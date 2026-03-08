import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Campaign Execute — Guarded execution for approved launch requests.
 * Meta-first approach: maps normalized payload to Meta Marketing API calls.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Auth with user context
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service client for writes
    const svc = createClient(supabaseUrl, serviceRoleKey);

    const { launch_request_id } = await req.json();
    if (!launch_request_id) throw new Error("launch_request_id is required");

    // ── Load launch request ──
    const { data: lr, error: lrErr } = await svc
      .from("launch_requests")
      .select("*")
      .eq("id", launch_request_id)
      .single();
    if (lrErr || !lr) throw new Error("Launch request not found");
    if (lr.status !== "approved") throw new Error(`Cannot execute: status is "${lr.status}", must be "approved"`);

    // Check admin role
    const { data: agencyUser } = await svc
      .from("agency_users")
      .select("agency_role")
      .eq("user_id", user.id)
      .single();
    if (!agencyUser || agencyUser.agency_role !== "AgencyAdmin") {
      throw new Error("Only admins can execute campaigns");
    }

    // Helper to log steps
    const logStep = async (step: string, entityLevel: string, status: string, message: string, extra?: any) => {
      await svc.from("launch_execution_logs").insert({
        launch_request_id,
        step,
        entity_level: entityLevel,
        status,
        message,
        executed_by: user.id,
        payload_snapshot: extra?.payload || {},
        external_entity_id: extra?.externalId || null,
        error_detail: extra?.error || null,
        response_data: extra?.response || {},
      });
    };

    // ── Update status to executing ──
    await svc.from("launch_requests").update({
      status: "executing",
      execution_status: "execution_started",
      executed_by: user.id,
    }).eq("id", launch_request_id);

    await logStep("execution_start", "campaign", "started", "Execution initiated by admin");

    // ── Load draft + items ──
    const { data: draft } = await svc.from("campaign_drafts").select("*").eq("id", lr.draft_id).single();
    if (!draft) {
      await logStep("load_draft", "campaign", "failed", "Draft not found");
      await svc.from("launch_requests").update({ status: "failed", execution_status: "execution_failed", error_message: "Draft not found" }).eq("id", launch_request_id);
      throw new Error("Draft not found");
    }

    const { data: items } = await svc.from("campaign_draft_items").select("*").eq("draft_id", draft.id).order("sort_order");

    // ── PREFLIGHT ──
    const errors: string[] = [];
    if (!draft.client_id) errors.push("Missing client_id");
    if (!draft.ad_account_id) errors.push("Missing ad_account_id");
    if (!draft.objective) errors.push("Missing objective");
    if (draft.validation_status === "invalid") errors.push("Draft validation status is invalid");

    const adsets = (items || []).filter((i: any) => i.item_type === "adset");
    const ads = (items || []).filter((i: any) => i.item_type === "ad");

    if (adsets.length === 0) errors.push("No ad sets configured");
    for (const as of adsets) {
      if (!as.config?.geo) errors.push(`Ad Set "${as.name}": missing geo targeting`);
    }
    for (const ad of ads) {
      if (!ad.config?.primary_text) errors.push(`Ad "${ad.name}": missing primary text`);
      if (!ad.config?.headline) errors.push(`Ad "${ad.name}": missing headline`);
      if (!ad.config?.destination_url) errors.push(`Ad "${ad.name}": missing destination URL`);
      if (!ad.parent_item_id) errors.push(`Ad "${ad.name}": not linked to an ad set`);
    }

    // Check platform connection exists
    const { data: adAccount } = await svc.from("ad_accounts").select("id, connection_id, platform_account_id").eq("id", draft.ad_account_id).single();
    if (!adAccount) errors.push("Ad account not found");

    let tokenRef: string | null = null;
    if (adAccount) {
      const { data: conn } = await svc.from("platform_connections").select("id, token_reference, is_active").eq("id", adAccount.connection_id).single();
      if (!conn) errors.push("Platform connection not found for ad account");
      else if (!conn.is_active) errors.push("Platform connection is inactive");
      else if (!conn.token_reference) errors.push("Platform connection has no token configured");
      else tokenRef = conn.token_reference;
    }

    if (errors.length > 0) {
      const msg = `Preflight failed: ${errors.join("; ")}`;
      await logStep("preflight", "campaign", "failed", msg);
      await svc.from("launch_requests").update({
        status: "failed",
        execution_status: "execution_blocked",
        error_message: msg,
      }).eq("id", launch_request_id);
      await svc.from("campaign_drafts").update({ status: "execution_failed" }).eq("id", draft.id);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logStep("preflight", "campaign", "passed", "All preflight checks passed");
    await svc.from("launch_requests").update({ execution_status: "preflight_passed" }).eq("id", launch_request_id);

    // ── EXECUTION: Meta-first ──
    if (draft.platform !== "meta") {
      const msg = `Platform "${draft.platform}" execution is not yet supported. Only Meta is available.`;
      await logStep("platform_check", "campaign", "blocked", msg);
      await svc.from("launch_requests").update({
        status: "failed", execution_status: "execution_blocked", error_message: msg,
      }).eq("id", launch_request_id);
      await svc.from("campaign_drafts").update({ status: "execution_failed" }).eq("id", draft.id);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt token
    let accessToken: string | null = null;
    if (tokenRef) {
      const { data: decrypted } = await svc.rpc("get_social_token", { _token_reference: tokenRef });
      accessToken = decrypted;
    }
    if (!accessToken) {
      const msg = "Failed to decrypt platform access token";
      await logStep("token_decrypt", "campaign", "failed", msg);
      await svc.from("launch_requests").update({ status: "failed", execution_status: "execution_failed", error_message: msg }).eq("id", launch_request_id);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logStep("token_decrypt", "campaign", "passed", "Access token decrypted successfully");

    const metaAccountId = adAccount!.platform_account_id;
    const externalIds: Record<string, any> = { campaign: null, adsets: {}, ads: {} };
    const metaApi = "https://graph.facebook.com/v21.0";

    // Map objective
    const objectiveMap: Record<string, string> = {
      leads: "OUTCOME_LEADS", sales: "OUTCOME_SALES", traffic: "OUTCOME_TRAFFIC",
      engagement: "OUTCOME_ENGAGEMENT", awareness: "OUTCOME_AWARENESS",
    };

    // ── Step 1: Create Campaign ──
    const campaignPayload = {
      name: draft.campaign_name || draft.name,
      objective: objectiveMap[draft.objective] || "OUTCOME_LEADS",
      buying_type: (draft.buying_type || "auction").toUpperCase(),
      status: "PAUSED",
      special_ad_categories: "[]",
    };

    await logStep("create_campaign", "campaign", "started", `Creating campaign: ${campaignPayload.name}`, { payload: campaignPayload });

    const campaignParams = new URLSearchParams();
    for (const [k, v] of Object.entries(campaignPayload)) campaignParams.append(k, String(v));
    campaignParams.append("access_token", accessToken);

    const campRes = await fetch(`${metaApi}/act_${metaAccountId}/campaigns`, {
      method: "POST", body: campaignParams,
    });
    const campData = await campRes.json();

    if (campData.error) {
      const msg = `Meta API error creating campaign: ${campData.error.message || JSON.stringify(campData.error)}`;
      await logStep("create_campaign", "campaign", "failed", msg, { response: campData, error: campData.error.message });
      await svc.from("launch_requests").update({
        status: "failed", execution_status: "execution_failed", error_message: msg,
      }).eq("id", launch_request_id);
      await svc.from("campaign_drafts").update({ status: "execution_failed" }).eq("id", draft.id);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    externalIds.campaign = campData.id;
    await logStep("create_campaign", "campaign", "completed", `Campaign created: ${campData.id}`, { externalId: campData.id, response: { id: campData.id } });

    // ── Step 2: Create Ad Sets ──
    let adsetsFailed = false;
    for (const as of adsets) {
      const cfg = as.config || {};
      const adsetPayload: Record<string, string> = {
        name: as.name,
        campaign_id: campData.id,
        billing_event: "IMPRESSIONS",
        optimization_goal: (cfg.optimization_goal || "LEAD_GENERATION").toUpperCase(),
        targeting: JSON.stringify({
          geo_locations: cfg.geo ? { countries: cfg.geo.split(",").map((g: string) => g.trim().toUpperCase()) } : {},
          age_min: String(cfg.age_min || 18),
          age_max: String(cfg.age_max || 65),
          ...(cfg.gender && cfg.gender !== "all" ? { genders: cfg.gender === "male" ? [1] : [2] } : {}),
        }),
        status: "PAUSED",
        access_token: accessToken!,
      };

      if (cfg.daily_budget && cfg.daily_budget > 0) {
        adsetPayload.daily_budget = String(Math.round(cfg.daily_budget * 100));
      } else if (draft.total_budget > 0) {
        adsetPayload.daily_budget = String(Math.round((draft.total_budget / Math.max(adsets.length, 1)) * 100));
      } else {
        adsetPayload.daily_budget = "1000"; // $10 minimum fallback
      }

      await logStep("create_adset", "adset", "started", `Creating ad set: ${as.name}`, { payload: { ...adsetPayload, access_token: "[REDACTED]" } });

      const asParams = new URLSearchParams();
      for (const [k, v] of Object.entries(adsetPayload)) asParams.append(k, String(v));

      const asRes = await fetch(`${metaApi}/act_${metaAccountId}/adsets`, { method: "POST", body: asParams });
      const asData = await asRes.json();

      if (asData.error) {
        const msg = `Meta API error creating ad set "${as.name}": ${asData.error.message || JSON.stringify(asData.error)}`;
        await logStep("create_adset", "adset", "failed", msg, { error: asData.error.message, response: asData });
        adsetsFailed = true;
        continue;
      }

      externalIds.adsets[as.id] = asData.id;
      await logStep("create_adset", "adset", "completed", `Ad set created: ${asData.id}`, { externalId: asData.id });

      // ── Step 3: Create Ads for this ad set ──
      const adsInSet = ads.filter((a: any) => a.parent_item_id === as.id);
      for (const ad of adsInSet) {
        const adCfg = ad.config || {};

        // Note: Full ad creation requires creative object first.
        // For now, we create ad creative inline with basic fields.
        const creativePayload = {
          name: `${ad.name} Creative`,
          object_story_spec: JSON.stringify({
            link_data: {
              message: adCfg.primary_text || "",
              name: adCfg.headline || "",
              link: adCfg.destination_url || "https://example.com",
              call_to_action: { type: adCfg.cta || "LEARN_MORE" },
            },
            // page_id is required but we don't have it yet
          }),
          access_token: accessToken!,
        };

        // Without a page_id, Meta won't accept ad creation.
        // Log this honestly and skip.
        if (!adCfg.page_id) {
          await logStep("create_ad", "ad", "blocked",
            `Ad "${ad.name}": Skipped — Facebook Page ID is required for ad creation. Add page_id to ad config.`,
            { error: "missing_page_id" });
          continue;
        }

        await logStep("create_ad", "ad", "started", `Creating ad: ${ad.name}`);

        // Create creative
        const crParams = new URLSearchParams();
        crParams.append("name", `${ad.name} Creative`);
        crParams.append("object_story_spec", JSON.stringify({
          page_id: adCfg.page_id,
          link_data: {
            message: adCfg.primary_text || "",
            name: adCfg.headline || "",
            link: adCfg.destination_url || "",
            call_to_action: { type: adCfg.cta || "LEARN_MORE" },
          },
        }));
        crParams.append("access_token", accessToken!);

        const crRes = await fetch(`${metaApi}/act_${metaAccountId}/adcreatives`, { method: "POST", body: crParams });
        const crData = await crRes.json();

        if (crData.error) {
          await logStep("create_ad_creative", "ad", "failed",
            `Failed to create creative for "${ad.name}": ${crData.error.message}`,
            { error: crData.error.message });
          continue;
        }

        // Create ad
        const adParams = new URLSearchParams();
        adParams.append("name", ad.name);
        adParams.append("adset_id", asData.id);
        adParams.append("creative", JSON.stringify({ creative_id: crData.id }));
        adParams.append("status", "PAUSED");
        adParams.append("access_token", accessToken!);

        const adRes = await fetch(`${metaApi}/act_${metaAccountId}/ads`, { method: "POST", body: adParams });
        const adData = await adRes.json();

        if (adData.error) {
          await logStep("create_ad", "ad", "failed",
            `Failed to create ad "${ad.name}": ${adData.error.message}`,
            { error: adData.error.message });
          continue;
        }

        externalIds.ads[ad.id] = adData.id;
        await logStep("create_ad", "ad", "completed", `Ad created: ${adData.id}`, { externalId: adData.id });
      }
    }

    // ── Determine final status ──
    const hasExternalCampaign = !!externalIds.campaign;
    const adsetCount = Object.keys(externalIds.adsets).length;
    const adCount = Object.keys(externalIds.ads).length;
    const totalAds = ads.length;

    let finalExecStatus = "execution_completed";
    let finalLrStatus = "completed";
    let finalDraftStatus = "executed";

    if (!hasExternalCampaign) {
      finalExecStatus = "execution_failed";
      finalLrStatus = "failed";
      finalDraftStatus = "execution_failed";
    } else if (adsetsFailed || adsetCount < adsets.length || adCount < totalAds) {
      finalExecStatus = "execution_partial";
      finalLrStatus = "completed"; // partial is still "completed" with notes
      finalDraftStatus = "executed";
    }

    await svc.from("launch_requests").update({
      status: finalLrStatus,
      execution_status: finalExecStatus,
      external_campaign_id: externalIds.campaign,
      external_ids: externalIds,
      executed_at: new Date().toISOString(),
    }).eq("id", launch_request_id);

    await svc.from("campaign_drafts").update({ status: finalDraftStatus }).eq("id", draft.id);

    const summary = `Execution ${finalExecStatus}: campaign=${externalIds.campaign || "none"}, adsets=${adsetCount}/${adsets.length}, ads=${adCount}/${totalAds}`;
    await logStep("execution_complete", "campaign", finalExecStatus === "execution_completed" ? "completed" : "partial", summary, { response: externalIds });

    return new Response(JSON.stringify({
      success: true,
      execution_status: finalExecStatus,
      external_ids: externalIds,
      summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
