import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot, MonitorSmartphone, BrainCircuit, Lightbulb, FileStack, Rocket,
  ArrowRight, Activity, TrendingUp, AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';

interface Metrics {
  accounts: number;
  sessions: number;
  drafts: number;
  pendingLaunches: number;
  hypotheses: number;
  recommendations: number;
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AiAdsOverviewPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<Metrics>({ accounts: 0, sessions: 0, drafts: 0, pendingLaunches: 0, hypotheses: 0, recommendations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [accounts, sessions, drafts, launches, threads, recs] = await Promise.all([
        supabase.from('ad_accounts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ai_campaign_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('campaign_drafts').select('id', { count: 'exact', head: true }),
        supabase.from('launch_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('hypothesis_threads' as any).select('id', { count: 'exact', head: true }),
        supabase.from('ai_recommendations').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      ]);
      setMetrics({
        accounts: accounts.count || 0,
        sessions: sessions.count || 0,
        drafts: drafts.count || 0,
        pendingLaunches: launches.count || 0,
        hypotheses: threads.count || 0,
        recommendations: recs.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const modules = [
    { labelKey: 'aiAds.adAccounts' as TranslationKey, descKey: 'aiAds.adAccountsDesc' as TranslationKey, icon: MonitorSmartphone, path: '/ai-ads/accounts', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', iconColor: 'text-blue-400' },
    { labelKey: 'aiAds.analysis' as TranslationKey, descKey: 'aiAds.analysisDesc' as TranslationKey, icon: BrainCircuit, path: '/ai-ads/analysis', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30', iconColor: 'text-violet-400' },
    { labelKey: 'aiAds.recommendations' as TranslationKey, descKey: 'aiAds.recommendationsDesc' as TranslationKey, icon: TrendingUp, path: '/ai-ads/recommendations', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30', iconColor: 'text-cyan-400' },
    { labelKey: 'aiAds.hypotheses' as TranslationKey, descKey: 'aiAds.hypothesesDesc' as TranslationKey, icon: Lightbulb, path: '/ai-ads/hypotheses', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30', iconColor: 'text-amber-400' },
    { labelKey: 'aiAds.campaignDrafts' as TranslationKey, descKey: 'aiAds.campaignDraftsDesc' as TranslationKey, icon: FileStack, path: '/ai-ads/drafts', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', iconColor: 'text-emerald-400' },
    { labelKey: 'aiAds.executions' as TranslationKey, descKey: 'aiAds.executionsDesc' as TranslationKey, icon: Rocket, path: '/ai-ads/executions', color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30', iconColor: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6 text-[hsl(270,70%,60%)]" />
          {t('aiAds.copilotTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('aiAds.copilotDesc')}</p>
      </div>

      {/* Workflow badge */}
      <Card className="border-[hsl(270,70%,50%)]/20 bg-[hsl(270,70%,50%)]/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-[hsl(270,70%,60%)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('aiAds.workflow')}</p>
            <p className="text-xs text-muted-foreground">{t('aiAds.workflowDesc')}</p>
          </div>
          <Badge variant="outline" className="border-[hsl(270,70%,50%)]/30 text-[hsl(270,70%,60%)]">{t('aiAds.guarded')}</Badge>
        </CardContent>
      </Card>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/50" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label={t('aiAds.adAccounts')} value={metrics.accounts} icon={MonitorSmartphone} color="bg-blue-500/10 text-blue-400" />
          <KpiCard label={t('aiAds.aiSessions')} value={metrics.sessions} icon={BrainCircuit} color="bg-violet-500/10 text-violet-400" />
          <KpiCard label={t('aiAds.drafts')} value={metrics.drafts} icon={FileStack} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label={t('aiAds.pendingLaunches')} value={metrics.pendingLaunches} icon={AlertCircle} color="bg-rose-500/10 text-rose-400" />
          <KpiCard label={t('aiAds.hypotheses')} value={metrics.hypotheses} icon={Lightbulb} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label={t('aiAds.recommendations')} value={metrics.recommendations} icon={TrendingUp} color="bg-cyan-500/10 text-cyan-400" />
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(m => (
          <Card
            key={m.path}
            className={`cursor-pointer hover:scale-[1.01] transition-all border bg-gradient-to-br ${m.color}`}
            onClick={() => navigate(m.path)}
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <m.icon className={`h-5 w-5 ${m.iconColor}`} />
                <span className="font-semibold text-foreground">{t(m.labelKey)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t(m.descKey)}</p>
              <div className="flex justify-end">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
