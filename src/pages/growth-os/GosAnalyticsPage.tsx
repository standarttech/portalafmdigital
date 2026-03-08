import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Eye, Inbox, CheckCircle2, XCircle, GitBranch, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type DateRange = '7d' | '30d' | '90d';

function useAnalyticsData(range: DateRange) {
  return useQuery({
    queryKey: ['gos-analytics', range],
    queryFn: async () => {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: events } = await supabase
        .from('gos_analytics_events')
        .select('id, event_type, entity_type, entity_id, created_at, metadata, client_id')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      const { data: routingLogs } = await supabase
        .from('gos_routing_log')
        .select('id, action_taken, created_at')
        .gte('created_at', since);

      const { data: crmLeads } = await supabase
        .from('crm_leads')
        .select('id, source, created_at')
        .like('source', 'gos_form:%')
        .gte('created_at', since);

      const { data: topForms } = await supabase
        .from('gos_forms')
        .select('id, name')
        .eq('status', 'published');

      const { data: topLandings } = await supabase
        .from('gos_landing_templates')
        .select('id, name')
        .eq('status', 'published');

      return { events: events || [], routingLogs: routingLogs || [], crmLeads: crmLeads || [], topForms: topForms || [], topLandings: topLandings || [] };
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
    date: date.slice(5), // MM-DD
    ...counts,
    conversion: counts.form_view > 0 ? Math.round((counts.submit_success / counts.form_view) * 100) : 0,
  }));
}

const COLORS = ['hsl(160,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,70%,55%)', 'hsl(340,70%,50%)', 'hsl(40,80%,50%)'];

export default function GosAnalyticsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const { data, isLoading } = useAnalyticsData(range);

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const trend = useMemo(() => data ? buildTrendData(data.events, days) : [], [data, days]);

  const totals = useMemo(() => {
    if (!data) return { landingViews: 0, formViews: 0, submitSuccess: 0, submitFailure: 0, convRate: 0, crmLeads: 0 };
    const landingViews = data.events.filter(e => e.event_type === 'landing_view').length;
    const formViews = data.events.filter(e => e.event_type === 'form_view').length;
    const submitSuccess = data.events.filter(e => e.event_type === 'form_submit_success').length;
    const submitFailure = data.events.filter(e => e.event_type === 'form_submit_failure').length;
    return {
      landingViews, formViews, submitSuccess, submitFailure,
      convRate: formViews > 0 ? Math.round((submitSuccess / formViews) * 100) : 0,
      crmLeads: data.crmLeads.length,
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
      .map(([id, count]) => ({ id, name: data.topForms.find(f => f.id === id)?.name || id.slice(0, 8), count }))
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

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Form & landing performance metrics from real events</p>
        </div>
        <Select value={range} onValueChange={v => setRange(v as DateRange)}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiMini label="Landing Views" value={totals.landingViews} icon={Eye} color="text-blue-400 bg-blue-500/10" />
        <KpiMini label="Form Views" value={totals.formViews} icon={Eye} color="text-violet-400 bg-violet-500/10" />
        <KpiMini label="Submissions" value={totals.submitSuccess} icon={Inbox} color="text-emerald-400 bg-emerald-500/10" />
        <KpiMini label="Failures" value={totals.submitFailure} icon={XCircle} color="text-destructive bg-destructive/10" />
        <KpiMini label="Conversion" value={`${totals.convRate}%`} icon={TrendingUp} color="text-amber-400 bg-amber-500/10" />
        <KpiMini label="CRM Leads" value={totals.crmLeads} icon={Users} color="text-cyan-400 bg-cyan-500/10" />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Views & Submissions Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="landing_view" stroke="hsl(200,80%,50%)" name="Landing Views" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="form_view" stroke="hsl(280,70%,55%)" name="Form Views" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="submit_success" stroke="hsl(160,70%,45%)" name="Submissions" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Conversion Funnel</h3>
          <div className="flex items-center justify-center gap-2 py-4">
            <FunnelStep label="Landing Views" value={totals.landingViews} color="bg-blue-500/20 text-blue-400 border-blue-500/30" />
            <span className="text-muted-foreground">→</span>
            <FunnelStep label="Form Views" value={totals.formViews} color="bg-violet-500/20 text-violet-400 border-violet-500/30" />
            <span className="text-muted-foreground">→</span>
            <FunnelStep label="Submissions" value={totals.submitSuccess} color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" />
            <span className="text-muted-foreground">→</span>
            <FunnelStep label="CRM Leads" value={totals.crmLeads} color="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" />
          </div>
        </CardContent>
      </Card>
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
    <div className={`rounded-lg border p-3 text-center min-w-[100px] ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
