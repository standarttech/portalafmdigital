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

    const startMs = Date.now();
    let status = "unhealthy";
    let errorMsg: string | null = null;

    try {
      if (provider.slug === "lovable-ai") {
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
        const res = await fetch(`${provider.base_url}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) status = "healthy";
        else errorMsg = `HTTP ${res.status}`;
      } else if (provider.provider_type === "workflow_webhook" && provider.base_url) {
        const res = await fetch(provider.base_url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        status = res.ok || res.status === 405 ? "healthy" : "degraded";
        if (!res.ok && res.status !== 405) errorMsg = `HTTP ${res.status}`;
      } else if (provider.base_url) {
        const res = await fetch(`${provider.base_url}/models`, { method: "GET", signal: AbortSignal.timeout(10000) });
        status = res.ok ? "healthy" : "degraded";
        if (!res.ok) errorMsg = `HTTP ${res.status}`;
      } else {
        errorMsg = "No base_url configured";
      }
    } catch (e: any) {
      errorMsg = e.message || "Connection failed";
    }

    const latencyMs = Date.now() - startMs;

    await sc.from("ai_provider_health_checks").insert({
      provider_id, status, latency_ms: latencyMs, error_message: errorMsg,
    });

    return new Response(JSON.stringify({ status, latency_ms: latencyMs, error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
