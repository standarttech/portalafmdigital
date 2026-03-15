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
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { sub: user.id, email: user.email };
}

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
      const scopes = ['public_profile', 'email'].join(',');
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

      const appOrigin = req.headers.get('referer')?.match(/^https?:\/\/[^/]+/)?.[0] || 'https://portalafmdigital.lovable.app';
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

      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&redirect_uri=${encodeURIComponent(canonicalRedirectUri)}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error: 'Failed to get token', detail: tokenData }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      const finalToken = longData.access_token || tokenData.access_token;
      const expiresIn = longData.expires_in || tokenData.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${finalToken}`);
      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const fbTokenRef = await storeTokenInVault(supabaseAdmin, finalToken, `social_facebook_${claims.sub}`);

      await supabaseAdmin.from('social_media_connections').upsert({
        platform: 'facebook',
        access_token: '',
        token_reference: fbTokenRef,
        token_expires_at: expiresAt,
        connected_by: claims.sub,
        connected_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        is_active: true,
        page_name: pages[0]?.name || null,
        page_id: pages[0]?.id || null,
      }, { onConflict: 'platform' });

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
          const igTokenRef = await storeTokenInVault(supabaseAdmin, pageToken, `social_instagram_${claims.sub}`);

          await supabaseAdmin.from('social_media_connections').upsert({
            platform: 'instagram',
            access_token: '',
            token_reference: igTokenRef,
            token_expires_at: null,
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

      return new Response(JSON.stringify({ success: true, pages: pages.map((p: any) => ({ id: p.id, name: p.name })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── LIST PAGES — load Facebook Pages for a platform_connection ──
    if (req.method === 'POST' && action === 'list-pages') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const body = await req.json();
      const connectionId = body.connection_id;
      const useManagement = body.use_management_token === true;

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Helper to fetch pages from a token
      const fetchPages = async (token: string, source: string) => {
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${token}`);
        const pagesData = await pagesRes.json();
        if (pagesData.data && pagesData.data.length > 0) {
          return { pages: pagesData.data.map((p: any) => ({ id: p.id, name: p.name })), source };
        }
        return { pages: [], error: pagesData.error?.message || 'No pages accessible with this token.', source };
      };

      // 1. If use_management_token, try platform_integrations meta_ads_management first
      if (useManagement || !connectionId) {
        const { data: mgmt } = await supabaseAdmin
          .from('platform_integrations')
          .select('secret_ref')
          .eq('integration_type', 'meta_ads_management')
          .eq('is_active', true)
          .maybeSingle();
        if (mgmt?.secret_ref) {
          const token = await getTokenFromVault(supabaseAdmin, mgmt.secret_ref);
          if (token) {
            try {
              const result = await fetchPages(token, 'meta_ads_management');
              if (result.pages.length > 0) {
                return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
              }
            } catch { /* fall through */ }
          }
        }
      }

      // 2. Try platform_connections (client-scoped ad token)
      if (connectionId) {
        const { data: conn } = await supabaseAdmin
          .from('platform_connections')
          .select('token_reference, platform')
          .eq('id', connectionId)
          .maybeSingle();
        if (conn?.token_reference) {
          const token = await getTokenFromVault(supabaseAdmin, conn.token_reference);
          if (token) {
            try {
              const result = await fetchPages(token, 'platform_connection');
              if (result.pages.length > 0) {
                return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
              }
            } catch { /* fall through */ }
          }
        }
      }

      // 3. Fallback: social_media_connections
      const { data: socialConn } = await supabaseAdmin
        .from('social_media_connections')
        .select('page_id, page_name, token_reference')
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .maybeSingle();
      if (socialConn?.token_reference) {
        const token = await getTokenFromVault(supabaseAdmin, socialConn.token_reference);
        if (token) {
          try {
            const result = await fetchPages(token, 'social_media_connection');
            if (result.pages.length > 0) {
              return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          } catch { /* fall through */ }
        }
        if (socialConn.page_id) {
          return new Response(JSON.stringify({
            pages: [{ id: socialConn.page_id, name: socialConn.page_name || 'Facebook Page' }],
            source: 'social_media_connection_stored',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // 4. System token
      const systemToken = Deno.env.get('META_SYSTEM_USER_TOKEN');
      if (systemToken) {
        try {
          const result = await fetchPages(systemToken, 'system_token');
          if (result.pages.length > 0) {
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch { /* fall through */ }
      }

      return new Response(JSON.stringify({
        pages: [],
        error: 'No pages found. The token may lack page permissions (ads_management or pages_read_engagement scope). Enter Page ID manually.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── LIST LEAD FORMS — for a given page ──
    if (req.method === 'POST' && action === 'list-forms') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const body = await req.json();
      const { page_id, connection_id } = body;

      if (!page_id) {
        return new Response(JSON.stringify({ error: 'page_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Try to get a usable token
      let token: string | null = null;

      // 1. From platform_connection
      if (connection_id) {
        const { data: conn } = await supabaseAdmin
          .from('platform_connections')
          .select('token_reference')
          .eq('id', connection_id)
          .maybeSingle();
        if (conn?.token_reference) {
          token = await getTokenFromVault(supabaseAdmin, conn.token_reference);
        }
      }

      // 2. From social_media_connections
      if (!token) {
        const { data: sc } = await supabaseAdmin
          .from('social_media_connections')
          .select('token_reference')
          .eq('platform', 'facebook')
          .eq('is_active', true)
          .maybeSingle();
        if (sc?.token_reference) {
          token = await getTokenFromVault(supabaseAdmin, sc.token_reference);
        }
      }

      // 3. System token
      if (!token) {
        token = Deno.env.get('META_SYSTEM_USER_TOKEN') || null;
      }

      if (!token) {
        return new Response(JSON.stringify({
          forms: [],
          error: 'No token available to query lead forms. Enter Form ID manually.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      try {
        const formsRes = await fetch(
          `https://graph.facebook.com/v21.0/${page_id}/leadgen_forms?fields=id,name,status&access_token=${token}`
        );
        const formsData = await formsRes.json();

        if (formsData.error) {
          return new Response(JSON.stringify({
            forms: [],
            error: formsData.error.message || 'Failed to load forms. Requires ads_management or leads_retrieval permission.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          forms: (formsData.data || []).map((f: any) => ({ id: f.id, name: f.name, status: f.status })),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ forms: [], error: String(err) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

      const token = conn.token_reference ? await getTokenFromVault(supabaseAdmin, conn.token_reference) : null;
      if (!token) return new Response(JSON.stringify({ error: 'Token unavailable' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const igId = conn.ig_user_id;
      const profileRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=followers_count,follows_count,media_count,username,profile_picture_url,biography,website&access_token=${token}`);
      const profile = await profileRes.json();
      const insightRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/insights?metric=reach,impressions,profile_views,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`);
      const insights = await insightRes.json();
      const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,insights.metric(impressions,reach,plays)&limit=12&access_token=${token}`);
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

      const pageToken = conn.token_reference ? await getTokenFromVault(supabaseAdmin, conn.token_reference) : null;
      if (!pageToken) return new Response(JSON.stringify({ error: 'Token unavailable' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const pageId = conn.page_id;
      const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name,fan_count,followers_count,picture,about,website&access_token=${pageToken}`);
      const page = await pageRes.json();
      const insightRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_reach,page_fan_adds,page_views_total&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${pageToken}`);
      const insights = await insightRes.json();
      const postsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${pageToken}`);
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
