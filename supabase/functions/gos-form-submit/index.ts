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
 * 4. Evaluates active routing rules (by priority ASC)
 * 5. Writes matched rules to gos_routing_log
 * 
 * Routing Engine:
 * - Rules are evaluated in priority order (lower number = higher priority)
 * - ALL matching rules fire (not short-circuit)
 * - Supported operators: equals, not_equals, contains, starts_with, greater_than, less_than
 * - Conditions within a rule are AND-ed (all must match)
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
      // Unknown operator — treat as non-match
      return false;
  }
}

function evaluateRule(rule: RoutingRule, submissionData: Record<string, any>, metadata: Record<string, any>): boolean {
  const conditions = rule.conditions || [];
  if (conditions.length === 0) return false; // No conditions = no match

  // All conditions must match (AND logic)
  const combinedData = { ...submissionData, ...metadata };
  return conditions.every((cond: RoutingCondition) => evaluateCondition(cond, combinedData));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract form_id from path: /gos-form-submit?form_id=xxx or from body
    const body = await req.json();
    const formId = body.form_id || url.searchParams.get('form_id');

    if (!formId) {
      return new Response(JSON.stringify({ error: 'form_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate form_id format (UUID)
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
      .select('id, name, fields, status, client_id, submit_action')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only published/active forms accept submissions
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

    // 4. Insert submission
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

    // 5. Evaluate routing rules
    // Fetch active rules for this form's client + global rules, ordered by priority
    let rulesQuery = supabase
      .from('gos_routing_rules')
      .select('id, name, conditions, action_type, action_config, priority, client_id')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (form.client_id) {
      // Get rules for this client + global rules (client_id IS NULL)
      rulesQuery = rulesQuery.or(`client_id.eq.${form.client_id},client_id.is.null`);
    } else {
      // Global form — only global rules
      rulesQuery = rulesQuery.is('client_id', null);
    }

    const { data: rules } = await rulesQuery;
    const matchedRules: any[] = [];

    // Build metadata object for condition evaluation
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

          // Determine routed_to based on action_type
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
              // Phase 1: Log the webhook decision but don't execute HTTP call yet
              actionTaken = 'webhook_logged_not_executed';
              break;
            case 'notify':
              routedTo = rule.action_config?.channel || 'unspecified';
              // Phase 1: Log the notification decision
              actionTaken = 'notification_logged_not_executed';
              break;
            default:
              actionTaken = `unknown_action_${rule.action_type}`;
          }

          // 6. Write to routing log
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

    // If no rules matched, log a default routing entry
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
