import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Beautiful HTML email template
function buildInviteEmail(params: {
  name: string;
  email: string;
  inviteLink: string;
  role: string;
}): string {
  const { name, email, inviteLink, role } = params;
  const displayName = name || email.split("@")[0];
  const roleMap: Record<string, string> = {
    Client: "Client",
    AgencyAdmin: "Agency Admin",
    MediaBuyer: "Media Buyer",
    Manager: "Manager",
    SalesManager: "Sales Manager",
    AccountManager: "Account Manager",
    Designer: "Designer",
    Copywriter: "Copywriter",
  };
  const roleLabel = roleMap[role] || role;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to AFM DIGITAL</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a843;width:4px;border-radius:2px;">&nbsp;</td>
                  <td style="padding-left:14px;">
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">AFM</span>
                    <span style="font-size:22px;font-weight:300;color:#d4a843;letter-spacing:2px;"> DIGITAL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111113;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0">

              <!-- Gold top bar -->
              <tr>
                <td style="background:linear-gradient(90deg,#d4a843 0%,#f0c860 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px 40px 36px;">

                  <!-- Headline -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:28px;">
                        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;">
                          You're invited, ${displayName}
                        </h1>
                        <p style="margin:0;font-size:15px;color:#71717a;line-height:1.5;">
                          You've been granted
                          <strong style="color:#d4a843;">${roleLabel}</strong> access to the AFM DIGITAL platform.
                          Click the button below to create your account.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Info row -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:10px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom:10px;">
                              <span style="font-size:11px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:1px;">Account</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="font-size:13px;color:#a1a1aa;padding-right:8px;">Email</td>
                                  <td style="font-size:13px;color:#ffffff;font-weight:500;">${email}</td>
                                </tr>
                                <tr>
                                  <td style="font-size:13px;color:#a1a1aa;padding-right:8px;padding-top:6px;">Role</td>
                                  <td style="font-size:13px;color:#d4a843;font-weight:600;padding-top:6px;">${roleLabel}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:28px;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteLink}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="#d4a843">
                          <w:anchorlock/>
                          <center style="color:#0a0a0b;font-family:sans-serif;font-size:15px;font-weight:bold;">Create Account →</center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-->
                        <a href="${inviteLink}" target="_blank"
                           style="display:inline-block;background:#d4a843;color:#0a0a0b;font-size:15px;font-weight:700;letter-spacing:-0.2px;text-decoration:none;padding:14px 40px;border-radius:10px;min-width:200px;text-align:center;">
                          Create Account →
                        </a>
                        <!--<![endif]-->
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:20px;">
                        <p style="margin:0;font-size:11px;color:#52525b;line-height:1.5;word-break:break-all;">
                          If the button doesn't work, copy and paste this link into your browser:<br/>
                          <a href="${inviteLink}" style="color:#d4a843;text-decoration:underline;">${inviteLink}</a>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Notice -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#1a1a1d;border:1px solid #27272a;border-radius:8px;padding:14px 16px;">
                        <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                          This invitation link expires in <strong style="color:#a1a1aa;">7 days</strong>.
                          If you didn't expect this email, you can safely ignore it.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">
                © ${new Date().getFullYear()} AFM DIGITAL · <a href="https://app.afmdigital.com" style="color:#52525b;text-decoration:none;">app.afmdigital.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildDenialEmail(name: string, email: string): string {
  const displayName = name || email.split("@")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;">AFM</span>
              <span style="font-size:22px;font-weight:300;color:#d4a843;letter-spacing:2px;"> DIGITAL</span>
            </td>
          </tr>
          <tr>
            <td style="background:#111113;border:1px solid #27272a;border-radius:16px;padding:40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Access Request Update</h1>
              <p style="margin:0 0 16px;font-size:14px;color:#71717a;line-height:1.6;">
                Hi ${displayName}, unfortunately your access request to the AFM DIGITAL Portal could not be approved at this time.
              </p>
              <p style="margin:0;font-size:13px;color:#52525b;line-height:1.6;">
                If you believe this is a mistake or have questions, please reach out to your account manager.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">© ${new Date().getFullYear()} AFM DIGITAL</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing anon key." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminCheck } = await supabaseAdmin
      .from("agency_users")
      .select("agency_role")
      .eq("user_id", callerUser.id)
      .eq("agency_role", "AgencyAdmin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Only admins can manage invitations" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { action, request_id, email, full_name, role, client_id, client_ids, permissions } = body;

    console.log("approve-user action:", action);

    // ── Input validation helpers ──────────────────────────────────────
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ALLOWED_ROLES = [
      "AgencyAdmin", "MediaBuyer", "Client", "Manager",
      "SalesManager", "AccountManager", "Designer", "Copywriter",
    ];

    function validateEmail(e: string): boolean {
      return typeof e === "string" && EMAIL_REGEX.test(e.trim()) && e.length <= 255;
    }
    function validateUUID(id: string): boolean {
      return typeof id === "string" && UUID_REGEX.test(id);
    }
    function validateRole(r: string): boolean {
      return typeof r === "string" && ALLOWED_ROLES.includes(r);
    }
    function validateName(n: string): boolean {
      return typeof n === "string" && n.trim().length >= 1 && n.length <= 100;
    }

    const APP_BASE_URL = "https://app.afmdigital.com";

    // ────────────────────────────────────────────────────────────────
    // APPROVE / CREATE_INVITE
    // Creates an invitation record and sends email with /invite?token=XXX link.
    // User registration happens on InvitePage when they click the link.
    // ────────────────────────────────────────────────────────────────
    if (action === "approve" || action === "create_invite") {
      if (!email || !validateEmail(email)) {
        return new Response(JSON.stringify({ error: "Valid email address is required (max 255 characters)" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (role && !validateRole(role)) {
        return new Response(JSON.stringify({ error: "Invalid role specified" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (full_name && !validateName(full_name)) {
        return new Response(JSON.stringify({ error: "Name must be between 1 and 100 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (client_id && !validateUUID(client_id)) {
        return new Response(JSON.stringify({ error: "Invalid client_id format" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Collect client IDs
      const resolvedClientIds: string[] = [];
      if (client_id) resolvedClientIds.push(client_id);
      if (Array.isArray(client_ids)) {
        for (const cid of client_ids) {
          if (typeof cid === "string" && validateUUID(cid) && !resolvedClientIds.includes(cid)) {
            resolvedClientIds.push(cid);
          }
        }
      }

      const cleanEmail = email.toLowerCase().trim();

      // Revoke any existing pending invitations for this email
      await supabaseAdmin
        .from("invitations")
        .update({ status: "revoked" })
        .eq("email", cleanEmail)
        .eq("status", "pending");

      // Update access_request status if approving a request
      if (request_id) {
        await supabaseAdmin.from("access_requests").update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUser.id,
        }).eq("id", request_id);
      }

      // Create invitation record (token is auto-generated by DB default)
      const { data: newInvitation, error: invError } = await supabaseAdmin.from("invitations").insert({
        email: cleanEmail,
        role: role || "MediaBuyer",
        status: "pending",
        created_by: callerUser.id,
        client_id: role === "Client" && resolvedClientIds.length > 0 ? resolvedClientIds[0] : null,
        permissions: permissions || {},
      }).select("id, token").single();

      if (invError || !newInvitation) {
        console.error("Error creating invitation:", invError);
        return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Store client assignments in invitation permissions for InvitePage to use
      if (resolvedClientIds.length > 0) {
        const permsWithClients = {
          ...(permissions || {}),
          _client_ids: resolvedClientIds,
        };
        await supabaseAdmin.from("invitations")
          .update({ permissions: permsWithClients })
          .eq("id", newInvitation.id);
      }

      // Build the invite link — direct to /invite page with invitation token
      const inviteLink = `${APP_BASE_URL}/invite?token=${newInvitation.token}`;

      // Send email
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
            to: [cleanEmail],
            subject: "You're invited to AFM DIGITAL",
            html: buildInviteEmail({
              name: full_name || "",
              email: cleanEmail,
              inviteLink,
              role: role || "MediaBuyer",
            }),
          });
          console.log("Invitation email sent to:", cleanEmail, "link:", inviteLink);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Email failed but invitation was created — admin can copy link manually
        }
      } else {
        console.warn("RESEND_API_KEY not configured, invitation created but email not sent");
      }

      // Audit log
      await supabaseAdmin.from("audit_log").insert({
        action: "invitation_created",
        entity_type: "invitations",
        entity_id: newInvitation.id,
        user_id: callerUser.id,
        details: { email: cleanEmail, role: role || "MediaBuyer", client_ids: resolvedClientIds },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Invitation created and email sent",
          invitation_id: newInvitation.id,
          invite_link: inviteLink,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ────────────────────────────────────────────────────────────────
    // DENY
    // ────────────────────────────────────────────────────────────────
    if (action === "deny") {
      if (email && !validateEmail(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (request_id && !validateUUID(request_id)) {
        return new Response(JSON.stringify({ error: "Invalid request_id format" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (request_id) {
        await supabaseAdmin.from("access_requests").update({
          status: "denied",
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUser.id,
        }).eq("id", request_id);
      }

      if (resendApiKey && email) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
            to: [email.toLowerCase().trim()],
            subject: "AFM DIGITAL — Access Request Update",
            html: buildDenialEmail(full_name || "", email),
          });
        } catch (emailError) {
          console.error("Error sending denial email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Request denied" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ────────────────────────────────────────────────────────────────
    // RESEND INVITE — create new invitation and send email
    // ────────────────────────────────────────────────────────────────
    if (action === "resend_temp_password") {
      let targetEmail = email;
      const user_id = body.user_id;

      if (user_id && !validateUUID(user_id)) {
        return new Response(JSON.stringify({ error: "Invalid user_id format" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Resolve email from user_id if needed
      if (user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userData?.user?.email) {
          targetEmail = userData.user.email;
        }
      }

      if (!targetEmail) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const cleanTarget = targetEmail.toLowerCase().trim();

      // Revoke old pending invitations
      await supabaseAdmin
        .from("invitations")
        .update({ status: "revoked" })
        .eq("email", cleanTarget)
        .eq("status", "pending");

      // Get user info
      const { data: agencyUser } = await supabaseAdmin
        .from("agency_users")
        .select("display_name, agency_role")
        .eq("user_id", user_id || "")
        .maybeSingle();

      // Create new invitation
      const { data: newInv } = await supabaseAdmin.from("invitations").insert({
        email: cleanTarget,
        role: agencyUser?.agency_role || "MediaBuyer",
        status: "pending",
        created_by: callerUser.id,
      }).select("id, token").single();

      const inviteLink = newInv
        ? `${APP_BASE_URL}/invite?token=${newInv.token}`
        : `${APP_BASE_URL}/auth`;

      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
            to: [cleanTarget],
            subject: "Your new invitation link — AFM DIGITAL",
            html: buildInviteEmail({
              name: agencyUser?.display_name || "",
              email: cleanTarget,
              inviteLink,
              role: agencyUser?.agency_role || "MediaBuyer",
            }),
          });
          console.log("Resent invitation to:", cleanTarget);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invitation resent", invite_link: inviteLink }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("approve-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
