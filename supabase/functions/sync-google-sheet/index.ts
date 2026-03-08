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
  const keys = Object.keys(row);
  const normalizedNames = names.map(normalizeHeader);

  // Pass 1: exact match (highest priority)
  for (const key of keys) {
    const norm = normalizeHeader(key);
    if (normalizedNames.includes(norm)) return row[key];
  }

  // Pass 2: startsWith match — but ONLY if the remaining chars are NOT alphanumeric
  // e.g. "date january" matches "date", but "purchaserate" does NOT match "purchase"
  for (const key of keys) {
    const norm = normalizeHeader(key);
    for (const normName of normalizedNames) {
      if (norm.startsWith(normName)) {
        const rest = norm.slice(normName.length);
        // Allow match only if what follows is empty OR starts with a non-alpha char
        // This prevents "purchaserate" matching "purchase" but allows "datejanuary" matching "date"
        // We specifically allow date-like suffixes (month names after "date")
        if (rest === "") return row[key];
        // For "date" prefix specifically, allow month name suffixes
        if (normName === "date" || normName === "дата") return row[key];
      }
    }
  }

  return "";
}

/** Strip currency symbols, spaces, and handle commas in numbers */
function cleanNumber(val: string): number {
  if (!val) return 0;
  // Remove $, €, ₽, spaces, % signs
  let cleaned = val.replace(/[$€₽%\s]/g, "");
  
  // Smart comma handling:
  // "26,843" or "1,234,567" → thousands separator (comma followed by exactly 3 digits)
  // "26,84" → decimal separator (European format)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    // US format with thousands commas: "1,234,567" or "1,234.56"
    cleaned = cleaned.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    // European format with period thousands: "1.234.567" or "1.234,56"
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Single comma → treat as decimal if followed by 1-2 digits, otherwise thousands
    const commaMatch = cleaned.match(/^(\d+),(\d+)$/);
    if (commaMatch) {
      if (commaMatch[2].length === 3) {
        // Likely thousands separator: "26,843" → 26843
        cleaned = cleaned.replace(",", "");
      } else {
        // Likely decimal: "26,84" → 26.84
        cleaned = cleaned.replace(",", ".");
      }
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

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
  if (!parsed) throw new Error("Invalid Google Sheets URL. Please paste a valid Google Sheets link.");

  const { id, gid } = parsed;

  // Strategy 1: gviz/tq endpoint — most reliable for "Anyone with link" sheets from server-side
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  let response = await fetch(gvizUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    await response.text(); // consume
    // Strategy 2: export endpoint
    const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    response = await fetch(exportUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  }

  if (!response.ok) {
    await response.text(); // consume
    // Strategy 3: pub endpoint (only if user published to web)
    const pubUrl = `https://docs.google.com/spreadsheets/d/${id}/pub?output=csv&gid=${gid}`;
    response = await fetch(pubUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  }

  if (!response.ok) {
    throw new Error(
      `Cannot access Google Sheet (HTTP ${response.status}). ` +
      `Make sure: 1) Sheet is shared via Share → "Anyone with the link" → Viewer, ` +
      `OR 2) Use File → Share → Publish to web → CSV.`
    );
  }

  const text = await response.text();
  // gviz sometimes returns HTML error page — detect it
  if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
    throw new Error(
      "Google Sheet returned an HTML page instead of CSV data. " +
      "Please make sure the sheet is publicly accessible (Share → Anyone with the link → Viewer)."
    );
  }

  return text;
}

async function syncClient(supabase: any, clientId: string, platform: string = "google") {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, google_sheet_url, meta_sheet_url, tiktok_sheet_url")
    .eq("id", clientId)
    .single();

  if (clientError || !client) throw new Error("Client not found");

  // Skip Google Sheets sync for platforms that have a direct API connection
  if (platform === "meta") {
    const { data: directAccounts } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .not("platform_account_id", "like", "sheets-%")
      .limit(1);
    
    if (directAccounts && directAccounts.length > 0) {
      console.log(`Skipping Sheets sync for client ${clientId} platform ${platform} — direct API connection active`);
      return 0;
    }
  }

  // Pick the correct sheet URL based on platform
  const sheetUrlMap: Record<string, string | null> = {
    meta: client.meta_sheet_url,
    google: client.google_sheet_url,
    tiktok: client.tiktok_sheet_url,
  };
  const sheetUrl = sheetUrlMap[platform] || client.google_sheet_url;
  if (!sheetUrl) throw new Error(`No Google Sheet URL configured for platform: ${platform}`);

  // Fetch CSV — tries export URL first, falls back to pub URL
  const csvText = await fetchSheetCSV(sheetUrl);
  const rows = parseCSV(csvText);
  if (rows.length === 0) return 0;

  // Log first row headers for debugging
  console.log("CSV headers:", Object.keys(rows[0]));
  console.log("First row values:", JSON.stringify(rows[0]));

  // Debug: show what each metric maps to in the first data row
  const debugRow = rows[0];
  console.log("Column mapping debug:", JSON.stringify({
    date: findColumn(debugRow, "date", "дата", "день"),
    spend: findColumn(debugRow, "spend", "расход", "расходы", "cost", "затраты"),
    impressions: findColumn(debugRow, "impressions", "показы", "reach", "охват"),
    clicks: findColumn(debugRow, "clicks", "click", "клики", "клик", "linkclicks", "link_clicks"),
    leads: findColumn(debugRow, "leads", "лиды", "лид", "conversions", "конверсии"),
    purchases: findColumn(debugRow, "purchases", "покупки", "purchase"),
    revenue: findColumn(debugRow, "revenue", "доход", "выручка", "amount", "сумма"),
    addToCart: findColumn(debugRow, "addtocart", "add_to_cart", "add to cart", "корзина", "добавления в корзину", "atc"),
    checkouts: findColumn(debugRow, "checkouts", "checkout", "чекаут", "оформление", "оформления", "initiatedcheckout"),
  }));

  // Get or create ad_account for this SPECIFIC platform connection
  let { data: existingConns } = await supabase
    .from("platform_connections").select("id").eq("client_id", clientId).eq("platform", platform).limit(1);
  
  let connId: string;
  if (existingConns && existingConns.length > 0) {
    connId = existingConns[0].id;
  } else {
    const platformNames: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", tiktok: "TikTok Ads" };
    const { data: newConn } = await supabase
      .from("platform_connections")
      .insert({ client_id: clientId, platform, account_name: platformNames[platform] || "Sheets Import", sync_status: "success", last_sync_at: new Date().toISOString() })
      .select("id").single();
    connId = newConn!.id;
  }

  // Get or create ad_account tied to this specific connection
  let { data: existingAccounts } = await supabase
    .from("ad_accounts").select("id").eq("client_id", clientId).eq("connection_id", connId).limit(1);

  let adAccountId: string;
  if (existingAccounts && existingAccounts.length > 0) {
    adAccountId = existingAccounts[0].id;
  } else {
    const platformNames: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", tiktok: "TikTok Ads" };
    const { data: newAccount } = await supabase
      .from("ad_accounts")
      .insert({ client_id: clientId, connection_id: connId, platform_account_id: `sheets-${platform}-${clientId.substring(0, 8)}`, account_name: `${platformNames[platform] || "Sheets"} Import` })
      .select("id").single();
    adAccountId = newAccount!.id;
  }

  const campaignCache: Record<string, string> = {};
  let synced = 0;

  for (const row of rows) {
    const dateStr = findColumn(row, "date", "дата", "день");
    // Campaign name: try Campaign, UTM, Name
    const campaignName = findColumn(row, "campaign", "campaignname", "utm", "кампания", "name") || "Default";
    // Spend: strip $ and other currency symbols
    const spend = cleanNumber(findColumn(row, "spend", "расход", "расходы", "cost", "затраты"));
    // Impressions OR Reach — map both to impressions
    const impressions = Math.round(cleanNumber(findColumn(row, "impressions", "показы", "reach", "охват")));
    // Clicks: singular and plural
    const clicks = Math.round(cleanNumber(findColumn(row, "clicks", "click", "клики", "клик", "linkclicks", "link_clicks")));
    // Leads
    const leads = Math.round(cleanNumber(findColumn(row, "leads", "лиды", "лид", "conversions", "конверсии")));
    // Revenue / Amount — exclude "profit" to avoid mismatch
    const revenue = cleanNumber(findColumn(row, "revenue", "доход", "выручка", "amount", "сумма"));
    // Purchases — use specific full terms to avoid matching "purchase rate", "purchase count" etc.
    const purchases = Math.round(cleanNumber(findColumn(row, "purchases", "покупки", "purchase")));
    // Add to Cart
    const addToCart = Math.round(cleanNumber(findColumn(row, "addtocart", "add_to_cart", "add to cart", "корзина", "добавления в корзину", "atc", "добавлениевкорзину")));
    // Checkouts / Initiated Checkout
    const checkouts = Math.round(cleanNumber(findColumn(row, "checkouts", "checkout", "чекаут", "оформление", "оформления", "initiatedcheckout", "initiated_checkout", "initiated checkout")));

    if (!dateStr) continue;
    // Skip rows with no meaningful data
    if (spend === 0 && impressions === 0 && clicks === 0 && leads === 0) continue;

    // Normalize date - handle multiple formats:
    // YYYY-MM-DD, YYYY/MM/DD → already ISO, keep as is
    // M/D/YYYY or MM/DD/YYYY (US slash format) → YYYY-MM-DD
    // DD.MM.YYYY or D.M.YYYY (European dot format) → YYYY-MM-DD
    // DD-MM-YYYY or D-M-YYYY (European dash format) → YYYY-MM-DD
    let normalizedDate = dateStr.trim();

    // Detect separator
    const sepMatch = normalizedDate.match(/[.\/-]/);
    const sep = sepMatch ? sepMatch[0] : null;
    const dateParts = normalizedDate.match(/^(\d{1,4})[.\/-](\d{1,2})[.\/-](\d{1,4})$/);

    if (dateParts) {
      const [, a, b, c] = dateParts;
      if (a.length === 4) {
        // YYYY-MM-DD or YYYY/MM/DD
        normalizedDate = `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
      } else if (c.length === 4) {
        if (sep === "/") {
          // M/D/YYYY (US format) — month first, then day
          normalizedDate = `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
        } else {
          // DD.MM.YYYY or DD-MM-YYYY (European format) — day first, then month
          normalizedDate = `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        }
      } else {
        // Two-digit year like DD.MM.YY — assume 20xx, European
        normalizedDate = `20${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
      }
    }

    // Validate resulting date is parseable
    if (isNaN(Date.parse(normalizedDate))) continue;

    // Get or create campaign
    if (!campaignCache[campaignName]) {
      const { data: existing } = await supabase
        .from("campaigns").select("id").eq("client_id", clientId).eq("campaign_name", campaignName).limit(1);
      if (existing && existing.length > 0) {
        campaignCache[campaignName] = existing[0].id;
      } else {
        const { data: newCamp } = await supabase
          .from("campaigns")
          .insert({ client_id: clientId, ad_account_id: adAccountId, campaign_name: campaignName, platform_campaign_id: `sheets-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: "active" })
          .select("id").single();
        campaignCache[campaignName] = newCamp!.id;
      }
    }

    const campaignId = campaignCache[campaignName];

    // Upsert: check existing
    const { data: existingMetric } = await supabase
      .from("daily_metrics").select("id")
      .eq("client_id", clientId).eq("campaign_id", campaignId).eq("date", normalizedDate).limit(1);

    const metricData = { spend, impressions, link_clicks: clicks, leads, revenue, purchases, add_to_cart: addToCart, checkouts };

    if (existingMetric && existingMetric.length > 0) {
      await supabase.from("daily_metrics").update(metricData).eq("id", existingMetric[0].id);
    } else {
      await supabase.from("daily_metrics").insert({ client_id: clientId, campaign_id: campaignId, date: normalizedDate, ...metricData });
    }
    synced++;
  }

  // Update sync status for this platform's connection
  await supabase
    .from("platform_connections")
    .update({ last_sync_at: new Date().toISOString(), sync_status: "success" })
    .eq("client_id", clientId)
    .eq("platform", platform);

  return synced;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a cron call — validate via service_role key or x-cron-secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");
    let body: any = {};
    try { body = await req.json(); } catch {}

    const isServiceRole = authHeader?.replace("Bearer ", "") === supabaseKey;
    const isCronValid = cronSecret === Deno.env.get("CRON_SECRET");

    if (body.cron === true && (isServiceRole || isCronValid)) {
      // Cron mode: validated via service_role key or cron secret
      // Cron mode: sync all clients with auto_sync_enabled for all platforms
      const { data: clients } = await supabase
        .from("clients")
        .select("id, google_sheet_url, meta_sheet_url, tiktok_sheet_url")
        .eq("auto_sync_enabled", true);

      let totalSynced = 0;
      const errors: string[] = [];
      for (const c of (clients || [])) {
        const platformsToSync: string[] = [];
        if (c.meta_sheet_url) platformsToSync.push("meta");
        if (c.google_sheet_url) platformsToSync.push("google");
        if (c.tiktok_sheet_url) platformsToSync.push("tiktok");
        
        for (const plat of platformsToSync) {
          try {
            const count = await syncClient(supabase, c.id, plat);
            totalSynced += count;
          } catch (e: any) {
            errors.push(`${c.id}/${plat}: ${e.message}`);
          }
        }
      }
      return new Response(
        JSON.stringify({ success: true, clients_synced: (clients || []).length, rows_synced: totalSynced, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual mode: requires auth
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

    const { client_id, platform } = body;
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const synced = await syncClient(supabase, client_id, platform || "google");

    return new Response(
      JSON.stringify({ success: true, rows_synced: synced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
