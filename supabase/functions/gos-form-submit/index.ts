import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * GOS Form Submit Edge Function
 * 
 * Accepts public form submissions for published forms.
 * 1. Validates form exists and is published
 * 2. Validates required fields
 * 3. Inserts into gos_form_submissions
 * 4. Handles submit_action: store (always), webhook (if configured), crm (if pipeline available)
 * 5. Evaluates active routing rules (by priority ASC)
 * 6. Writes matched rules to gos_routing_log
 * 
 * Routing Engine:
 * - Rules are evaluated in priority order (lower number = higher priority)
 * - ALL matching rules fire (not short-circuit)
 * - Supported operators: equals, not_equals, contains, starts_with, greater_than, less_than
 * - Conditions within a rule are AND-ed (all must match)
 * 
 * Submit Actions:
 * - store: Default. Saves submission + runs routing.
 * - webhook: After store, attempts to POST to configured webhook URL from form settings.
 * - crm: After store, creates a CRM lead if form has a linked pipeline. Not yet fully implemented.
 */

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface RoutingCondition {
  field: string;
  operator: string;
  value: string;
}

interface RoutingRule {
  id: string;
  name: string;
  conditions: RoutingCondition[];
  action_type: string;
  action_config: Record<string, any>;
  priority: number;
  client_id: string | null;
}

function evaluateCondition(condition: RoutingCondition, data: Record<string, any>): boolean {
  const fieldValue = String(data[condition.field] ?? '');
  const targetValue = String(condition.value ?? '');

  switch (condition.operator) {
    case 'equals':
      return fieldValue.toLowerCase() === targetValue.toLowerCase();
    case 'not_equals':
      return fieldValue.toLowerCase() !== targetValue.toLowerCase();
    case 'contains':
      return fieldValue.toLowerCase().includes(targetValue.toLowerCase());
    case 'starts_with':
      return fieldValue.toLowerCase().startsWith(targetValue.toLowerCase());
    case 'greater_than':
      return parseFloat(fieldValue) > parseFloat(targetValue);
    case 'less_than':
      return parseFloat(fieldValue) < parseFloat(targetValue);
    default:
      return false;
  }
}

function evaluateRule(rule: RoutingRule, submissionData: Record<string, any>, metadata: Record<string, any>): boolean {
  const conditions = rule.conditions || [];
  if (conditions.length === 0) return false;
  const combinedData = { ...submissionData, ...metadata };
  return conditions.every((cond: RoutingCondition) => evaluateCondition(cond, combinedData));
}

/**
 * SSRF Protection: Validates that a webhook URL targets a public internet host.
 * Blocks: private IPs (10.x, 172.16-31.x, 192.168.x, 127.x), link-local (169.254.x),
 * localhost, and non-http(s) schemes.
 */
function isUrlSafeForWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return false;
    // Block common internal/private IP ranges
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10) return false;                           // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return false;   // 172.16.0.0/12
      if (a === 192 && b === 168) return false;             // 192.168.0.0/16
      if (a === 169 && b === 254) return false;             // 169.254.0.0/16 (AWS metadata etc)
      if (a === 127) return false;                          // 127.0.0.0/8
      if (a === 0) return false;                            // 0.0.0.0/8
    }
    // Block .internal, .local TLDs
    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.localhost')) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const formId = body.form_id;

    if (!formId) {
      return new Response(JSON.stringify({ error: 'form_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return new Response(JSON.stringify({ error: 'Invalid form_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch form and validate it's published
    const { data: form, error: formError } = await supabase
      .from('gos_forms')
      .select('id, name, fields, status, client_id, submit_action, settings')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (form.status !== 'published' && form.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Form is not accepting submissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate required fields
    const submissionData = body.data || {};
    const fields = (form.fields || []) as FormField[];
    const validationErrors: string[] = [];

    for (const field of fields) {
      if (field.required) {
        const value = submissionData[field.id];
        if (value === undefined || value === null || String(value).trim() === '') {
          validationErrors.push(`${field.label || field.id} is required`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: validationErrors }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Capture metadata
    const source = body.source || 'embed';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // 4. Insert submission (always — "store" is the baseline)
    const { data: submission, error: insertError } = await supabase
      .from('gos_form_submissions')
      .insert({
        form_id: formId,
        data: submissionData,
        source,
        ip_address: ipAddress,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save submission' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4b. Handle submit_action beyond "store"
    const submitAction = form.submit_action || 'store';
    const actionResults: Record<string, string> = { store: 'saved' };

    if (submitAction === 'webhook') {
      // Try to POST to webhook URL from form settings
      const settings = (form.settings || {}) as Record<string, any>;
      const webhookUrl = settings.webhook_url;
      if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
        // SSRF protection: validate URL targets public internet only
        if (!isUrlSafeForWebhook(webhookUrl)) {
          actionResults.webhook = 'blocked_ssrf_protection';
          console.warn('Webhook URL blocked by SSRF protection:', webhookUrl);
        } else {
          try {
            const webhookRes = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                form_id: formId,
                form_name: form.name,
                submission_id: submission.id,
                data: submissionData,
                source,
                submitted_at: new Date().toISOString(),
              }),
            });
            actionResults.webhook = webhookRes.ok ? 'sent' : `failed_${webhookRes.status}`;
          } catch (e) {
            actionResults.webhook = 'error';
            console.error('Webhook error:', e);
          }
        }
      } else {
        actionResults.webhook = 'no_url_configured';
      }
    } else if (submitAction === 'crm') {
      // CRM lead creation — not yet fully implemented
      // Would need: pipeline_id in form settings, stage lookup, lead creation
      actionResults.crm = 'not_yet_implemented';
    }

    // 5. Evaluate routing rules
    let rulesQuery = supabase
      .from('gos_routing_rules')
      .select('id, name, conditions, action_type, action_config, priority, client_id')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (form.client_id) {
      rulesQuery = rulesQuery.or(`client_id.eq.${form.client_id},client_id.is.null`);
    } else {
      rulesQuery = rulesQuery.is('client_id', null);
    }

    const { data: rules } = await rulesQuery;
    const matchedRules: any[] = [];

    const routingMetadata = {
      source,
      form_id: formId,
      form_name: form.name,
      client_id: form.client_id || '',
    };

    if (rules && rules.length > 0) {
      for (const rule of rules as RoutingRule[]) {
        const matched = evaluateRule(rule, submissionData, routingMetadata);

        if (matched) {
          matchedRules.push(rule);

          let routedTo = '';
          let actionTaken = rule.action_type;

          switch (rule.action_type) {
            case 'assign_user':
              routedTo = rule.action_config?.user_id || 'unspecified';
              actionTaken = 'assigned_to_user';
              break;
            case 'assign_pipeline':
              routedTo = rule.action_config?.pipeline_id || 'unspecified';
              actionTaken = 'routed_to_pipeline';
              break;
            case 'tag':
              routedTo = rule.action_config?.tag || 'unspecified';
              actionTaken = 'tagged';
              break;
            case 'webhook':
              routedTo = rule.action_config?.url || 'unspecified';
              actionTaken = 'webhook_logged_not_executed';
              break;
            case 'notify':
              routedTo = rule.action_config?.channel || 'unspecified';
              actionTaken = 'notification_logged_not_executed';
              break;
            default:
              actionTaken = `unknown_action_${rule.action_type}`;
          }

          await supabase.from('gos_routing_log').insert({
            rule_id: rule.id,
            lead_id: submission.id,
            lead_source: source,
            routed_to: routedTo,
            action_taken: actionTaken,
            matched_conditions: rule.conditions,
          });
        }
      }
    }

    if (matchedRules.length === 0 && rules && rules.length > 0) {
      await supabase.from('gos_routing_log').insert({
        rule_id: null,
        lead_id: submission.id,
        lead_source: source,
        routed_to: null,
        action_taken: 'no_rules_matched',
        matched_conditions: null,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      submission_id: submission.id,
      rules_matched: matchedRules.length,
      submit_action: submitAction,
      action_results: actionResults,
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
