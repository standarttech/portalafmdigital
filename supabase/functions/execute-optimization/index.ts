import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v21.0";

const SUPPORTED_LIVE_ACTIONS = ["pause_campaign", "pause_adset", "increase_budget", "decrease_budget"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Verify the user is an agency admin
    const svc = createClient(supabaseUrl, serviceRoleKey);
    const { data: agencyUser } = await svc.from("agency_users")
      .select("agency_role").eq("user_id", user.id).single();
    if (!agencyUser || agencyUser.agency_role !== "AgencyAdmin") {
      throw new Error("Only agency admins can execute optimization actions");
    }

    const { action_id } = await req.json();
    if (!action_id) throw new Error("Missing action_id");

    // Load action
    const { data: action, error: aErr } = await svc.from("optimization_actions")
      .select("*").eq("id", action_id).single();
    if (aErr || !action) throw new Error("Action not found");

    // Validate status
    if (action.status !== "approved") {
      throw new Error(`Action must be approved to execute. Current status: ${action.status}`);
    }

    // Log start
    const logStep = async (step: string, status: string, message: string, payload?: any) => {
      await svc.from("optimization_action_logs").insert({
        action_id, step, status, message, payload: payload || {}, created_by: user.id,
      });
    };

    await logStep("execution_start", "info", `Execution started by ${user.id}`);

    // Mark executing
    await svc.from("optimization_actions").update({
      status: "executing", executed_by: user.id,
    }).eq("id", action_id);

    // Check if action type is supported for live execution
    if (!SUPPORTED_LIVE_ACTIONS.includes(action.action_type)) {
      await svc.from("optimization_actions").update({
        status: "blocked", error_message: `Action type "${action.action_type}" not supported for live execution yet`,
      }).eq("id", action_id);
      await logStep("blocked", "error", `Unsupported live action type: ${action.action_type}`);
      return new Response(JSON.stringify({ success: false, status: "blocked", reason: "unsupported_action_type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve platform connection & token
    let accessToken: string | null = null;
    const launchId = action.launch_request_id;

    if (launchId) {
      const { data: lr } = await svc.from("launch_requests").select("ad_account_id, platform").eq("id", launchId).single();
      if (lr?.ad_account_id) {
        const { data: acc } = await svc.from("ad_accounts").select("connection_id").eq("id", lr.ad_account_id).single();
        if (acc?.connection_id) {
          const { data: conn } = await svc.from("platform_connections").select("token_reference, is_active").eq("id", acc.connection_id).single();
          if (conn?.is_active && conn?.token_reference) {
            const { data: tok } = await svc.rpc("get_social_token", { _token_reference: conn.token_reference });
            accessToken = tok;
          }
        }
      }
    }

    if (!accessToken) {
      await svc.from("optimization_actions").update({
        status: "failed", error_message: "Could not resolve platform access token",
      }).eq("id", action_id);
      await logStep("token_resolution", "error", "Failed to resolve access token");
      return new Response(JSON.stringify({ success: false, status: "failed", reason: "no_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute based on action type
    let result: any = {};
    let success = false;

    try {
      const input = action.input_payload || {};

      if (action.action_type === "pause_campaign") {
        if (!action.external_campaign_id) throw new Error("Missing external_campaign_id");
        const res = await fetch(`${META_API}/${action.external_campaign_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAUSED", access_token: accessToken }),
        });
        result = await res.json();
        if (result.error) throw new Error(result.error.message);
        success = true;
        await logStep("meta_api", "success", `Campaign ${action.external_campaign_id} paused`, result);

      } else if (action.action_type === "pause_adset") {
        if (!action.external_adset_id) throw new Error("Missing external_adset_id");
        const res = await fetch(`${META_API}/${action.external_adset_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAUSED", access_token: accessToken }),
        });
        result = await res.json();
        if (result.error) throw new Error(result.error.message);
        success = true;
        await logStep("meta_api", "success", `Ad set ${action.external_adset_id} paused`, result);

      } else if (action.action_type === "increase_budget" || action.action_type === "decrease_budget") {
        const targetId = action.external_campaign_id || action.external_adset_id;
        if (!targetId) throw new Error("Missing external entity ID for budget change");
        const newBudget = input.new_daily_budget;
        if (!newBudget || newBudget <= 0) throw new Error("Invalid new_daily_budget value");

        // Meta expects budget in cents
        const budgetCents = Math.round(newBudget * 100);
        const res = await fetch(`${META_API}/${targetId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ daily_budget: budgetCents, access_token: accessToken }),
        });
        result = await res.json();
        if (result.error) throw new Error(result.error.message);
        success = true;
        await logStep("meta_api", "success", `Budget updated to $${newBudget} on ${targetId}`, result);
      }

    } catch (execErr: any) {
      await svc.from("optimization_actions").update({
        status: "failed", error_message: execErr.message, result_payload: result,
        executed_at: new Date().toISOString(),
      }).eq("id", action_id);
      await logStep("execution_error", "error", execErr.message, result);
      return new Response(JSON.stringify({ success: false, status: "failed", error: execErr.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark success
    await svc.from("optimization_actions").update({
      status: "executed", result_payload: result,
      executed_at: new Date().toISOString(),
    }).eq("id", action_id);
    await logStep("execution_complete", "success", "Action executed successfully", result);

    return new Response(JSON.stringify({ success: true, status: "executed", result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
