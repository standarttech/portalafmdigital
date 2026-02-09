import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, "");
}

function findColumn(row: Record<string, string>, ...names: string[]): string {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    for (const n of names) {
      if (norm === normalizeHeader(n)) return row[key];
    }
  }
  return "";
}

function toCSVExportURL(url: string): string {
  // Handle various Google Sheets URL formats
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  const id = match[1];
  // Extract gid if present
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client with sheet URL
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, google_sheet_url")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client.google_sheet_url) {
      return new Response(JSON.stringify({ error: "No Google Sheet URL configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch CSV
    const csvUrl = toCSVExportURL(client.google_sheet_url);
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${csvResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, rows_synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We need an ad_account to link campaigns. Get or create a placeholder.
    let { data: existingAccounts } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("client_id", client_id)
      .limit(1);

    let adAccountId: string;
    if (existingAccounts && existingAccounts.length > 0) {
      adAccountId = existingAccounts[0].id;
    } else {
      // Need a platform_connection first
      let { data: existingConns } = await supabase
        .from("platform_connections")
        .select("id")
        .eq("client_id", client_id)
        .limit(1);

      let connId: string;
      if (existingConns && existingConns.length > 0) {
        connId = existingConns[0].id;
      } else {
        const { data: newConn } = await supabase
          .from("platform_connections")
          .insert({
            client_id,
            platform: "google",
            account_name: "Google Sheets Import",
            sync_status: "success",
            last_sync_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        connId = newConn!.id;
      }

      const { data: newAccount } = await supabase
        .from("ad_accounts")
        .insert({
          client_id,
          connection_id: connId,
          platform_account_id: `sheets-${client_id.substring(0, 8)}`,
          account_name: "Google Sheets Import",
        })
        .select("id")
        .single();
      adAccountId = newAccount!.id;
    }

    // Process rows: find or create campaigns, upsert metrics
    const campaignCache: Record<string, string> = {};
    let synced = 0;

    for (const row of rows) {
      const dateStr = findColumn(row, "date", "дата", "день");
      const campaignName = findColumn(row, "campaign", "кампания", "campaignname") || "Default";
      const spend = parseFloat(findColumn(row, "spend", "расход", "расходы", "cost")) || 0;
      const impressions = parseInt(findColumn(row, "impressions", "показы")) || 0;
      const clicks = parseInt(findColumn(row, "clicks", "клики", "linkclicks")) || 0;
      const leads = parseInt(findColumn(row, "leads", "лиды", "conversions")) || 0;
      const revenue = parseFloat(findColumn(row, "revenue", "доход", "выручка")) || 0;
      const purchases = parseInt(findColumn(row, "purchases", "покупки")) || 0;

      if (!dateStr) continue;

      // Normalize date
      let normalizedDate = dateStr;
      // Try parsing common formats
      const dateParts = dateStr.match(/(\d{1,4})[.\/-](\d{1,2})[.\/-](\d{1,4})/);
      if (dateParts) {
        const [, a, b, c] = dateParts;
        if (a.length === 4) normalizedDate = `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
        else if (c.length === 4) normalizedDate = `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        else normalizedDate = `20${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
      }

      // Get or create campaign
      if (!campaignCache[campaignName]) {
        const { data: existing } = await supabase
          .from("campaigns")
          .select("id")
          .eq("client_id", client_id)
          .eq("campaign_name", campaignName)
          .limit(1);

        if (existing && existing.length > 0) {
          campaignCache[campaignName] = existing[0].id;
        } else {
          const { data: newCamp } = await supabase
            .from("campaigns")
            .insert({
              client_id,
              ad_account_id: adAccountId,
              campaign_name: campaignName,
              platform_campaign_id: `sheets-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              status: "active",
            })
            .select("id")
            .single();
          campaignCache[campaignName] = newCamp!.id;
        }
      }

      const campaignId = campaignCache[campaignName];

      // Check if metrics row exists for this date+campaign
      const { data: existingMetric } = await supabase
        .from("daily_metrics")
        .select("id")
        .eq("client_id", client_id)
        .eq("campaign_id", campaignId)
        .eq("date", normalizedDate)
        .limit(1);

      if (existingMetric && existingMetric.length > 0) {
        await supabase
          .from("daily_metrics")
          .update({ spend, impressions, link_clicks: clicks, leads, revenue, purchases })
          .eq("id", existingMetric[0].id);
      } else {
        await supabase.from("daily_metrics").insert({
          client_id,
          campaign_id: campaignId,
          date: normalizedDate,
          spend,
          impressions,
          link_clicks: clicks,
          leads,
          revenue,
          purchases,
        });
      }
      synced++;
    }

    // Update sync status
    await supabase
      .from("platform_connections")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success" })
      .eq("client_id", client_id);

    return new Response(
      JSON.stringify({ success: true, rows_synced: synced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
