import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Adapter pattern ── */

interface AdapterInput {
  provider: any;
  input: any;
  secrets: any[];
  timeout: number;
  modelOverride: string;
}

function resolveModel(opts: AdapterInput): string {
  // Priority: input.model > route model_override > provider default_model > fallback
  return opts.input.model || opts.modelOverride || opts.provider.default_model || "google/gemini-3-flash-preview";
}

async function callLocalLLM(opts: AdapterInput): Promise<{ success: boolean; output?: any; error?: string; model_used?: string }> {
  const { provider, input, secrets, timeout } = opts;
  const baseUrl = provider.base_url;
  if (!baseUrl) return { success: false, error: "No base_url configured for local LLM provider" };

  const model = resolveModel(opts);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (provider.auth_type === "bearer" && secrets.length > 0) {
      const token = await getSecretValue(secrets[0].secret_ref);
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const body: any = {
      model,
      messages: input.messages || [{ role: "user", content: input.prompt || "" }],
    };
    if (input.tools) body.tools = input.tools;
    if (input.tool_choice) body.tool_choice = input.tool_choice;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST", headers, body: JSON.stringify(body), signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Local LLM ${res.status}: ${errText.slice(0, 300)}`, model_used: model };
    }
    return { success: true, output: await res.json(), model_used: model };
  } catch (e: any) {
    clearTimeout(timer);
    return { success: false, error: e.name === "AbortError" ? "Timeout" : e.message, model_used: model };
  }
}

async function callWorkflowWebhook(opts: AdapterInput): Promise<{ success: boolean; output?: any; error?: string; model_used?: string }> {
  const { provider, input, secrets, timeout } = opts;
  const url = provider.base_url;
  if (!url) return { success: false, error: "No webhook URL configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (provider.auth_type === "bearer" && secrets.length > 0) {
      const token = await getSecretValue(secrets[0].secret_ref);
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } else if (provider.auth_type === "api_key" && secrets.length > 0) {
      const key = await getSecretValue(secrets[0].secret_ref);
      if (key) headers["X-API-Key"] = key;
    }

    const res = await fetch(url, {
      method: "POST", headers, body: JSON.stringify(input), signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Webhook ${res.status}: ${errText.slice(0, 300)}` };
    }

    const expectsJson = provider.metadata?.expects_json_response !== false;
    if (expectsJson) {
      return { success: true, output: await res.json() };
    }
    return { success: true, output: { text: await res.text() } };
  } catch (e: any) {
    clearTimeout(timer);
    return { success: false, error: e.name === "AbortError" ? "Timeout" : e.message };
  }
}

async function callExternalApi(opts: AdapterInput): Promise<{ success: boolean; output?: any; error?: string; model_used?: string }> {
  const { provider, input, secrets, timeout } = opts;
  const baseUrl = provider.base_url;
  if (!baseUrl) return { success: false, error: "No base_url configured" };

  const isBuiltinLovable = provider.slug === "lovable-ai";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (isBuiltinLovable) {
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) return { success: false, error: "LOVABLE_API_KEY not configured" };
      headers["Authorization"] = `Bearer ${lovableApiKey}`;
    } else if (provider.auth_type === "bearer" && secrets.length > 0) {
      const token = await getSecretValue(secrets[0].secret_ref);
      if (token) headers["Authorization"] = `Bearer ${token}`;
      else return { success: false, error: "Secret reference exists but vault returned null — secret may have been deleted" };
    } else if (provider.auth_type === "api_key" && secrets.length > 0) {
      const key = await getSecretValue(secrets[0].secret_ref);
      if (key) headers["X-API-Key"] = key;
      else return { success: false, error: "Secret reference exists but vault returned null" };
    } else if (provider.auth_type !== "none" && !isBuiltinLovable) {
      return { success: false, error: "No secret configured for authenticated provider" };
    }

    const model = resolveModel(opts);
    const body: any = {
      model,
      messages: input.messages || [{ role: "user", content: input.prompt || "" }],
    };
    if (input.tools) body.tools = input.tools;
    if (input.tool_choice) body.tool_choice = input.tool_choice;

    const endpoint = provider.metadata?.endpoint_path || "/chat/completions";
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST", headers, body: JSON.stringify(body), signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `API ${res.status}: ${errText.slice(0, 300)}`, model_used: model };
    }
    return { success: true, output: await res.json(), model_used: model };
  } catch (e: any) {
    clearTimeout(timer);
    return { success: false, error: e.name === "AbortError" ? "Timeout" : e.message };
  }
}

async function callCreativeProvider(opts: AdapterInput): Promise<{ success: boolean; output?: any; error?: string; model_used?: string }> {
  return callWorkflowWebhook(opts);
}

const adapters: Record<string, (opts: AdapterInput) => Promise<{ success: boolean; output?: any; error?: string; model_used?: string }>> = {
  local_llm: callLocalLLM,
  workflow_webhook: callWorkflowWebhook,
  external_api: callExternalApi,
  creative_provider: callCreativeProvider,
};

/* ── Vault helper ── */
let _serviceClient: any = null;
function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _serviceClient;
}

async function getSecretValue(secretRef: string | null): Promise<string | null> {
  if (!secretRef) return null;
  try {
    const sc = getServiceClient();
    const { data } = await sc.rpc("get_social_token", { _token_reference: secretRef });
    return data || null;
  } catch { return null; }
}

/* ── Main serve ── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { task_type, input_payload, client_id, source_module, source_entity_type, source_entity_id, metadata } = body;
    if (!task_type) throw new Error("task_type is required");

    const sc = getServiceClient();

    // Find route
    const { data: route } = await sc.from("ai_provider_routes")
      .select("*, primary_provider:ai_providers!ai_provider_routes_primary_provider_id_fkey(*), fallback_provider:ai_providers!ai_provider_routes_fallback_provider_id_fkey(*)")
      .eq("task_type", task_type)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .single();

    if (!route) throw new Error(`No active route for task_type: ${task_type}`);

    const modelOverride = route.model_override || "";

    // Create task
    const { data: task, error: taskErr } = await sc.from("ai_tasks").insert({
      task_type,
      client_id: client_id || null,
      requested_by: user.id,
      source_module: source_module || "unknown",
      source_entity_type: source_entity_type || null,
      source_entity_id: source_entity_id || null,
      input_payload: input_payload || {},
      normalized_input: input_payload || {},
      selected_provider_id: route.primary_provider.id,
      provider_route_id: route.id,
      status: "routing",
      metadata: { model_override: modelOverride },
    }).select().single();
    if (taskErr) throw new Error("Failed to create task: " + taskErr.message);

    const logStep = async (step_type: string, message: string, level: string, provider_id?: string, meta?: any) => {
      await sc.from("ai_task_logs").insert({
        task_id: task.id, step_type, message, level, provider_id: provider_id || null, metadata: meta || {},
      });
    };

    await logStep("route_selected", `Route: ${route.task_type} → ${route.primary_provider.name}`, "info", route.primary_provider.id, { model_override: modelOverride });

    // Get secrets for primary provider
    const { data: secrets } = await sc.from("ai_provider_secrets")
      .select("secret_ref, secret_label")
      .eq("provider_id", route.primary_provider.id);

    // Update status to running
    await sc.from("ai_tasks").update({ status: "running", started_at: new Date().toISOString(), attempt_count: 1 }).eq("id", task.id);

    const adapter = adapters[route.primary_provider.provider_type] || callExternalApi;
    let result = await adapter({
      provider: route.primary_provider,
      input: input_payload || {},
      secrets: secrets || [],
      timeout: route.timeout_seconds,
      modelOverride,
    });

    if (result.model_used) {
      await logStep("model_resolved", `Model: ${result.model_used}`, "info", route.primary_provider.id);
    }

    // Fallback if primary failed
    if (!result.success && route.fallback_provider) {
      await logStep("primary_failed", `Primary failed: ${result.error}`, "warn", route.primary_provider.id);
      await sc.from("ai_tasks").update({ status: "fallback_running", attempt_count: 2, selected_provider_id: route.fallback_provider.id }).eq("id", task.id);
      await logStep("fallback_started", `Switching to fallback: ${route.fallback_provider.name}`, "info", route.fallback_provider.id);

      const { data: fbSecrets } = await sc.from("ai_provider_secrets")
        .select("secret_ref, secret_label")
        .eq("provider_id", route.fallback_provider.id);

      const fbAdapter = adapters[route.fallback_provider.provider_type] || callExternalApi;
      result = await fbAdapter({
        provider: route.fallback_provider,
        input: input_payload || {},
        secrets: fbSecrets || [],
        timeout: route.timeout_seconds,
        modelOverride: "", // Fallback uses its own default model
      });
    }

    if (result.success) {
      await sc.from("ai_tasks").update({
        status: "completed", completed_at: new Date().toISOString(), output_payload: result.output,
        metadata: { model_used: result.model_used || null },
      }).eq("id", task.id);
      await logStep("completed", `Task completed successfully${result.model_used ? ` (model: ${result.model_used})` : ''}`, "info");

      return new Response(JSON.stringify({ success: true, task_id: task.id, output: result.output, model_used: result.model_used }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await sc.from("ai_tasks").update({
        status: "failed", failed_at: new Date().toISOString(), error_message: result.error,
      }).eq("id", task.id);
      await logStep("failed", result.error || "Unknown error", "error");

      return new Response(JSON.stringify({ success: false, task_id: task.id, error: result.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("ai-router error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
