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

    // Verify caller is authenticated admin
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Check admin role
    const svc = createClient(supabaseUrl, serviceKey);
    const { data: au } = await svc
      .from("agency_users")
      .select("agency_role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (au?.agency_role !== "AgencyAdmin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Prevent self-deletion
    if (target_user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete yourself" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete platform data first
    await Promise.all([
      svc.from("agency_users").delete().eq("user_id", target_user_id),
      svc.from("user_permissions").delete().eq("user_id", target_user_id),
      svc.from("client_users").delete().eq("user_id", target_user_id),
      svc.from("user_settings").delete().eq("user_id", target_user_id),
    ]);

    // Delete from auth.users (this fully removes the user)
    const { error: deleteErr } =
      await svc.auth.admin.deleteUser(target_user_id);
    if (deleteErr) {
      console.error("[delete-user] Auth delete error:", deleteErr);
      // Platform data already cleaned — log but don't fail
      await svc.from("audit_log").insert({
        action: "user_delete_auth_failed",
        entity_type: "user",
        entity_id: target_user_id,
        user_id: user.id,
        details: { error: deleteErr.message },
      });

      return new Response(
        JSON.stringify({
          success: true,
          auth_deleted: false,
          warning: "Platform data removed but auth record could not be deleted",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await svc.from("audit_log").insert({
      action: "user_fully_deleted",
      entity_type: "user",
      entity_id: target_user_id,
      user_id: user.id,
      details: { deleted_by: user.email },
    });

    return new Response(
      JSON.stringify({ success: true, auth_deleted: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[delete-user] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
