import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  ShieldCheck, Instagram, Facebook, Loader2, Users, Eye, Heart,
  MessageCircle, TrendingUp, RefreshCw, LogOut, Image, Video, Grid3X3,
  BarChart3, Calendar, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const EDGE_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-oauth`;

interface Connection {
  platform: 'instagram' | 'facebook';
  page_name: string;
  ig_user_id?: string;
  connected_at: string;
  is_active: boolean;
}

interface IGProfile {
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography?: string;
  profile_picture_url?: string;
}

interface IGMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  insights?: { data: Array<{ name: string; values: Array<{ value: number }> }> };
}

interface FBPage {
  name: string;
  fan_count: number;
  followers_count: number;
  picture?: { data: { url: string } };
  about?: string;
}

interface InsightMetric {
  name: string;
  values: Array<{ value: number; end_time: string }>;
}

async function callEdge(action: string, method = 'GET', body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${EDGE_BASE}?action=${action}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Canonical redirect URI — must match Meta App settings exactly
const CANONICAL_REDIRECT_URI = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-oauth?action=callback`;

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MediaTypeIcon({ type }: { type: string }) {
  if (type === 'VIDEO') return <Video className="h-3 w-3" />;
  if (type === 'CAROUSEL_ALBUM') return <Grid3X3 className="h-3 w-3" />;
  return <Image className="h-3 w-3" />;
}

function sumInsight(data: InsightMetric[], name: string) {
  const metric = data.find(m => m.name === name);
  if (!metric) return 0;
  return metric.values.reduce((s, v) => s + (v.value || 0), 0);
}

function InstagramPanel({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<IGProfile | null>(null);
  const [insights, setInsights] = useState<InsightMetric[]>([]);
  const [media, setMedia] = useState<IGMedia[]>([]);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callEdge('instagram-metrics');
    if (data.error) {
      toast.error('Ошибка загрузки Instagram метрик');
    } else {
      setProfile(data.profile);
      setInsights(data.insights || []);
      setMedia(data.media || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const reach30 = sumInsight(insights, 'reach');
  const impressions30 = sumInsight(insights, 'impressions');
  const profileViews30 = sumInsight(insights, 'profile_views');
  const avgLikes = media.length ? Math.round(media.reduce((s, m) => s + m.like_count, 0) / media.length) : 0;
  const engRate = profile?.followers_count && avgLikes
    ? ((avgLikes / profile.followers_count) * 100).toFixed(2)
    : '—';

  return (
    <div className="space-y-5">
      {/* Profile */}
      {profile && (
        <motion.div variants={item} className="flex items-center gap-4 p-4 glass-card rounded-xl border border-border/40">
          {profile.profile_picture_url && (
            <img src={profile.profile_picture_url} alt={profile.username} className="h-14 w-14 rounded-full border-2 border-primary/30 object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-foreground">@{profile.username}</p>
              <Badge variant="outline" className="text-[10px] gap-1 border-pink-500/40 text-pink-400">
                <Instagram className="h-2.5 w-2.5" /> Instagram
              </Badge>
            </div>
            {profile.biography && <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.biography}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />Обновить
          </Button>
        </motion.div>
      )}

      {/* KPI Grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('afm.sm.followers')} value={profile?.followers_count ?? 0} icon={Users} />
        <StatCard label={t('afm.sm.reach')} value={reach30} icon={Eye} sub="30 дней" />
        <StatCard label={t('afm.sm.impressions')} value={impressions30} icon={BarChart3} sub="30 дней" />
        <StatCard label={t('afm.sm.engagement')} value={`${engRate}%`} icon={TrendingUp} sub="средний лайк/подп." />
      </motion.div>

      {/* Extra stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Подписок" value={profile?.follows_count ?? 0} icon={Users} />
        <StatCard label="Постов" value={profile?.media_count ?? 0} icon={Grid3X3} />
        <StatCard label="Просмотров профиля" value={profileViews30} icon={Eye} sub="30 дней" />
      </motion.div>

      {/* Recent media */}
      {media.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />{t('afm.sm.recentPosts')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map(m => {
              const plays = m.insights?.data?.find(d => d.name === 'plays')?.values?.[0]?.value;
              const reach = m.insights?.data?.find(d => d.name === 'reach')?.values?.[0]?.value;
              return (
                <Card key={m.id} className="glass-card overflow-hidden group cursor-default">
                  <div className="relative aspect-square bg-muted/30">
                    {(m.media_url || m.thumbnail_url) ? (
                      <img
                        src={m.thumbnail_url || m.media_url}
                        alt={m.caption || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MediaTypeIcon type={m.media_type} />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5">
                      <div className="bg-black/60 rounded-md p-0.5 text-white">
                        <MediaTypeIcon type={m.media_type} />
                      </div>
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{m.like_count.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{m.comments_count.toLocaleString()}</span>
                    </div>
                  </div>
                  <CardContent className="p-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{format(new Date(m.timestamp), 'dd.MM.yy')}</span>
                      {plays != null && <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" />{plays.toLocaleString()}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-0.5 text-pink-400"><Heart className="h-2.5 w-2.5" />{m.like_count}</span>
                      <span className="flex items-center gap-0.5 text-muted-foreground"><MessageCircle className="h-2.5 w-2.5" />{m.comments_count}</span>
                      {reach != null && <span className="flex items-center gap-0.5 text-blue-400 ml-auto"><Eye className="h-2.5 w-2.5" />{reach}</span>}
                    </div>
                    {m.caption && <p className="text-[10px] text-muted-foreground line-clamp-2">{m.caption}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FacebookPanel() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<FBPage | null>(null);
  const [insights, setInsights] = useState<InsightMetric[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callEdge('facebook-metrics');
    if (data.error) {
      toast.error('Ошибка загрузки Facebook метрик');
    } else {
      setPage(data.page);
      setInsights(data.insights || []);
      setPosts(data.posts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const reach30 = sumInsight(insights, 'page_reach');
  const impressions30 = sumInsight(insights, 'page_impressions');
  const views30 = sumInsight(insights, 'page_views_total');
  const newFans30 = sumInsight(insights, 'page_fan_adds');

  return (
    <div className="space-y-5">
      {page && (
        <motion.div variants={item} className="flex items-center gap-4 p-4 glass-card rounded-xl border border-border/40">
          {page.picture?.data.url && (
            <img src={page.picture.data.url} alt={page.name} className="h-14 w-14 rounded-full border-2 border-blue-500/30 object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-foreground">{page.name}</p>
              <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/40 text-blue-400">
                <Facebook className="h-2.5 w-2.5" /> Facebook
              </Badge>
            </div>
            {page.about && <p className="text-xs text-muted-foreground mt-0.5 truncate">{page.about}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />Обновить
          </Button>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('afm.sm.followers')} value={page?.fan_count ?? 0} icon={Users} />
        <StatCard label={t('afm.sm.reach')} value={reach30} icon={Eye} sub="30 дней" />
        <StatCard label={t('afm.sm.impressions')} value={impressions30} icon={BarChart3} sub="30 дней" />
        <StatCard label="Новые подписчики" value={newFans30} icon={TrendingUp} sub="30 дней" />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <StatCard label="Просмотры страницы" value={views30} icon={Eye} sub="30 дней" />
        <StatCard label="Подписчиков" value={page?.followers_count ?? 0} icon={Users} />
      </motion.div>

      {posts.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />{t('afm.sm.recentPosts')}
          </h3>
          <div className="space-y-2">
            {posts.map((post: any) => (
              <Card key={post.id} className="glass-card">
                <CardContent className="p-3 flex gap-3">
                  {post.full_picture && (
                    <img src={post.full_picture} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {post.message && <p className="text-xs text-foreground line-clamp-2">{post.message}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{format(new Date(post.created_time), 'dd.MM.yy HH:mm')}</span>
                      {post.likes?.summary?.total_count != null && (
                        <span className="flex items-center gap-1 text-blue-400"><Heart className="h-2.5 w-2.5" />{post.likes.summary.total_count}</span>
                      )}
                      {post.comments?.summary?.total_count != null && (
                        <span className="flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" />{post.comments.summary.total_count}</span>
                      )}
                      {post.shares?.count != null && (
                        <span className="flex items-center gap-1"><ExternalLink className="h-2.5 w-2.5" />{post.shares.count}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function AfmSocialMedia() {
  const { t } = useLanguage();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    const data = await callEdge('status');
    setConnections(data.connections || []);
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    loadStatus();
    // Handle OAuth callback via URL search params after redirect back
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('meta_code');
    if (code) {
      console.log('[meta-oauth] callback: code received via URL param');
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
      handleOAuthCallback(code);
    }
  }, []);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === 'meta-oauth-callback' && e.data.code) {
        console.log('[meta-oauth] popup callback: code received, exchanging...');
        setConnecting(true);
        const result = await callEdge('exchange', 'POST', { code: e.data.code });
        if (result.success) {
          console.log('[meta-oauth] popup: tokens saved successfully');
          toast.success('Аккаунты успешно подключены!');
          await loadStatus();
        } else {
          toast.error('Ошибка подключения: ' + (result.error || 'Unknown'));
        }
        setConnecting(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadStatus]);

  const handleOAuthCallback = async (code: string) => {
    setConnecting(true);
    console.log('[meta-oauth] exchanging code for tokens...');
    const result = await callEdge('exchange', 'POST', { code });
    if (result.success) {
      console.log('[meta-oauth] tokens saved successfully');
      toast.success('Аккаунты подключены!');
      await loadStatus();
    } else {
      toast.error('Ошибка: ' + (result.error || 'Unknown'));
    }
    setConnecting(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    const data = await callEdge('auth-url');
    if (data.url) {
      // Log the OAuth URL (without secrets) to verify redirect_uri is correct
      try {
        const parsed = new URL(data.url);
        const redirectUri = parsed.searchParams.get('redirect_uri');
        console.log('[meta-oauth] Opening OAuth URL. redirect_uri:', redirectUri);
      } catch {}
      // Open popup for OAuth
      const popup = window.open(data.url, 'meta-oauth', 'width=600,height=700,scrollbars=yes');
      // Check if popup was blocked
      if (!popup) {
        // Redirect instead
        window.location.href = data.url;
      } else {
        // Listen for popup to send back code
        const interval = setInterval(() => {
          if (popup.closed) {
            clearInterval(interval);
            setConnecting(false);
            loadStatus();
          }
        }, 1000);
      }
    } else {
      toast.error('Не удалось получить OAuth URL');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    await callEdge('disconnect', 'DELETE', { platform });
    toast.success(`${platform} отключён`);
    await loadStatus();
    setDisconnecting(null);
  };

  const igConn = connections.find(c => c.platform === 'instagram');
  const fbConn = connections.find(c => c.platform === 'facebook');
  const hasAny = igConn || fbConn;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.socialMedia')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      {/* Security note */}
      <motion.div variants={item}>
        <Card className="glass-card border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('afm.socialSecurity')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('afm.sm.readOnlyNote')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connection panel */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Подключённые аккаунты
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStatus ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* Instagram status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                      <Instagram className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Instagram</p>
                      {igConn ? (
                        <p className="text-xs text-muted-foreground">@{igConn.page_name} · {format(new Date(igConn.connected_at), 'dd.MM.yy')}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('afm.notConnected')}</p>
                      )}
                    </div>
                  </div>
                  {igConn ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400 gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> Подключено
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDisconnect('instagram')} disabled={!!disconnecting}>
                        {disconnecting === 'instagram' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('afm.notConnected')}</Badge>
                  )}
                </div>

                {/* Facebook status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Facebook className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Facebook</p>
                      {fbConn ? (
                        <p className="text-xs text-muted-foreground">{fbConn.page_name} · {format(new Date(fbConn.connected_at), 'dd.MM.yy')}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('afm.notConnected')}</p>
                      )}
                    </div>
                  </div>
                  {fbConn ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400 gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> Подключено
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDisconnect('facebook')} disabled={!!disconnecting}>
                        {disconnecting === 'facebook' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('afm.notConnected')}</Badge>
                  )}
                </div>

                {/* Connect button */}
                {!hasAny && (
                  <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2 h-auto py-2.5 whitespace-normal">
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                    {t('afm.sm.connectOAuth')} (Instagram + Facebook)
                  </Button>
                )}
                {hasAny && !igConn && (
                  <Button onClick={handleConnect} disabled={connecting} variant="outline" className="w-full gap-2">
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                    Переподключить / добавить Instagram
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Metrics tabs */}
      {hasAny && (
        <motion.div variants={item}>
          <Tabs defaultValue={igConn ? 'instagram' : 'facebook'}>
            <TabsList className="mb-4">
              {igConn && (
                <TabsTrigger value="instagram" className="gap-1.5 text-xs sm:text-sm">
                  <Instagram className="h-3.5 w-3.5" />Instagram
                </TabsTrigger>
              )}
              {fbConn && (
                <TabsTrigger value="facebook" className="gap-1.5 text-xs sm:text-sm">
                  <Facebook className="h-3.5 w-3.5" />Facebook
                </TabsTrigger>
              )}
            </TabsList>
            {igConn && (
              <TabsContent value="instagram">
                <InstagramPanel token={igConn.page_name} />
              </TabsContent>
            )}
            {fbConn && (
              <TabsContent value="facebook">
                <FacebookPanel />
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      )}
    </motion.div>
  );
}
