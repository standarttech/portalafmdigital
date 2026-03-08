import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

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

  // Check auth: either cron secret or user JWT
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");

  if (cronSecret) {
    // cron
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

    if (action === "sync") {
      const { data: adAccounts } = await supabase
        .from("ad_accounts")
        .select("id, platform_account_id, client_id, account_name")
        .eq("is_active", true);

      if (!adAccounts?.length) {
        return new Response(JSON.stringify({ message: "No active ad accounts to sync", synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const targetClientId = body.client_id;
      const accountsToSync = targetClientId
        ? adAccounts.filter(a => a.client_id === targetClientId)
        : adAccounts;

      let synced = 0;
      const errors: string[] = [];

      for (const account of accountsToSync) {
        try {
          const dateFrom = body.date_from || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
          const dateTo = body.date_to || new Date().toISOString().split("T")[0];

          // --- Campaign level ---
          const insightsUrl = `${META_API_BASE}/act_${account.platform_account_id}/insights?` +
            `fields=spend,impressions,clicks,actions,action_values,cpc,cpm,ctr,cost_per_action_type,campaign_name,campaign_id` +
            `&time_range={"since":"${dateFrom}","until":"${dateTo}"}` +
            `&time_increment=1&level=campaign&limit=500&access_token=${metaToken}`;

          const resp = await fetch(insightsUrl);
          const insightsData = await resp.json();

          if (insightsData.error) {
            errors.push(`Account ${account.platform_account_id}: ${insightsData.error.message}`);
            continue;
          }

          const rows = insightsData.data || [];

          for (const row of rows) {
            const leads = (row.actions || []).find((a: any) => a.action_type === "lead")?.value || 0;
            const purchases = (row.actions || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
            const revenue = (row.action_values || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
            const addToCart = (row.actions || []).find((a: any) => a.action_type === "add_to_cart")?.value || 0;
            const checkouts = (row.actions || []).find((a: any) => a.action_type === "initiate_checkout")?.value || 0;

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
                leads: parseInt(leads),
                purchases: parseInt(purchases),
                revenue: parseFloat(revenue),
                add_to_cart: parseInt(addToCart),
                checkouts: parseInt(checkouts),
              }, { onConflict: "campaign_id,date" });

            synced++;
          }

          // --- Adset level ---
          try {
            const adsetUrl = `${META_API_BASE}/act_${account.platform_account_id}/insights?` +
              `fields=spend,impressions,clicks,actions,action_values,adset_name,adset_id,campaign_id` +
              `&time_range={"since":"${dateFrom}","until":"${dateTo}"}` +
              `&time_increment=1&level=adset&limit=500&access_token=${metaToken}`;

            const adsetResp = await fetch(adsetUrl);
            const adsetData = await adsetResp.json();

            if (!adsetData.error && adsetData.data) {
              for (const row of adsetData.data) {
                const leads = (row.actions || []).find((a: any) => a.action_type === "lead")?.value || 0;
                const purchases = (row.actions || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
                const revenue = (row.action_values || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
                const addToCart = (row.actions || []).find((a: any) => a.action_type === "add_to_cart")?.value || 0;
                const checkouts = (row.actions || []).find((a: any) => a.action_type === "initiate_checkout")?.value || 0;

                // Find campaign id
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
                  level: "adset",
                  platform_id: row.adset_id,
                  name: row.adset_name || "Unknown Adset",
                  parent_platform_id: row.campaign_id,
                  date: row.date_start,
                  spend: parseFloat(row.spend || "0"),
                  impressions: parseInt(row.impressions || "0"),
                  link_clicks: parseInt(row.clicks || "0"),
                  leads: parseInt(leads),
                  purchases: parseInt(purchases),
                  revenue: parseFloat(revenue),
                  add_to_cart: parseInt(addToCart),
                  checkouts: parseInt(checkouts),
                }, { onConflict: "campaign_id,level,platform_id,date" });
              }
            }
          } catch (e) {
            // non-critical
          }

          // --- Ad level ---
          try {
            const adUrl = `${META_API_BASE}/act_${account.platform_account_id}/insights?` +
              `fields=spend,impressions,clicks,actions,action_values,ad_name,ad_id,adset_id,campaign_id` +
              `&time_range={"since":"${dateFrom}","until":"${dateTo}"}` +
              `&time_increment=1&level=ad&limit=500&access_token=${metaToken}`;

            const adResp = await fetch(adUrl);
            const adData = await adResp.json();

            if (!adData.error && adData.data) {
              for (const row of adData.data) {
                const leads = (row.actions || []).find((a: any) => a.action_type === "lead")?.value || 0;
                const purchases = (row.actions || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
                const revenue = (row.action_values || []).find((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase")?.value || 0;
                const addToCart = (row.actions || []).find((a: any) => a.action_type === "add_to_cart")?.value || 0;
                const checkouts = (row.actions || []).find((a: any) => a.action_type === "initiate_checkout")?.value || 0;

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
                  level: "ad",
                  platform_id: row.ad_id,
                  name: row.ad_name || "Unknown Ad",
                  parent_platform_id: row.adset_id,
                  date: row.date_start,
                  spend: parseFloat(row.spend || "0"),
                  impressions: parseInt(row.impressions || "0"),
                  link_clicks: parseInt(row.clicks || "0"),
                  leads: parseInt(leads),
                  purchases: parseInt(purchases),
                  revenue: parseFloat(revenue),
                  add_to_cart: parseInt(addToCart),
                  checkouts: parseInt(checkouts),
                }, { onConflict: "campaign_id,level,platform_id,date" });
              }
            }
          } catch (e) {
            // non-critical
          }

        } catch (err) {
          errors.push(`Account ${account.platform_account_id}: ${(err as Error).message}`);
        }
      }

      // Update sync status
      for (const account of accountsToSync) {
        await supabase
          .from("platform_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: errors.length ? "error" : "synced",
            sync_error: errors.length ? errors.join("; ") : null,
          })
          .eq("client_id", account.client_id)
          .eq("platform", "meta");
      }

      return new Response(JSON.stringify({ synced, errors }), {
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
