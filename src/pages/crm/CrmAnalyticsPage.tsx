import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, DollarSign, Users, Target, Percent,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { useCrmPipelines, useCrmStages, useCrmLeads } from '@/hooks/useCrmData';

function fmt(v: number | null, prefix = '', suffix = '', decimals = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  if (v === 0) return `${prefix}0${suffix}`;
  return `${prefix}${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

function fmtInt(v: number): string {
  return v.toLocaleString();
}

function safeDivide(a: number, b: number): number | null {
  if (!b || b === 0) return null;
  return a / b;
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'primary' }: {
  title: string; value: string; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/40 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`h-4 w-4 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrmAnalyticsPage() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      }
      setLoadingClients(false);
    })();
  }, []);

  const { pipelines } = useCrmPipelines(selectedClientId);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !pipelines.find(p => p.id === selectedPipelineId)) {
      setSelectedPipelineId(pipelines[0].id);
    } else if (pipelines.length === 0) {
      setSelectedPipelineId(null);
    }
  }, [pipelines]);

  const { stages } = useCrmStages(selectedPipelineId);
  const { leads, loading: loadingLeads } = useCrmLeads(selectedPipelineId, selectedClientId);

  // Calculate metrics from CRM data
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const qualifiedStageIds = new Set(stages.filter(s => (s as any).is_qualified_stage).map(s => s.id));
    const bookedStageIds = new Set(stages.filter(s => (s as any).is_booked_stage).map(s => s.id));
    const wonStageIds = new Set(stages.filter(s => s.is_won_stage).map(s => s.id));
    const lostStageIds = new Set(stages.filter(s => s.is_lost_stage).map(s => s.id));

    // Count leads by business stage
    // A lead that's in Won stage also passed through Qualified, etc.
    // We count based on status or current stage
    const wonLeads = leads.filter(l => l.status === 'won' || wonStageIds.has(l.stage_id));
    const lostLeads = leads.filter(l => l.status === 'lost' || lostStageIds.has(l.stage_id));
    
    // For qualified/booked: count leads that are in that stage OR any stage after it (including won)
    const qualifiedLeads = leads.filter(l => {
      if (qualifiedStageIds.size === 0) return false;
      const currentStage = stages.find(s => s.id === l.stage_id);
      if (!currentStage) return false;
      const qualMinPos = Math.min(...Array.from(qualifiedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity));
      return currentStage.position >= qualMinPos || l.status === 'won';
    });
    
    const bookedLeads = leads.filter(l => {
      if (bookedStageIds.size === 0) return false;
      const currentStage = stages.find(s => s.id === l.stage_id);
      if (!currentStage) return false;
      const bookMinPos = Math.min(...Array.from(bookedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity));
      return currentStage.position >= bookMinPos || l.status === 'won';
    });

    const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalSales = wonLeads.length;
    const totalLost = lostLeads.length;
    const totalQualified = qualifiedLeads.length;
    const totalBooked = bookedLeads.length;

    // We don't have ad spend data yet (Meta integration pending)
    // For now, show CRM-only metrics
    const avgDealValue = safeDivide(totalRevenue, totalSales);
    const closeRate = safeDivide(totalSales, totalQualified || totalLeads);
    const qualRate = safeDivide(totalQualified, totalLeads);
    const bookRate = safeDivide(totalBooked, totalQualified || totalLeads);

    return {
      totalLeads,
      totalQualified,
      totalBooked,
      totalSales,
      totalLost,
      totalRevenue,
      avgDealValue,
      closeRate,
      qualRate,
      bookRate,
    };
  }, [leads, stages]);

  // Stage funnel data
  const funnelData = useMemo(() => {
    return stages.map(stage => ({
      name: stage.name,
      color: stage.color,
      count: leads.filter(l => l.stage_id === stage.id).length,
      value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0),
      isWon: stage.is_won_stage,
      isLost: stage.is_lost_stage,
      isQualified: (stage as any).is_qualified_stage,
      isBooked: (stage as any).is_booked_stage,
    }));
  }, [leads, stages]);

  // Source breakdown
  const sourceData = useMemo(() => {
    const map: Record<string, { leads: number; qualified: number; won: number; revenue: number }> = {};
    const qualifiedStageIds = new Set(stages.filter(s => (s as any).is_qualified_stage).map(s => s.id));
    const qualMinPos = qualifiedStageIds.size > 0
      ? Math.min(...Array.from(qualifiedStageIds).map(id => stages.find(s => s.id === id)?.position ?? Infinity))
      : Infinity;

    leads.forEach(l => {
      const src = l.source || 'Unknown';
      if (!map[src]) map[src] = { leads: 0, qualified: 0, won: 0, revenue: 0 };
      map[src].leads++;
      const currentStage = stages.find(s => s.id === l.stage_id);
      if (currentStage && currentStage.position >= qualMinPos) map[src].qualified++;
      if (l.status === 'won') {
        map[src].won++;
        map[src].revenue += l.value || 0;
      }
    });

    return Object.entries(map)
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads, stages]);

  if (loadingClients) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[300px] w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {pipelines.length > 0 && (
          <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Pipeline" /></SelectTrigger>
            <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Badge variant="outline" className="text-[10px] ml-auto">
          CRM Data Only • Ad spend metrics available after Meta integration
        </Badge>
      </div>

      {loadingLeads ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Total Leads" value={fmtInt(metrics.totalLeads)} icon={Users} />
            <MetricCard title="Qualified" value={fmtInt(metrics.totalQualified)} subtitle={metrics.qualRate !== null ? `${(metrics.qualRate * 100).toFixed(1)}% qual rate` : undefined} icon={Target} />
            <MetricCard title="Booked" value={fmtInt(metrics.totalBooked)} subtitle={metrics.bookRate !== null ? `${(metrics.bookRate * 100).toFixed(1)}% book rate` : undefined} icon={BarChart3} />
            <MetricCard title="Sales (Won)" value={fmtInt(metrics.totalSales)} subtitle={metrics.closeRate !== null ? `${(metrics.closeRate * 100).toFixed(1)}% close rate` : undefined} icon={TrendingUp} color="success" />
            <MetricCard title="Lost" value={fmtInt(metrics.totalLost)} icon={Minus} color="destructive" />
            <MetricCard title="Revenue" value={fmt(metrics.totalRevenue, '$', '', 0)} icon={DollarSign} color="success" />
            <MetricCard title="Avg Deal Value" value={fmt(metrics.avgDealValue, '$')} icon={DollarSign} />
            <MetricCard title="Close Rate" value={fmt(metrics.closeRate !== null ? metrics.closeRate * 100 : null, '', '%')} icon={Percent} />
          </div>

          {/* Stage Funnel */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
            </CardHeader>
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
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: stage.color + '40' }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-foreground">
                          {stage.count}
                        </span>
                      </div>
                      <div className="w-[80px] text-right flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {stage.value > 0 ? `$${stage.value.toLocaleString()}` : ''}
                        </span>
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

          {/* Source Breakdown */}
          {sourceData.length > 0 && (
            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 text-muted-foreground font-medium">Source</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Leads</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Qualified</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Won</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Close %</th>
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
                          <td className="text-right py-2">
                            {row.qualified > 0 ? `${((row.won / row.qualified) * 100).toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ad Spend placeholder */}
          <Card className="bg-card/30 border-border/20 border-dashed">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Ad Spend Metrics Coming Soon</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Connect Meta Ads to see CPL, CPQL, Cost per Sale, ROAS and more
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
