import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractSheetId(url: string): { id: string; gid: string } | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = url.match(/[?&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return { id, gid };
}

async function fetchSheetCSV(url: string): Promise<string> {
  const parsed = extractSheetId(url);
  if (!parsed) throw new Error("Invalid Google Sheets URL");
  const { id, gid } = parsed;

  // Try gviz first, then export, then pub
  for (const tmpl of [
    `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${id}/pub?output=csv&gid=${gid}`,
  ]) {
    const res = await fetch(tmpl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const text = await res.text();
      if (!text.trim().startsWith("<!") && !text.trim().startsWith("<html")) return text;
    }
    try { await res.text(); } catch {}
  }
  throw new Error("Cannot access Google Sheet. Make sure it's shared as 'Anyone with the link'.");
}

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    return values;
  });
}

function cleanNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$€₽%\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sheet_url, tab_key } = body;
    // tab_key: 'financial_planning' or 'income_plan'

    if (!sheet_url || !tab_key) {
      return new Response(JSON.stringify({ error: "sheet_url and tab_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await fetchSheetCSV(sheet_url);
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "Sheet is empty or has no data rows" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The first row is headers (month columns), first column is row labels
    const headers = rows[0];
    let synced = 0;

    // Determine section based on tab_key
    const section = tab_key === 'income_plan' ? 'settings' : 'revenue';

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rowLabel = row[0] || `row_${r}`;
      const rowId = rowLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `row_${r}`;

      for (let c = 1; c < row.length && c < headers.length; c++) {
        const value = cleanNumber(row[c]);
        const fieldName = String(c - 1); // 0-indexed month

        await supabase.rpc('upsert_finance_data', {
          _tab_key: tab_key,
          _section: section,
          _row_id: rowId,
          _row_label: rowLabel,
          _field_name: fieldName,
          _value: value,
        });
        synced++;
      }
    }

    // Save the sheet URL in platform_settings for future reference
    await supabase.from('platform_settings').upsert({
      key: `finance_sheet_${tab_key}`,
      value: { url: sheet_url, last_synced: new Date().toISOString() },
      updated_by: user.id,
    }, { onConflict: 'key' });

    return new Response(
      JSON.stringify({ success: true, rows_synced: synced, total_rows: rows.length - 1, columns: headers.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Finance sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
