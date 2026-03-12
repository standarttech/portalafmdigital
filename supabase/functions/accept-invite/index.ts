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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { invitation_id, display_name } = await req.json();
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: "Missing invitation_id" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const svc = createClient(supabaseUrl, serviceKey);

    // Get invitation details
    const { data: invite } = await svc
      .from("invitations")
      .select("id, email, role, status, client_id, permissions")
      .eq("id", invitation_id)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Verify email match
    if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Email mismatch" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    if (invite.status !== "pending") {
      // Already accepted — still provision records in case they're missing
    }

    const perms = (invite.permissions as Record<string, any>) || {};
    const clientIds: string[] = perms._client_ids || (invite.client_id ? [invite.client_id] : []);
    const trimmedName = (display_name || "").trim() || user.email || "";

    if (invite.role === "Client") {
      // Create client_users records
      for (const cid of clientIds) {
        await svc.from("client_users").upsert(
          { user_id: user.id, client_id: cid, role: "Client" },
          { onConflict: "user_id,client_id" }
        );
      }
    } else {
      // Agency user — upsert
      const { data: existingAU } = await svc
        .from("agency_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAU) {
        await svc.from("agency_users").insert({
          user_id: user.id,
          agency_role: invite.role,
          display_name: trimmedName,
        });
      } else {
        await svc.from("agency_users").update({
          agency_role: invite.role,
          display_name: trimmedName,
        }).eq("user_id", user.id);
      }

      // Assign to clients
      for (const cid of clientIds) {
        await svc.from("client_users").upsert(
          { user_id: user.id, client_id: cid, role: "viewer" },
          { onConflict: "user_id,client_id" }
        );
      }

      // Create permissions
      const { data: existingPerms } = await svc
        .from("user_permissions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingPerms) {
        await svc.from("user_permissions").insert({
          user_id: user.id,
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
    }

    // For Client role — also create agency_users with Client role
    if (invite.role === "Client") {
      const { data: existingAU } = await svc
        .from("agency_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAU) {
        await svc.from("agency_users").insert({
          user_id: user.id,
          agency_role: "Client",
          display_name: trimmedName,
        });
      }
    }

    // Create default user settings
    const { data: existingSettings } = await svc
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingSettings) {
      await svc.from("user_settings").insert({
        user_id: user.id,
        language: "ru",
        theme: "dark",
      });
    }

    // Add user to support chat rooms for their clients
    for (const cid of clientIds) {
      const { data: supportRoom } = await svc
        .from("chat_rooms")
        .select("id")
        .eq("type", "support")
        .eq("client_id", cid)
        .maybeSingle();

      if (supportRoom) {
        await svc.from("chat_members").upsert(
          { room_id: supportRoom.id, user_id: user.id, can_write: true },
          { onConflict: "room_id,user_id" }
        ).select();
      }
    }

    // Mark invitation as accepted
    await svc.from("invitations").update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).eq("id", invitation_id);

    // Audit log
    await svc.from("audit_log").insert({
      action: "invitation_accepted_via_function",
      entity_type: "invitation",
      entity_id: invitation_id,
      user_id: user.id,
      details: { role: invite.role, client_ids: clientIds },
    });

    return new Response(
      JSON.stringify({ success: true, role: invite.role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[accept-invite] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
