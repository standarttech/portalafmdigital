/**
 * facebook-lead-intake-setup — One-click orchestration for FB Lead Form trigger
 *
 * POST: Runs the full setup flow:
 *   1. Validates Meta connection & token
 *   2. Ensures FB_LEADGEN_VERIFY_TOKEN exists (auto-generates if missing)
 *   3. Loads Facebook Pages
 *   4. Loads Lead Forms for selected page
 *   5. Subscribes page to leadgen events
 *   6. Checks webhook endpoint liveness
 *   7. Saves trigger_config to automation
 *
 * POST ?action=test-lead — Sends a synthetic test lead through the automation
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SetupRequest {
  automation_id: string;
  meta_connection_id?: string;
  page_id?: string;
  form_id?: string;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  data?: Record<string, unknown>;
}

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

async function resolveMetaToken(admin: ReturnType<typeof createClient>, connectionId?: string): Promise<{ token: string; source: string } | null> {
  // Priority 1: meta_ads_management
  const { data: mgmt } = await admin
    .from('platform_integrations')
    .select('secret_ref')
    .eq('integration_type', 'meta_ads_management')
    .eq('is_active', true)
    .maybeSingle();
  if (mgmt?.secret_ref) {
    const t = await getTokenFromVault(admin, mgmt.secret_ref);
    if (t) return { token: t, source: 'meta_ads_management' };
  }

  // Priority 2: platform_connections
  if (connectionId) {
    const { data: conn } = await admin
      .from('platform_connections')
      .select('token_reference')
      .eq('id', connectionId)
      .maybeSingle();
    if (conn?.token_reference) {
      const t = await getTokenFromVault(admin, conn.token_reference);
      if (t) return { token: t, source: 'platform_connection' };
    }
  }

  // Priority 3: social_media_connections
  const { data: sc } = await admin
    .from('social_media_connections')
    .select('token_reference')
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .maybeSingle();
  if (sc?.token_reference) {
    const t = await getTokenFromVault(admin, sc.token_reference);
    if (t) return { token: t, source: 'social_media_connection' };
  }

  // Priority 4: system token
  const sys = Deno.env.get('META_SYSTEM_USER_TOKEN');
  if (sys) return { token: sys, source: 'system_token' };

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          automation_id,
          trigger_payload: testPayload,
          test_mode: true,
          _system_trigger: true,
        }),
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
    const body: SetupRequest = await req.json();
    const { automation_id, meta_connection_id, page_id, form_id } = body;

    if (!automation_id) {
      return new Response(JSON.stringify({ error: 'automation_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const steps: StepResult[] = [];
    const callbackUrl = `${SUPABASE_URL}/functions/v1/fb-leadgen-webhook`;
    let finalConfig: Record<string, unknown> = {};

    // ── STEP 1: Resolve Meta token ──
    console.log(`[intake-setup] Step 1: Resolving Meta token...`);
    const tokenResult = await resolveMetaToken(admin, meta_connection_id);
    if (!tokenResult) {
      steps.push({ step: 'check_meta_connection', status: 'error', message: 'No Meta token available. Connect a Meta account with page management permissions.' });
      return new Response(JSON.stringify({ success: false, steps, next_action: 'connect_meta' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    steps.push({ step: 'check_meta_connection', status: 'success', message: `Token found via ${tokenResult.source}` });
    finalConfig.meta_connection_id = meta_connection_id || tokenResult.source;

    // ── STEP 2: Ensure verify token ──
    console.log(`[intake-setup] Step 2: Ensuring verify token...`);
    let verifyToken = Deno.env.get('FB_LEADGEN_VERIFY_TOKEN') || '';
    if (!verifyToken) {
      // Check platform_settings
      const { data: setting } = await admin
        .from('platform_settings')
        .select('value')
        .eq('key', 'fb_leadgen_verify_token')
        .single();
      if (setting?.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        verifyToken = parsed.token || '';
      }
    }
    if (!verifyToken) {
      // Auto-generate
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      verifyToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      await admin.from('platform_settings').upsert({
        key: 'fb_leadgen_verify_token',
        value: JSON.stringify({ token: verifyToken, updated_at: new Date().toISOString(), updated_by: user.id }),
      }, { onConflict: 'key' });
      console.log(`[intake-setup] Generated new verify token`);
    }
    steps.push({ step: 'ensure_verify_token', status: 'success', message: 'Verify token ready' });
    finalConfig.callback_url = callbackUrl;
    finalConfig.verify_token_secret_name = 'FB_LEADGEN_VERIFY_TOKEN';

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
    steps.push({ step: 'load_pages', status: 'success', message: `Found ${pages.length} pages`, data: { pages } });

    // If no page_id provided, return pages for selection
    if (!page_id) {
      return new Response(JSON.stringify({
        success: true,
        steps,
        needs_selection: 'page',
        pages,
        callback_url: callbackUrl,
        verify_token: verifyToken,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const selectedPage = (pagesData.data || []).find((p: any) => String(p.id) === String(page_id));
    const pageName = selectedPage?.name || page_id;
    const pageAccessToken = selectedPage?.access_token;
    finalConfig.page_id = page_id;
    finalConfig.page_name = pageName;

    // ── STEP 4: Load forms ──
    console.log(`[intake-setup] Step 4: Loading Lead Forms for page ${page_id}...`);
    let forms: { id: string; name: string; status?: string }[] = [];
    const formToken = pageAccessToken || tokenResult.token;
    try {
      const formsRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/leadgen_forms?fields=id,name,status&access_token=${formToken}`);
      const formsData = await formsRes.json();
      if (formsData.error) {
        steps.push({ step: 'load_forms', status: 'error', message: `Meta API: ${formsData.error.message}`, data: { requires_scope: 'leads_retrieval or ads_management' } });
      } else {
        forms = (formsData.data || []).map((f: any) => ({ id: f.id, name: f.name, status: f.status }));
        steps.push({ step: 'load_forms', status: 'success', message: `Found ${forms.length} forms`, data: { forms } });
      }
    } catch (err) {
      steps.push({ step: 'load_forms', status: 'error', message: String(err) });
    }

    // If no form_id provided, return forms for selection
    if (!form_id) {
      return new Response(JSON.stringify({
        success: true,
        steps,
        needs_selection: 'form',
        pages,
        forms,
        selected_page: { id: page_id, name: pageName },
        callback_url: callbackUrl,
        verify_token: verifyToken,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const selectedForm = forms.find(f => String(f.id) === String(form_id));
    finalConfig.form_id = form_id;
    finalConfig.form_name = selectedForm?.name || form_id;

    // ── STEP 5: Subscribe page to leadgen ──
    console.log(`[intake-setup] Step 5: Subscribing page ${page_id} to leadgen...`);
    let pageSubscribed = false;
    if (pageAccessToken) {
      try {
        const subRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            access_token: pageAccessToken,
            subscribed_fields: 'leadgen',
          }).toString(),
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
            details: { page_name: pageName, token_source: tokenResult.source, automation_id },
          });
        } else {
          const errMsg = subData.error?.message || 'Subscription failed';
          steps.push({ step: 'subscribe_page', status: 'error', message: errMsg });
        }
      } catch (err) {
        steps.push({ step: 'subscribe_page', status: 'error', message: String(err) });
      }
    } else {
      steps.push({ step: 'subscribe_page', status: 'error', message: 'No page access token available' });
    }
    finalConfig.page_subscribed = pageSubscribed;
    finalConfig.page_subscribed_at = pageSubscribed ? new Date().toISOString() : undefined;

    // ── STEP 6: Check webhook endpoint liveness ──
    console.log(`[intake-setup] Step 6: Checking webhook endpoint...`);
    let webhookEndpointLive = false;
    try {
      const healthRes = await fetch(callbackUrl, { method: 'GET' });
      // The webhook returns 403 for unverified GET requests — that means it's live
      webhookEndpointLive = healthRes.status === 403 || healthRes.status === 200;
      steps.push({
        step: 'check_webhook',
        status: webhookEndpointLive ? 'success' : 'error',
        message: webhookEndpointLive ? `Webhook endpoint is live (HTTP ${healthRes.status})` : `Webhook returned HTTP ${healthRes.status}`,
      });
    } catch (err) {
      steps.push({ step: 'check_webhook', status: 'error', message: `Endpoint unreachable: ${String(err)}` });
    }
    finalConfig.webhook_endpoint_live = webhookEndpointLive;
    // webhook_verified stays false — only true after real Meta verify challenge
    finalConfig.webhook_verified = false;

    // ── Determine if manual Meta step is required ──
    const manualMetaStepRequired = true; // Always required — can't programmatically set app webhook config
    finalConfig.manual_meta_step_required = manualMetaStepRequired;
    finalConfig.live_ingestion_active = false; // Will be set after manual verification

    // ── STEP 7: Save trigger_config ──
    console.log(`[intake-setup] Step 7: Saving trigger_config...`);
    const { error: saveErr } = await admin
      .from('automations')
      .update({ trigger_config: finalConfig })
      .eq('id', automation_id);
    if (saveErr) {
      steps.push({ step: 'save_config', status: 'error', message: saveErr.message });
    } else {
      steps.push({ step: 'save_config', status: 'success', message: 'Configuration saved' });
    }

    return new Response(JSON.stringify({
      success: !steps.some(s => s.status === 'error' && ['check_meta_connection', 'load_pages', 'save_config'].includes(s.step)),
      steps,
      config: finalConfig,
      callback_url: callbackUrl,
      verify_token: verifyToken,
      manual_meta_step_required: manualMetaStepRequired,
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
