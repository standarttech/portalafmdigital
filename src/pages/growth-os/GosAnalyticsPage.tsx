import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Eye, Inbox, CheckCircle2, XCircle, GitBranch, Users, AlertTriangle, ArrowRight, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type DateRange = '7d' | '30d' | '90d';

interface Filters {
  range: DateRange;
  clientId: string;
  formId: string;
  landingId: string;
  experimentId: string;
  variantId: string;
}

function useAnalyticsData(filters: Filters) {
  return useQuery({
    queryKey: ['gos-analytics', filters],
    queryFn: async () => {
      const days = filters.range === '7d' ? 7 : filters.range === '30d' ? 30 : 90;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      let eventsQuery = supabase
        .from('gos_analytics_events')
        .select('id, event_type, entity_type, entity_id, created_at, metadata, client_id, variant_id')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (filters.clientId) eventsQuery = eventsQuery.eq('client_id', filters.clientId);
      if (filters.variantId) eventsQuery = eventsQuery.eq('variant_id', filters.variantId);

      const { data: events } = await eventsQuery;

      let filteredEvents = events || [];
      if (filters.formId) {
        filteredEvents = filteredEvents.filter(e => e.entity_id === filters.formId || (e.metadata as any)?.form_id === filters.formId);
      }
      if (filters.landingId) {
        filteredEvents = filteredEvents.filter(e => e.entity_id === filters.landingId);
      }
      if (filters.experimentId) {
        // Only show events with variant_id that belongs to this experiment
        filteredEvents = filteredEvents.filter(e => e.variant_id);
      }

      const { data: routingLogs } = await supabase
        .from('gos_routing_log')
        .select('id, action_taken, created_at, lead_source, routed_to')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: crmLeads } = await supabase
        .from('crm_leads')
        .select('id, source, created_at, is_duplicate, status')
        .like('source', 'gos_form:%')
        .gte('created_at', since);

      const { data: forms } = await supabase.from('gos_forms').select('id, name').eq('status', 'published');
      const { data: landings } = await supabase.from('gos_landing_templates').select('id, name').eq('status', 'published');
      const { data: clients } = await supabase.from('clients').select('id, name').order('name');
      const { data: experiments } = await supabase.from('gos_experiments').select('id, name, status');
      const { data: healthLogs } = await supabase
        .from('gos_health_check_log')
        .select('id, status, checked_at, message')
        .gte('checked_at', since)
        .order('checked_at', { ascending: false })
        .limit(50);

      return {
        events: filteredEvents,
        routingLogs: routingLogs || [],
        crmLeads: crmLeads || [],
        forms: forms || [],
        landings: landings || [],
        clients: clients || [],
        experiments: experiments || [],
        healthLogs: healthLogs || [],
      };
    },
    staleTime: 60_000,
  });
}

function buildTrendData(events: any[], days: number) {
  const byDay: Record<string, { landing_view: number; form_view: number; submit_success: number; submit_failure: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { landing_view: 0, form_view: 0, submit_success: 0, submit_failure: 0 };
  }
  for (const e of events) {
    const key = e.created_at.slice(0, 10);
    if (!byDay[key]) continue;
    if (e.event_type === 'landing_view') byDay[key].landing_view++;
    else if (e.event_type === 'form_view') byDay[key].form_view++;
    else if (e.event_type === 'form_submit_success') byDay[key].submit_success++;
    else if (e.event_type === 'form_submit_failure') byDay[key].submit_failure++;
  }
  return Object.entries(byDay).map(([date, counts]) => ({
    date: date.slice(5),
    ...counts,
    conversion: counts.form_view > 0 ? Math.round((counts.submit_success / counts.form_view) * 100) : 0,
  }));
}

const COLORS = ['hsl(160,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,70%,55%)', 'hsl(340,70%,50%)', 'hsl(40,80%,50%)'];

export default function GosAnalyticsPage() {
  const [filters, setFilters] = useState<Filters>({
    range: '30d', clientId: '', formId: '', landingId: '', experimentId: '', variantId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading } = useAnalyticsData(filters);

  const days = filters.range === '7d' ? 7 : filters.range === '30d' ? 30 : 90;
  const trend = useMemo(() => data ? buildTrendData(data.events, days) : [], [data, days]);

  const totals = useMemo(() => {
    if (!data) return { landingViews: 0, formViews: 0, submitSuccess: 0, submitFailure: 0, convRate: 0, crmLeads: 0, crmDuplicates: 0 };
    const landingViews = data.events.filter(e => e.event_type === 'landing_view').length;
    const formViews = data.events.filter(e => e.event_type === 'form_view').length;
    const submitSuccess = data.events.filter(e => e.event_type === 'form_submit_success').length;
    const submitFailure = data.events.filter(e => e.event_type === 'form_submit_failure').length;
    return {
      landingViews, formViews, submitSuccess, submitFailure,
      convRate: formViews > 0 ? Math.round((submitSuccess / formViews) * 100) : 0,
      crmLeads: data.crmLeads.filter(l => !l.is_duplicate).length,
      crmDuplicates: data.crmLeads.filter(l => l.is_duplicate).length,
    };
  }, [data]);

  // Top forms by submissions
  const topFormsBySubmissions = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const e of data.events) {
      if (e.event_type === 'form_submit_success' && e.entity_id) {
        counts[e.entity_id] = (counts[e.entity_id] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([id, count]) => ({ id, name: data.forms.find(f => f.id === id)?.name || id.slice(0, 8), count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [data]);

  // Failure reasons
  const failureReasons = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const e of data.events) {
      if (e.event_type === 'form_submit_failure') {
        const reason = (e.metadata as any)?.error || 'unknown';
        counts[reason] = (counts[reason] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [data]);

  // Routing outcomes
  const routingOutcomes = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const log of data.routingLogs) {
      const action = log.action_taken?.split(':')[0] || 'unknown';
      counts[action] = (counts[action] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  // CRM outcomes
  const crmOutcomes = useMemo(() => {
    if (!data) return [];
    const created = data.crmLeads.filter(l => !l.is_duplicate).length;
    const duplicates = data.crmLeads.filter(l => l.is_duplicate).length;
    const results = [];
    if (created > 0) results.push({ name: 'Created', value: created });
    if (duplicates > 0) results.push({ name: 'Duplicate', value: duplicates });
    return results;
  }, [data]);

  // Integration health
  const healthSummary = useMemo(() => {
    if (!data) return { ok: 0, error: 0, total: 0 };
    const ok = data.healthLogs.filter(l => l.status === 'ok').length;
    const error = data.healthLogs.filter(l => l.status !== 'ok').length;
    return { ok, error, total: data.healthLogs.length };
  }, [data]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.clientId || filters.formId || filters.landingId || filters.experimentId || filters.variantId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Form & landing performance from real events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${hasActiveFilters ? 'border-primary/50 text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters {hasActiveFilters && <Badge className="text-[9px] h-4 px-1 bg-primary text-primary-foreground">{[filters.clientId, filters.formId, filters.landingId, filters.experimentId, filters.variantId].filter(Boolean).length}</Badge>}
          </button>
          <Select value={filters.range} onValueChange={v => updateFilter('range', v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Panel */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-3">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Client</label>
                  <Select value={filters.clientId || 'all'} onValueChange={v => updateFilter('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {data?.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Form</label>
                  <Select value={filters.formId || 'all'} onValueChange={v => updateFilter('formId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      {data?.forms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Landing</label>
                  <Select value={filters.landingId || 'all'} onValueChange={v => updateFilter('landingId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Landings</SelectItem>
                      {data?.landings.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Experiment</label>
                  <Select value={filters.experimentId || 'all'} onValueChange={v => updateFilter('experimentId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {data?.experiments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, clientId: '', formId: '', landingId: '', experimentId: '', variantId: '' }))}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >Clear all</button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <KpiMini label="Landing Views" value={totals.landingViews} icon={Eye} color="text-blue-400 bg-blue-500/10" />
        <KpiMini label="Form Views" value={totals.formViews} icon={Eye} color="text-violet-400 bg-violet-500/10" />
        <KpiMini label="Submissions" value={totals.submitSuccess} icon={Inbox} color="text-emerald-400 bg-emerald-500/10" />
        <KpiMini label="Failures" value={totals.submitFailure} icon={XCircle} color="text-destructive bg-destructive/10" />
        <KpiMini label="Conversion" value={`${totals.convRate}%`} icon={TrendingUp} color="text-amber-400 bg-amber-500/10" />
        <KpiMini label="CRM Leads" value={totals.crmLeads} icon={Users} color="text-cyan-400 bg-cyan-500/10" />
        <KpiMini label="Duplicates" value={totals.crmDuplicates} icon={AlertTriangle} color="text-muted-foreground bg-muted" />
      </div>

      {/* Trend Chart with conversion rate */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Views, Submissions & Conversion Trend</h3>
          {trend.every(t => t.landing_view === 0 && t.form_view === 0 && t.submit_success === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No analytics events in this period</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Events are recorded when forms and landings are viewed via embed</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="landing_view" stroke="hsl(200,80%,50%)" name="Landing Views" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="form_view" stroke="hsl(280,70%,55%)" name="Form Views" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="submit_success" stroke="hsl(160,70%,45%)" name="Submissions" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="submit_failure" stroke="hsl(0,70%,50%)" name="Failures" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="hsl(40,80%,50%)" name="Conversion %" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Conversion Funnel</h3>
          <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
            <FunnelStep label="Landing Views" value={totals.landingViews} color="bg-blue-500/20 text-blue-400 border-blue-500/30" />
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <FunnelStep label="Form Views" value={totals.formViews} color="bg-violet-500/20 text-violet-400 border-violet-500/30" />
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <FunnelStep label="Submit OK" value={totals.submitSuccess} color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" />
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <FunnelStep label="CRM Leads" value={totals.crmLeads} color="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" />
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            {totals.submitFailure > 0 && <span className="text-destructive">↳ {totals.submitFailure} failures</span>}
            {totals.crmDuplicates > 0 && <span className="text-amber-400">↳ {totals.crmDuplicates} duplicates</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Forms */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top Forms by Submissions</h3>
            {topFormsBySubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No submission data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topFormsBySubmissions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(160,70%,45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Routing Outcomes */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Routing Outcomes</h3>
            {routingOutcomes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No routing data yet</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={routingOutcomes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                      {routingOutcomes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {routingOutcomes.map((o, i) => (
                    <div key={o.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-foreground">{o.name}</span>
                      <Badge variant="outline" className="text-[10px]">{o.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CRM Lead Outcomes */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">CRM Lead Outcomes</h3>
            {crmOutcomes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No CRM leads from forms yet</p>
            ) : (
              <div className="space-y-2">
                {crmOutcomes.map(o => (
                  <div key={o.name} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{o.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-muted w-24 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${o.name === 'Created' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, (o.value / Math.max(...crmOutcomes.map(c => c.value), 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">{o.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Reasons */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top Failure Reasons</h3>
            {failureReasons.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No failures recorded</p>
            ) : (
              <div className="space-y-2">
                {failureReasons.map(r => (
                  <div key={r.reason} className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate flex-1">{r.reason}</span>
                    <Badge variant="outline" className="text-[10px] ml-2">{r.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Health History */}
      {healthSummary.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Integration Health History</h3>
            <div className="flex items-center gap-4 text-xs mb-3">
              <span className="text-emerald-400">✓ {healthSummary.ok} OK</span>
              {healthSummary.error > 0 && <span className="text-destructive">✗ {healthSummary.error} errors</span>}
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {data?.healthLogs.slice(0, 20).map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={log.status === 'ok' ? 'text-emerald-400' : 'text-destructive'}>●</span>
                    <span className="text-muted-foreground">{new Date(log.checked_at).toLocaleString()}</span>
                  </div>
                  {log.message && <span className="text-muted-foreground truncate max-w-[200px]">{log.message}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiMini({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border p-3 text-center min-w-[90px] ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
