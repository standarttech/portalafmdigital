import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!telegramBotToken) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();

    // Handle Telegram webhook update
    if (body.message) {
      const chatId = String(body.message.chat.id);
      const text = body.message.text || "";

      // /start <link_code> — link Telegram account
      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const linkCode = parts[1]?.trim();

        if (!linkCode) {
          await sendTelegramMessage(telegramBotToken, chatId,
            "👋 Welcome to AFM DIGITAL Bot!\n\nTo link your account, go to your Profile → Notification Settings in the portal and click 'Link Telegram'. You'll get a unique code to use here.");
          return new Response("ok", { headers: corsHeaders });
        }

        // Find user by link code
        const { data: prefs, error } = await supabase
          .from("notification_preferences")
          .select("user_id")
          .eq("telegram_link_code", linkCode)
          .maybeSingle();

        if (error || !prefs) {
          await sendTelegramMessage(telegramBotToken, chatId,
            "❌ Invalid or expired link code. Please generate a new one in the portal.");
          return new Response("ok", { headers: corsHeaders });
        }

        // Update preferences with chat_id
        await supabase
          .from("notification_preferences")
          .update({
            telegram_chat_id: chatId,
            telegram_enabled: true,
            telegram_link_code: null, // Clear used code
          })
          .eq("user_id", prefs.user_id);

        await sendTelegramMessage(telegramBotToken, chatId,
          "✅ Your Telegram account has been linked to AFM DIGITAL!\n\nYou will now receive notifications here based on your settings.");
        return new Response("ok", { headers: corsHeaders });
      }

      // /unlink — unlink Telegram account
      if (text === "/unlink") {
        const { data } = await supabase
          .from("notification_preferences")
          .update({ telegram_chat_id: null, telegram_enabled: false })
          .eq("telegram_chat_id", chatId)
          .select("user_id")
          .maybeSingle();

        if (data) {
          await sendTelegramMessage(telegramBotToken, chatId,
            "🔓 Your Telegram account has been unlinked from AFM DIGITAL.");
        } else {
          await sendTelegramMessage(telegramBotToken, chatId,
            "ℹ️ No linked account found for this chat.");
        }
        return new Response("ok", { headers: corsHeaders });
      }

      // Default response
      await sendTelegramMessage(telegramBotToken, chatId,
        "ℹ️ AFM DIGITAL Bot\n\nCommands:\n/start <code> — Link your account\n/unlink — Unlink your account");
      return new Response("ok", { headers: corsHeaders });
    }

    // Handle manual actions (generate link code, set webhook)
    if (body.action === "generate_link_code") {
      // Verify auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const linkCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

      // Upsert notification preferences
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("notification_preferences")
          .update({ telegram_link_code: linkCode })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, telegram_link_code: linkCode });
      }

      return new Response(JSON.stringify({ link_code: linkCode }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (body.action === "set_webhook") {
      const webhookUrl = body.webhook_url;
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const result = await res.json();
      return new Response(JSON.stringify(result), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (body.action === "unlink") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      await supabase
        .from("notification_preferences")
        .update({ telegram_chat_id: null, telegram_enabled: false, telegram_link_code: null })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("telegram-bot error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
