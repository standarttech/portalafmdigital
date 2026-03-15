import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── SSRF blocklist ── */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^169\.254\.\d+\.\d+$/,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^::1$/,
  /\.local$/i,
  /\.internal$/i,
  /\.metadata\.google\.internal$/i,
  /^metadata\.google\.internal$/i,
];

function isUrlSafe(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    return !BLOCKED_HOST_PATTERNS.some(p => p.test(u.hostname));
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    /* ── 1. AUTH: verify caller ── */
    const body = await req.json();
    const { automation_id, trigger_payload = {}, test_mode = false, _system_trigger = false } = body;

    // Service-role client for execution
    const supabase = createClient(supabaseUrl, serviceKey);

    let callerId = 'system';
    let agencyRole = 'AgencyAdmin';

    if (_system_trigger) {
      // System-triggered (from fb-leadgen-webhook or other internal services)
      // Verify the caller is using service role key
      const authHeader = req.headers.get('Authorization');
      if (authHeader !== `Bearer ${serviceKey}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized system trigger' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // User-triggered
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userSupabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userSupabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callerId = user.id;

      const { data: agencyUser } = await supabase
        .from('agency_users').select('agency_role').eq('user_id', callerId).maybeSingle();
      if (!agencyUser) {
        return new Response(JSON.stringify({ error: 'Forbidden: not an agency member' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      agencyRole = agencyUser.agency_role;
    }
    if (!automation_id) throw new Error('automation_id required');

    // Load automation
    const { data: automation, error: autoErr } = await supabase
      .from('automations').select('*').eq('id', automation_id).single();
    if (autoErr || !automation) throw new Error('Automation not found');
    if (!automation.is_active && !test_mode) throw new Error('Automation is inactive');

    // Verify client scope access (skip for system triggers)
    if (automation.client_id && !_system_trigger) {
      const isAdmin = agencyRole === 'AgencyAdmin';
      if (!isAdmin) {
        const { data: access } = await supabase
          .from('client_users').select('id').eq('user_id', callerId).eq('client_id', automation.client_id).maybeSingle();
        if (!access) {
          return new Response(JSON.stringify({ error: 'Forbidden: no access to this client' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Load steps
    const { data: steps } = await supabase
      .from('automation_steps').select('*')
      .eq('automation_id', automation_id)
      .eq('is_active', true)
      .order('step_order', { ascending: true });
    if (!steps?.length) throw new Error('No active steps');

    // Create run
    const { data: run, error: runErr } = await supabase
      .from('automation_runs').insert({
        automation_id,
        status: 'running',
        trigger_payload,
        is_test: test_mode,
        steps_total: steps.length,
        started_at: new Date().toISOString(),
      }).select().single();
    if (runErr) throw runErr;

    let stepsCompleted = 0;
    let stepsFailed = 0;
    const stepOutputs: Record<string, any> = { trigger: trigger_payload };

    for (const step of steps) {
      const stepStart = Date.now();
      const resolvedMapping = resolveFieldMapping(step.field_mapping || {}, stepOutputs);
      const fullInput = { ...resolvedMapping, ...(step.config || {}) };

      const { data: runStep } = await supabase
        .from('automation_run_steps').insert({
          run_id: run.id,
          step_id: step.id,
          step_order: step.step_order,
          step_name: step.name || step.action_type,
          action_type: step.action_type,
          status: 'running',
          input_payload: sanitizePayload(fullInput),
          started_at: new Date().toISOString(),
        }).select().single();

      try {
        if (step.step_type === 'condition' || step.action_type === 'filter') {
          const passes = evaluateCondition(step.condition_config, stepOutputs);
          if (!passes) {
            await supabase.from('automation_run_steps').update({
              status: 'skipped', output_payload: { reason: 'Condition not met' },
              completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
            }).eq('id', runStep!.id);
            continue;
          }
          stepsCompleted++;
          await supabase.from('automation_run_steps').update({
            status: 'completed', output_payload: { passed: true },
            completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
          }).eq('id', runStep!.id);
          continue;
        }

        const result = await executeAction(step.action_type, fullInput, supabase, automation);
        const stepKey = `step_${step.step_order}`;
        stepOutputs[stepKey] = result;
        stepOutputs['last'] = result;
        stepsCompleted++;

        await supabase.from('automation_run_steps').update({
          status: 'completed', output_payload: sanitizePayload(result || {}),
          completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
        }).eq('id', runStep!.id);
      } catch (stepError: any) {
        stepsFailed++;
        await supabase.from('automation_run_steps').update({
          status: 'failed', error_message: stepError.message?.substring(0, 500),
          completed_at: new Date().toISOString(), duration_ms: Date.now() - stepStart,
        }).eq('id', runStep!.id);
      }
    }

    const finalStatus = stepsFailed > 0 ? (stepsCompleted > 0 ? 'partial' : 'failed') : 'completed';
    const runEnd = new Date().toISOString();

    await supabase.from('automation_runs').update({
      status: finalStatus, completed_at: runEnd,
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      steps_completed: stepsCompleted, steps_failed: stepsFailed,
    }).eq('id', run.id);

    await supabase.from('automations').update({
      last_run_at: runEnd, last_run_status: finalStatus,
      run_count: (automation.run_count || 0) + 1,
    }).eq('id', automation_id);

    return new Response(JSON.stringify({
      success: true, run_id: run.id, status: finalStatus,
      steps_completed: stepsCompleted, steps_failed: stepsFailed,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* ══════════════════════════════════════════════
   Variable resolution
   ══════════════════════════════════════════════ */

function resolveFieldMapping(mapping: Record<string, any>, ctx: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [targetField, sourceExpr] of Object.entries(mapping)) {
    if (typeof sourceExpr === 'string') {
      result[targetField] = resolveTemplate(sourceExpr, ctx);
    } else {
      result[targetField] = sourceExpr;
    }
  }
  return result;
}

function resolveTemplate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    const val = getNestedValue(ctx, path.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o: any, k: string) => o?.[k], obj);
}

function evaluateCondition(config: any, ctx: Record<string, any>): boolean {
  if (!config) return true;
  const { field, operator, value } = config;
  const fieldPath = field?.includes('.') ? field : `trigger.${field}`;
  const actual = getNestedValue(ctx, fieldPath);
  switch (operator) {
    case 'exists': return actual !== undefined && actual !== null && actual !== '';
    case 'not_exists': return actual === undefined || actual === null || actual === '';
    case 'equals': return String(actual) === String(value);
    case 'not_equals': return String(actual) !== String(value);
    case 'contains': return String(actual || '').includes(String(value));
    case 'starts_with': return String(actual || '').startsWith(String(value));
    case 'greater_than': return Number(actual) > Number(value);
    case 'less_than': return Number(actual) < Number(value);
    default: return true;
  }
}

/* ── Action dispatcher ── */
async function executeAction(actionType: string, input: any, supabase: any, automation: any): Promise<any> {
  switch (actionType) {
    case 'send_telegram': return await executeTelegram(input, supabase);
    case 'create_crm_lead': return await executeCreateCrmLead(input, supabase, automation);
    case 'update_crm_lead': return await executeUpdateCrmLead(input, supabase);
    case 'add_sheets_row': return await executeAddSheetsRow(input, supabase);
    case 'send_webhook': return await executeSendWebhook(input);
    case 'send_notification': return await executeSendNotification(input, supabase);
    case 'assign_manager': return await executeAssignManager(input, supabase);
    case 'tag_lead': return await executeTagLead(input, supabase);
    case 'update_lead_status': return await executeUpdateLeadStatus(input, supabase);
    default: throw new Error(`Unknown action type: ${actionType}`);
  }
}

async function executeTelegram(input: any, supabase: any): Promise<any> {
  const { chat_id, message, bot_profile_id } = input;
  if (!chat_id || !message) throw new Error('chat_id and message required');

  let botToken: string | null = null;

  if (bot_profile_id) {
    // FIXED: use correct table crm_bot_profiles with column bot_token_ref
    const { data: profile } = await supabase
      .from('crm_bot_profiles').select('bot_token_ref').eq('id', bot_profile_id).single();
    if (profile?.bot_token_ref) {
      const { data: tokenData } = await supabase.rpc('get_crm_connection_secret', {
        _secret_ref: profile.bot_token_ref,
      });
      botToken = tokenData;
    }
  }

  if (!botToken) botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || null;
  if (!botToken) throw new Error('No Telegram bot token configured');

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text: message, parse_mode: 'HTML' }),
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
  return { message_id: data.result?.message_id, sent: true };
}

async function executeCreateCrmLead(input: any, supabase: any, automation: any): Promise<any> {
  const clientId = input.client_id || automation.client_id;
  if (!clientId) throw new Error('client_id required for CRM lead');

  const leadData: any = {
    client_id: clientId,
    full_name: input.full_name || input.name || '',
    email: input.email || null,
    phone: input.phone || null,
    source: input.source || 'automation',
    status: input.status || 'new',
    utm_source: input.utm_source || null,
    utm_medium: input.utm_medium || null,
    utm_campaign: input.utm_campaign || null,
    metadata: input.metadata || {},
  };
  if (input.pipeline_id) leadData.pipeline_id = input.pipeline_id;
  if (input.stage_id) leadData.stage_id = input.stage_id;
  if (input.assigned_to) leadData.assigned_to = input.assigned_to;

  if (input.dedupe_strategy !== 'create_new' && (leadData.email || leadData.phone)) {
    let query = supabase.from('crm_leads').select('id').eq('client_id', clientId);
    if (leadData.email) query = query.eq('email', leadData.email);
    else if (leadData.phone) query = query.eq('phone', leadData.phone);
    const { data: existing } = await query.maybeSingle();

    if (existing && (input.dedupe_strategy === 'update_existing' || input.dedupe_strategy === 'upsert')) {
      const { data, error } = await supabase.from('crm_leads').update(leadData).eq('id', existing.id).select().single();
      if (error) throw error;
      return { lead_id: data.id, action: 'updated', full_name: data.full_name };
    } else if (existing) {
      return { lead_id: existing.id, action: 'skipped_duplicate', full_name: leadData.full_name };
    }
  }

  const { data, error } = await supabase.from('crm_leads').insert(leadData).select().single();
  if (error) throw error;
  return { lead_id: data.id, action: 'created', full_name: data.full_name };
}

async function executeUpdateCrmLead(input: any, supabase: any): Promise<any> {
  const { lead_id, ...updateFields } = input;
  if (!lead_id) throw new Error('lead_id required');
  const clean: any = {};
  for (const [k, v] of Object.entries(updateFields)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  const { error } = await supabase.from('crm_leads').update(clean).eq('id', lead_id);
  if (error) throw error;
  return { lead_id, updated: true };
}

async function executeAddSheetsRow(input: any, supabase: any): Promise<any> {
  // FIXED: accept both sheet_url (canonical) and connection_id (legacy compat)
  const sheetUrl = input.sheet_url || input.connection_id;
  if (!sheetUrl) throw new Error('sheet_url required for Google Sheets action');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resp = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${svcKey}` },
    body: JSON.stringify({ sheet_url: sheetUrl, mode: 'append', rows: [input.row_data || input] }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to add sheets row');
  return { appended: true, ...data };
}

async function executeSendWebhook(input: any): Promise<any> {
  const { url, method = 'POST', headers: customHeaders = {}, body } = input;
  if (!url) throw new Error('url required');
  if (!isUrlSafe(url)) throw new Error('Webhook URL is blocked: private/internal addresses are not allowed');

  const resp = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...customHeaders },
    body: method !== 'GET' ? JSON.stringify(body || input) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const responseText = await resp.text();
  return { status: resp.status, response: responseText.substring(0, 1000) };
}

async function executeSendNotification(input: any, supabase: any): Promise<any> {
  const { title, message, user_ids, type = 'info', link } = input;
  if (!title || !message) throw new Error('title and message required');
  let targets = user_ids;
  if (!targets?.length) {
    const { data: admins } = await supabase
      .from('agency_users').select('user_id').eq('agency_role', 'AgencyAdmin');
    targets = admins?.map((a: any) => a.user_id) || [];
  }
  if (!targets.length) throw new Error('No notification targets');
  const notifications = targets.map((uid: string) => ({
    user_id: uid, title, message, type, link: link || '/automations',
  }));
  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) throw error;
  return { sent_to: targets.length };
}

async function executeAssignManager(input: any, supabase: any): Promise<any> {
  const { lead_id, assigned_to } = input;
  if (!lead_id || !assigned_to) throw new Error('lead_id and assigned_to required');
  const { error } = await supabase.from('crm_leads').update({ assigned_to }).eq('id', lead_id);
  if (error) throw error;
  return { lead_id, assigned_to, assigned: true };
}

async function executeTagLead(input: any, supabase: any): Promise<any> {
  const { lead_id, tags } = input;
  if (!lead_id) throw new Error('lead_id required');
  const { data: lead } = await supabase.from('crm_leads').select('tags').eq('id', lead_id).single();
  const currentTags = lead?.tags || [];
  const newTags = Array.isArray(tags) ? tags : String(tags).split(',').map((t: string) => t.trim()).filter(Boolean);
  const mergedTags = [...new Set([...currentTags, ...newTags])];
  const { error } = await supabase.from('crm_leads').update({ tags: mergedTags }).eq('id', lead_id);
  if (error) throw error;
  return { lead_id, tags: mergedTags };
}

async function executeUpdateLeadStatus(input: any, supabase: any): Promise<any> {
  const { lead_id, status, stage_id } = input;
  if (!lead_id) throw new Error('lead_id required');
  const update: any = {};
  if (status) update.status = status;
  if (stage_id) update.stage_id = stage_id;
  const { error } = await supabase.from('crm_leads').update(update).eq('id', lead_id);
  if (error) throw error;
  return { lead_id, updated: true, status, stage_id };
}

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const sanitized = { ...payload };
  const sensitiveKeys = ['token', 'secret', 'password', 'api_key', 'access_token', 'bot_token', 'token_reference', 'service_role'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***';
    }
  }
  return sanitized;
}
