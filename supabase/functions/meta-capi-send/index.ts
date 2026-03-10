import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow service-role or authenticated user
    const isServiceRole = authHeader.includes(serviceKey);
    if (!isServiceRole) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { client_id, event_name, lead_data, custom_data, test_event_code } = body;

    if (!client_id || !event_name) throw new Error("client_id and event_name required");

    // Get CAPI config for this client
    const { data: config } = await adminClient
      .from("client_capi_config")
      .select("*")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .single();

    if (!config) throw new Error("No active CAPI configuration for this client");

    // Get access token from vault
    let accessToken = "";
    if (config.access_token_ref) {
      const { data: token } = await adminClient.rpc("get_capi_token", {
        _secret_ref: config.access_token_ref,
      });
      accessToken = token || "";
    }
    if (!accessToken) throw new Error("No access token configured for CAPI");

    // Build user data with hashing
    const userData: Record<string, string> = {};
    if (lead_data?.email) userData.em = [sha256(lead_data.email)];
    if (lead_data?.phone) userData.ph = [sha256(lead_data.phone.replace(/[^0-9]/g, ""))];
    if (lead_data?.first_name) userData.fn = [sha256(lead_data.first_name)];
    if (lead_data?.last_name) userData.ln = [sha256(lead_data.last_name)];
    if (lead_data?.country) userData.country = [sha256(lead_data.country)];
    if (lead_data?.city) userData.ct = [sha256(lead_data.city)];
    if (lead_data?.external_id) userData.external_id = [lead_data.external_id];

    // Build event
    const event: Record<string, unknown> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "system",
      user_data: userData,
    };

    if (custom_data) event.custom_data = custom_data;

    const payload: Record<string, unknown> = {
      data: [event],
    };

    // Use test event code if provided
    const effectiveTestCode = test_event_code || config.test_event_code;
    if (effectiveTestCode) {
      payload.test_event_code = effectiveTestCode;
    }

    // Send to Meta CAPI
    const metaUrl = `https://graph.facebook.com/v21.0/${config.pixel_id}/events`;
    const resp = await fetch(`${metaUrl}?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error("CAPI error:", result);
      return new Response(
        JSON.stringify({ ok: false, error: result.error?.message || "CAPI request failed", details: result }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, events_received: result.events_received, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("meta-capi-send error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
