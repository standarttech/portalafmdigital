import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

// Smart lookback strategy:
// - Hourly cron: 3 days (covers Facebook attribution window)
// - Manual sync (single client): 7 days — fast enough to stay under 60s timeout
// - Manual sync (all clients, no client_id): same as cron
const HOURLY_LOOKBACK_DAYS = 3;
const MANUAL_DEFAULT_LOOKBACK_DAYS = 7;

function getDateRange(isCron: boolean, bodyDateFrom?: string, bodyDateTo?: string) {
  const dateTo = bodyDateTo || new Date().toISOString().split("T")[0];
  let dateFrom: string;

  if (bodyDateFrom) {
    dateFrom = bodyDateFrom;
  } else if (isCron) {
    dateFrom = new Date(Date.now() - HOURLY_LOOKBACK_DAYS * 86400000).toISOString().split("T")[0];
  } else {
    dateFrom = new Date(Date.now() - MANUAL_DEFAULT_LOOKBACK_DAYS * 86400000).toISOString().split("T")[0];
  }
  return { dateFrom, dateTo };
}

function extractActionValue(actions: any[], ...types: string[]): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => types.includes(a.action_type));
  return found ? parseInt(found.value) : 0;
}

function extractActionNumericValue(actionValues: any[], ...types: string[]): number {
  if (!actionValues) return 0;
  const found = actionValues.find((a: any) => types.includes(a.action_type));
  return found ? parseFloat(found.value) : 0;
}

async function fetchAllPages(url: string): Promise<any[]> {
  let allData: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const resp = await fetch(nextUrl);
    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("Failed to parse Meta API response:", text.substring(0, 500));
      throw new Error(`Meta API returned invalid JSON (status ${resp.status})`);
    }
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    allData = allData.concat(json.data || []);
    nextUrl = json.paging?.next || null;
    if (allData.length > 5000) break;
  }
  return allData;
}

// Upsert rows in chunks to avoid request size limits
async function batchUpsert(supabase: any, table: string, rows: any[], conflictCol: string, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await supabase.from(table).upsert(rows.slice(i, i + chunkSize), { onConflict: conflictCol });
  }
}

async function syncAccountLevel(
  supabase: any,
  account: any,
  level: "campaign" | "adset" | "ad",
  dateFrom: string,
  dateTo: string,
  metaToken: string
) {
  const fieldsByLevel: Record<string, string> = {
    campaign: "campaign_name,campaign_id",
    adset: "adset_name,adset_id,campaign_id",
    ad: "ad_name,ad_id,adset_id,campaign_id",
  };

  const insightsUrl = `${META_API_BASE}/act_${account.platform_account_id}/insights?` +
    `fields=spend,impressions,clicks,actions,action_values,${fieldsByLevel[level]}` +
    `&time_range={"since":"${dateFrom}","until":"${dateTo}"}` +
    `&time_increment=1&level=${level}&limit=500&access_token=${metaToken}`;

  const rows = await fetchAllPages(insightsUrl);
  if (!rows.length) return 0;

  if (level === "campaign") {
    // ── 1. Batch upsert unique campaigns (deduplicated) ──
    const uniqueCampaigns = [...new Map(rows.map(r => [r.campaign_id, r])).values()];
    await batchUpsert(
      supabase,
      "campaigns",
      uniqueCampaigns.map(r => ({
        ad_account_id: account.id,
        client_id: account.client_id,
        platform_campaign_id: r.campaign_id,
        campaign_name: r.campaign_name || "Unknown",
        status: "active",
      })),
      "ad_account_id,platform_campaign_id"
    );

    // ── 2. Fetch internal campaign IDs in one query ──
    const { data: campaignRows } = await supabase
      .from("campaigns")
      .select("id, platform_campaign_id")
      .eq("ad_account_id", account.id)
      .in("platform_campaign_id", uniqueCampaigns.map(c => c.campaign_id));

    const campaignMap = new Map(
      (campaignRows || []).map((c: any) => [c.platform_campaign_id, c.id])
    );

    // ── 3. Batch upsert daily_metrics ──
    const metricsRows = rows
      .map(row => ({
        client_id: account.client_id,
        campaign_id: campaignMap.get(row.campaign_id),
        date: row.date_start,
        spend: parseFloat(row.spend || "0"),
        impressions: parseInt(row.impressions || "0"),
        link_clicks: parseInt(row.clicks || "0"),
        leads: extractActionValue(row.actions, "lead"),
        purchases: extractActionValue(row.actions, "purchase", "omni_purchase"),
        revenue: extractActionNumericValue(row.action_values, "purchase", "omni_purchase"),
        add_to_cart: extractActionValue(row.actions, "add_to_cart"),
        checkouts: extractActionValue(row.actions, "initiate_checkout"),
      }))
      .filter(m => m.campaign_id != null);

    await batchUpsert(supabase, "daily_metrics", metricsRows, "campaign_id,date");
    return metricsRows.length;
  } else {
    // adset or ad level → ad_level_metrics (batched)
    const platformId = (row: any) => level === "adset" ? row.adset_id : row.ad_id;
    const name = (row: any) => level === "adset" ? (row.adset_name || "Unknown Adset") : (row.ad_name || "Unknown Ad");
    const parentId = (row: any) => level === "adset" ? row.campaign_id : row.adset_id;

    // Fetch all relevant campaign IDs in one shot
    const platformCampaignIds = [...new Set(rows.map(r => r.campaign_id))];
    const { data: campaignRows } = await supabase
      .from("campaigns")
      .select("id, platform_campaign_id")
      .eq("ad_account_id", account.id)
      .in("platform_campaign_id", platformCampaignIds);

    const campaignMap = new Map(
      (campaignRows || []).map((c: any) => [c.platform_campaign_id, c.id])
    );

    const adLevelRows = rows.map(row => ({
      client_id: account.client_id,
      campaign_id: campaignMap.get(row.campaign_id) || null,
      ad_account_id: account.id,
      level,
      platform_id: platformId(row),
      name: name(row),
      parent_platform_id: parentId(row),
      date: row.date_start,
      spend: parseFloat(row.spend || "0"),
      impressions: parseInt(row.impressions || "0"),
      link_clicks: parseInt(row.clicks || "0"),
      leads: extractActionValue(row.actions, "lead"),
      purchases: extractActionValue(row.actions, "purchase", "omni_purchase"),
      revenue: extractActionNumericValue(row.action_values, "purchase", "omni_purchase"),
      add_to_cart: extractActionValue(row.actions, "add_to_cart"),
      checkouts: extractActionValue(row.actions, "initiate_checkout"),
    }));

    await batchUpsert(supabase, "ad_level_metrics", adLevelRows, "campaign_id,level,platform_id,date");
    return adLevelRows.length;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const metaToken = Deno.env.get("META_SYSTEM_USER_TOKEN");

  if (!metaToken) {
    return new Response(JSON.stringify({ error: "META_SYSTEM_USER_TOKEN not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Auth: cron secret or user JWT
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const isCron = !!cronSecret;

  if (cronSecret) {
    // cron — OK
  } else if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    // --- LIST ACCOUNTS ---
    if (action === "list_accounts") {
      const response = await fetch(
        `${META_API_BASE}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${metaToken}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({
        accounts: (data.data || []).map((a: any) => ({
          id: a.id.replace("act_", ""),
          name: a.name,
          status: a.account_status === 1 ? "active" : "inactive",
          currency: a.currency,
          timezone: a.timezone_name,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- SYNC ---
    if (action === "sync") {
      let query = supabase
        .from("ad_accounts")
        .select("id, platform_account_id, client_id, account_name")
        .eq("is_active", true);

      const targetClientId = body.client_id;
      if (targetClientId) {
        query = query.eq("client_id", targetClientId);
      }

      const { data: adAccounts } = await query;

      if (!adAccounts?.length) {
        return new Response(JSON.stringify({ message: "No active ad accounts to sync", synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter out Google Sheets-originated accounts
      let accountsToSync = adAccounts.filter((a: any) => !a.platform_account_id.startsWith("sheets-"));

      if (isCron && !targetClientId) {
        const clientIds = [...new Set(accountsToSync.map((a: any) => a.client_id))];
        const { data: settings } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", clientIds.map(id => `meta_auto_sync_${id}`));

        const enabledClients = new Set<string>();
        (settings || []).forEach((s: any) => {
          const cid = s.key.replace("meta_auto_sync_", "");
          if (s.value?.enabled !== false) enabledClients.add(cid);
        });

        if (!settings?.length) {
          clientIds.forEach(id => enabledClients.add(id));
        }

        accountsToSync = accountsToSync.filter((a: any) => enabledClients.has(a.client_id));
      }

      if (!accountsToSync.length) {
        return new Response(JSON.stringify({ message: "No clients with auto-sync enabled", synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { dateFrom, dateTo } = getDateRange(isCron, body.date_from, body.date_to);

      let totalSynced = 0;
      const errors: string[] = [];

      for (const account of accountsToSync) {
        try {
          const campaignSynced = await syncAccountLevel(supabase, account, "campaign", dateFrom, dateTo, metaToken);
          totalSynced += campaignSynced;

          // Adset & Ad levels — non-critical, skip on manual single-client sync to stay within timeout
          if (isCron || !targetClientId) {
            try {
              await syncAccountLevel(supabase, account, "adset", dateFrom, dateTo, metaToken);
            } catch { /* non-critical */ }

            try {
              await syncAccountLevel(supabase, account, "ad", dateFrom, dateTo, metaToken);
            } catch { /* non-critical */ }
          }
        } catch (err) {
          const errMsg = (err as Error).message;
          errors.push(`Account ${account.platform_account_id}: ${errMsg}`);

          await supabase.from("raw_api_logs").insert({
            client_id: account.client_id,
            platform: "meta" as any,
            endpoint: `sync-meta-ads/${account.platform_account_id}`,
            error_message: errMsg,
            status_code: 500,
          });
        }
      }

      // Update sync status for each client
      const clientIds = [...new Set(accountsToSync.map((a: any) => a.client_id))];
      for (const clientId of clientIds) {
        const clientAccountIds = accountsToSync
          .filter((a: any) => a.client_id === clientId)
          .map((a: any) => a.platform_account_id);
        const clientErrors = errors.filter(e => clientAccountIds.some(id => e.includes(id)));

        const syncStatus = clientErrors.length ? "error" : "synced";
        const syncError = clientErrors.length ? clientErrors.join("; ") : null;

        await supabase
          .from("platform_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: syncStatus,
            sync_error: syncError,
          })
          .eq("client_id", clientId)
          .eq("platform", "meta");

        if (clientErrors.length > 0) {
          const { data: admins } = await supabase.from("agency_users").select("user_id").eq("agency_role", "AgencyAdmin");
          const { data: clientRow } = await supabase.from("clients").select("name").eq("id", clientId).single();
          const clientName = clientRow?.name || clientId;
          for (const admin of (admins || [])) {
            await supabase.from("notifications").insert({
              user_id: admin.user_id,
              title: "Sync Error",
              message: `Meta Ads sync failed for ${clientName}: ${clientErrors.join("; ").substring(0, 200)}`,
              type: "warning",
              link: "/sync",
            });
          }
        }
      }

      return new Response(JSON.stringify({
        synced: totalSynced,
        errors,
        lookback_days: isCron ? HOURLY_LOOKBACK_DAYS : MANUAL_DEFAULT_LOOKBACK_DAYS,
        date_range: { from: dateFrom, to: dateTo },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
