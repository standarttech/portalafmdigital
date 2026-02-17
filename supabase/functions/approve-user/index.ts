import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Beautiful HTML email template
function buildApprovalEmail(params: {
  name: string;
  email: string;
  inviteLink: string;
  role: string;
}): string {
  const { name, email, inviteLink, role } = params;
  const displayName = name || email.split("@")[0];
  const roleLabel = role === "Client" ? "Client" : "Media Buyer";

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

              <!-- Gold top bar -->
              <tr>
                <td style="background:linear-gradient(90deg,#d4a843 0%,#f0c860 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px 40px 36px;">

                  <!-- Icon + headline -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:28px;">
                        <div style="width:48px;height:48px;background:#d4a84318;border:1px solid #d4a84340;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                          <span style="font-size:22px;line-height:48px;display:block;text-align:center;">✦</span>
                        </div>
                        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;">
                          You're invited, ${displayName}
                        </h1>
                        <p style="margin:0;font-size:15px;color:#71717a;line-height:1.5;">
                          Your access request has been approved. You've been granted
                          <strong style="color:#d4a843;">${roleLabel}</strong> access to the AFM DIGITAL Portal.
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
                        <a href="${inviteLink}"
                           style="display:inline-block;background:linear-gradient(135deg,#d4a843 0%,#f0c860 100%);color:#0a0a0b;font-size:15px;font-weight:700;letter-spacing:-0.2px;text-decoration:none;padding:14px 40px;border-radius:10px;min-width:200px;text-align:center;">
                          Set Password &amp; Sign In →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Notice -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#27272a28;border:1px solid #27272a;border-radius:8px;padding:14px 16px;">
                        <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                          This invitation link is <strong style="color:#a1a1aa;">single-use</strong> and expires in <strong style="color:#a1a1aa;">24 hours</strong>.
                          If you didn't request access, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

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
                If you believe this is a mistake or have questions, please reach out to your account manager or reply to this email.
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
      return new Response(JSON.stringify({ error: "Only admins can approve users" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { action, request_id, invitation_id, email, full_name, role, client_id, permissions } = body;

    console.log("approve-user action:", action, "email:", email);

    // ────────────────────────────────────────────────────────────────
    // APPROVE / CREATE_INVITE — magic link flow (no temp passwords)
    // ────────────────────────────────────────────────────────────────
    if (action === "approve" || action === "create_invite") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Find or create the auth user
      let resolvedUserId: string | null = null;

      // Check if user already exists
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (existingUser) {
        resolvedUserId = existingUser.id;
      } else {
        // Create a new user with a random secure password (they'll set their own via magic link)
        const randomPw = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: randomPw,
          email_confirm: true,
          user_metadata: { display_name: full_name || cleanEmail.split("@")[0] },
        });

        if (createError) {
          console.error("Error creating user:", createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        resolvedUserId = newUser?.user?.id || null;
      }

      if (resolvedUserId) {
        // Upsert agency_users
        const { data: existingAU } = await supabaseAdmin.from("agency_users").select("id").eq("user_id", resolvedUserId).maybeSingle();
        if (!existingAU) {
          await supabaseAdmin.from("agency_users").insert({
            user_id: resolvedUserId,
            agency_role: role || "MediaBuyer",
            display_name: full_name || cleanEmail.split("@")[0],
          });
        } else {
          await supabaseAdmin.from("agency_users").update({
            agency_role: role || "MediaBuyer",
            display_name: full_name || cleanEmail.split("@")[0],
          }).eq("user_id", resolvedUserId);
        }

        // Client role — also add to client_users
        if (role === "Client" && client_id) {
          const { data: existingCU } = await supabaseAdmin.from("client_users").select("id").eq("user_id", resolvedUserId).eq("client_id", client_id).maybeSingle();
          if (!existingCU) {
            await supabaseAdmin.from("client_users").insert({
              user_id: resolvedUserId,
              client_id,
              role: "Client",
            });
          }
        }

        // Upsert permissions
        const perms = permissions || {};
        const { data: existingPerms } = await supabaseAdmin.from("user_permissions").select("id").eq("user_id", resolvedUserId).maybeSingle();
        if (!existingPerms) {
          await supabaseAdmin.from("user_permissions").insert({
            user_id: resolvedUserId,
            can_add_clients: perms.can_add_clients || false,
            can_edit_clients: perms.can_edit_clients || false,
            can_assign_clients_to_users: perms.can_assign_clients_to_users || false,
            can_connect_integrations: perms.can_connect_integrations || false,
            can_run_manual_sync: perms.can_run_manual_sync || false,
            can_edit_metrics_override: perms.can_edit_metrics_override || false,
            can_manage_tasks: perms.can_manage_tasks || false,
            can_publish_reports: perms.can_publish_reports || false,
            can_view_audit_log: perms.can_view_audit_log || false,
          });
        }

        // Upsert user_settings (no force_password_change needed)
        const { data: existingSettings } = await supabaseAdmin.from("user_settings").select("id").eq("user_id", resolvedUserId).maybeSingle();
        if (!existingSettings) {
          await supabaseAdmin.from("user_settings").insert({
            user_id: resolvedUserId,
            force_password_change: false,
            language: "ru",
            theme: "dark",
          });
        } else {
          await supabaseAdmin.from("user_settings").update({
            force_password_change: false,
            temp_password_expires_at: null,
          }).eq("user_id", resolvedUserId);
        }
      }

      // Update access_request status
      if (request_id) {
        await supabaseAdmin.from("access_requests").update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUser.id,
        }).eq("id", request_id);
      }

      // Mark invitation as accepted
      if (invitation_id) {
        await supabaseAdmin.from("invitations").update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        }).eq("id", invitation_id);
      }

      // Generate a magic sign-in link (one-time, expires in 24h)
      let inviteLink = `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/auth`;

      if (resendApiKey) {
        try {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: {
              redirectTo: `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/`,
            },
          });

          if (!linkError && linkData?.properties?.action_link) {
            inviteLink = linkData.properties.action_link;
          } else {
            console.warn("Could not generate magic link, falling back to login URL:", linkError?.message);
          }

          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
            to: [cleanEmail],
            subject: "You're invited to AFM DIGITAL Portal",
            html: buildApprovalEmail({
              name: full_name || "",
              email: cleanEmail,
              inviteLink,
              role: role || "MediaBuyer",
            }),
          });

          console.log("Invitation email sent to:", cleanEmail);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping email");
      }

      return new Response(
        JSON.stringify({ success: true, message: "User approved and invitation sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ────────────────────────────────────────────────────────────────
    // DENY
    // ────────────────────────────────────────────────────────────────
    if (action === "deny") {
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
            subject: "AFM DIGITAL Portal — Access Request Update",
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
    // RESEND INVITE — regenerate magic link and resend
    // ────────────────────────────────────────────────────────────────
    if (action === "resend_temp_password") {
      let targetEmail = email;
      let existingUser: any = null;

      const user_id = body.user_id;
      if (user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userData?.user) {
          existingUser = userData.user;
          targetEmail = userData.user.email;
        }
      } else if (targetEmail) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === targetEmail.toLowerCase().trim()
        );
      }

      if (!existingUser || !targetEmail) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Clear any leftover force_password_change flag
      await supabaseAdmin.from("user_settings").update({
        force_password_change: false,
        temp_password_expires_at: null,
      }).eq("user_id", existingUser.id);

      if (resendApiKey) {
        try {
          let inviteLink = `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/auth`;

          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: targetEmail.toLowerCase().trim(),
            options: {
              redirectTo: `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/`,
            },
          });

          if (!linkError && linkData?.properties?.action_link) {
            inviteLink = linkData.properties.action_link;
          }

          const resend = new Resend(resendApiKey);

          // Get display_name from agency_users
          const { data: agencyUser } = await supabaseAdmin
            .from("agency_users")
            .select("display_name, agency_role")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          await resend.emails.send({
            from: "AFM DIGITAL <no-reply@app.afmdigital.com>",
            to: [targetEmail.toLowerCase().trim()],
            subject: "Your new invitation link — AFM DIGITAL Portal",
            html: buildApprovalEmail({
              name: agencyUser?.display_name || "",
              email: targetEmail,
              inviteLink,
              role: agencyUser?.agency_role || "MediaBuyer",
            }),
          });

          console.log("Resent invitation to:", targetEmail);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invitation resent" }),
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
