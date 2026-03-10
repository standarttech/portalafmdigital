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
  force_channels?: string[];
  bot_profile_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    let isAuthorized = false;

    // Internal service call
    if (token === supabaseServiceKey) {
      isAuthorized = true;
    } else if (token) {
      // Validate user JWT using getUser (works reliably in edge functions)
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user?.id) {
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: agencyUser } = await serviceClient
          .from("agency_users")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (agencyUser) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      console.error("Unauthorized: no valid token or agency membership");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: NotificationPayload = await req.json();
    const { type, title, message, link, force_channels, bot_profile_id } = payload;

    // Resolve bot token: use bot_profile_id if provided, else fallback to env
    let resolvedTelegramToken = telegramBotToken;
    if (bot_profile_id) {
      try {
        const { data: botProfile } = await supabase
          .from("crm_bot_profiles")
          .select("bot_token_ref")
          .eq("id", bot_profile_id)
          .single();
        if (botProfile?.bot_token_ref) {
          const { data: decryptedToken } = await supabase.rpc("get_social_token", {
            _token_reference: botProfile.bot_token_ref,
          });
          if (decryptedToken) resolvedTelegramToken = decryptedToken;
        }
      } catch (e) {
        console.warn("Failed to resolve bot_profile_id, using default token:", e);
      }
    }

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
          alert: ["in_app", "email", "telegram"],
          task: ["in_app"],
          chat: ["in_app"],
          report: ["email"],
          approval: ["in_app", "email", "telegram"],
          client_report: ["email"],
        };
        // Use the type-specific channels from prefs, falling back to defaults
        const prefsChannels = prefs ? (prefs as any)[channelField] : undefined;
        channels = prefsChannels || defaultChannels[type] || ["in_app"];
      }

      console.log(`Processing user ${userId}, type: ${type}, channels: ${JSON.stringify(channels)}`);

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
          const email = userData?.user?.email;
          if (email) {
            console.log(`Sending email to ${email} for notification: ${title}`);
            const resend = new Resend(resendApiKey);
            const { data: emailResult, error: emailError } = await resend.emails.send({
              from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
              to: [email],
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
            if (emailError) {
              console.error("Resend API error:", JSON.stringify(emailError));
            } else {
              console.log("Email sent successfully:", emailResult?.id);
              deliveredChannels.push("email");
            }
          } else {
            console.warn(`No email found for user ${userId}`);
          }
        } catch (e) {
          console.error("Email send error:", e);
        }
      } else if (channels.includes("email") && !resendApiKey) {
        console.warn("Email channel requested but RESEND_API_KEY not configured");
      }

      // 3. Telegram
      if (channels.includes("telegram")) {
        const tokenToUse = resolvedTelegramToken;
        if (!tokenToUse) {
          console.warn("Telegram channel requested but no bot token available");
        } else if (!prefs?.telegram_chat_id) {
          console.warn(`Telegram channel requested but no telegram_chat_id for user ${userId}`);
        } else {
          try {
            const text = `*${title}*\n${message}${link ? `\n\n[Open in Portal](https://portalafmdigital.lovable.app${link})` : ""}`;
            console.log(`Sending Telegram to chat_id: ${prefs.telegram_chat_id}`);
            const res = await fetch(`https://api.telegram.org/bot${tokenToUse}/sendMessage`, {
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
            if (res.ok && resData.ok) {
              console.log("Telegram sent successfully");
              deliveredChannels.push("telegram");
            } else {
              console.error("Telegram API error:", JSON.stringify(resData));
            }
          } catch (e) {
            console.error("Telegram send error:", e);
          }
        }
      }

      // 4. Web Push
      if (channels.includes("webpush") && prefs?.webpush_enabled && prefs?.webpush_subscription) {
        try {
          console.log(`Sending web push to user ${userId}`);
          const wpRes = await fetch(`${supabaseUrl}/functions/v1/send-webpush`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              subscription: prefs.webpush_subscription,
              title,
              message,
              link,
              tag: type,
            }),
          });
          const wpData = await wpRes.json();
          if (wpData.success) {
            deliveredChannels.push("webpush");
            if (wpData.expired) {
              // Clean up expired subscription
              await supabase
                .from("notification_preferences")
                .update({ webpush_enabled: false, webpush_subscription: null })
                .eq("user_id", userId);
              console.warn(`Cleaned up expired webpush subscription for user ${userId}`);
            }
          } else {
            console.error("Web push delivery failed:", JSON.stringify(wpData));
          }
        } catch (e) {
          console.error("Web push error:", e);
        }
      }

      results[userId] = deliveredChannels;
    }

    console.log("Notification delivery results:", JSON.stringify(results));

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
