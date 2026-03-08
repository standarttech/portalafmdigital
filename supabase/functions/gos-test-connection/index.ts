import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * GOS Test Connection Edge Function
 * 
 * Tests an integration instance's connection health.
 * Uses vault-stored secret to attempt a basic API ping.
 * Updates last_sync_at and error_message on the instance.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify agency membership
    const { data: agencyUser } = await supabase
      .from('agency_users')
      .select('agency_role')
      .eq('user_id', user.id)
      .single();

    if (!agencyUser) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { instance_id } = body;

    if (!instance_id) {
      return new Response(JSON.stringify({ error: 'instance_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch instance with integration details
    const { data: instance, error: instError } = await supabase
      .from('gos_integration_instances')
      .select('id, vault_secret_ref, config, integration_id, gos_integrations(name, provider, category)')
      .eq('id', instance_id)
      .single();

    if (instError || !instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provider = (instance as any).gos_integrations?.provider?.toLowerCase() || '';
    const config = (instance.config || {}) as Record<string, any>;
    let testResult = { status: 'not_testable', message: 'No test available for this integration type' };

    // Get secret if available
    let secret: string | null = null;
    if (instance.vault_secret_ref) {
      const { data: decrypted } = await supabase.rpc('get_social_token', {
        _token_reference: instance.vault_secret_ref,
      });
      secret = decrypted || null;
    }

    // Provider-specific health checks
    if (provider === 'telegram' && secret) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${secret}/getMe`);
        const data = await res.json();
        if (data.ok) {
          testResult = { status: 'healthy', message: `Bot: @${data.result.username}` };
        } else {
          testResult = { status: 'failed', message: data.description || 'Invalid token' };
        }
      } catch (e) {
        testResult = { status: 'failed', message: 'Connection failed' };
      }
    } else if ((provider === 'hubspot' || provider === 'crm') && secret) {
      // Generic API key test - try a simple GET
      const testUrl = config.test_url || config.base_url;
      if (testUrl) {
        try {
          const res = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${secret}` },
          });
          testResult = res.ok
            ? { status: 'healthy', message: `API responded ${res.status}` }
            : { status: 'failed', message: `API returned ${res.status}` };
        } catch {
          testResult = { status: 'failed', message: 'Connection failed' };
        }
      } else {
        testResult = { status: 'not_testable', message: 'No test URL configured' };
      }
    } else if (secret) {
      // Generic: we have a secret but no specific test
      testResult = { status: 'not_testable', message: 'Secret stored, no automated test available for this provider' };
    } else {
      testResult = { status: 'not_testable', message: 'No secret configured' };
    }

    // Update instance with test result
    const updateData: Record<string, any> = {
      last_sync_at: new Date().toISOString(),
    };
    if (testResult.status === 'failed') {
      updateData.error_message = testResult.message;
    } else if (testResult.status === 'healthy') {
      updateData.error_message = null;
    }

    await supabase.from('gos_integration_instances').update(updateData).eq('id', instance_id);

    return new Response(JSON.stringify({
      success: true,
      ...testResult,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Test connection error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
