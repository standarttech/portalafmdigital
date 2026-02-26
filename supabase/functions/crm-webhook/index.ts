import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing endpoint slug' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find webhook endpoint by slug
    const { data: endpoint, error: epError } = await supabase
      .from('crm_webhook_endpoints')
      .select('*')
      .eq('endpoint_slug', slug)
      .eq('is_active', true)
      .single();

    if (epError || !endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate secret key
    const webhookSecret = req.headers.get('x-webhook-secret') || '';
    if (endpoint.secret_key && webhookSecret !== endpoint.secret_key) {
      await logWebhook(supabase, endpoint.id, 'error', null, 'Invalid secret key');
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      await logWebhook(supabase, endpoint.id, 'error', null, 'Invalid JSON body');
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract lead data with field mapping support
    const leadData = {
      client_id: endpoint.client_id,
      pipeline_id: endpoint.pipeline_id,
      stage_id: endpoint.default_stage_id,
      first_name: sanitize(body.first_name || body.firstName || body.name?.split(' ')[0] || '', 100),
      last_name: sanitize(body.last_name || body.lastName || body.name?.split(' ').slice(1).join(' ') || '', 100),
      full_name: sanitize(body.full_name || body.fullName || body.name || `${body.first_name || ''} ${body.last_name || ''}`.trim(), 200),
      email: sanitize(body.email || '', 255).toLowerCase(),
      phone: sanitize(body.phone || body.phone_number || body.phoneNumber || '', 50),
      company: sanitize(body.company || body.company_name || '', 200),
      source: sanitize(body.source || endpoint.source_label || 'webhook', 100),
      utm_source: sanitize(body.utm_source || '', 200) || null,
      utm_medium: sanitize(body.utm_medium || '', 200) || null,
      utm_campaign: sanitize(body.utm_campaign || '', 200) || null,
      utm_content: sanitize(body.utm_content || '', 200) || null,
      utm_term: sanitize(body.utm_term || '', 200) || null,
      campaign_name: sanitize(body.campaign_name || '', 200) || null,
      adset_name: sanitize(body.adset_name || '', 200) || null,
      ad_name: sanitize(body.ad_name || '', 200) || null,
      form_name: sanitize(body.form_name || '', 200) || null,
      landing_page: sanitize(body.landing_page || '', 500) || null,
      external_lead_id: sanitize(body.external_lead_id || body.lead_id || '', 200) || null,
      tags: Array.isArray(body.tags) ? body.tags.map((t: string) => sanitize(t, 50)).slice(0, 20) : [],
      raw_payload: body,
      status: 'open',
      priority: 'medium',
      value: typeof body.value === 'number' ? body.value : 0,
    };

    // If no default stage, get first stage
    if (!leadData.stage_id) {
      const { data: firstStage } = await supabase
        .from('crm_pipeline_stages')
        .select('id')
        .eq('pipeline_id', endpoint.pipeline_id)
        .order('position')
        .limit(1)
        .single();
      if (firstStage) leadData.stage_id = firstStage.id;
    }

    if (!leadData.stage_id) {
      await logWebhook(supabase, endpoint.id, 'error', body, 'No stages configured for pipeline');
      return new Response(JSON.stringify({ error: 'No stages configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplication check by email or phone
    let isDuplicate = false;
    let duplicateOfId = null;
    if (leadData.email) {
      const { data: existing } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('client_id', endpoint.client_id)
        .eq('email', leadData.email)
        .limit(1)
        .single();
      if (existing) {
        isDuplicate = true;
        duplicateOfId = existing.id;
      }
    }
    if (!isDuplicate && leadData.phone) {
      const { data: existing } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('client_id', endpoint.client_id)
        .eq('phone', leadData.phone)
        .limit(1)
        .single();
      if (existing) {
        isDuplicate = true;
        duplicateOfId = existing.id;
      }
    }

    // Insert lead
    const { data: newLead, error: insertError } = await supabase
      .from('crm_leads')
      .insert({
        ...leadData,
        is_duplicate: isDuplicate,
        duplicate_of: duplicateOfId,
      })
      .select('id')
      .single();

    if (insertError) {
      await logWebhook(supabase, endpoint.id, 'error', body, insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create lead', details: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log activity
    await supabase.from('crm_lead_activities').insert({
      lead_id: newLead.id,
      type: 'webhook_received',
      payload: { source: leadData.source, endpoint: endpoint.name, is_duplicate: isDuplicate },
    });

    await logWebhook(supabase, endpoint.id, 'success', body, `Lead created: ${newLead.id}${isDuplicate ? ' (duplicate)' : ''}`);

    return new Response(JSON.stringify({
      success: true,
      lead_id: newLead.id,
      is_duplicate: isDuplicate,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('CRM Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logWebhook(supabase: any, endpointId: string, status: string, payload: any, message: string) {
  try {
    await supabase.from('crm_webhook_logs').insert({
      endpoint_id: endpointId,
      status,
      request_payload: payload,
      response_message: message,
    });
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }
}

function sanitize(value: string, maxLength: number): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().substring(0, maxLength);
}
