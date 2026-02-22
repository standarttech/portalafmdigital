import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WebhookPayload {
  client_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: WebhookPayload = await req.json();
    const { client_id, event_type, data } = payload;

    if (!client_id || !event_type) {
      return new Response(JSON.stringify({ error: "client_id and event_type required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch active webhooks for this client that listen to this event
    const { data: webhooks, error: fetchErr } = await supabase
      .from("client_webhooks")
      .select("*")
      .eq("client_id", client_id)
      .eq("is_active", true);

    if (fetchErr) {
      console.error("Error fetching webhooks:", fetchErr);
      return new Response(JSON.stringify({ error: "Failed to fetch webhooks" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Filter webhooks that subscribe to this event (or have '*' / empty events meaning all)
    const matchingWebhooks = (webhooks || []).filter(w => {
      if (!w.events || w.events.length === 0) return true;
      return w.events.includes("*") || w.events.includes(event_type);
    });

    console.log(`Found ${matchingWebhooks.length} matching webhooks for client ${client_id}, event: ${event_type}`);

    const results: Record<string, { success: boolean; status?: number }> = {};

    for (const webhook of matchingWebhooks) {
      try {
        const body = JSON.stringify({
          event: event_type,
          timestamp: new Date().toISOString(),
          client_id,
          data,
          webhook_id: webhook.id,
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(webhook.headers || {}),
        };

        // Add HMAC signature if secret is set
        if (webhook.secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhook.secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
          const hexSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
          headers["X-Webhook-Signature"] = `sha256=${hexSig}`;
        }

        const res = await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        const resBody = await res.text().catch(() => "");
        const success = res.ok;

        // Log delivery
        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          event_type,
          payload: { event: event_type, data },
          response_status: res.status,
          response_body: resBody.substring(0, 1000),
          success,
        });

        // Update webhook status
        await supabase.from("client_webhooks").update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: res.status,
          failure_count: success ? 0 : webhook.failure_count + 1,
        }).eq("id", webhook.id);

        results[webhook.id] = { success, status: res.status };
        console.log(`Webhook ${webhook.id} (${webhook.name}): ${success ? "OK" : "FAIL"} (${res.status})`);
      } catch (e) {
        console.error(`Webhook ${webhook.id} error:`, e);
        
        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          event_type,
          payload: { event: event_type, data },
          response_status: 0,
          response_body: e instanceof Error ? e.message : "Unknown error",
          success: false,
        });

        await supabase.from("client_webhooks").update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: 0,
          failure_count: webhook.failure_count + 1,
        }).eq("id", webhook.id);

        results[webhook.id] = { success: false, status: 0 };
      }
    }

    return new Response(JSON.stringify({ success: true, triggered: matchingWebhooks.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("trigger-webhooks error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
