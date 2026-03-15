/**
 * facebook-lead-intake-setup — One-click orchestration for FB Lead Form trigger
 *
 * POST: Runs the full setup flow (token per-integration, not per-automation)
 * POST ?action=test-lead — Sends a synthetic test lead
 * GET  ?action=get-integration-config&connection_id=X — Returns verify token for a given integration
 * GET  ?action=get-form-fields&connection_id=X&form_id=Y — Returns form questions/fields
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
  const { data: conn } = await admin
    .from('platform_connections')
    .select('token_reference')
    .eq('id', connectionId)
    .maybeSingle();
  if (conn?.token_reference) {
    const t = await getTokenFromVault(admin, conn.token_reference);
    if (t) return { token: t, source: 'platform_connection' };
  }

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

  const sys = Deno.env.get('META_SYSTEM_USER_TOKEN');
  if (sys) return { token: sys, source: 'system_token' };

  return null;
}

async function ensureIntegrationVerifyToken(
  admin: ReturnType<typeof createClient>,
  connectionId: string,
  userId: string
): Promise<string> {
  const settingKey = `fb_leadgen_verify_token__${connectionId}`;
  const { data: existing } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', settingKey)
    .maybeSingle();
  if (existing?.value) {
    const parsed = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
    if (parsed.token) return parsed.token;
  }
  const globalToken = Deno.env.get('FB_LEADGEN_VERIFY_TOKEN') || '';
  if (globalToken) {
    await admin.from('platform_settings').upsert({
      key: settingKey,
      value: JSON.stringify({ token: globalToken, updated_at: new Date().toISOString(), updated_by: userId, source: 'migrated_from_global' }),
    }, { onConflict: 'key' });
    return globalToken;
  }
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const newToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  await admin.from('platform_settings').upsert({
    key: settingKey,
    value: JSON.stringify({ token: newToken, updated_at: new Date().toISOString(), updated_by: userId }),
  }, { onConflict: 'key' });
  await admin.from('platform_settings').upsert({
    key: 'fb_leadgen_verify_token',
    value: JSON.stringify({ token: newToken, updated_at: new Date().toISOString(), updated_by: userId }),
  }, { onConflict: 'key' });
  console.log(`[intake-setup] Generated verify token for integration ${connectionId}`);
  return newToken;
}

/** Convert a question label to a safe slug variable name (transliterated) */
function toSlug(label: string): string {
  // Basic transliteration map for Cyrillic
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
  };
  return label
    .toLowerCase()
    .split('')
    .map(ch => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60) || 'field';
}

/** Fetch form questions from Meta Graph API */
async function fetchFormFields(token: string, formId: string): Promise<{
  questions: Array<{ key: string; label: string; type: string; slug: string }>;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${formId}?fields=id,name,questions&access_token=${token}`
    );
    const data = await res.json();
    if (data.error) {
      return { questions: [], error: data.error.message };
    }

    const usedSlugs = new Map<string, number>();
    const questions = (data.questions || []).map((q: any, idx: number) => {
      const label = q.label || q.key || `Field ${idx + 1}`;
      const baseSlug = toSlug(label) || `field_${idx + 1}`;
      const seen = usedSlugs.get(baseSlug) || 0;
      usedSlugs.set(baseSlug, seen + 1);
      const slug = seen === 0 ? baseSlug : `${baseSlug}_${seen + 1}`;

      return {
        key: q.key || q.id || slug,
        label,
        type: q.type || 'CUSTOM',
        slug,
      };
    });

    return { questions };
  } catch (err) {
    return { questions: [], error: String(err) };
  }
}

async function fetchPageAccessToken(userToken: string, pageId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${userToken}`
    );
    const data = await res.json();
    if (data?.error || !data?.access_token) return null;
    return data.access_token as string;
  } catch {
    return null;
  }
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

  // ── GET INTEGRATION CONFIG ──
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

  // ── GET FORM FIELDS ──
  if (req.method === 'GET' && action === 'get-form-fields') {
    const connectionId = url.searchParams.get('connection_id');
    const formId = url.searchParams.get('form_id');
    const pageId = url.searchParams.get('page_id');
    if (!connectionId || !formId) {
      return new Response(JSON.stringify({ error: 'connection_id and form_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenResult = await resolveMetaToken(admin, connectionId);
    if (!tokenResult) {
      return new Response(JSON.stringify({ error: 'No Meta token available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensToTry: Array<{ token: string; source: string }> = [{ token: tokenResult.token, source: tokenResult.source }];
    if (pageId) {
      const pageToken = await fetchPageAccessToken(tokenResult.token, pageId);
      if (pageToken && pageToken !== tokenResult.token) {
        tokensToTry.unshift({ token: pageToken, source: 'page_access_token' });
      }
    }

    let questions: Array<{ key: string; label: string; type: string; slug: string }> = [];
    let fieldsError: string | undefined;
    let tokenSource = tokensToTry[0]?.source || 'unknown';

    for (const entry of tokensToTry) {
      const result = await fetchFormFields(entry.token, formId);
      if (result.questions.length > 0 || !result.error) {
        questions = result.questions;
        fieldsError = result.error;
        tokenSource = entry.source;
        break;
      }
      fieldsError = result.error;
    }

    return new Response(JSON.stringify({ questions, error: fieldsError, token_source: tokenSource }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

      // Load automation trigger_config to get form_fields for realistic test payload
      const { data: autoData } = await admin
        .from('automations')
        .select('trigger_config')
        .eq('id', automation_id)
        .single();
      const tc = (autoData?.trigger_config as Record<string, any>) || {};
      const formFields = (tc.form_fields || []) as Array<{ key: string; label: string; slug: string }>;

      // Build test fields object
      const fieldsObj: Record<string, string> = {};
      const answersLines: string[] = [];
      for (const f of formFields) {
        const testVal = `Test ${f.label}`;
        fieldsObj[f.slug] = testVal;
        answersLines.push(`${f.label}: ${testVal}`);
      }

      const testPayload: Record<string, any> = {
        leadgen_id: `test_${Date.now()}`,
        full_name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        form_id: tc.form_id || 'test_form',
        form_name: tc.form_name || 'Test Form',
        page_id: tc.page_id || 'test_page',
        page_name: tc.page_name || 'Test Page',
        platform: 'facebook',
        source: 'fb_lead_form_test',
        created_at: new Date().toISOString(),
        fields: fieldsObj,
        form_answers_text: answersLines.length > 0 ? answersLines.join('\n') : 'No custom fields',
        form_answers_json: JSON.stringify(fieldsObj),
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
    const triggerConfig: Record<string, unknown> = { meta_connection_id };

    // ── STEP 1: Resolve Meta token ──
    console.log(`[intake-setup] Step 1: Resolving Meta token for connection ${meta_connection_id}...`);
    const tokenResult = await resolveMetaToken(admin, meta_connection_id);
    if (!tokenResult) {
      steps.push({ step: 'check_meta_connection', status: 'error', message: 'No Meta token available for selected integration.' });
      return new Response(JSON.stringify({ success: false, steps, next_action: 'connect_meta' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    steps.push({ step: 'check_meta_connection', status: 'success', message: `Token found via ${tokenResult.source}` });

    // ── STEP 2: Ensure verify token ──
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

    // ── STEP 4b: Load form questions/fields ──
    console.log(`[intake-setup] Step 4b: Loading form fields for ${form_id}...`);
    const { questions: formQuestions, error: formFieldsError } = await fetchFormFields(formToken, form_id);
    if (formFieldsError) {
      steps.push({ step: 'load_form_fields', status: 'error', message: `Form fields: ${formFieldsError}` });
    } else {
      steps.push({ step: 'load_form_fields', status: 'success', message: `Found ${formQuestions.length} form fields` });
    }
    // Store form field definitions for variable resolution
    triggerConfig.form_fields = formQuestions;

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

    triggerConfig.webhook_verified = false;
    triggerConfig.live_ingestion_active = false;

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
      form_fields: formQuestions,
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
