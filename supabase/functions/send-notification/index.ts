import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  user_id?: string;
  user_ids?: string[];
  type: "alert" | "task" | "chat" | "report" | "approval" | "client_report";
  title: string;
  message: string;
  link?: string;
  // For broadcasts: override channels instead of using user prefs
  force_channels?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: NotificationPayload = await req.json();
    const { type, title, message, link, force_channels } = payload;

    const userIds: string[] = payload.user_ids || (payload.user_id ? [payload.user_id] : []);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No user_id(s) provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const channelField = `${type}_channels`;
    const results: Record<string, string[]> = {};

    for (const userId of userIds) {
      const deliveredChannels: string[] = [];

      // Fetch user preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // If force_channels provided (broadcast), use those. Otherwise use user prefs.
      let channels: string[];
      if (force_channels && force_channels.length > 0) {
        channels = force_channels;
      } else {
        const defaultChannels: Record<string, string[]> = {
          alert: ["in_app", "email"],
          task: ["in_app"],
          chat: ["in_app"],
          report: ["email"],
          approval: ["in_app", "email"],
          client_report: ["email"],
        };
        channels = prefs?.[channelField] || defaultChannels[type] || ["in_app"];
      }

      // 1. In-App notification
      if (channels.includes("in_app")) {
        const { error } = await supabase.from("notifications").insert({
          user_id: userId,
          title,
          message,
          type: type === "alert" ? "warning" : "info",
          link: link || null,
        });
        if (!error) deliveredChannels.push("in_app");
        else console.error("in_app insert error:", error);
      }

      // 2. Email
      if (channels.includes("email") && resendApiKey) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          if (userData?.user?.email) {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
              to: [userData.user.email],
              subject: `AFM DIGITAL — ${title}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0b10; color: #e2e8f0; border-radius: 16px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #d4a843; font-size: 20px; margin: 0;">AFM DIGITAL</h1>
                  </div>
                  <div style="background: #131520; border-radius: 12px; padding: 24px; border: 1px solid #1e2030;">
                    <h2 style="color: #f1f5f9; font-size: 16px; margin: 0 0 12px;">${title}</h2>
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">${message}</p>
                    ${link ? `<div style="text-align: center; margin-top: 20px;"><a href="https://portalafmdigital.lovable.app${link}" style="display: inline-block; background: #d4a843; color: #0a0b10; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open in Portal</a></div>` : ""}
                  </div>
                </div>
              `,
            });
            deliveredChannels.push("email");
          }
        } catch (e) {
          console.error("Email send error:", e);
        }
      }

      // 3. Telegram
      if (channels.includes("telegram") && prefs?.telegram_chat_id && telegramBotToken) {
        try {
          const text = `*${title}*\n${message}${link ? `\n\n[Open in Portal](https://portalafmdigital.lovable.app${link})` : ""}`;
          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: prefs.telegram_chat_id,
              text,
              parse_mode: "Markdown",
              disable_web_page_preview: true,
            }),
          });
          const resData = await res.json();
          if (res.ok) {
            deliveredChannels.push("telegram");
          } else {
            console.error("Telegram API error:", JSON.stringify(resData));
          }
        } catch (e) {
          console.error("Telegram send error:", e);
        }
      }

      // 4. Web Push
      if (channels.includes("webpush") && prefs?.webpush_enabled && prefs?.webpush_subscription) {
        console.log("Web push would be sent to user:", userId);
      }

      results[userId] = deliveredChannels;
    }

    console.log("Notification results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
