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

/** Strip currency symbols, spaces, and handle commas in numbers */
function cleanNumber(val: string): number {
  if (!val) return 0;
  // Remove $, €, ₽, spaces, % signs
  const cleaned = val.replace(/[$€₽%\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function toCSVExportURL(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  const id = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

async function syncClient(supabase: any, clientId: string, platform: string = "google") {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, google_sheet_url, meta_sheet_url, tiktok_sheet_url")
    .eq("id", clientId)
    .single();

  if (clientError || !client) throw new Error("Client not found");

  // Pick the correct sheet URL based on platform
  const sheetUrlMap: Record<string, string | null> = {
    meta: client.meta_sheet_url,
    google: client.google_sheet_url,
    tiktok: client.tiktok_sheet_url,
  };
  const sheetUrl = sheetUrlMap[platform] || client.google_sheet_url;
  if (!sheetUrl) throw new Error(`No Google Sheet URL configured for platform: ${platform}`);

  // Fetch CSV
  const csvUrl = toCSVExportURL(sheetUrl);
  const csvResponse = await fetch(csvUrl);
  if (!csvResponse.ok) throw new Error(`Failed to fetch sheet: ${csvResponse.status}`);

  const csvText = await csvResponse.text();
  const rows = parseCSV(csvText);
  if (rows.length === 0) return 0;

  // Log first row headers for debugging
  console.log("CSV headers:", Object.keys(rows[0]));
  console.log("First row values:", JSON.stringify(rows[0]));

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
    // Revenue / Amount
    const revenue = cleanNumber(findColumn(row, "revenue", "доход", "выручка", "amount", "сумма"));
    // Purchases
    const purchases = Math.round(cleanNumber(findColumn(row, "purchases", "покупки", "purchase")));
    // Add to Cart
    const addToCart = Math.round(cleanNumber(findColumn(row, "addtocart", "add_to_cart", "add to cart", "корзина", "добавления в корзину", "atc", "добавлениевкорзину")));
    // Checkouts
    const checkouts = Math.round(cleanNumber(findColumn(row, "checkouts", "checkout", "чекаут", "оформление", "оформления", "initiatedcheckout", "initiated_checkout", "initiated checkout")));

    if (!dateStr) continue;
    // Skip rows with no meaningful data
    if (spend === 0 && impressions === 0 && clicks === 0 && leads === 0) continue;

    // Normalize date
    let normalizedDate = dateStr;
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

    // Check if this is a cron call (no auth header, has "cron" flag)
    const authHeader = req.headers.get("Authorization");
    let body: any = {};
    try { body = await req.json(); } catch {}

    if (body.cron === true) {
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
