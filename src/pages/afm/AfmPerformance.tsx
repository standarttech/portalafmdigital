import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Target, BarChart3, Star, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getAllAfmCampaignIds } from '@/lib/afmCampaignFilter';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { format, subDays, startOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

interface BuyerStat {
  name: string; role: string; clients: string[];
  spend: number; leads: number; cpl: number; ctr: number; impressions: number; score: number;
}

const BUYER_ROLES = ['MediaBuyer', 'AccountManager', 'Manager'];

export default function AfmPerformance() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [buyers, setBuyers] = useState<BuyerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'month'>('30d');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: agencyUsers } = await supabase.from('agency_users').select('user_id, display_name, agency_role').in('agency_role', BUYER_ROLES as any);
        if (!agencyUsers || agencyUsers.length === 0) { setLoading(false); return; }

        const { data: clientUsers } = await supabase.from('client_users').select('user_id, client_id, clients(name)').in('user_id', agencyUsers.map(u => u.user_id));

        const now = new Date();
        let fromDate = format(subDays(now, 29), 'yyyy-MM-dd');
        if (period === '7d') fromDate = format(subDays(now, 6), 'yyyy-MM-dd');
        if (period === 'month') fromDate = format(startOfMonth(now), 'yyyy-MM-dd');
        const toDate = format(now, 'yyyy-MM-dd');

        const stats: BuyerStat[] = await Promise.all(agencyUsers.map(async (user) => {
          const userClients = (clientUsers || []).filter(cu => cu.user_id === user.user_id).map(cu => (cu.clients as any)?.name || cu.client_id);
          const clientIds = (clientUsers || []).filter(cu => cu.user_id === user.user_id).map(cu => cu.client_id);
          let spend = 0, leads = 0, impressions = 0, clicks = 0;
          if (clientIds.length > 0) {
            // AFM FILTER: only AFM campaigns
            const afmIds = await getAllAfmCampaignIds(clientIds);
            if (afmIds.length > 0) {
              const { data: metrics } = await supabase.from('daily_metrics').select('spend, leads, impressions, link_clicks').in('campaign_id', afmIds).gte('date', fromDate).lte('date', toDate);
              if (metrics) { spend = metrics.reduce((s, m) => s + m.spend, 0); leads = metrics.reduce((s, m) => s + m.leads, 0); impressions = metrics.reduce((s, m) => s + m.impressions, 0); clicks = metrics.reduce((s, m) => s + m.link_clicks, 0); }
            }
          }
          const cpl = leads > 0 ? spend / leads : 0;
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const leadsScore = Math.min(100, leads * 2);
          const cplScore = cpl > 0 ? Math.min(100, Math.max(0, 100 - (cpl - 30))) : 50;
          const ctrScore = Math.min(100, ctr * 50);
          const score = Math.round((leadsScore * 0.4 + cplScore * 0.4 + ctrScore * 0.2));
          return { name: user.display_name || 'User', role: user.agency_role, clients: userClients, spend, leads, cpl, ctr, impressions, score };
        }));

        setBuyers(stats.sort((a, b) => b.score - a.score));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [period]);

  const chartData = buyers.map(b => ({
    name: b.name.split(' ')[0],
    [t('afm.mb.leadsPeriod' as any)]: b.leads,
    [t('afm.mb.spendPeriod' as any)]: Math.round(b.spend),
    CPL: Math.round(b.cpl),
  }));

  const getScoreColor = (score: number) => score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const getScoreBadge = (score: number) => {
    if (score >= 70) return { label: t('afm.perf.excellent' as any), icon: CheckCircle2, cls: 'text-green-400 bg-green-400/10 border-green-400/30' };
    if (score >= 40) return { label: t('afm.perf.average' as any), icon: AlertTriangle, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    return { label: t('afm.perf.needsAttention' as any), icon: AlertTriangle, cls: 'text-red-400 bg-red-400/10 border-red-400/30' };
  };

  if (loading) return <PageSkeleton variant="dashboard" kpiCards={4} tableRows={5} />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            {t('afm.perf.title' as any)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('afm.perf.subtitle' as any)}</p>
        </div>
        <div className="flex gap-1.5">
          {(['7d', '30d', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${period === p ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border/40 hover:border-border/70'}`}>
              {p === '7d' ? t('afm.mb.days7' as any) : p === '30d' ? t('afm.mb.days30' as any) : t('afm.mb.thisMonth' as any)}
            </button>
          ))}
        </div>
      </motion.div>

      {buyers.length === 0 ? (
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">
                {t('afm.perf.noBuyers' as any)}<br />
                {t('afm.perf.assignClients' as any)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {buyers.map((buyer, idx) => {
              const badge = getScoreBadge(buyer.score);
              const BadgeIcon = badge.icon;
              return (
                <Card key={buyer.name} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-base font-bold text-primary">{buyer.name.charAt(0)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{buyer.name}</p>
                            {idx === 0 && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-400/20 text-amber-400 border-amber-400/30">#{1} {t('afm.perf.top' as any)}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{buyer.role} · {buyer.clients.length} {t('afm.perf.clients' as any)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(buyer.score)}`}>{buyer.score}</div>
                        <div className={`text-[10px] flex items-center gap-1 justify-end ${badge.cls} px-1.5 py-0.5 rounded-full border mt-0.5`}>
                          <BadgeIcon className="h-2.5 w-2.5" />{badge.label}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: t('afm.mb.spendPeriod' as any), value: formatCurrency(buyer.spend), color: 'text-blue-400' },
                        { label: t('afm.mb.leadsPeriod' as any), value: formatNumber(buyer.leads), color: 'text-green-400' },
                        { label: 'CPL', value: buyer.cpl > 0 ? formatCurrency(buyer.cpl) : '—', color: 'text-amber-400' },
                        { label: 'CTR', value: `${buyer.ctr.toFixed(2)}%`, color: 'text-purple-400' },
                      ].map(kpi => (
                        <div key={kpi.label} className="rounded-lg bg-muted/30 p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                          <p className={`text-sm font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Performance Score</span>
                        <span className={getScoreColor(buyer.score)}>{buyer.score}/100</span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${buyer.score >= 70 ? 'bg-green-500' : buyer.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${buyer.score}%` }} />
                      </div>
                    </div>
                    {buyer.clients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {buyer.clients.slice(0, 5).map(c => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30">{c}</span>
                        ))}
                        {buyer.clients.length > 5 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30">+{buyer.clients.length - 5}</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {buyers.length > 1 && (
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />{t('afm.perf.leadsVsSpend' as any)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey={t('afm.mb.leadsPeriod' as any)} fill="#34d399" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />{t('afm.perf.cplByBuyer' as any)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="CPL" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('afm.perf.summaryTable' as any)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/40">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t('afm.perf.mediaBuyer' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.perf.clientsCount' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.spendPeriod' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.leadsPeriod' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">CPL</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">CTR</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((b, i) => (
                        <tr key={b.name} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {i === 0 && <span className="text-amber-400">🥇</span>}
                              {i === 1 && <span>🥈</span>}
                              {i === 2 && <span>🥉</span>}
                              <span className="font-medium text-foreground">{b.name}</span>
                              <span className="text-muted-foreground">({b.role})</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{b.clients.length}</td>
                          <td className="px-3 py-2 text-right text-blue-400 font-mono">{formatCurrency(b.spend)}</td>
                          <td className="px-3 py-2 text-right text-green-400 font-mono">{formatNumber(b.leads)}</td>
                          <td className="px-3 py-2 text-right text-amber-400 font-mono">{b.cpl > 0 ? formatCurrency(b.cpl) : '—'}</td>
                          <td className="px-3 py-2 text-right text-purple-400 font-mono">{b.ctr.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right"><span className={`font-bold ${getScoreColor(b.score)}`}>{b.score}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
