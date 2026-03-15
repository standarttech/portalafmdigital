/**
 * Facebook Lead Gen Webhook — Production
 *
 * GET  — Meta verification challenge (hub.verify_token from env)
 * POST — Leadgen event: dedupes via fb_leadgen_events table, matches active automations, executes.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify token from env — NOT hardcoded
  const VERIFY_TOKEN = Deno.env.get('FB_LEADGEN_VERIFY_TOKEN') || '';

  // ── GET: Meta Webhook Verification Challenge ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token && token === VERIFY_TOKEN && challenge) {
      console.log('[fb-leadgen-webhook] Verification challenge accepted');
      // NOTE: We do NOT mass-update all automations here.
      // Webhook verification is platform-level, not per-automation.
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Verification failed', { status: 403 });
  }

  // ── POST: Leadgen Event from Meta ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();
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

          // ── Idempotency: insert into fb_leadgen_events, skip on conflict ──
          const { data: inserted, error: insertErr } = await supabase
            .from('fb_leadgen_events')
            .insert({
              leadgen_id: leadgenId,
              page_id: pageId,
              form_id: formId,
              ad_id: adId,
              created_time: createdTime ? new Date(createdTime * 1000).toISOString() : null,
              raw_payload: change.value,
              status: 'received',
            })
            .select('id')
            .single();

          if (insertErr) {
            // Unique constraint violation = duplicate
            if (insertErr.code === '23505') {
              console.log(`[fb-leadgen-webhook] Duplicate leadgen_id ${leadgenId}, skipping`);
              continue;
            }
            console.error(`[fb-leadgen-webhook] Insert error:`, insertErr.message);
            errors.push(`Insert error for ${leadgenId}: ${insertErr.message}`);
            continue;
          }

          const eventId = inserted?.id;

          // ── Fetch real lead data from Meta Graph API ──
          let leadData: Record<string, unknown> = {
            leadgen_id: leadgenId,
            form_id: formId,
            page_id: pageId,
            ad_id: adId,
            created_time: createdTime,
          };

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

                // Update event with fetched data
                await supabase.from('fb_leadgen_events').update({
                  status: 'fetched',
                  lead_data: leadData,
                  normalized_payload: fieldData,
                }).eq('id', eventId);
              } else {
                const errText = await leadResp.text();
                console.error(`[fb-leadgen-webhook] Meta API ${leadResp.status}: ${errText}`);
                await supabase.from('fb_leadgen_events').update({
                  status: 'fetched',
                  error: `Meta API ${leadResp.status}`,
                  lead_data: leadData,
                }).eq('id', eventId);
              }
            } catch (fetchErr) {
              console.error(`[fb-leadgen-webhook] Fetch error for ${leadgenId}:`, fetchErr);
              await supabase.from('fb_leadgen_events').update({
                error: String(fetchErr),
                lead_data: leadData,
              }).eq('id', eventId);
            }
          }

          leadsProcessed++;

          // ── Match active automations by page_id + form_id (strict) ──
          const { data: matchingAutos } = await supabase
            .from('automations')
            .select('id, trigger_config, client_id')
            .eq('trigger_type', 'fb_lead_form')
            .eq('is_active', true);

          let matched = false;
          for (const auto of matchingAutos || []) {
            const tc = (auto.trigger_config as Record<string, unknown>) || {};
            const configPageId = String(tc.page_id || '');
            const configFormId = String(tc.form_id || '');

            // Must have live_ingestion_active
            if (!tc.live_ingestion_active) continue;
            // Must match page_id exactly
            if (!configPageId || configPageId !== pageId) continue;
            // Must match form_id exactly (both must be present)
            if (!configFormId || configFormId !== formId) continue;

            matched = true;

            // Update event status
            await supabase.from('fb_leadgen_events').update({
              status: 'matched',
              matched_automation_id: auto.id,
            }).eq('id', eventId);

            // Execute
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

              await supabase.from('fb_leadgen_events').update({
                status: execResult.status === 'completed' ? 'executed' : 'failed',
                error: execResult.status !== 'completed' ? JSON.stringify(execResult) : null,
                processed_at: new Date().toISOString(),
              }).eq('id', eventId);

              console.log(`[fb-leadgen-webhook] Automation ${auto.id} → ${execResult.status}`);
              automationsTriggered++;
            } catch (execErr) {
              console.error(`[fb-leadgen-webhook] Exec error ${auto.id}:`, execErr);
              await supabase.from('fb_leadgen_events').update({
                status: 'failed',
                error: String(execErr),
                processed_at: new Date().toISOString(),
              }).eq('id', eventId);
              errors.push(`Automation ${auto.id}: ${String(execErr)}`);
            }
          }

          if (!matched) {
            await supabase.from('fb_leadgen_events').update({
              status: 'received',
              error: 'No matching active automation found',
            }).eq('id', eventId);
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
