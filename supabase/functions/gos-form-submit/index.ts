import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * GOS Form Submit Edge Function — Phase 3
 * 
 * 1. Rate limiting per IP/form
 * 2. Honeypot anti-spam check
 * 3. Validates form + required fields
 * 4. Inserts into gos_form_submissions
 * 5. Writes analytics events
 * 6. Handles submit_action: store, webhook, crm
 * 7. Evaluates routing rules with real execution
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
    case 'equals': return fieldValue.toLowerCase() === targetValue.toLowerCase();
    case 'not_equals': return fieldValue.toLowerCase() !== targetValue.toLowerCase();
    case 'contains': return fieldValue.toLowerCase().includes(targetValue.toLowerCase());
    case 'starts_with': return fieldValue.toLowerCase().startsWith(targetValue.toLowerCase());
    case 'greater_than': return parseFloat(fieldValue) > parseFloat(targetValue);
    case 'less_than': return parseFloat(fieldValue) < parseFloat(targetValue);
    default: return false;
  }
}

function evaluateRule(rule: RoutingRule, submissionData: Record<string, any>, metadata: Record<string, any>): boolean {
  const conditions = rule.conditions || [];
  if (conditions.length === 0) return false;
  const combinedData = { ...submissionData, ...metadata };
  return conditions.every((cond: RoutingCondition) => evaluateCondition(cond, combinedData));
}

/**
 * SSRF Protection: block private IPs, localhost, link-local, metadata endpoints
 */
function isUrlSafeForWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return false;
    // Block metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') return false;
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
      if (a === 127) return false;
      if (a === 0) return false;
    }
    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.localhost')) return false;
    return true;
  } catch {
    return false;
  }
}

function hashIp(ip: string): string {
  // Simple hash for rate limiting - not cryptographic, just for grouping
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const chr = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'ip_' + Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const formId = body.form_id;

    if (!formId) {
      return new Response(JSON.stringify({ error: 'form_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return new Response(JSON.stringify({ error: 'Invalid form_id format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Honeypot anti-spam check
    if (body._hp_check && String(body._hp_check).trim() !== '') {
      // Bot detected — silently accept but don't process
      return new Response(JSON.stringify({ success: true, submission_id: '00000000-0000-0000-0000-000000000000', rules_matched: 0, submit_action: 'store', action_results: { store: 'saved' } }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown';
    const ipHash = hashIp(ipAddress);
    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';

    // Rate limiting: max 10 submissions per form per IP per 5 min window
    const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('gos_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('form_id', formId)
      .gte('window_start', windowStart);

    if ((recentCount || 0) >= 10) {
      return new Response(JSON.stringify({ error: 'Too many submissions. Please try again later.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record rate limit entry
    await supabase.from('gos_rate_limits').insert({ ip_hash: ipHash, form_id: formId });

    // Fetch form
    const { data: form, error: formError } = await supabase
      .from('gos_forms')
      .select('id, name, fields, status, client_id, submit_action, settings')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (form.status !== 'published' && form.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Form is not accepting submissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
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
      // Write analytics: submit_failure
      await supabase.from('gos_analytics_events').insert({
        event_type: 'form_submit_failure',
        entity_type: 'form',
        entity_id: formId,
        client_id: form.client_id,
        ip_hash: ipHash,
        metadata: { reason: 'validation', errors: validationErrors },
      });
      return new Response(JSON.stringify({ error: 'Validation failed', details: validationErrors }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const source = body.source || 'embed';

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from('gos_form_submissions')
      .insert({ form_id: formId, data: submissionData, source, ip_address: ipAddress })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save submission' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Write analytics: form_submit_success
    await supabase.from('gos_analytics_events').insert({
      event_type: 'form_submit_success',
      entity_type: 'form',
      entity_id: formId,
      client_id: form.client_id,
      ip_hash: ipHash,
      user_agent: userAgent.substring(0, 500),
      referrer: referrer.substring(0, 500),
    });

    // Handle submit_action
    const submitAction = form.submit_action || 'store';
    const actionResults: Record<string, any> = { store: 'saved' };

    if (submitAction === 'webhook') {
      const settings = (form.settings || {}) as Record<string, any>;
      const webhookUrl = settings.webhook_url;
      if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
        if (!isUrlSafeForWebhook(webhookUrl)) {
          actionResults.webhook = 'blocked_ssrf_protection';
        } else {
          try {
            const webhookRes = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                form_id: formId, form_name: form.name, submission_id: submission.id,
                data: submissionData, source, submitted_at: new Date().toISOString(),
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
      // CRM lead creation via existing platform CRM infrastructure
      const settings = (form.settings || {}) as Record<string, any>;
      const pipelineId = settings.crm_pipeline_id;
      
      if (!pipelineId) {
        actionResults.crm = 'no_pipeline_configured';
      } else if (!form.client_id) {
        actionResults.crm = 'no_client_id_on_form';
      } else {
        try {
          // Get default stage for the pipeline
          const { data: stages } = await supabase
            .from('crm_pipeline_stages')
            .select('id')
            .eq('pipeline_id', pipelineId)
            .order('position', { ascending: true })
            .limit(1);

          const stageId = settings.crm_stage_id || stages?.[0]?.id;
          if (!stageId) {
            actionResults.crm = 'no_stage_found';
          } else {
            // Build lead from submission data
            const firstName = submissionData.first_name || submissionData.name?.split(' ')[0] || submissionData.firstName || '';
            const lastName = submissionData.last_name || submissionData.name?.split(' ').slice(1).join(' ') || submissionData.lastName || '';
            const fullName = submissionData.full_name || submissionData.name || `${firstName} ${lastName}`.trim() || 'Unknown';
            const email = submissionData.email || '';
            const phone = submissionData.phone || submissionData.tel || '';

            // Check for duplicate by email
            let isDuplicate = false;
            let duplicateOf: string | null = null;
            if (email) {
              const { data: existing } = await supabase
                .from('crm_leads')
                .select('id')
                .eq('client_id', form.client_id)
                .eq('email', email.toLowerCase())
                .limit(1);
              if (existing && existing.length > 0) {
                isDuplicate = true;
                duplicateOf = existing[0].id;
              }
            }

            const { data: lead, error: leadError } = await supabase
              .from('crm_leads')
              .insert({
                client_id: form.client_id,
                pipeline_id: pipelineId,
                stage_id: stageId,
                first_name: firstName.substring(0, 100),
                last_name: lastName.substring(0, 100),
                full_name: fullName.substring(0, 200),
                email: email.toLowerCase().substring(0, 255),
                phone: phone.substring(0, 50),
                company: (submissionData.company || '').substring(0, 200),
                source: `gos_form:${form.name}`,
                is_duplicate: isDuplicate,
                duplicate_of: duplicateOf,
                raw_payload: submissionData,
              })
              .select('id')
              .single();

            if (leadError) {
              actionResults.crm = `error: ${leadError.message}`;
              console.error('CRM lead creation error:', leadError);
            } else {
              actionResults.crm = 'lead_created';
              actionResults.crm_lead_id = lead.id;

              // Log activity
              await supabase.from('crm_lead_activities').insert({
                lead_id: lead.id,
                type: 'created',
                payload: { source: 'gos_form', form_id: formId, form_name: form.name, submission_id: submission.id },
              });
            }
          }
        } catch (e) {
          actionResults.crm = 'error';
          console.error('CRM error:', e);
        }
      }
    }

    // Evaluate routing rules
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
    const routingMetadata = { source, form_id: formId, form_name: form.name, client_id: form.client_id || '' };

    if (rules && rules.length > 0) {
      for (const rule of rules as RoutingRule[]) {
        const matched = evaluateRule(rule, submissionData, routingMetadata);
        if (!matched) continue;
        matchedRules.push(rule);

        let routedTo = '';
        let actionTaken = rule.action_type;
        let executionStatus = 'logged';

        switch (rule.action_type) {
          case 'assign_user': {
            const userId = rule.action_config?.user_id;
            routedTo = userId || 'unspecified';
            // If we created a CRM lead, actually assign it
            if (actionResults.crm_lead_id && userId) {
              const { error: assignErr } = await supabase
                .from('crm_leads')
                .update({ assignee_id: userId })
                .eq('id', actionResults.crm_lead_id);
              executionStatus = assignErr ? 'execution_failed' : 'executed';
              actionTaken = `assigned_to_user:${executionStatus}`;
            } else {
              actionTaken = 'assign_user:no_lead_to_assign';
            }
            break;
          }
          case 'assign_pipeline': {
            const pId = rule.action_config?.pipeline_id;
            routedTo = pId || 'unspecified';
            if (actionResults.crm_lead_id && pId) {
              // Get first stage of target pipeline
              const { data: stgs } = await supabase
                .from('crm_pipeline_stages')
                .select('id')
                .eq('pipeline_id', pId)
                .order('position', { ascending: true })
                .limit(1);
              if (stgs?.[0]?.id) {
                const { error: pipeErr } = await supabase
                  .from('crm_leads')
                  .update({ pipeline_id: pId, stage_id: stgs[0].id })
                  .eq('id', actionResults.crm_lead_id);
                executionStatus = pipeErr ? 'execution_failed' : 'executed';
              } else {
                executionStatus = 'no_stages_found';
              }
              actionTaken = `routed_to_pipeline:${executionStatus}`;
            } else {
              actionTaken = 'assign_pipeline:no_lead_to_route';
            }
            break;
          }
          case 'tag': {
            routedTo = rule.action_config?.tag || 'unspecified';
            if (actionResults.crm_lead_id && routedTo !== 'unspecified') {
              // Add tag to CRM lead
              const { data: currentLead } = await supabase
                .from('crm_leads')
                .select('tags')
                .eq('id', actionResults.crm_lead_id)
                .single();
              const currentTags = (currentLead?.tags || []) as string[];
              if (!currentTags.includes(routedTo)) {
                await supabase.from('crm_leads')
                  .update({ tags: [...currentTags, routedTo] })
                  .eq('id', actionResults.crm_lead_id);
              }
              executionStatus = 'executed';
            }
            actionTaken = `tagged:${executionStatus}`;
            break;
          }
          case 'webhook': {
            const webhookUrl = rule.action_config?.url;
            routedTo = webhookUrl || 'unspecified';
            if (webhookUrl && isUrlSafeForWebhook(webhookUrl)) {
              try {
                const res = await fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'routing_match', rule_name: rule.name,
                    submission_id: submission.id, form_id: formId,
                    data: submissionData, source, matched_at: new Date().toISOString(),
                  }),
                });
                executionStatus = res.ok ? 'executed' : `failed_${res.status}`;
              } catch (e) {
                executionStatus = 'execution_error';
                console.error('Routing webhook error:', e);
              }
            } else if (webhookUrl && !isUrlSafeForWebhook(webhookUrl)) {
              executionStatus = 'blocked_ssrf';
            } else {
              executionStatus = 'no_url';
            }
            actionTaken = `webhook:${executionStatus}`;
            break;
          }
          case 'notify': {
            const channel = rule.action_config?.channel || 'email';
            routedTo = channel;
            // Use platform send-notification edge function for email
            if (channel === 'email') {
              try {
                const notifyPayload = {
                  type: 'alert',
                  title: `Routing: ${rule.name}`,
                  message: `New lead matched rule "${rule.name}" from form "${form.name}". Source: ${source}`,
                  link: '/growth-os/lead-routing',
                };
                // Get admin user IDs for notification
                const { data: admins } = await supabase
                  .from('agency_users')
                  .select('user_id')
                  .eq('agency_role', 'AgencyAdmin')
                  .limit(5);
                if (admins && admins.length > 0) {
                  const adminIds = admins.map((a: any) => a.user_id);
                  // Insert notifications directly (platform pattern)
                  for (const uid of adminIds) {
                    await supabase.from('notifications' as any).insert({
                      user_id: uid,
                      title: notifyPayload.title,
                      message: notifyPayload.message,
                      type: 'info',
                      link: notifyPayload.link,
                    });
                  }
                  executionStatus = 'executed';
                } else {
                  executionStatus = 'no_admin_users';
                }
              } catch (e) {
                executionStatus = 'execution_error';
                console.error('Notify error:', e);
              }
            } else if (channel === 'telegram') {
              // Use existing Telegram bot infrastructure
              try {
                const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
                const chatId = rule.action_config?.telegram_chat_id;
                if (botToken && chatId) {
                  const text = `🔔 Routing: ${rule.name}\nForm: ${form.name}\nSource: ${source}\nLead: ${submissionData.name || submissionData.email || 'Unknown'}`;
                  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
                  });
                  executionStatus = tgRes.ok ? 'executed' : `failed_${tgRes.status}`;
                } else {
                  executionStatus = botToken ? 'no_chat_id' : 'no_bot_token';
                }
              } catch (e) {
                executionStatus = 'execution_error';
                console.error('Telegram notify error:', e);
              }
            } else {
              executionStatus = 'unsupported_channel';
            }
            actionTaken = `notify_${channel}:${executionStatus}`;
            break;
          }
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

    if (matchedRules.length === 0 && rules && rules.length > 0) {
      await supabase.from('gos_routing_log').insert({
        rule_id: null, lead_id: submission.id, lead_source: source,
        routed_to: null, action_taken: 'no_rules_matched', matched_conditions: null,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      submission_id: submission.id,
      rules_matched: matchedRules.length,
      submit_action: submitAction,
      action_results: actionResults,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
