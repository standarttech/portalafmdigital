import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_APP_ID = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims;
}

/** Store a token in Vault and return its UUID reference */
async function storeTokenInVault(supabaseAdmin: ReturnType<typeof createClient>, token: string, name: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('store_social_token', {
    _secret_value: token,
    _secret_name: name,
  });
  if (error) {
    console.error('[meta-oauth] vault store error:', error.message);
    return null;
  }
  return data as string;
}

/** Retrieve a decrypted token from Vault by UUID reference */
async function getTokenFromVault(supabaseAdmin: ReturnType<typeof createClient>, tokenReference: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('get_social_token', {
    _token_reference: tokenReference,
  });
  if (error) {
    console.error('[meta-oauth] vault get error:', error.message);
    return null;
  }
  return data as string;
}

/** Delete a Vault secret by UUID reference */
async function deleteTokenFromVault(supabaseAdmin: ReturnType<typeof createClient>, tokenReference: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('delete_social_token', {
    _token_reference: tokenReference,
  });
  if (error) {
    console.error('[meta-oauth] vault delete error:', error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ── GET OAUTH URL ─────────────────────────────────────────
    if (req.method === 'GET' && action === 'auth-url') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const redirectUri = `https://${SUPABASE_URL.replace(/^https?:\/\//, '')}/functions/v1/meta-oauth?action=callback`;
      console.log('[meta-oauth] Generated OAuth URL with redirect_uri:', redirectUri);
      const scopes = [
        'public_profile',
        'pages_show_list',
        'pages_read_engagement',
        'pages_read_user_content',
        'instagram_basic',
        'instagram_manage_insights',
        'business_management',
      ].join(',');

      const state = encodeURIComponent(JSON.stringify({ userId: claims.sub }));
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;

      return new Response(JSON.stringify({ url: oauthUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── OAUTH CALLBACK (redirect from Facebook) ──────────────
    if (req.method === 'GET' && action === 'callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorReason = url.searchParams.get('error_reason');

      if (error || !code) {
        const html = `<!DOCTYPE html><html><body><script>
          window.opener && window.opener.postMessage({ type: 'meta-oauth-callback', error: '${errorReason || error || 'no_code'}' }, '*');
          window.close();
        </script><p>Authorization failed. You can close this window.</p></body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
      }

      // Determine the app origin from the Referer or state, fallback to known published URL
      const appOrigin = req.headers.get('referer')?.match(/^https?:\/\/[^/]+/)?.[0] || 'https://portalafmdigital.lovable.app';
      
      // Return HTML that sends the code to the opener and closes
      const html = `<!DOCTYPE html><html><body><script>
        try {
          if (window.opener) {
            window.opener.postMessage({ type: 'meta-oauth-callback', code: '${code}' }, '*');
            setTimeout(function() { window.close(); }, 500);
          } else {
            window.location.href = '${appOrigin}/afm-internal/social?meta_code=${code}';
          }
        } catch(e) {
          window.location.href = '${appOrigin}/afm-internal/social?meta_code=${code}';
        }
      </script><p>Connecting... Please wait.</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    // ── EXCHANGE CODE FOR TOKEN ───────────────────────────────
    if (req.method === 'POST' && action === 'exchange') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const body = await req.json();
      const { code } = body;
      const canonicalRedirectUri = `https://${SUPABASE_URL.replace(/^https?:\/\//, '')}/functions/v1/meta-oauth?action=callback`;
      console.log('[meta-oauth] exchange: using redirect_uri:', canonicalRedirectUri, 'code received:', !!code);

      // Exchange short-lived token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&redirect_uri=${encodeURIComponent(canonicalRedirectUri)}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error: 'Failed to get token', detail: tokenData }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Exchange for long-lived token
      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      const finalToken = longData.access_token || tokenData.access_token;
      const expiresIn = longData.expires_in || tokenData.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Get Facebook pages
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${finalToken}`);
      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Store Facebook token in Vault (encrypted), get reference UUID
      const fbTokenRef = await storeTokenInVault(supabaseAdmin, finalToken, `social_facebook_${claims.sub}`);

      // Save Facebook connection — token stored in Vault, only reference saved to DB
      await supabaseAdmin.from('social_media_connections').upsert({
        platform: 'facebook',
        access_token: '', // cleared — token now in Vault
        token_reference: fbTokenRef,
        token_expires_at: expiresAt,
        connected_by: claims.sub,
        connected_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        is_active: true,
        page_name: pages[0]?.name || null,
        page_id: pages[0]?.id || null,
      }, { onConflict: 'platform' });

      // Try to get Instagram Business account linked to first page
      if (pages.length > 0) {
        const pageToken = pages[0].access_token;
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${pages[0].id}?fields=instagram_business_account&access_token=${pageToken}`
        );
        const igData = await igRes.json();
        const igUserId = igData.instagram_business_account?.id;

        if (igUserId) {
          const igUserRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=name,username&access_token=${pageToken}`);
          const igUserData = await igUserRes.json();

          // Store Instagram page token in Vault
          const igTokenRef = await storeTokenInVault(supabaseAdmin, pageToken, `social_instagram_${claims.sub}`);

          await supabaseAdmin.from('social_media_connections').upsert({
            platform: 'instagram',
            access_token: '', // cleared — token now in Vault
            token_reference: igTokenRef,
            token_expires_at: null, // Page tokens don't expire
            connected_by: claims.sub,
            connected_at: new Date().toISOString(),
            last_refreshed_at: new Date().toISOString(),
            is_active: true,
            ig_user_id: igUserId,
            page_id: pages[0].id,
            page_name: igUserData.username || igUserData.name || 'Instagram Business',
          }, { onConflict: 'platform' });
        }
      }

      console.log('[meta-oauth] tokens saved to Vault for pages:', pages.map((p: any) => p.name));
      return new Response(JSON.stringify({ success: true, pages: pages.map((p: any) => ({ id: p.id, name: p.name })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── GET INSTAGRAM METRICS ─────────────────────────────────
    if (req.method === 'GET' && action === 'instagram-metrics') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: conn } = await supabaseAdmin
        .from('social_media_connections')
        .select('token_reference, ig_user_id')
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .maybeSingle();

      if (!conn) return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Retrieve token from Vault using reference
      const token = conn.token_reference
        ? await getTokenFromVault(supabaseAdmin, conn.token_reference)
        : null;

      if (!token) return new Response(JSON.stringify({ error: 'Token unavailable' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const igId = conn.ig_user_id;

      const profileRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=followers_count,follows_count,media_count,username,profile_picture_url,biography,website&access_token=${token}`
      );
      const profile = await profileRes.json();

      const insightRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/insights?metric=reach,impressions,profile_views,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`
      );
      const insights = await insightRes.json();

      const mediaRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,insights.metric(impressions,reach,plays)&limit=12&access_token=${token}`
      );
      const media = await mediaRes.json();

      return new Response(JSON.stringify({ profile, insights: insights.data || [], media: media.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── GET FACEBOOK PAGE METRICS ─────────────────────────────
    if (req.method === 'GET' && action === 'facebook-metrics') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: conn } = await supabaseAdmin
        .from('social_media_connections')
        .select('token_reference, page_id')
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .maybeSingle();

      if (!conn) return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Retrieve token from Vault using reference
      const pageToken = conn.token_reference
        ? await getTokenFromVault(supabaseAdmin, conn.token_reference)
        : null;

      if (!pageToken) return new Response(JSON.stringify({ error: 'Token unavailable' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const pageId = conn.page_id;

      const pageRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=name,fan_count,followers_count,picture,about,website&access_token=${pageToken}`
      );
      const page = await pageRes.json();

      const insightRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_reach,page_fan_adds,page_views_total&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${pageToken}`
      );
      const insights = await insightRes.json();

      const postsRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${pageToken}`
      );
      const posts = await postsRes.json();

      return new Response(JSON.stringify({ page, insights: insights.data || [], posts: posts.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DISCONNECT ────────────────────────────────────────────
    if (req.method === 'DELETE' && action === 'disconnect') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const body = await req.json();
      const { platform } = body;
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Retrieve token_reference before deactivating so we can delete from Vault
      const { data: conn } = await supabaseAdmin
        .from('social_media_connections')
        .select('token_reference')
        .eq('platform', platform)
        .eq('is_active', true)
        .maybeSingle();

      if (conn?.token_reference) {
        await deleteTokenFromVault(supabaseAdmin, conn.token_reference);
      }

      await supabaseAdmin
        .from('social_media_connections')
        .update({ is_active: false, token_reference: null, access_token: '' })
        .eq('platform', platform);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── GET CONNECTION STATUS ─────────────────────────────────
    if (req.method === 'GET' && action === 'status') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      // Only return safe metadata — never expose token_reference or access_token to client
      const { data } = await supabaseAdmin
        .from('social_media_connections')
        .select('platform, page_name, ig_user_id, connected_at, is_active')
        .eq('is_active', true);
      return new Response(JSON.stringify({ connections: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
