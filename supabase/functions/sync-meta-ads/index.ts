import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

// Smart lookback strategy:
// - Hourly cron: 3 days (covers Facebook attribution window)
// - Manual sync: user-specified range or default 30 days
const HOURLY_LOOKBACK_DAYS = 3;
const MANUAL_DEFAULT_LOOKBACK_DAYS = 30;

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
    const json = await resp.json();
    if (json.error) throw new Error(json.error.message);
    allData = allData.concat(json.data || []);
    nextUrl = json.paging?.next || null;
    // Safety limit
    if (allData.length > 5000) break;
  }
  return allData;
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
  let synced = 0;

  for (const row of rows) {
    const leads = extractActionValue(row.actions, "lead");
    const purchases = extractActionValue(row.actions, "purchase", "omni_purchase");
    const revenue = extractActionNumericValue(row.action_values, "purchase", "omni_purchase");
    const addToCart = extractActionValue(row.actions, "add_to_cart");
    const checkouts = extractActionValue(row.actions, "initiate_checkout");

    if (level === "campaign") {
      // Upsert campaign record
      const { data: campaign } = await supabase
        .from("campaigns")
        .upsert({
          ad_account_id: account.id,
          client_id: account.client_id,
          platform_campaign_id: row.campaign_id,
          campaign_name: row.campaign_name || "Unknown",
          status: "active",
        }, { onConflict: "ad_account_id,platform_campaign_id" })
        .select("id")
        .single();

      if (!campaign) continue;

      await supabase
        .from("daily_metrics")
        .upsert({
          client_id: account.client_id,
          campaign_id: campaign.id,
          date: row.date_start,
          spend: parseFloat(row.spend || "0"),
          impressions: parseInt(row.impressions || "0"),
          link_clicks: parseInt(row.clicks || "0"),
          leads,
          purchases,
          revenue,
          add_to_cart: addToCart,
          checkouts,
        }, { onConflict: "campaign_id,date" });

      synced++;
    } else {
      // adset or ad level → ad_level_metrics
      const platformId = level === "adset" ? row.adset_id : row.ad_id;
      const name = level === "adset" ? (row.adset_name || "Unknown Adset") : (row.ad_name || "Unknown Ad");
      const parentId = level === "adset" ? row.campaign_id : row.adset_id;

      // Look up campaign internal id
      const { data: campRow } = await supabase
        .from("campaigns")
        .select("id")
        .eq("ad_account_id", account.id)
        .eq("platform_campaign_id", row.campaign_id)
        .maybeSingle();

      await supabase.from("ad_level_metrics").upsert({
        client_id: account.client_id,
        campaign_id: campRow?.id || null,
        ad_account_id: account.id,
        level,
        platform_id: platformId,
        name,
        parent_platform_id: parentId,
        date: row.date_start,
        spend: parseFloat(row.spend || "0"),
        impressions: parseInt(row.impressions || "0"),
        link_clicks: parseInt(row.clicks || "0"),
        leads,
        purchases,
        revenue,
        add_to_cart: addToCart,
        checkouts,
      }, { onConflict: "campaign_id,level,platform_id,date" });

      synced++;
    }
  }
  return synced;
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
      // Get active ad accounts, optionally filtered by client
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

      // For cron: only sync clients with meta_auto_sync enabled
      let accountsToSync = adAccounts;
      if (isCron && !targetClientId) {
        // Check which clients have meta auto-sync on
        const clientIds = [...new Set(adAccounts.map(a => a.client_id))];
        const { data: settings } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", clientIds.map(id => `meta_auto_sync_${id}`));
        
        const enabledClients = new Set<string>();
        (settings || []).forEach((s: any) => {
          const cid = s.key.replace("meta_auto_sync_", "");
          if (s.value?.enabled !== false) enabledClients.add(cid);
        });

        // If no settings found, default to enabled for clients that have ad accounts
        if (!settings?.length) {
          clientIds.forEach(id => enabledClients.add(id));
        }

        accountsToSync = adAccounts.filter(a => enabledClients.has(a.client_id));
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
          // Sync all three levels
          const campaignSynced = await syncAccountLevel(supabase, account, "campaign", dateFrom, dateTo, metaToken);
          totalSynced += campaignSynced;

          // Adset & Ad levels — non-critical
          try {
            await syncAccountLevel(supabase, account, "adset", dateFrom, dateTo, metaToken);
          } catch (e) { /* non-critical */ }

          try {
            await syncAccountLevel(supabase, account, "ad", dateFrom, dateTo, metaToken);
          } catch (e) { /* non-critical */ }

        } catch (err) {
          errors.push(`Account ${account.platform_account_id}: ${(err as Error).message}`);
        }
      }

      // Update sync status for each client
      const clientIds = [...new Set(accountsToSync.map(a => a.client_id))];
      for (const clientId of clientIds) {
        const clientErrors = errors.filter(e => {
          const acc = accountsToSync.find(a => a.client_id === clientId);
          return acc && e.includes(acc.platform_account_id);
        });

        await supabase
          .from("platform_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: clientErrors.length ? "error" : "synced",
            sync_error: clientErrors.length ? clientErrors.join("; ") : null,
          })
          .eq("client_id", clientId)
          .eq("platform", "meta");
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
