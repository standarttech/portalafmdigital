import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Scheduled GOS Health Check
 * Runs periodically via pg_cron to check active integration instances.
 * Updates last_sync_at, error_message, and logs results to gos_health_check_log.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get all active integration instances
    const { data: instances } = await supabase
      .from('gos_integration_instances')
      .select('id, vault_secret_ref, config, integration_id, gos_integrations(name, provider, category)')
      .eq('is_active', true);

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let checked = 0;
    let healthy = 0;
    let failed = 0;
    let skipped = 0;

    for (const instance of instances) {
      const provider = (instance as any).gos_integrations?.provider?.toLowerCase() || '';
      let secret: string | null = null;

      if (instance.vault_secret_ref) {
        const { data: decrypted } = await supabase.rpc('get_social_token', {
          _token_reference: instance.vault_secret_ref,
        });
        secret = decrypted || null;
      }

      let status = 'not_testable';
      let message = 'No automated test available';

      if (provider === 'telegram' && secret) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${secret}/getMe`);
          const data = await res.json();
          if (data.ok) {
            status = 'healthy';
            message = `Bot: @${data.result.username}`;
            healthy++;
          } else {
            status = 'failed';
            message = data.description || 'Invalid token';
            failed++;
          }
        } catch {
          status = 'failed';
          message = 'Connection failed';
          failed++;
        }
      } else if ((provider === 'hubspot' || provider === 'crm') && secret) {
        const config = (instance.config || {}) as Record<string, any>;
        const testUrl = config.test_url || config.base_url;
        if (testUrl) {
          try {
            const res = await fetch(testUrl, { headers: { 'Authorization': `Bearer ${secret}` } });
            if (res.ok) { status = 'healthy'; message = `API: ${res.status}`; healthy++; }
            else { status = 'failed'; message = `API: ${res.status}`; failed++; }
          } catch {
            status = 'failed'; message = 'Connection failed'; failed++;
          }
        } else { skipped++; }
      } else {
        skipped++;
      }

      // Update instance
      const updateData: Record<string, any> = { last_sync_at: new Date().toISOString() };
      if (status === 'failed') updateData.error_message = message;
      else if (status === 'healthy') updateData.error_message = null;
      await supabase.from('gos_integration_instances').update(updateData).eq('id', instance.id);

      // Log result
      await supabase.from('gos_health_check_log').insert({
        instance_id: instance.id,
        status,
        message,
      });

      checked++;
    }

    return new Response(JSON.stringify({ checked, healthy, failed, skipped }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Scheduled health check error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
