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
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

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

    const matchingWebhooks = (webhooks || []).filter((w) => {
      if (!w.events || w.events.length === 0) return true;
      return w.events.includes("*") || w.events.includes(event_type);
    });

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

        let success = false;
        let statusCode = 0;
        let responseBody = "";

        if (webhook.url?.startsWith("telegram://")) {
          if (!telegramBotToken) {
            throw new Error("TELEGRAM_BOT_TOKEN not configured");
          }

          const telegramUrl = new URL(webhook.url);
          const chatId = decodeURIComponent(telegramUrl.hostname || telegramUrl.pathname.replace(/^\/+/, ""));
          if (!chatId) {
            throw new Error("Telegram destination requires chat id in format telegram://<chat_id>");
          }

          const text = formatTelegramMessage(event_type, client_id, data);
          const telegramRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true,
            }),
          });

          const telegramData = await telegramRes.json().catch(() => ({}));
          success = telegramRes.ok && Boolean(telegramData?.ok);
          statusCode = telegramRes.status;
          responseBody = JSON.stringify(telegramData).substring(0, 1000);
        } else {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(webhook.headers || {}),
          };

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
            const hexSig = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
            headers["X-Webhook-Signature"] = `sha256=${hexSig}`;
          }

          const res = await fetch(webhook.url, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(10000),
          });

          const resBody = await res.text().catch(() => "");
          success = res.ok;
          statusCode = res.status;
          responseBody = resBody.substring(0, 1000);
        }

        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          event_type,
          payload: { event: event_type, data },
          response_status: statusCode,
          response_body: responseBody,
          success,
        });

        await supabase.from("client_webhooks").update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode,
          failure_count: success ? 0 : webhook.failure_count + 1,
        }).eq("id", webhook.id);

        results[webhook.id] = { success, status: statusCode };
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";

        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          event_type,
          payload: { event: event_type, data },
          response_status: 0,
          response_body: errorMessage,
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

function formatTelegramMessage(eventType: string, clientId: string, data: Record<string, unknown>) {
  const leadName = String(data?.full_name || data?.lead_name || data?.name || "").trim();
  const phone = String(data?.phone || "").trim();
  const email = String(data?.email || "").trim();
  const source = String(data?.source || "").trim();

  return [
    `🔔 AFM Webhook Event`,
    `Event: ${eventType}`,
    `Client: ${clientId}`,
    leadName ? `Lead: ${leadName}` : "",
    phone ? `Phone: ${phone}` : "",
    email ? `Email: ${email}` : "",
    source ? `Source: ${source}` : "",
  ].filter(Boolean).join("\n");
}

