import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Verify agency membership
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: member } = await adminClient
      .from("agency_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Not an agency member");

    const body = await req.json();
    const { client_id, provider, label, api_key, base_url, sync_interval_minutes, field_mapping, connection_id } = body;

    if (!client_id) throw new Error("client_id required");

    // If updating existing connection
    if (connection_id) {
      const updates: Record<string, unknown> = {};
      if (label !== undefined) updates.label = label;
      if (base_url !== undefined) updates.base_url = base_url;
      if (sync_interval_minutes !== undefined) updates.sync_interval_minutes = sync_interval_minutes;
      if (field_mapping !== undefined) updates.field_mapping = field_mapping;
      if (provider !== undefined) updates.provider = provider;

      // If new API key provided, store it and update ref
      if (api_key) {
        // Delete old secret
        const { data: conn } = await adminClient
          .from("crm_external_connections")
          .select("api_key_ref")
          .eq("id", connection_id)
          .single();
        if (conn?.api_key_ref) {
          await adminClient.rpc("delete_crm_connection_secret", { _secret_ref: conn.api_key_ref });
        }
        const { data: refData } = await adminClient.rpc("store_crm_connection_secret", {
          _secret_value: api_key,
          _secret_name: `crm_conn_${connection_id}`,
        });
        updates.api_key_ref = refData;
      }

      const { error } = await adminClient
        .from("crm_external_connections")
        .update(updates)
        .eq("id", connection_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, connection_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New connection
    if (!provider || !api_key) throw new Error("provider and api_key required for new connection");

    // Store API key in vault
    const secretName = `crm_conn_${client_id}_${provider}_${Date.now()}`;
    const { data: secretRef, error: vaultErr } = await adminClient.rpc("store_crm_connection_secret", {
      _secret_value: api_key,
      _secret_name: secretName,
    });
    if (vaultErr) throw vaultErr;

    const { data: conn, error: insertErr } = await adminClient
      .from("crm_external_connections")
      .insert({
        client_id,
        provider,
        label: label || provider,
        api_key_ref: secretRef,
        base_url: base_url || null,
        sync_interval_minutes: sync_interval_minutes || 60,
        field_mapping: field_mapping || {},
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, connection_id: conn.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-store-connection error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
