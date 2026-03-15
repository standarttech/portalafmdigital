/**
 * fb-leadgen-config — Admin-only endpoint to manage FB_LEADGEN_VERIFY_TOKEN
 *
 * GET  → returns { callback_url, verify_token, configured }
 * POST → generates or sets a new verify token
 *
 * Only AgencyAdmin users can access this endpoint.
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';

  // Auth check — must be AgencyAdmin
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check admin role
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: agencyUser } = await adminClient
    .from('agency_users')
    .select('agency_role')
    .eq('user_id', user.id)
    .single();

  if (!agencyUser || agencyUser.agency_role !== 'AgencyAdmin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const callbackUrl = `${supabaseUrl}/functions/v1/fb-leadgen-webhook`;

  // ── GET: Read current token ──
  if (req.method === 'GET') {
    const currentToken = Deno.env.get('FB_LEADGEN_VERIFY_TOKEN') || '';
    return new Response(JSON.stringify({
      callback_url: callbackUrl,
      verify_token: currentToken || null,
      configured: !!currentToken,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── POST: Generate or set token ──
  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      let newToken = body.token as string | undefined;

      // If no token provided, generate a secure one
      if (!newToken) {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        newToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      // The token is stored as a Supabase secret (FB_LEADGEN_VERIFY_TOKEN).
      // We cannot programmatically update Deno.env secrets at runtime.
      // Instead, store it in platform_settings table for persistence,
      // and the webhook will read from both env and DB.
      const { error: upsertErr } = await adminClient
        .from('platform_settings')
        .upsert({
          key: 'fb_leadgen_verify_token',
          value: JSON.stringify({ token: newToken, updated_at: new Date().toISOString(), updated_by: user.id }),
        }, { onConflict: 'key' });

      if (upsertErr) {
        console.error('[fb-leadgen-config] Upsert error:', upsertErr.message);
        return new Response(JSON.stringify({ error: upsertErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Audit log
      await adminClient.from('audit_log').insert({
        action: 'fb_leadgen_verify_token_updated',
        entity_type: 'platform_settings',
        entity_id: 'fb_leadgen_verify_token',
        user_id: user.id,
        details: { action: 'token_generated' },
      });

      return new Response(JSON.stringify({
        success: true,
        callback_url: callbackUrl,
        verify_token: newToken,
        configured: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
