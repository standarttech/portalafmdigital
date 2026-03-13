import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bot, MonitorSmartphone, BrainCircuit, Lightbulb, FileStack, Rocket,
  ArrowRight, Activity, TrendingUp, AlertCircle, ImageIcon, Brain, Zap,
  Settings, Users, Link2, Target, BookOpen, ExternalLink,
  LayoutDashboard, UserPlus, BarChart3
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
  creatives: number;
  optimizationActions: number;
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
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [metrics, setMetrics] = useState<Metrics>({ accounts: 0, sessions: 0, drafts: 0, pendingLaunches: 0, hypotheses: 0, recommendations: 0, creatives: 0, optimizationActions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [accounts, sessions, drafts, launches, threads, recs, creatives, optActions] = await Promise.all([
        supabase.from('ad_accounts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ai_campaign_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('campaign_drafts').select('id', { count: 'exact', head: true }),
        supabase.from('launch_requests' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('hypothesis_threads' as any).select('id', { count: 'exact', head: true }),
        supabase.from('ai_recommendations').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('creative_assets' as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('optimization_actions' as any).select('id', { count: 'exact', head: true }).in('status', ['proposed', 'approved']),
      ]);
      setMetrics({
        accounts: accounts.count || 0,
        sessions: sessions.count || 0,
        drafts: drafts.count || 0,
        pendingLaunches: launches.count || 0,
        hypotheses: threads.count || 0,
        recommendations: recs.count || 0,
        creatives: creatives.count || 0,
        optimizationActions: optActions.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const coreModules = [
    { labelKey: 'aiAds.adAccounts' as TranslationKey, descKey: 'aiAds.adAccountsDesc' as TranslationKey, icon: MonitorSmartphone, path: '/ai-ads/accounts', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', iconColor: 'text-blue-400' },
    { labelKey: 'aiAds.analysis' as TranslationKey, descKey: 'aiAds.analysisDesc' as TranslationKey, icon: BrainCircuit, path: '/ai-ads/analysis', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30', iconColor: 'text-violet-400' },
    { labelKey: 'aiAds.recommendations' as TranslationKey, descKey: 'aiAds.recommendationsDesc' as TranslationKey, icon: TrendingUp, path: '/ai-ads/recommendations', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30', iconColor: 'text-cyan-400' },
    { labelKey: 'aiAds.hypotheses' as TranslationKey, descKey: 'aiAds.hypothesesDesc' as TranslationKey, icon: Lightbulb, path: '/ai-ads/hypotheses', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30', iconColor: 'text-amber-400' },
    { labelKey: 'aiAds.campaignDrafts' as TranslationKey, descKey: 'aiAds.campaignDraftsDesc' as TranslationKey, icon: FileStack, path: '/ai-ads/drafts', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', iconColor: 'text-emerald-400' },
    { labelKey: 'aiAds.creatives' as TranslationKey, desc: isRu ? 'Библиотека креативов для рекламных кампаний' : 'Creative asset library for campaign ads', icon: ImageIcon, path: '/ai-ads/creatives', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30', iconColor: 'text-pink-400' },
    { labelKey: 'aiAds.executions' as TranslationKey, descKey: 'aiAds.executionsDesc' as TranslationKey, icon: Rocket, path: '/ai-ads/executions', color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30', iconColor: 'text-rose-400' },
    { labelKey: 'aiAds.intelligence' as TranslationKey, desc: isRu ? 'Мониторинг здоровья и аномалий кампаний' : 'Post-launch health monitoring and anomaly detection', icon: Brain, path: '/ai-ads/intelligence', color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30', iconColor: 'text-indigo-400' },
    { labelKey: 'aiAds.optimization' as TranslationKey, desc: isRu ? 'Предлагайте и выполняйте оптимизации' : 'Propose, approve, and execute optimizations', icon: Zap, path: '/ai-ads/optimization', color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30', iconColor: 'text-yellow-400' },
  ];

  const toolModules = [
    { labelKey: 'aiAds.metaAutomation' as TranslationKey, desc: isRu ? 'Пиксели, аудитории, лидформы, кампании' : 'Pixels, audiences, lead forms, campaigns', icon: Target, path: '/ai-ads/meta-automation', color: 'from-blue-600/20 to-indigo-500/20 border-blue-600/30', iconColor: 'text-blue-500' },
    { labelKey: 'aiAds.presets' as TranslationKey, desc: isRu ? 'Автоматические правила оптимизации' : 'Rule-based optimization presets', icon: Settings, path: '/ai-ads/presets', color: 'from-slate-500/20 to-gray-500/20 border-slate-500/30', iconColor: 'text-slate-400' },
    { labelKey: 'aiAds.clientReport' as TranslationKey, desc: isRu ? 'Отчёт для клиента по эффективности' : 'Client-facing performance summary', icon: Users, path: '/ai-ads/client-report', color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30', iconColor: 'text-teal-400' },
    { labelKey: 'common.integrations' as TranslationKey, desc: isRu ? 'Meta, Google, Freepik, n8n, хранилища' : 'Meta, Google, Freepik, n8n, cloud storage', icon: Link2, path: '/ai-ads/integrations', color: 'from-orange-500/20 to-red-500/20 border-orange-500/30', iconColor: 'text-orange-400' },
    { labelKey: 'ai.guide' as TranslationKey, desc: isRu ? 'Полное руководство по работе' : 'Full module documentation', icon: BookOpen, path: '/ai-ads/guide', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30', iconColor: 'text-green-400' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/50" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard label={t('aiAds.adAccounts')} value={metrics.accounts} icon={MonitorSmartphone} color="bg-blue-500/10 text-blue-400" />
          <KpiCard label={t('aiAds.aiSessions')} value={metrics.sessions} icon={BrainCircuit} color="bg-violet-500/10 text-violet-400" />
          <KpiCard label={t('aiAds.drafts')} value={metrics.drafts} icon={FileStack} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label={t('aiAds.pendingLaunches')} value={metrics.pendingLaunches} icon={AlertCircle} color="bg-rose-500/10 text-rose-400" />
          <KpiCard label={t('aiAds.hypotheses')} value={metrics.hypotheses} icon={Lightbulb} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label={t('aiAds.recommendations')} value={metrics.recommendations} icon={TrendingUp} color="bg-cyan-500/10 text-cyan-400" />
          <KpiCard label={t('aiAds.creatives')} value={metrics.creatives} icon={ImageIcon} color="bg-pink-500/10 text-pink-400" />
          <KpiCard label={isRu ? 'Оптимизации' : 'Optimizations'} value={metrics.optimizationActions} icon={Zap} color="bg-yellow-500/10 text-yellow-400" />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-primary/10">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isRu ? 'Быстрые действия' : 'Quick Actions'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/ai-ads/analysis')}>
              <BrainCircuit className="h-3.5 w-3.5" /> {isRu ? 'Запустить анализ' : 'Run Analysis'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/ai-ads/drafts')}>
              <FileStack className="h-3.5 w-3.5" /> {isRu ? 'Новый черновик' : 'New Draft'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/ai-ads/creatives')}>
              <ImageIcon className="h-3.5 w-3.5" /> {isRu ? 'Загрузить креатив' : 'Upload Creative'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/ai-ads/meta-automation')}>
              <Target className="h-3.5 w-3.5" /> {isRu ? 'Meta автоматизация' : 'Meta Automation'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/ai-ads/intelligence')}>
              <Brain className="h-3.5 w-3.5" /> {isRu ? 'Проверить здоровье' : 'Check Health'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Core Modules */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isRu ? 'Основные модули' : 'Core Modules'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreModules.map(m => (
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
                <p className="text-xs text-muted-foreground">{'descKey' in m ? t(m.descKey as TranslationKey) : m.desc}</p>
                <div className="flex justify-end">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tools & Settings */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isRu ? 'Инструменты и настройки' : 'Tools & Settings'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {toolModules.map(m => (
            <Card
              key={m.path}
              className={`cursor-pointer hover:scale-[1.01] transition-all border bg-gradient-to-br ${m.color}`}
              onClick={() => navigate(m.path)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <m.icon className={`h-4 w-4 ${m.iconColor} shrink-0`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{t(m.labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cross-module links */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isRu ? 'Связанные разделы платформы' : 'Related Platform Sections'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="h-3.5 w-3.5" /> {isRu ? 'Дашборд' : 'Dashboard'}
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/crm')}>
              <UserPlus className="h-3.5 w-3.5" /> CRM
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/growth-os')}>
              <BarChart3 className="h-3.5 w-3.5" /> Growth OS
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/clients')}>
              <Users className="h-3.5 w-3.5" /> {isRu ? 'Клиенты' : 'Clients'}
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/sync-monitor')}>
              <Activity className="h-3.5 w-3.5" /> {isRu ? 'Мониторинг синхронизации' : 'Sync Monitor'}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
