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
      // Only use scopes that are valid without App Review for development.
      // For production (Live mode), add: pages_read_engagement, instagram_manage_insights
      const scopes = [
        'public_profile',
        'email',
        'pages_show_list',
        'pages_read_engagement',
      ].join(',');

      const state = encodeURIComponent(JSON.stringify({ userId: claims.sub }));
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;

      return new Response(JSON.stringify({ url: oauthUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── EXCHANGE CODE FOR TOKEN ───────────────────────────────
    if (req.method === 'POST' && action === 'exchange') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const body = await req.json();
      const { code } = body;
      // Always use the canonical HTTPS redirect URI (must match Meta App settings)
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

      // Save Facebook connection
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabaseAdmin.from('social_media_connections').upsert({
        platform: 'facebook',
        access_token: finalToken,
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
          // Get IG username
          const igUserRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=name,username&access_token=${pageToken}`);
          const igUserData = await igUserRes.json();
          await supabaseAdmin.from('social_media_connections').upsert({
            platform: 'instagram',
            access_token: pageToken,
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

      console.log('[meta-oauth] tokens saved successfully for pages:', pages.map((p: any) => p.name));
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
        .select('*')
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .maybeSingle();

      if (!conn) return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const token = conn.access_token;
      const igId = conn.ig_user_id;

      // Fetch profile + follower count
      const profileRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=followers_count,follows_count,media_count,username,profile_picture_url,biography,website&access_token=${token}`
      );
      const profile = await profileRes.json();

      // Fetch insights: reach, impressions for last 30 days
      const insightRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/insights?metric=reach,impressions,profile_views,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`
      );
      const insights = await insightRes.json();

      // Fetch recent media
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
        .select('*')
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .maybeSingle();

      if (!conn) return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const pageToken = conn.access_token;
      const pageId = conn.page_id;

      // Fetch page info
      const pageRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=name,fan_count,followers_count,picture,about,website&access_token=${pageToken}`
      );
      const page = await pageRes.json();

      // Fetch page insights
      const insightRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_reach,page_fan_adds,page_views_total&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${pageToken}`
      );
      const insights = await insightRes.json();

      // Fetch recent posts
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
      await supabaseAdmin.from('social_media_connections').update({ is_active: false }).eq('platform', platform);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── GET CONNECTION STATUS ─────────────────────────────────
    if (req.method === 'GET' && action === 'status') {
      const claims = await getAuthUser(req);
      if (!claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await supabaseAdmin.from('social_media_connections').select('platform, page_name, ig_user_id, connected_at, is_active').eq('is_active', true);
      return new Response(JSON.stringify({ connections: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
