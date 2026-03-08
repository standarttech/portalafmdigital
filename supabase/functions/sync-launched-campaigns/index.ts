import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Support both user-auth and cron/service calls
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");
    let isServiceCall = false;

    if (cronSecret) {
      // Scheduled cron call — validate service role key as cron secret
      if (cronSecret !== serviceRoleKey) throw new Error("Invalid cron secret");
      isServiceCall = true;
    } else if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) throw new Error("Unauthorized");
    } else {
      // Also accept service role in Authorization for pg_net calls
      throw new Error("Missing authorization");
    }

    const svc = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const { launch_request_id, client_id } = body;

    let query = svc.from("launch_requests")
      .select("id, client_id, ad_account_id, platform, external_campaign_id, external_ids, execution_status, draft_id, metadata, executed_at")
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
    const now = new Date().toISOString();

    for (const lr of launches) {
      const result: any = { launch_request_id: lr.id, campaign_id: lr.external_campaign_id, status: "skipped", metrics: null, errors: [] };

      if (lr.platform !== "meta") {
        result.errors.push(`Platform "${lr.platform}" sync not supported`);
        results.push(result);
        continue;
      }

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

        // Write to campaign_performance_snapshots
        await svc.from("campaign_performance_snapshots").insert({
          client_id: lr.client_id,
          launch_request_id: lr.id,
          platform: lr.platform,
          entity_level: "campaign",
          external_campaign_id: lr.external_campaign_id,
          entity_name: result.campaign_name,
          entity_status: result.campaign_status,
          spend: result.metrics.spend,
          impressions: result.metrics.impressions,
          clicks: result.metrics.clicks,
          ctr: result.metrics.ctr,
          cpc: result.metrics.cpc,
          leads: result.metrics.leads,
          purchases: result.metrics.purchases,
          revenue: result.metrics.revenue,
          date_window_start: dateFrom,
          date_window_end: dateTo,
          synced_at: now,
        });

        // Sync ad set and ad statuses
        const extAdsets = lr.external_ids?.adsets || {};
        const extAds = lr.external_ids?.ads || {};
        result.adset_statuses = {};
        result.ad_statuses = {};

        for (const [localId, extId] of Object.entries(extAdsets)) {
          try {
            const asRes = await fetch(`${META_API}/${extId}?fields=name,effective_status&access_token=${token}`);
            const asData = await asRes.json();
            if (!asData.error) {
              result.adset_statuses[String(extId)] = asData.effective_status || "unknown";
              // Write adset snapshot
              await svc.from("campaign_performance_snapshots").insert({
                client_id: lr.client_id,
                launch_request_id: lr.id,
                platform: lr.platform,
                entity_level: "adset",
                external_campaign_id: lr.external_campaign_id,
                external_adset_id: String(extId),
                entity_name: asData.name || localId,
                entity_status: asData.effective_status || "unknown",
                date_window_start: dateFrom,
                date_window_end: dateTo,
                synced_at: now,
              });
            }
          } catch { /* non-critical */ }
        }

        for (const [localId, extId] of Object.entries(extAds)) {
          try {
            const adRes = await fetch(`${META_API}/${extId}?fields=name,effective_status&access_token=${token}`);
            const adData = await adRes.json();
            if (!adData.error) {
              result.ad_statuses[String(extId)] = adData.effective_status || "unknown";
              await svc.from("campaign_performance_snapshots").insert({
                client_id: lr.client_id,
                launch_request_id: lr.id,
                platform: lr.platform,
                entity_level: "ad",
                external_campaign_id: lr.external_campaign_id,
                external_ad_id: String(extId),
                entity_name: adData.name || localId,
                entity_status: adData.effective_status || "unknown",
                date_window_start: dateFrom,
                date_window_end: dateTo,
                synced_at: now,
              });
            }
          } catch { /* non-critical */ }
        }

        // ── Smart proposal engine: preset-driven recommendations ──
        const m = result.metrics;
        const executedAt = lr.executed_at ? new Date(lr.executed_at).getTime() : 0;
        const hoursSinceLaunch = executedAt ? (Date.now() - executedAt) / 3600000 : 0;

        // Load active presets
        const { data: presets } = await svc.from("optimization_presets")
          .select("*").eq("is_active", true);

        // Check for existing non-dismissed proposals for this launch to avoid duplicates
        const { data: existingRecs } = await svc.from("ai_recommendations")
          .select("id, recommendation_type, status")
          .eq("client_id", lr.client_id)
          .in("status", ["new", "reviewed"])
          .filter("metadata->>launch_request_id", "eq", lr.id);
        const existingTypes = new Set((existingRecs || []).map((r: any) => r.recommendation_type));

        // Also check existing optimization actions to avoid re-proposing actioned items
        const { data: existingActions } = await svc.from("optimization_actions")
          .select("action_type, status")
          .eq("client_id", lr.client_id)
          .in("status", ["proposed", "approved", "executing"])
          .filter("external_campaign_id", "eq", lr.external_campaign_id || "");
        const activeActionTypes = new Set((existingActions || []).map((a: any) => a.action_type));

        const recsToInsert: any[] = [];

        const addRec = (type: string, title: string, desc: string, priority: string, evidence: any) => {
          if (existingTypes.has(type)) return; // dedup
          // Don't propose if there's already an active optimization action for similar type
          const actionMap: Record<string, string[]> = {
            no_delivery_check: ["relaunch_with_changes"],
            pause_loser: ["pause_campaign", "pause_adset"],
            increase_budget: ["increase_budget"],
            fix_creative_issue: ["mark_for_review"],
            investigate_rejection: ["mark_for_review"],
            relaunch_with_changes: ["relaunch_with_changes"],
            duplicate_winner: ["duplicate_winner"],
          };
          if ((actionMap[type] || []).some(at => activeActionTypes.has(at))) return;
          existingTypes.add(type); // prevent intra-cycle dups
          recsToInsert.push({
            client_id: lr.client_id,
            title, description: desc,
            recommendation_type: type,
            priority, status: "new",
            metadata: {
              source: "auto_sync",
              launch_request_id: lr.id,
              external_campaign_id: lr.external_campaign_id,
              evidence,
              generated_by_preset: true,
            },
          });
        };

        for (const preset of (presets || [])) {
          const cond = preset.rule_condition || {};

          if (cond.type === "no_delivery" && m.impressions === 0 && m.spend === 0 && hoursSinceLaunch > (cond.threshold_hours || 24)) {
            addRec("no_delivery_check", "Investigate zero delivery",
              `Campaign ${lr.external_campaign_id} has 0 impressions after ${Math.round(hoursSinceLaunch)}h. Preset: "${preset.name}"`,
              preset.proposed_priority || "high",
              { hours_since_launch: Math.round(hoursSinceLaunch), preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "spend_no_results" && m.spend > (cond.spend_threshold || 50) && m.leads === 0 && m.purchases === 0) {
            addRec("pause_loser", "Consider pausing underperformer",
              `$${m.spend.toFixed(2)} spent with zero conversions. Preset: "${preset.name}"`,
              preset.proposed_priority || "high",
              { spend: m.spend, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "low_ctr" && m.impressions > (cond.min_impressions || 500) && m.ctr < (cond.ctr_threshold || 0.5)) {
            addRec("fix_creative_issue", "Fix creative or targeting",
              `Low CTR (${m.ctr.toFixed(2)}%) with ${m.impressions} impressions. Preset: "${preset.name}"`,
              preset.proposed_priority || "medium",
              { ctr: m.ctr, impressions: m.impressions, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "winner_detected" && m.ctr > (cond.ctr_threshold || 1.5) && m.leads >= (cond.min_leads || 3) && m.spend > 5) {
            addRec("increase_budget", "Scale winning campaign",
              `Strong CTR (${m.ctr.toFixed(1)}%) and ${m.leads} leads. Preset: "${preset.name}"`,
              preset.proposed_priority || "medium",
              { ctr: m.ctr, leads: m.leads, spend: m.spend, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "platform_rejection" && result.campaign_status && ["DISAPPROVED", "WITH_ISSUES"].includes(result.campaign_status)) {
            addRec("investigate_rejection", "Investigate platform rejection",
              `Campaign reported as ${result.campaign_status} by Meta. Preset: "${preset.name}"`,
              preset.proposed_priority || "high",
              { campaign_status: result.campaign_status, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "partial_execution" && lr.execution_status === "execution_partial") {
            addRec("relaunch_with_changes", "Relaunch with fixes",
              `Partial execution — some entities failed. Preset: "${preset.name}"`,
              preset.proposed_priority || "high",
              { execution_status: lr.execution_status, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "strong_winner" && m.ctr > (cond.ctr_threshold || 2.0) && m.leads >= (cond.min_leads || 5)) {
            addRec("duplicate_winner", "Duplicate winning campaign",
              `Exceptional performance: ${m.ctr.toFixed(1)}% CTR, ${m.leads} leads. Preset: "${preset.name}"`,
              preset.proposed_priority || "medium",
              { ctr: m.ctr, leads: m.leads, preset_id: preset.id, preset_name: preset.name });
          }

          if (cond.type === "high_cpc" && m.cpc > (cond.cpc_threshold || 10) && m.clicks >= (cond.min_clicks || 5)) {
            addRec("high_cpc_alert", "High CPC alert",
              `CPC is $${m.cpc.toFixed(2)} with ${m.clicks} clicks. Preset: "${preset.name}"`,
              preset.proposed_priority || "medium",
              { cpc: m.cpc, clicks: m.clicks, preset_id: preset.id, preset_name: preset.name });
          }
        }

        // Batch insert all new recs
        if (recsToInsert.length > 0) {
          await svc.from("ai_recommendations").insert(recsToInsert);
        }

      } catch (e: any) {
        result.status = "sync_failed";
        result.errors.push(e.message);
      }

      // Update launch_requests.metadata summary
      await svc.from("launch_requests").update({
        metadata: {
          ...(lr as any).metadata,
          last_sync_at: now,
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
