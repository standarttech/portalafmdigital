import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v21.0";

/**
 * Sync performance data for launched campaigns.
 * Reuses existing daily_metrics / ad_level_metrics tables.
 * Fetches latest insights for external IDs stored in launch_requests.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const svc = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const { launch_request_id, client_id } = body;

    // Build query for launched requests
    let query = svc.from("launch_requests")
      .select("id, client_id, ad_account_id, platform, external_campaign_id, external_ids, execution_status, draft_id, metadata")
      .in("status", ["completed"])
      .not("external_campaign_id", "is", null);

    if (launch_request_id) query = query.eq("id", launch_request_id);
    if (client_id) query = query.eq("client_id", client_id);

    const { data: launches, error: lErr } = await query.limit(50);
    if (lErr) throw new Error("Failed to load launch requests: " + lErr.message);
    if (!launches || launches.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No launched campaigns to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const lr of launches) {
      const result: any = { launch_request_id: lr.id, campaign_id: lr.external_campaign_id, status: "skipped", metrics: null, errors: [] };

      if (lr.platform !== "meta") {
        result.errors.push(`Platform "${lr.platform}" sync not supported`);
        results.push(result);
        continue;
      }

      // Find ad account and token
      if (!lr.ad_account_id) {
        result.errors.push("No ad account linked");
        results.push(result);
        continue;
      }

      const { data: adAccount } = await svc.from("ad_accounts").select("id, platform_account_id, connection_id").eq("id", lr.ad_account_id).single();
      if (!adAccount) { result.errors.push("Ad account not found"); results.push(result); continue; }

      const { data: conn } = await svc.from("platform_connections").select("token_reference, is_active").eq("id", adAccount.connection_id).single();
      if (!conn || !conn.is_active || !conn.token_reference) {
        result.errors.push("Platform connection inactive or missing token");
        results.push(result);
        continue;
      }

      const { data: token } = await svc.rpc("get_social_token", { _token_reference: conn.token_reference });
      if (!token) { result.errors.push("Failed to decrypt access token"); results.push(result); continue; }

      // Fetch campaign-level insights (last 7 days)
      const dateTo = new Date().toISOString().split("T")[0];
      const dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      try {
        // Campaign status
        const statusRes = await fetch(`${META_API}/${lr.external_campaign_id}?fields=name,status,effective_status,daily_budget,lifetime_budget&access_token=${token}`);
        const statusData = await statusRes.json();
        if (statusData.error) throw new Error(statusData.error.message);

        result.campaign_status = statusData.effective_status || statusData.status || "unknown";
        result.campaign_name = statusData.name;

        // Campaign insights
        const insightsRes = await fetch(
          `${META_API}/${lr.external_campaign_id}/insights?fields=spend,impressions,clicks,actions,action_values,ctr,cpc&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${token}`
        );
        const insightsData = await insightsRes.json();

        if (insightsData.data && insightsData.data.length > 0) {
          const row = insightsData.data[0];
          const leads = (row.actions || []).find((a: any) => a.action_type === "lead")?.value || 0;
          const purchases = (row.actions || []).find((a: any) => ["purchase", "omni_purchase"].includes(a.action_type))?.value || 0;
          const revenue = (row.action_values || []).find((a: any) => ["purchase", "omni_purchase"].includes(a.action_type))?.value || 0;

          result.metrics = {
            spend: parseFloat(row.spend || "0"),
            impressions: parseInt(row.impressions || "0"),
            clicks: parseInt(row.clicks || "0"),
            ctr: parseFloat(row.ctr || "0"),
            cpc: parseFloat(row.cpc || "0"),
            leads: parseInt(String(leads)),
            purchases: parseInt(String(purchases)),
            revenue: parseFloat(String(revenue)),
          };
          result.status = "synced";
        } else {
          result.metrics = { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, leads: 0, purchases: 0, revenue: 0 };
          result.status = "synced_no_data";
        }

        // Sync ad set and ad statuses from external_ids
        const extAdsets = lr.external_ids?.adsets || {};
        const extAds = lr.external_ids?.ads || {};
        result.adset_statuses = {};
        result.ad_statuses = {};

        for (const [, extId] of Object.entries(extAdsets)) {
          try {
            const asRes = await fetch(`${META_API}/${extId}?fields=name,effective_status&access_token=${token}`);
            const asData = await asRes.json();
            if (!asData.error) result.adset_statuses[String(extId)] = asData.effective_status || "unknown";
          } catch { /* non-critical */ }
        }

        for (const [, extId] of Object.entries(extAds)) {
          try {
            const adRes = await fetch(`${META_API}/${extId}?fields=name,effective_status&access_token=${token}`);
            const adData = await adRes.json();
            if (!adData.error) result.ad_statuses[String(extId)] = adData.effective_status || "unknown";
          } catch { /* non-critical */ }
        }

      } catch (e: any) {
        result.status = "sync_failed";
        result.errors.push(e.message);
      }

      // Store sync metadata on launch request
      await svc.from("launch_requests").update({
        metadata: {
          ...(lr as any).metadata,
          last_sync_at: new Date().toISOString(),
          last_sync_status: result.status,
          last_sync_metrics: result.metrics,
          campaign_status: result.campaign_status,
          adset_statuses: result.adset_statuses,
          ad_statuses: result.ad_statuses,
        },
      }).eq("id", lr.id);

      results.push(result);
    }

    const syncedCount = results.filter(r => r.status === "synced" || r.status === "synced_no_data").length;
    const failedCount = results.filter(r => r.status === "sync_failed").length;

    return new Response(JSON.stringify({
      synced: syncedCount,
      failed: failedCount,
      total: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
