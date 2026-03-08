import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * GOS Store Secret Edge Function
 * 
 * Securely stores integration secrets in Vault and updates
 * gos_integration_instances.vault_secret_ref with the reference UUID.
 * 
 * Requires authenticated admin/agency member.
 * Strips sensitive keys from the config JSONB field.
 */

const SENSITIVE_KEYS = ['api_key', 'access_token', 'refresh_token', 'client_secret', 'webhook_secret', 'token', 'secret', 'password'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for vault operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user is agency member
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_role')
      .eq('user_id', user.id)
      .single();

    if (!agencyUser) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { instance_id, secret_value, config } = body;

    if (!instance_id) {
      return new Response(JSON.stringify({ error: 'instance_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current instance
    const { data: instance, error: instanceError } = await supabase
      .from('gos_integration_instances')
      .select('id, vault_secret_ref, config, integration_id')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: Record<string, any> = {};

    // Store secret in vault if provided
    if (secret_value) {
      // Delete old secret if exists
      if (instance.vault_secret_ref) {
        await supabase.rpc('delete_gos_secret', { _secret_ref: instance.vault_secret_ref });
      }

      // Store new secret
      const secretName = `gos_int_${instance_id}`;
      const { data: secretId, error: vaultError } = await supabase.rpc('store_gos_secret', {
        _secret_value: secret_value,
        _secret_name: secretName,
      });

      if (vaultError) {
        console.error('Vault error:', vaultError);
        return new Response(JSON.stringify({ error: 'Failed to store secret' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates.vault_secret_ref = secretId;
    }

    // Clean config: strip sensitive keys
    if (config) {
      const cleanConfig = { ...config };
      for (const key of SENSITIVE_KEYS) {
        delete cleanConfig[key];
      }
      updates.config = cleanConfig;
    } else {
      // If no new config but there's existing config, clean it
      const existingConfig = (instance.config as Record<string, any>) || {};
      const cleanConfig = { ...existingConfig };
      let changed = false;
      for (const key of SENSITIVE_KEYS) {
        if (key in cleanConfig) {
          delete cleanConfig[key];
          changed = true;
        }
      }
      if (changed) {
        updates.config = cleanConfig;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('gos_integration_instances')
        .update(updates)
        .eq('id', instance_id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update instance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      has_secret: !!updates.vault_secret_ref || !!instance.vault_secret_ref,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
