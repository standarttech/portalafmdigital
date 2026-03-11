import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarChart3, TrendingUp, DollarSign, Users, Target, Percent, Minus, ArrowDown, Facebook } from 'lucide-react';
import { useCrmPipelines, useCrmStages, useCrmLeads } from '@/hooks/useCrmData';

function fmt(v: number | null, prefix = '', suffix = '', decimals = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  if (v === 0) return `${prefix}0${suffix}`;
  return `${prefix}${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}
function fmtInt(v: number): string { return v.toLocaleString(); }
function safeDivide(a: number, b: number): number | null { return b === 0 ? null : a / b; }

function MetricCard({ title, value, subtitle, icon: Icon }: { title: string; value: string; subtitle?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="bg-card/50 border-border/40 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Check if a lead came from Facebook based on source, UTM, or FB-specific IDs
function isFromFacebook(lead: any): boolean {
  const src = (lead.source || '').toLowerCase();
  const utmSrc = (lead.utm_source || '').toLowerCase();
  const utmMed = (lead.utm_medium || '').toLowerCase();
  if (src.includes('facebook') || src.includes('fb') || src.includes('meta') || src === 'ig') return true;
  if (utmSrc.includes('facebook') || utmSrc.includes('fb') || utmSrc.includes('meta') || utmSrc.includes('ig')) return true;
  if (utmMed.includes('cpc') || utmMed.includes('paid') || utmMed.includes('cpm')) {
    if (utmSrc.includes('facebook') || utmSrc.includes('fb') || utmSrc.includes('meta')) return true;
  }
  if (lead.fbclid || lead.fbc || lead.fbp || lead.fb_lead_id || lead.fb_campaign_id || lead.fb_ad_id || lead.fb_adset_id) return true;
  return false;
}

export default function CrmAnalyticsPage() {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [adSpend, setAdSpend] = useState<number>(0);
  const [loadingSpend, setLoadingSpend] = useState(false);
  const [fbOnly, setFbOnly] = useState(true); // Default: show only Facebook leads

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) { setClients(data); if (data.length > 0) setSelectedClientId(data[0].id); }
      setLoadingClients(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setAdSpend(0); return; }
    (async () => {
      setLoadingSpend(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      let { data } = await supabase.from('ad_level_metrics').select('spend').eq('client_id', selectedClientId).eq('level', 'campaign').gte('date', dateStr);
      if (!data || data.length === 0) {
        const res = await supabase.from('ad_level_metrics').select('spend').eq('client_id', selectedClientId).eq('level', 'adset').gte('date', dateStr);
        data = res.data;
      }
      if (!data || data.length === 0) {
        const res = await supabase.from('ad_level_metrics').select('spend').eq('client_id', selectedClientId).eq('level', 'ad').gte('date', dateStr);
        data = res.data;
      }
      const totalSpend = (data || []).reduce((sum, row) => sum + (row.spend || 0), 0);
      setAdSpend(totalSpend);
      setLoadingSpend(false);
    })();
  }, [selectedClientId]);

  const { pipelines } = useCrmPipelines(selectedClientId);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !pipelines.find(p => p.id === selectedPipelineId)) setSelectedPipelineId(pipelines[0].id);
    else if (pipelines.length === 0) setSelectedPipelineId(null);
  }, [pipelines]);

  const { stages } = useCrmStages(selectedPipelineId);
  const { leads: allLeads, loading: loadingLeads } = useCrmLeads(selectedPipelineId, selectedClientId);

  // Filter leads based on source toggle
  const leads = useMemo(() => {
    if (!fbOnly) return allLeads;
    return allLeads.filter(isFromFacebook);
  }, [allLeads, fbOnly]);

  const fbLeadCount = useMemo(() => allLeads.filter(isFromFacebook).length, [allLeads]);

  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const qualifiedStageIds = new Set(stages.filter(s => s.is_qualified_stage).map(s => s.id));
    const bookedStageIds = new Set(stages.filter(s => s.is_booked_stage).map(s => s.id));
    const wonStageIds = new Set(stages.filter(s => s.is_won_stage).map(s => s.id));
    const lostStageIds = new Set(stages.filter(s => s.is_lost_stage).map(s => s.id));

    const wonLeads = leads.filter(l => l.status === 'won' || wonStageIds.has(l.stage_id));
    const lostLeads = leads.filter(l => l.status === 'lost' || lostStageIds.has(l.stage_id));
    const qualifiedLeads = leads.filter(l => {
      if (qualifiedStageIds.size === 0) return false;
      const cs = stages.find(s => s.id === l.stage_id);
      if (!cs) return false;
      const qMin = Math.min(...Array.from(qualifiedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity));
      return cs.position >= qMin || l.status === 'won';
    });
    const bookedLeads = leads.filter(l => {
      if (bookedStageIds.size === 0) return false;
      const cs = stages.find(s => s.id === l.stage_id);
      if (!cs) return false;
      const bMin = Math.min(...Array.from(bookedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity));
      return cs.position >= bMin || l.status === 'won';
    });

    const totalRevenue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
    const cpl = safeDivide(adSpend, totalLeads);
    const cpql = safeDivide(adSpend, qualifiedLeads.length);
    const cps = safeDivide(adSpend, wonLeads.length);
    const roas = safeDivide(totalRevenue, adSpend);

    return {
      totalLeads, totalQualified: qualifiedLeads.length, totalBooked: bookedLeads.length,
      totalSales: wonLeads.length, totalLost: lostLeads.length, totalRevenue,
      avgDealValue: safeDivide(totalRevenue, wonLeads.length),
      closeRate: safeDivide(wonLeads.length, qualifiedLeads.length || totalLeads),
      qualRate: safeDivide(qualifiedLeads.length, totalLeads),
      bookRate: safeDivide(bookedLeads.length, qualifiedLeads.length || totalLeads),
      adSpend, cpl, cpql, cps, roas,
    };
  }, [leads, stages, adSpend]);

  const funnelData = useMemo(() => stages.map(stage => ({
    name: stage.name, color: stage.color,
    count: leads.filter(l => l.stage_id === stage.id).length,
    value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0),
    isWon: stage.is_won_stage, isLost: stage.is_lost_stage,
    isQualified: stage.is_qualified_stage, isBooked: stage.is_booked_stage,
  })), [leads, stages]);

  const sourceData = useMemo(() => {
    const map: Record<string, { leads: number; qualified: number; won: number; revenue: number }> = {};
    const qualifiedStageIds = new Set(stages.filter(s => s.is_qualified_stage).map(s => s.id));
    const qualMinPos = qualifiedStageIds.size > 0 ? Math.min(...Array.from(qualifiedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity)) : Infinity;
    leads.forEach(l => {
      const src = l.source || 'Unknown';
      if (!map[src]) map[src] = { leads: 0, qualified: 0, won: 0, revenue: 0 };
      map[src].leads++;
      const cs = stages.find(s => s.id === l.stage_id);
      if (cs && cs.position >= qualMinPos) map[src].qualified++;
      if (l.status === 'won') { map[src].won++; map[src].revenue += l.value || 0; }
    });
    return Object.entries(map).map(([source, data]) => ({ source, ...data })).sort((a, b) => b.leads - a.leads);
  }, [leads, stages]);

  if (loadingClients) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[300px] w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">{t('crm.analytics')}</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('crm.selectClient')} /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {pipelines.length > 0 && (
          <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('crm.selectPipeline')} /></SelectTrigger>
            <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {/* Source filter toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/40">
            <Facebook className="h-3.5 w-3.5 text-blue-500" />
            <Label htmlFor="fb-filter" className="text-xs cursor-pointer">
              {isRu ? 'Только Facebook' : 'Facebook only'}
            </Label>
            <Switch id="fb-filter" checked={fbOnly} onCheckedChange={setFbOnly} />
          </div>
          {!fbOnly && (
            <Badge variant="outline" className="text-[10px] bg-muted/30">
              {isRu ? 'Все источники' : 'All sources'} · {allLeads.length} {isRu ? 'лидов' : 'leads'}
            </Badge>
          )}
          {fbOnly && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">
              FB: {fbLeadCount} / {allLeads.length}
            </Badge>
          )}
        </div>
      </div>

      {adSpend > 0 && (
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          {isRu ? 'Расходы подключены' : 'Ad spend connected'} ✓
        </Badge>
      )}

      {loadingLeads ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title={t('crm.totalLeads')} value={fmtInt(metrics.totalLeads)} icon={Users} />
            <MetricCard title={t('crm.qualified')} value={fmtInt(metrics.totalQualified)} subtitle={metrics.qualRate !== null ? `${(metrics.qualRate * 100).toFixed(1)}% ${t('crm.qualRate')}` : undefined} icon={Target} />
            <MetricCard title={t('crm.booked')} value={fmtInt(metrics.totalBooked)} subtitle={metrics.bookRate !== null ? `${(metrics.bookRate * 100).toFixed(1)}% ${t('crm.bookRate')}` : undefined} icon={BarChart3} />
            <MetricCard title={t('crm.sales')} value={fmtInt(metrics.totalSales)} subtitle={metrics.closeRate !== null ? `${(metrics.closeRate * 100).toFixed(1)}% ${t('crm.closeRate')}` : undefined} icon={TrendingUp} />
            <MetricCard title={t('crm.lost')} value={fmtInt(metrics.totalLost)} icon={Minus} />
            <MetricCard title={t('crm.revenue')} value={fmt(metrics.totalRevenue, '$', '', 0)} icon={DollarSign} />
            <MetricCard title={t('crm.avgDealValue')} value={fmt(metrics.avgDealValue, '$')} icon={DollarSign} />
            <MetricCard title={t('crm.closeRate')} value={fmt(metrics.closeRate !== null ? metrics.closeRate * 100 : null, '', '%')} icon={Percent} />
          </div>

          {adSpend > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard title={isRu ? 'Рекл. расходы (30д)' : 'Ad Spend (30d)'} value={fmt(metrics.adSpend, '$', '', 0)} icon={ArrowDown} />
              <MetricCard title="CPL" value={fmt(metrics.cpl, '$')} subtitle={isRu ? 'Стоимость лида' : 'Cost per Lead'} icon={DollarSign} />
              <MetricCard title="CPQL" value={fmt(metrics.cpql, '$')} subtitle={isRu ? 'Стоимость квал. лида' : 'Cost per Qualified Lead'} icon={DollarSign} />
              <MetricCard title="ROAS" value={fmt(metrics.roas, '', 'x')} subtitle={isRu ? 'Окупаемость рекламы' : 'Return on Ad Spend'} icon={TrendingUp} />
            </div>
          )}

          {/* Pipeline funnel */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('crm.pipelineFunnel')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funnelData.map((stage, i) => {
                  const maxCount = Math.max(...funnelData.map(s => s.count), 1);
                  const pct = (stage.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-[120px] flex items-center gap-2 flex-shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs text-foreground truncate">{stage.name}</span>
                      </div>
                      <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden relative">
                        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color + '40' }} />
                        <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-foreground">{stage.count}</span>
                      </div>
                      <div className="w-[80px] text-right flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">{stage.value > 0 ? `$${stage.value.toLocaleString()}` : ''}</span>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {stage.isQualified && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">Q</Badge>}
                        {stage.isBooked && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">B</Badge>}
                        {stage.isWon && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-success/50 text-success">W</Badge>}
                        {stage.isLost && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-destructive/50 text-destructive">L</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Source breakdown */}
          {sourceData.length > 0 && (
            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('crm.sourceBreakdown')}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 text-muted-foreground font-medium">{t('crm.source')}</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">{t('crm.leads')}</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">{t('crm.qualified')}</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">{t('crm.won')}</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">{t('crm.revenue')}</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">{t('crm.closeRate')}</th>
                        {adSpend > 0 && <th className="text-right py-2 text-muted-foreground font-medium">CPL</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map(row => (
                        <tr key={row.source} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="py-2 font-medium text-foreground">{row.source}</td>
                          <td className="text-right py-2">{row.leads}</td>
                          <td className="text-right py-2">{row.qualified}</td>
                          <td className="text-right py-2 text-success">{row.won}</td>
                          <td className="text-right py-2">{row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : '—'}</td>
                          <td className="text-right py-2">{row.qualified > 0 ? `${((row.won / row.qualified) * 100).toFixed(1)}%` : '—'}</td>
                          {adSpend > 0 && <td className="text-right py-2">{row.leads > 0 ? `$${(adSpend / metrics.totalLeads * row.leads / row.leads).toFixed(2)}` : '—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {adSpend === 0 && (
            <Card className="bg-card/30 border-border/20 border-dashed">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  {isRu ? 'Нет данных о расходах' : 'No ad spend data available'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {isRu
                    ? 'Подключите Meta Ads аккаунт к этому клиенту для автоматического расчёта CPL, CPQL и ROAS'
                    : 'Connect a Meta Ads account to this client for automatic CPL, CPQL and ROAS calculations'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
