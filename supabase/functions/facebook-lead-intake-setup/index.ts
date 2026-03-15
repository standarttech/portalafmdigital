/**
 * facebook-lead-intake-setup — One-click orchestration for FB Lead Form trigger
 *
 * POST: Runs the full setup flow (token per-integration, not per-automation)
 * POST ?action=test-lead — Sends a synthetic test lead
 * GET  ?action=get-integration-config&connection_id=X — Returns verify token for a given integration
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getTokenFromVault(admin: ReturnType<typeof createClient>, ref: string): Promise<string | null> {
  const { data, error } = await admin.rpc('get_social_token', { _token_reference: ref });
  if (error) return null;
  return data as string;
}

/** Resolve the Meta API token from a specific connection */
async function resolveMetaToken(admin: ReturnType<typeof createClient>, connectionId: string): Promise<{ token: string; source: string } | null> {
  // Try platform_connections first (the selected connection)
  const { data: conn } = await admin
    .from('platform_connections')
    .select('token_reference')
    .eq('id', connectionId)
    .maybeSingle();
  if (conn?.token_reference) {
    const t = await getTokenFromVault(admin, conn.token_reference);
    if (t) return { token: t, source: 'platform_connection' };
  }

  // Try platform_integrations with matching id
  const { data: integ } = await admin
    .from('platform_integrations')
    .select('secret_ref')
    .eq('id', connectionId)
    .eq('is_active', true)
    .maybeSingle();
  if (integ?.secret_ref) {
    const t = await getTokenFromVault(admin, integ.secret_ref);
    if (t) return { token: t, source: 'platform_integration' };
  }

  // Fallback: system token
  const sys = Deno.env.get('META_SYSTEM_USER_TOKEN');
  if (sys) return { token: sys, source: 'system_token' };

  return null;
}

/** 
 * Get or create a stable verify token for a specific integration.
 * Stored in platform_settings keyed by connection ID.
 */
async function ensureIntegrationVerifyToken(
  admin: ReturnType<typeof createClient>,
  connectionId: string,
  userId: string
): Promise<string> {
  const settingKey = `fb_leadgen_verify_token__${connectionId}`;
  
  // Check if already exists
  const { data: existing } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', settingKey)
    .maybeSingle();
  
  if (existing?.value) {
    const parsed = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
    if (parsed.token) return parsed.token;
  }

  // Also check the legacy global token as migration path
  const globalToken = Deno.env.get('FB_LEADGEN_VERIFY_TOKEN') || '';
  if (globalToken) {
    // Persist global token for this integration
    await admin.from('platform_settings').upsert({
      key: settingKey,
      value: JSON.stringify({ token: globalToken, updated_at: new Date().toISOString(), updated_by: userId, source: 'migrated_from_global' }),
    }, { onConflict: 'key' });
    return globalToken;
  }

  // Generate new token
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const newToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  
  await admin.from('platform_settings').upsert({
    key: settingKey,
    value: JSON.stringify({ token: newToken, updated_at: new Date().toISOString(), updated_by: userId }),
  }, { onConflict: 'key' });
  
  // Also write to legacy global key for backward compat with webhook
  await admin.from('platform_settings').upsert({
    key: 'fb_leadgen_verify_token',
    value: JSON.stringify({ token: newToken, updated_at: new Date().toISOString(), updated_by: userId }),
  }, { onConflict: 'key' });
  
  console.log(`[intake-setup] Generated verify token for integration ${connectionId}`);
  return newToken;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check admin role
  const { data: agencyUser } = await admin
    .from('agency_users')
    .select('agency_role')
    .eq('user_id', user.id)
    .single();
  if (!agencyUser || !['AgencyAdmin', 'Manager'].includes(agencyUser.agency_role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // ── GET INTEGRATION CONFIG (verify token + callback URL for a specific integration) ──
  if (req.method === 'GET' && action === 'get-integration-config') {
    const connectionId = url.searchParams.get('connection_id');
    if (!connectionId) {
      return new Response(JSON.stringify({ error: 'connection_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const verifyToken = await ensureIntegrationVerifyToken(admin, connectionId, user.id);
    const callbackUrl = `${SUPABASE_URL}/functions/v1/fb-leadgen-webhook`;
    return new Response(JSON.stringify({
      callback_url: callbackUrl,
      verify_token: verifyToken,
      connection_id: connectionId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // ── TEST LEAD ──
  if (action === 'test-lead') {
    try {
      const body = await req.json();
      const { automation_id } = body;
      if (!automation_id) {
        return new Response(JSON.stringify({ error: 'automation_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const testPayload = {
        leadgen_id: `test_${Date.now()}`,
        full_name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        form_id: 'test_form',
        page_id: 'test_page',
        platform: 'facebook',
        source: 'fb_lead_form_test',
        created_at: new Date().toISOString(),
      };
      const execResp = await fetch(`${SUPABASE_URL}/functions/v1/automation-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ automation_id, trigger_payload: testPayload, test_mode: true, _system_trigger: true }),
      });
      const execResult = await execResp.json();
      return new Response(JSON.stringify({
        success: execResult.status === 'completed',
        run_id: execResult.run_id,
        status: execResult.status,
        steps: execResult.steps,
        error: execResult.error,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── MAIN SETUP FLOW ──
  try {
    const body = await req.json();
    const { automation_id, meta_connection_id, page_id, form_id } = body;

    if (!automation_id) {
      return new Response(JSON.stringify({ error: 'automation_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!meta_connection_id) {
      return new Response(JSON.stringify({ error: 'meta_connection_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const steps: StepResult[] = [];
    const callbackUrl = `${SUPABASE_URL}/functions/v1/fb-leadgen-webhook`;

    // Clean trigger_config — only these fields
    const triggerConfig: Record<string, unknown> = {
      meta_connection_id,
    };

    // ── STEP 1: Resolve Meta token from selected integration ──
    console.log(`[intake-setup] Step 1: Resolving Meta token for connection ${meta_connection_id}...`);
    const tokenResult = await resolveMetaToken(admin, meta_connection_id);
    if (!tokenResult) {
      steps.push({ step: 'check_meta_connection', status: 'error', message: 'No Meta token available for selected integration.' });
      return new Response(JSON.stringify({ success: false, steps, next_action: 'connect_meta' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    steps.push({ step: 'check_meta_connection', status: 'success', message: `Token found via ${tokenResult.source}` });

    // ── STEP 2: Ensure stable verify token for this integration ──
    console.log(`[intake-setup] Step 2: Ensuring verify token for integration ${meta_connection_id}...`);
    const verifyToken = await ensureIntegrationVerifyToken(admin, meta_connection_id, user.id);
    steps.push({ step: 'ensure_verify_token', status: 'success', message: 'Verify token ready (integration-level)' });

    // ── STEP 3: Load pages ──
    console.log(`[intake-setup] Step 3: Loading Facebook Pages...`);
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${tokenResult.token}`);
    const pagesData = await pagesRes.json();
    if (pagesData.error) {
      steps.push({ step: 'load_pages', status: 'error', message: `Meta API: ${pagesData.error.message}` });
      return new Response(JSON.stringify({ success: false, steps }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pages = (pagesData.data || []).map((p: any) => ({ id: p.id, name: p.name }));
    steps.push({ step: 'load_pages', status: 'success', message: `Found ${pages.length} pages` });

    if (!page_id) {
      return new Response(JSON.stringify({
        success: true, steps, needs_selection: 'page', pages,
        callback_url: callbackUrl, verify_token: verifyToken,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const selectedPage = (pagesData.data || []).find((p: any) => String(p.id) === String(page_id));
    const pageName = selectedPage?.name || page_id;
    const pageAccessToken = selectedPage?.access_token;
    triggerConfig.page_id = page_id;
    triggerConfig.page_name = pageName;

    // ── STEP 4: Load forms ──
    console.log(`[intake-setup] Step 4: Loading Lead Forms for page ${page_id}...`);
    let forms: { id: string; name: string; status?: string }[] = [];
    const formToken = pageAccessToken || tokenResult.token;
    try {
      const formsRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/leadgen_forms?fields=id,name,status&access_token=${formToken}`);
      const formsData = await formsRes.json();
      if (formsData.error) {
        steps.push({ step: 'load_forms', status: 'error', message: `Meta API: ${formsData.error.message}` });
      } else {
        forms = (formsData.data || []).map((f: any) => ({ id: f.id, name: f.name, status: f.status }));
        steps.push({ step: 'load_forms', status: 'success', message: `Found ${forms.length} forms` });
      }
    } catch (err) {
      steps.push({ step: 'load_forms', status: 'error', message: String(err) });
    }

    if (!form_id) {
      return new Response(JSON.stringify({
        success: true, steps, needs_selection: 'form', pages, forms,
        selected_page: { id: page_id, name: pageName },
        callback_url: callbackUrl, verify_token: verifyToken,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const selectedForm = forms.find(f => String(f.id) === String(form_id));
    triggerConfig.form_id = form_id;
    triggerConfig.form_name = selectedForm?.name || form_id;

    // ── STEP 5: Subscribe page to leadgen ──
    console.log(`[intake-setup] Step 5: Subscribing page ${page_id} to leadgen...`);
    let pageSubscribed = false;
    if (pageAccessToken) {
      try {
        const subRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ access_token: pageAccessToken, subscribed_fields: 'leadgen' }).toString(),
        });
        const subData = await subRes.json();
        console.log(`[intake-setup] Subscribe result:`, JSON.stringify(subData));
        if (subData.success === true) {
          pageSubscribed = true;
          steps.push({ step: 'subscribe_page', status: 'success', message: `Page "${pageName}" subscribed to leadgen` });
          await admin.from('audit_log').insert({
            action: 'meta_page_subscribed_leadgen',
            entity_type: 'facebook_page',
            entity_id: page_id,
            user_id: user.id,
            details: { page_name: pageName, token_source: tokenResult.source, automation_id, connection_id: meta_connection_id },
          });
        } else {
          steps.push({ step: 'subscribe_page', status: 'error', message: subData.error?.message || 'Subscription failed' });
        }
      } catch (err) {
        steps.push({ step: 'subscribe_page', status: 'error', message: String(err) });
      }
    } else {
      steps.push({ step: 'subscribe_page', status: 'error', message: 'No page access token available' });
    }
    triggerConfig.page_subscribed = pageSubscribed;

    // ── STEP 6: Check webhook endpoint ──
    console.log(`[intake-setup] Step 6: Checking webhook endpoint...`);
    let webhookEndpointLive = false;
    try {
      const healthRes = await fetch(callbackUrl, { method: 'GET' });
      webhookEndpointLive = healthRes.status === 403 || healthRes.status === 200;
      steps.push({
        step: 'check_webhook',
        status: webhookEndpointLive ? 'success' : 'error',
        message: webhookEndpointLive ? `Webhook endpoint is live (HTTP ${healthRes.status})` : `Webhook returned HTTP ${healthRes.status}`,
      });
    } catch (err) {
      steps.push({ step: 'check_webhook', status: 'error', message: `Endpoint unreachable: ${String(err)}` });
    }

    // Statuses — honest, not fake
    triggerConfig.webhook_verified = false; // Only true after real Meta verification
    triggerConfig.live_ingestion_active = false; // Only true after manual Meta step confirmed

    // ── STEP 7: Save trigger_config ──
    console.log(`[intake-setup] Step 7: Saving trigger_config...`);
    const { error: saveErr } = await admin
      .from('automations')
      .update({ trigger_config: triggerConfig })
      .eq('id', automation_id);
    if (saveErr) {
      steps.push({ step: 'save_config', status: 'error', message: saveErr.message });
    } else {
      steps.push({ step: 'save_config', status: 'success', message: 'Configuration saved' });
    }

    return new Response(JSON.stringify({
      success: !steps.some(s => s.status === 'error' && ['check_meta_connection', 'load_pages', 'save_config'].includes(s.step)),
      steps,
      config: triggerConfig,
      callback_url: callbackUrl,
      verify_token: verifyToken,
      manual_meta_step_required: true,
      page_subscribed: pageSubscribed,
      webhook_endpoint_live: webhookEndpointLive,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[intake-setup] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
