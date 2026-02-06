import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Client with caller's token to verify admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller is admin
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
    const {
      action,
      request_id,
      invitation_id,
      email,
      full_name,
      role,
      client_id,
      permissions,
    } = body;

    console.log("approve-user action:", action, "email:", email);

    if (action === "approve" || action === "create_invite") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Generate temp password
      const tempPassword = generateTempPassword();
      const tempPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Create auth user with service role
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: full_name || email.split("@")[0] },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        // If user already exists, try to update password
        if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
          // List users to find existing user
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
          );
          if (existingUser) {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: tempPassword,
            });

            // Update user settings for force password change
            const { data: existingSettings } = await supabaseAdmin
              .from("user_settings")
              .select("id")
              .eq("user_id", existingUser.id)
              .maybeSingle();

            if (existingSettings) {
              await supabaseAdmin
                .from("user_settings")
                .update({
                  force_password_change: true,
                  temp_password_expires_at: tempPasswordExpiresAt,
                })
                .eq("user_id", existingUser.id);
            } else {
              await supabaseAdmin.from("user_settings").insert({
                user_id: existingUser.id,
                force_password_change: true,
                temp_password_expires_at: tempPasswordExpiresAt,
                language: "ru",
                theme: "dark",
              });
            }
          } else {
            return new Response(JSON.stringify({ error: createError.message }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      const userId = newUser?.user?.id;

      if (userId) {
        // Create agency_users or client_users record
        if (role === "Client" && client_id) {
          await supabaseAdmin.from("client_users").insert({
            user_id: userId,
            client_id: client_id,
            role: "Client",
          });
        } else {
          await supabaseAdmin.from("agency_users").insert({
            user_id: userId,
            agency_role: role || "MediaBuyer",
            display_name: full_name || email.split("@")[0],
          });
        }

        // Create permissions
        const perms = permissions || {};
        await supabaseAdmin.from("user_permissions").insert({
          user_id: userId,
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

        // Create user settings with force_password_change
        await supabaseAdmin.from("user_settings").insert({
          user_id: userId,
          force_password_change: true,
          temp_password_expires_at: tempPasswordExpiresAt,
          language: "ru",
          theme: "dark",
        });
      }

      // Update access request if provided
      if (request_id) {
        await supabaseAdmin
          .from("access_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: callerUser.id,
          })
          .eq("id", request_id);
      }

      // Update or create invitation
      if (invitation_id) {
        await supabaseAdmin
          .from("invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invitation_id);
      }

      // Send email via Resend
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const loginUrl = `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/auth`;

          await resend.emails.send({
            from: "AFM DIGITAL <onboarding@resend.dev>",
            to: [email.toLowerCase().trim()],
            subject: "AFM DIGITAL Portal — Доступ одобрен / Access Approved",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0b10; color: #e2e8f0; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #d4a843; font-size: 24px; margin: 0;">AFM DIGITAL</h1>
                  <p style="color: #94a3b8; font-size: 14px; margin-top: 8px;">Portal Access</p>
                </div>
                
                <div style="background: #131520; border-radius: 12px; padding: 24px; border: 1px solid #1e2030;">
                  <h2 style="color: #f1f5f9; font-size: 18px; margin: 0 0 16px;">✅ Доступ одобрен / Access Approved</h2>
                  
                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    Ваша заявка на доступ к AFM DIGITAL Portal была одобрена.<br>
                    Your access request to AFM DIGITAL Portal has been approved.
                  </p>
                  
                  <div style="background: #1a1c2e; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #2a2d45;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Учётные данные / Credentials</p>
                    <p style="color: #f1f5f9; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="color: #f1f5f9; font-size: 14px; margin: 4px 0;"><strong>Пароль / Password:</strong> <code style="background: #0f1018; padding: 2px 8px; border-radius: 4px; color: #d4a843; font-size: 15px;">${tempPassword}</code></p>
                  </div>
                  
                  <p style="color: #f59e0b; font-size: 13px; line-height: 1.5; background: #f59e0b15; padding: 12px; border-radius: 8px; border: 1px solid #f59e0b30;">
                    ⚠️ Это временный пароль. При первом входе вам будет необходимо сменить пароль.<br>
                    ⚠️ This is a temporary password. You will be required to change your password on first login.
                  </p>
                  
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${loginUrl}" style="display: inline-block; background: #d4a843; color: #0a0b10; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                      Войти в портал / Sign In
                    </a>
                  </div>
                  
                  <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px;">
                    Временный пароль действителен 24 часа.<br>
                    Temporary password is valid for 24 hours.
                  </p>
                </div>
              </div>
            `,
          });
          console.log("Approval email sent to:", email);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the whole operation if email fails
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping email");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "User approved and email sent",
          temp_password: tempPassword, // Return to admin for manual sharing if email fails
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "deny") {
      if (request_id) {
        await supabaseAdmin
          .from("access_requests")
          .update({
            status: "denied",
            reviewed_at: new Date().toISOString(),
            reviewed_by: callerUser.id,
          })
          .eq("id", request_id);
      }

      // Optionally send denial email
      if (resendApiKey && email) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "AFM DIGITAL <onboarding@resend.dev>",
            to: [email.toLowerCase().trim()],
            subject: "AFM DIGITAL Portal — Заявка отклонена / Access Denied",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0b10; color: #e2e8f0; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #d4a843; font-size: 24px; margin: 0;">AFM DIGITAL</h1>
                </div>
                <div style="background: #131520; border-radius: 12px; padding: 24px; border: 1px solid #1e2030;">
                  <h2 style="color: #f1f5f9; font-size: 18px; margin: 0 0 16px;">Заявка отклонена / Access Denied</h2>
                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    К сожалению, ваша заявка на доступ к AFM DIGITAL Portal была отклонена.<br>
                    Unfortunately, your access request to AFM DIGITAL Portal has been denied.
                  </p>
                  <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">
                    Если у вас есть вопросы, свяжитесь с администратором.<br>
                    If you have questions, please contact the administrator.
                  </p>
                </div>
              </div>
            `,
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

    if (action === "resend_temp_password") {
      let targetEmail = email;
      let existingUser: any = null;

      // Support lookup by user_id (UUID) or email
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

      const tempPassword = generateTempPassword();
      const tempPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
      });

      await supabaseAdmin
        .from("user_settings")
        .update({
          force_password_change: true,
          temp_password_expires_at: tempPasswordExpiresAt,
        })
        .eq("user_id", existingUser.id);

      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const loginUrl = `${req.headers.get("origin") || "https://portalafmdigital.lovable.app"}/auth`;

          await resend.emails.send({
            from: "AFM DIGITAL <onboarding@resend.dev>",
            to: [targetEmail.toLowerCase().trim()],
            subject: "AFM DIGITAL Portal — Новый временный пароль / New Temporary Password",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0b10; color: #e2e8f0; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #d4a843; font-size: 24px; margin: 0;">AFM DIGITAL</h1>
                </div>
                <div style="background: #131520; border-radius: 12px; padding: 24px; border: 1px solid #1e2030;">
                  <h2 style="color: #f1f5f9; font-size: 18px; margin: 0 0 16px;">🔑 Новый временный пароль / New Temporary Password</h2>
                  <div style="background: #1a1c2e; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #2a2d45;">
                    <p style="color: #f1f5f9; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${targetEmail}</p>
                    <p style="color: #f1f5f9; font-size: 14px; margin: 4px 0;"><strong>Пароль / Password:</strong> <code style="background: #0f1018; padding: 2px 8px; border-radius: 4px; color: #d4a843;">${tempPassword}</code></p>
                  </div>
                  <p style="color: #f59e0b; font-size: 13px; background: #f59e0b15; padding: 12px; border-radius: 8px; border: 1px solid #f59e0b30;">
                    ⚠️ При входе вам потребуется сменить пароль. Действителен 24 часа.<br>
                    ⚠️ You will need to change your password on login. Valid for 24 hours.
                  </p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${loginUrl}" style="display: inline-block; background: #d4a843; color: #0a0b10; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Войти / Sign In</a>
                  </div>
                </div>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, temp_password: tempPassword }),
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
