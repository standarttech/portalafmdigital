import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { provider_id } = await req.json();
    if (!provider_id) throw new Error("provider_id is required");

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: provider } = await sc.from("ai_providers").select("*").eq("id", provider_id).single();
    if (!provider) throw new Error("Provider not found");

    // Get secret
    const { data: secretRows } = await sc.from("ai_provider_secrets").select("secret_ref, secret_label").eq("provider_id", provider_id);
    let secretValue: string | null = null;
    if (secretRows && secretRows.length > 0 && secretRows[0].secret_ref) {
      const { data: decrypted } = await sc.rpc("get_social_token", { _token_reference: secretRows[0].secret_ref });
      secretValue = decrypted || null;
    }

    const startMs = Date.now();
    let status = "unhealthy";
    let errorMsg: string | null = null;
    let detail = "";

    try {
      if (provider.slug === "lovable-ai") {
        // Built-in Lovable AI — test with real call
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableKey) {
          errorMsg = "LOVABLE_API_KEY not configured";
        } else {
          const res = await fetch(`${provider.base_url}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            status = "healthy";
            detail = "Authenticated and responded";
          } else if (res.status === 401 || res.status === 403) {
            errorMsg = `Authentication failed (HTTP ${res.status})`;
            detail = "reachable but auth failed";
          } else {
            errorMsg = `HTTP ${res.status}`;
            status = "degraded";
            detail = "reachable but returned error";
          }
          // Consume body
          await res.text();
        }
      } else if (provider.provider_type === "workflow_webhook" && provider.base_url) {
        // Webhook — just check reachability
        const headers: Record<string, string> = {};
        if (provider.auth_type === "bearer" && secretValue) {
          headers["Authorization"] = `Bearer ${secretValue}`;
        } else if (provider.auth_type === "api_key" && secretValue) {
          headers["X-API-Key"] = secretValue;
        }
        const res = await fetch(provider.base_url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ test: true }), signal: AbortSignal.timeout(10000) });
        const bodyText = await res.text();
        if (res.ok || res.status === 405 || res.status === 200) {
          status = "healthy";
          detail = "Endpoint reachable";
        } else if (res.status === 401 || res.status === 403) {
          errorMsg = `Authentication failed (HTTP ${res.status})`;
          detail = "reachable but auth failed";
        } else {
          status = "degraded";
          errorMsg = `HTTP ${res.status}: ${bodyText.slice(0, 200)}`;
        }
      } else if (provider.base_url) {
        // External API — do a real authenticated /chat/completions test
        const needsAuth = provider.auth_type !== "none";
        if (needsAuth && !secretValue) {
          errorMsg = "Secret not configured — cannot authenticate";
          detail = "secret_missing";
        } else {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (provider.auth_type === "bearer" && secretValue) {
            headers["Authorization"] = `Bearer ${secretValue}`;
          } else if (provider.auth_type === "api_key" && secretValue) {
            headers["X-API-Key"] = secretValue;
          }

          const model = provider.default_model || "google/gemini-2.5-flash-lite";
          const endpoint = provider.metadata?.endpoint_path || "/chat/completions";

          const res = await fetch(`${provider.base_url}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout(15000),
          });
          const bodyText = await res.text();

          if (res.ok) {
            // Verify we got a valid response
            try {
              const json = JSON.parse(bodyText);
              if (json.choices || json.id || json.output) {
                status = "healthy";
                detail = "Authenticated and model responded";
              } else {
                status = "degraded";
                detail = "Response OK but unexpected format";
                errorMsg = "Response missing choices/id field";
              }
            } catch {
              status = "degraded";
              detail = "Response OK but not JSON";
              errorMsg = "Non-JSON response from API";
            }
          } else if (res.status === 401 || res.status === 403) {
            errorMsg = `Authentication failed (HTTP ${res.status}): ${bodyText.slice(0, 200)}`;
            detail = "reachable but unauthorized";
          } else if (res.status === 404) {
            errorMsg = `Model or endpoint not found (HTTP 404): ${bodyText.slice(0, 200)}`;
            detail = "reachable but endpoint/model missing";
            status = "degraded";
          } else if (res.status === 429) {
            // Rate limited means auth worked
            status = "healthy";
            detail = "Authenticated (rate limited)";
          } else {
            errorMsg = `HTTP ${res.status}: ${bodyText.slice(0, 200)}`;
            status = "degraded";
          }
        }
      } else {
        errorMsg = "No base_url configured";
      }
    } catch (e: any) {
      errorMsg = e.name === "AbortError" ? "Connection timeout" : (e.message || "Connection failed");
    }

    const latencyMs = Date.now() - startMs;

    // Save health check
    await sc.from("ai_provider_health_checks").insert({
      provider_id, status, latency_ms: latencyMs, error_message: errorMsg,
      metadata: { detail },
    });

    // Update provider last_test fields
    await sc.from("ai_providers").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: status,
      last_test_error: errorMsg || '',
    }).eq("id", provider_id);

    return new Response(JSON.stringify({ status, latency_ms: latencyMs, error: errorMsg, detail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
