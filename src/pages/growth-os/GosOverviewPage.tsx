import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  FileCode2, FormInput, ClipboardCheck, Plug, GitBranch, ArrowRight,
  Inbox, Activity, CheckCircle2, AlertCircle, Loader2, TrendingUp
} from 'lucide-react';
import { useGosMetrics } from '@/hooks/useGosMetrics';
import type { TranslationKey } from '@/i18n/translations';

const modules = [
  { key: 'gos.landingTemplates' as TranslationKey, desc: 'gos.landingTemplatesDesc' as TranslationKey, icon: FileCode2, path: '/growth-os/landing-templates', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', iconColor: 'text-blue-400' },
  { key: 'gos.formBuilder' as TranslationKey, desc: 'gos.formBuilderDesc' as TranslationKey, icon: FormInput, path: '/growth-os/forms', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30', iconColor: 'text-violet-400' },
  { key: 'gos.onboarding' as TranslationKey, desc: 'gos.onboardingDesc' as TranslationKey, icon: ClipboardCheck, path: '/growth-os/onboarding', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30', iconColor: 'text-amber-400' },
  { key: 'gos.integrations' as TranslationKey, desc: 'gos.integrationsDesc' as TranslationKey, icon: Plug, path: '/growth-os/integrations', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', iconColor: 'text-emerald-400' },
  { key: 'gos.leadRouting' as TranslationKey, desc: 'gos.leadRoutingDesc' as TranslationKey, icon: GitBranch, path: '/growth-os/lead-routing', color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30', iconColor: 'text-rose-400' },
];

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GosOverviewPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useGosMetrics();
  const isRu = language === 'ru';

  const kpiLabels = {
    publishedForms: isRu ? 'Опубликованные формы' : 'Published Forms',
    publishedLandings: isRu ? 'Опубликованные лендинги' : 'Published Landings',
    submissions7d: isRu ? 'Заявки (7д)' : 'Submissions (7d)',
    submissions30d: isRu ? 'Заявки (30д)' : 'Submissions (30d)',
    activeOnboarding: isRu ? 'Активный онбординг' : 'Active Onboarding',
    completedOnboarding: isRu ? 'Завершённый онбординг' : 'Completed Onboarding',
    activeIntegrations: isRu ? 'Активные интеграции' : 'Active Integrations',
    routing7d: isRu ? 'Маршрутизация (7д)' : 'Routing (7d)',
    total: isRu ? 'всего' : 'total',
    rate: isRu ? '% завершения' : '% rate',
    withErrors: isRu ? 'с ошибками' : 'with errors',
    activeRules: isRu ? 'активных правил' : 'active rules',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Growth OS</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('gos.overviewDesc' as TranslationKey)}</p>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Card key={i}><CardContent className="p-4 h-[72px]"><Skeleton className="h-full w-full" /></CardContent></Card>)}
        </div>
      ) : metrics ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <KpiCard label={kpiLabels.publishedForms} value={metrics.publishedForms} icon={FormInput} color="bg-violet-500/10 text-violet-400" />
          <KpiCard label={kpiLabels.publishedLandings} value={metrics.publishedLandings} icon={FileCode2} color="bg-blue-500/10 text-blue-400" />
          <KpiCard label={kpiLabels.submissions7d} value={metrics.submissions7d} sub={`${metrics.totalSubmissions} ${kpiLabels.total}`} icon={Inbox} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label={kpiLabels.submissions30d} value={metrics.submissions30d} icon={TrendingUp} color="bg-cyan-500/10 text-cyan-400" />
          <KpiCard label={kpiLabels.activeOnboarding} value={metrics.activeOnboarding} icon={ClipboardCheck} color="bg-amber-500/10 text-amber-400" />
          <KpiCard label={kpiLabels.completedOnboarding} value={metrics.completedOnboarding} sub={`${metrics.onboardingCompletionRate}${kpiLabels.rate}`} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label={kpiLabels.activeIntegrations} value={metrics.activeIntegrations} sub={metrics.integrationErrors > 0 ? `${metrics.integrationErrors} ${kpiLabels.withErrors}` : undefined} icon={Plug} color="bg-teal-500/10 text-teal-400" />
          <KpiCard label={kpiLabels.routing7d} value={metrics.routingLogs7d} sub={`${metrics.activeRules} ${kpiLabels.activeRules}`} icon={GitBranch} color="bg-rose-500/10 text-rose-400" />
        </div>
      ) : null}

      {/* Operational Blocks */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Submissions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Submissions</h3>
                <button onClick={() => navigate('/growth-os/forms')} className="text-xs text-primary hover:underline">View All</button>
              </div>
              {metrics.recentSubmissions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
              ) : (
                <div className="space-y-2">
                  {metrics.recentSubmissions.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Inbox className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground truncate">
                          {(sub.data as any)?.name || (sub.data as any)?.email || 'Submission'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{sub.source || 'direct'}</Badge>
                      </div>
                      <span className="text-muted-foreground flex-shrink-0">{new Date(sub.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Routing */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Routing</h3>
                <button onClick={() => navigate('/growth-os/lead-routing')} className="text-xs text-primary hover:underline">View All</button>
              </div>
              {metrics.recentRoutingLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No routing events yet</p>
              ) : (
                <div className="space-y-2">
                  {metrics.recentRoutingLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{log.lead_source || '—'}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground truncate">{log.routed_to || '—'}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{log.action_taken}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Onboarding Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Onboarding Sessions</h3>
                <button onClick={() => navigate('/growth-os/onboarding')} className="text-xs text-primary hover:underline">View All</button>
              </div>
              {metrics.onboardingSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No sessions yet</p>
              ) : (
                <div className="space-y-2">
                  {metrics.onboardingSessions.map((s: any) => {
                    const flowSteps = (s as any).gos_onboarding_flows?.steps || [];
                    const total = Array.isArray(flowSteps) ? flowSteps.length : 0;
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <ClipboardCheck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground truncate">{(s as any).clients?.name || '—'}</span>
                          <span className="text-muted-foreground">{s.current_step + 1}/{total || '?'}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${s.status === 'completed' ? 'border-emerald-500/30 text-emerald-400' : ''}`}>
                          {s.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integrations Health */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Integrations Health</h3>
                <button onClick={() => navigate('/growth-os/integrations')} className="text-xs text-primary hover:underline">View All</button>
              </div>
              {metrics.integrationInstances.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No integrations configured</p>
              ) : (
                <div className="space-y-2">
                  {metrics.integrationInstances.map((inst: any) => {
                    const hasError = !!inst.error_message;
                    const neverSynced = !inst.last_sync_at;
                    return (
                      <div key={inst.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasError ? (
                            <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                          ) : inst.is_active ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-foreground truncate">{(inst as any).gos_integrations?.name || 'Integration'}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${hasError ? 'border-destructive/30 text-destructive' : neverSynced ? 'border-amber-500/30 text-amber-400' : inst.is_active ? 'border-emerald-500/30 text-emerald-400' : ''}`}>
                          {hasError ? 'error' : neverSynced ? 'never synced' : inst.is_active ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Navigation */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Modules</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(mod => {
            const Icon = mod.icon;
            return (
              <Card
                key={mod.path}
                className={`cursor-pointer group bg-gradient-to-br ${mod.color} border hover:scale-[1.02] transition-all duration-200`}
                onClick={() => navigate(mod.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-background/50 ${mod.iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">{t(mod.key)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(mod.desc)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
