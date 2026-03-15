/**
 * Facebook Lead Gen Webhook — Handles Meta webhook verification + lead ingestion + automation trigger.
 *
 * GET  — Meta verification challenge (hub.mode=subscribe, hub.verify_token, hub.challenge)
 * POST — Leadgen event payload from Meta, dedupes by fb_lead_id, matches active automations, executes them.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = 'afm_fb_leadgen_verify_2024';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── GET: Meta Webhook Verification Challenge ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      console.log('[fb-leadgen-webhook] Verification challenge accepted');

      // Mark all fb_lead_form automations as webhook_verified
      const { data: automations } = await supabase
        .from('automations')
        .select('id, trigger_config')
        .eq('trigger_type', 'fb_lead_form');

      for (const auto of automations || []) {
        const tc = (auto.trigger_config as Record<string, unknown>) || {};
        if (!tc.webhook_verified) {
          await supabase.from('automations').update({
            trigger_config: { ...tc, webhook_verified: true, last_verified_at: new Date().toISOString() },
          }).eq('id', auto.id);
        }
      }

      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Verification failed', { status: 403 });
  }

  // ── POST: Leadgen Event from Meta ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Log raw ingestion
      await supabase.from('audit_log').insert({
        action: 'fb_leadgen_webhook_received',
        entity_type: 'fb_leadgen',
        details: { raw_payload: body, received_at: new Date().toISOString() },
      });

      const entries = body?.entry || [];
      let leadsProcessed = 0;
      let automationsTriggered = 0;
      const errors: string[] = [];

      for (const entry of entries) {
        const pageId = String(entry.id || '');
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field !== 'leadgen') continue;
          const leadgenId = String(change.value?.leadgen_id || '');
          const formId = String(change.value?.form_id || '');
          const adId = String(change.value?.ad_id || '');
          const createdTime = change.value?.created_time;

          if (!leadgenId) {
            errors.push('Missing leadgen_id in change');
            continue;
          }

          // ── Idempotency: check if we already processed this lead ──
          const { data: existing } = await supabase
            .from('audit_log')
            .select('id')
            .eq('action', 'fb_leadgen_processed')
            .eq('entity_id', leadgenId)
            .maybeSingle();

          if (existing) {
            console.log(`[fb-leadgen-webhook] Duplicate leadgen_id ${leadgenId}, skipping`);
            continue;
          }

          // ── Fetch real lead data from Meta Graph API ──
          let leadData: Record<string, unknown> = {
            leadgen_id: leadgenId,
            form_id: formId,
            page_id: pageId,
            ad_id: adId,
            created_time: createdTime,
          };

          // Try to fetch actual lead data from Meta using stored token
          const metaToken = Deno.env.get('META_SYSTEM_USER_TOKEN');
          if (metaToken) {
            try {
              const leadResp = await fetch(
                `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${metaToken}`
              );
              if (leadResp.ok) {
                const ld = await leadResp.json();
                const fieldData: Record<string, string> = {};
                for (const fd of ld.field_data || []) {
                  fieldData[fd.name] = Array.isArray(fd.values) ? fd.values[0] : fd.values;
                }
                leadData = {
                  ...leadData,
                  full_name: fieldData.full_name || fieldData.name || '',
                  email: fieldData.email || '',
                  phone: fieldData.phone_number || fieldData.phone || '',
                  ...fieldData,
                  fb_lead_id: leadgenId,
                  fb_form_id: formId,
                  fb_page_id: pageId,
                  fb_ad_id: adId,
                  platform: 'facebook',
                  source: 'fb_lead_form',
                };
              } else {
                console.error(`[fb-leadgen-webhook] Failed to fetch lead ${leadgenId}: ${leadResp.status}`);
                leadData.fetch_error = `Meta API ${leadResp.status}`;
              }
            } catch (fetchErr) {
              console.error(`[fb-leadgen-webhook] Fetch error for lead ${leadgenId}:`, fetchErr);
              leadData.fetch_error = String(fetchErr);
            }
          }

          // Mark as processed for idempotency
          await supabase.from('audit_log').insert({
            action: 'fb_leadgen_processed',
            entity_type: 'fb_leadgen',
            entity_id: leadgenId,
            details: { page_id: pageId, form_id: formId, ad_id: adId },
          });

          leadsProcessed++;

          // ── Match active automations ──
          const { data: matchingAutos } = await supabase
            .from('automations')
            .select('id, trigger_config, client_id, is_active')
            .eq('trigger_type', 'fb_lead_form')
            .eq('is_active', true);

          for (const auto of matchingAutos || []) {
            const tc = (auto.trigger_config as Record<string, unknown>) || {};
            // Match by page_id and optionally form_id
            const configPageId = String(tc.page_id || '');
            const configFormId = String(tc.form_id || '');

            if (configPageId && configPageId !== pageId) continue;
            if (configFormId && configFormId !== formId) continue;

            // Execute the automation
            try {
              const execResp = await fetch(`${supabaseUrl}/functions/v1/automation-execute`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                  automation_id: auto.id,
                  trigger_payload: leadData,
                  test_mode: false,
                  _system_trigger: true,
                }),
              });
              const execResult = await execResp.json();
              console.log(`[fb-leadgen-webhook] Automation ${auto.id} result:`, execResult);
              automationsTriggered++;
            } catch (execErr) {
              console.error(`[fb-leadgen-webhook] Failed to execute automation ${auto.id}:`, execErr);
              errors.push(`Automation ${auto.id}: ${String(execErr)}`);
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        leads_processed: leadsProcessed,
        automations_triggered: automationsTriggered,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('[fb-leadgen-webhook] Error:', err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
