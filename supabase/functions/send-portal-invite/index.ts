import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const svc = createClient(supabaseUrl, serviceKey);
    const { data: au } = await svc.from("agency_users").select("agency_role").eq("user_id", user.id).maybeSingle();
    if (au?.agency_role !== "AgencyAdmin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { invite_id, email, client_id, full_name, token, portal_url } = body;

    if (!invite_id || !email || !token) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    // Get client name
    const { data: client } = await svc.from("clients").select("name").eq("id", client_id).maybeSingle();
    const clientName = client?.name || "your team";

    // Get branding
    const { data: branding } = await svc.from("client_portal_branding").select("*").eq("client_id", client_id).maybeSingle();
    const portalTitle = branding?.portal_title || "Performance Portal";
    const accentColor = branding?.accent_color || "#D4A843";

    const acceptUrl = `${portal_url || "https://portalafmdigital.lovable.app"}/portal/accept-invite?token=${token}`;

    if (!resendKey) {
      // No email provider — log and return manual link
      console.log(`[portal-invite] Email not sent (no RESEND_API_KEY). Manual link: ${acceptUrl}`);

      await svc.from("audit_log").insert({
        action: "portal_invite_email_skipped",
        entity_type: "client_portal_invites",
        entity_id: invite_id,
        user_id: user.id,
        details: { reason: "no_email_provider", email },
      });

      return new Response(JSON.stringify({
        sent: false,
        reason: "no_email_provider",
        invite_url: acceptUrl,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr><td style="padding:32px 32px 0;text-align:center">
          <h1 style="margin:0;font-size:20px;color:#1a1a1a">${portalTitle}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#666">You've been invited to ${clientName}'s portal</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px">
            Hi${full_name ? ` ${full_name}` : ''},
          </p>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 24px">
            You've been invited to access your performance dashboard. Click the button below to get started.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${acceptUrl}" style="display:inline-block;padding:12px 32px;background:${accentColor};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px">
                Accept Invite
              </a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#999;line-height:1.6;margin:24px 0 0;text-align:center">
            This invite expires in 7 days. If the button doesn't work, copy this link:<br>
            <a href="${acceptUrl}" style="color:${accentColor};word-break:break-all">${acceptUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #eee;text-align:center">
          <p style="margin:0;font-size:11px;color:#aaa">
            ${branding?.agency_label || 'Powered by AFM Digital'}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "noreply@afmdigital.com",
        to: [email],
        subject: `You're invited to ${portalTitle}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[portal-invite] Resend error:", resendData);
      await svc.from("audit_log").insert({
        action: "portal_invite_email_failed",
        entity_type: "client_portal_invites",
        entity_id: invite_id,
        user_id: user.id,
        details: { email, error: resendData },
      });

      return new Response(JSON.stringify({
        sent: false,
        reason: "email_send_failed",
        invite_url: acceptUrl,
        error: resendData,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log success
    await svc.from("audit_log").insert({
      action: "portal_invite_email_sent",
      entity_type: "client_portal_invites",
      entity_id: invite_id,
      user_id: user.id,
      details: { email, resend_id: resendData.id },
    });

    return new Response(JSON.stringify({
      sent: true,
      resend_id: resendData.id,
      invite_url: acceptUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[portal-invite] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
