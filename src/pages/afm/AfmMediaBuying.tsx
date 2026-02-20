import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, RefreshCw, Target, DollarSign, Users, Zap, CalendarIcon, Loader2, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function fmt$(n: number) {
  if (!n) return '$0';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtN(n: number) { return n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }

interface Client { id: string; name: string; google_sheet_url: string | null; meta_sheet_url: string | null; tiktok_sheet_url: string | null; }
interface DailyMetric { date: string; spend: number; leads: number; impressions: number; link_clicks: number; }
interface BudgetPlan { id: string; month: string; planned_spend: number; planned_leads: number; planned_cpl: number | null; }
interface ClientTarget { target_cpl: number | null; target_leads: number | null; target_roas: number | null; }

// Date presets
const DATE_PRESETS = [
  { label: '7 дней', getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: '30 дней', getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'Этот месяц', getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Прош. месяц', getDates: () => { const lm = subMonths(new Date(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
  { label: 'Эта неделя', getDates: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
];

function MbDatePicker({ dateRange, onDateRangeChange }: {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (r: { from: Date; to: Date }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<DateRange | undefined>({ from: dateRange.from, to: dateRange.to });
  const [preset, setPreset] = useState('30 дней');

  const handlePreset = (p: typeof DATE_PRESETS[0]) => {
    const range = p.getDates();
    setPick({ from: range.from, to: range.to });
    setPreset(p.label);
  };

  const handleApply = () => {
    if (pick?.from && pick?.to) {
      onDateRangeChange({ from: pick.from, to: pick.to });
    }
    setOpen(false);
  };

  const displayLabel = dateRange
    ? `${format(dateRange.from, 'dd.MM.yy')} – ${format(dateRange.to, 'dd.MM.yy')}`
    : '30 дней';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/50">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        <div className="flex">
          <div className="w-36 border-r border-border/50 py-2">
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p)}
                className={cn('w-full text-left px-4 py-1.5 text-xs transition-colors', preset === p.label ? 'text-primary font-semibold bg-primary/5' : 'text-foreground hover:bg-muted/50')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={pick}
              onSelect={r => { setPick(r); setPreset(''); }}
              numberOfMonths={2}
              disabled={d => d > new Date()}
              className="p-3 pointer-events-auto"
              weekStartsOn={1}
            />
            <div className="flex items-center justify-between px-4 pb-3 gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted/50 rounded">{pick?.from ? format(pick.from, 'dd.MM.yy') : '—'}</span>
                <span>–</span>
                <span className="px-2 py-1 bg-muted/50 rounded">{pick?.to ? format(pick.to, 'dd.MM.yy') : '—'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>Отмена</Button>
                <Button size="sm" className="h-8 text-xs" onClick={handleApply}>Применить</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AfmMediaBuying() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [target, setTarget] = useState<ClientTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState(false);
  const [planSpend, setPlanSpend] = useState('');
  const [planLeads, setPlanLeads] = useState('');
  const [planCpl, setPlanCpl] = useState('');
  const [targetCpl, setTargetCpl] = useState('');
  const [targetLeads, setTargetLeads] = useState('');
  const [targetRoas, setTargetRoas] = useState('');
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });

  useEffect(() => {
    supabase.from('clients').select('id, name, google_sheet_url, meta_sheet_url, tiktok_sheet_url')
      .order('name')
      .then(({ data }) => {
        const all = data || [];
        setClients(all);
        if (all.length > 0) setSelectedClientId(all[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const monthStr = format(new Date(), 'yyyy-MM-01');

    Promise.all([
      supabase.from('daily_metrics')
        .select('date, spend, leads, impressions, link_clicks')
        .eq('client_id', selectedClientId)
        .gte('date', fromStr)
        .lte('date', toStr)
        .order('date'),
      supabase.from('budget_plans')
        .select('id, month, planned_spend, planned_leads, planned_cpl')
        .eq('client_id', selectedClientId)
        .eq('month', monthStr)
        .maybeSingle(),
      supabase.from('client_targets')
        .select('target_cpl, target_leads, target_roas')
        .eq('client_id', selectedClientId)
        .maybeSingle(),
    ]).then(([m, b, tg]) => {
      setMetrics(m.data || []);
      setBudget(b.data);
      if (b.data) {
        setPlanSpend(String(b.data.planned_spend || ''));
        setPlanLeads(String(b.data.planned_leads || ''));
        setPlanCpl(String(b.data.planned_cpl || ''));
      } else {
        setPlanSpend(''); setPlanLeads(''); setPlanCpl('');
      }
      setTarget(tg.data);
      if (tg.data) {
        setTargetCpl(String(tg.data.target_cpl || ''));
        setTargetLeads(String(tg.data.target_leads || ''));
        setTargetRoas(String(tg.data.target_roas || ''));
      } else {
        setTargetCpl(''); setTargetLeads(''); setTargetRoas('');
      }
    });
  }, [selectedClientId, dateRange]);


  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalLeads = metrics.reduce((s, m) => s + m.leads, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const ctr = totalImpressions > 0 ? (metrics.reduce((s, m) => s + m.link_clicks, 0) / totalImpressions * 100) : 0;

  const chartData = metrics.map(m => ({
    date: format(new Date(m.date), 'dd.MM'),
    Spend: Math.round(m.spend),
    Leads: m.leads,
    CPL: m.leads > 0 ? Math.round(m.spend / m.leads) : 0,
  }));

  const handleSync = async () => {
    if (!selectedClientId) return;
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-google-sheet', { body: { clientId: selectedClientId } });
      toast.success('Синхронизировано');
    } catch { toast.error('Ошибка синхронизации'); }
    setSyncing(false);
  };

  const saveBudget = useCallback(async () => {
    if (!selectedClientId) return;
    const monthStr = format(new Date(), 'yyyy-MM-01');
    if (budget?.id) {
      await supabase.from('budget_plans').update({
        planned_spend: Number(planSpend) || 0,
        planned_leads: Number(planLeads) || 0,
        planned_cpl: Number(planCpl) || null,
      }).eq('id', budget.id);
    } else {
      const { data } = await supabase.from('budget_plans').insert({
        client_id: selectedClientId, month: monthStr,
        planned_spend: Number(planSpend) || 0,
        planned_leads: Number(planLeads) || 0,
        planned_cpl: Number(planCpl) || null,
      }).select().maybeSingle();
      if (data) setBudget(data);
    }
    toast.success('Бюджет сохранён');
    setBudgetEdit(false);
  }, [selectedClientId, budget, planSpend, planLeads, planCpl]);

  const saveTargets = useCallback(async () => {
    if (!selectedClientId) return;
    if (target) {
      await supabase.from('client_targets').update({
        target_cpl: Number(targetCpl) || null,
        target_leads: Number(targetLeads) || null,
        target_roas: Number(targetRoas) || null,
      }).eq('client_id', selectedClientId);
    } else {
      await supabase.from('client_targets').insert({
        client_id: selectedClientId,
        target_cpl: Number(targetCpl) || null,
        target_leads: Number(targetLeads) || null,
        target_roas: Number(targetRoas) || null,
      });
    }
    toast.success('Цели сохранены');
  }, [selectedClientId, target, targetCpl, targetLeads, targetRoas]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const connectedPlatforms = selectedClient ? [
    selectedClient.google_sheet_url && 'Google',
    selectedClient.meta_sheet_url && 'Meta',
    selectedClient.tiktok_sheet_url && 'TikTok',
  ].filter(Boolean) as string[] : [];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Media Buying Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Внутренняя реклама и продвижение</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MbDatePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <select
            value={selectedClientId || ''}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Синхронизировать
          </Button>
        </div>
      </motion.div>

      {connectedPlatforms.length > 0 && (
        <motion.div variants={item} className="flex gap-2 flex-wrap">
          {connectedPlatforms.map(p => (
            <span key={p} className="inline-flex items-center gap-1.5 text-xs border border-border/60 rounded-full px-2.5 py-0.5 text-muted-foreground">
              <Link2 className="h-3 w-3 text-primary" />{p}
            </span>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Расходы (30д)', value: fmt$(totalSpend), icon: DollarSign, color: 'text-blue-400' },
          { label: 'Лиды (30д)', value: fmtN(totalLeads), icon: Users, color: 'text-green-400' },
          { label: 'CPL', value: cpl > 0 ? fmt$(cpl) : '—', icon: Target, color: 'text-amber-400' },
          { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: Zap, color: 'text-purple-400' },
        ].map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="daily" className="text-xs">Статистика по дням</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">Бюджетный план</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">Цели и KPI</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {chartData.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Нет данных. Синхронизируйте Google Sheets.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">Расходы по дням</CardTitle></CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="Spend" fill="#60a5fa" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">Лиды и CPL</CardTitle></CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="Leads" stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="CPL" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {chartData.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Дата</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Расходы</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Лиды</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">CPL</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Показы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.slice().reverse().map(m => (
                        <tr key={m.date} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="px-3 py-1.5 text-foreground">{format(new Date(m.date), 'dd.MM.yyyy')}</td>
                          <td className="px-3 py-1.5 text-right text-blue-400 font-mono">{fmt$(m.spend)}</td>
                          <td className="px-3 py-1.5 text-right text-green-400 font-mono">{fmtN(m.leads)}</td>
                          <td className="px-3 py-1.5 text-right text-amber-400 font-mono">{m.leads > 0 ? fmt$(m.spend / m.leads) : '—'}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground font-mono">{fmtN(m.impressions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget">
          <Card className="glass-card">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Бюджетный план — {format(new Date(), 'MMMM yyyy')}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setBudgetEdit(e => !e)} className="text-xs h-7">
                  {budgetEdit ? 'Отмена' : 'Редактировать'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Плановый расход ($)', val: planSpend, set: setPlanSpend },
                  { label: 'Плановые лиды', val: planLeads, set: setPlanLeads },
                  { label: 'Целевой CPL ($)', val: planCpl, set: setPlanCpl },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                    {budgetEdit ? (
                      <input type="text" inputMode="numeric" value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="w-full bg-background border border-primary/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary font-mono"
                      />
                    ) : (
                      <p className="text-lg font-bold font-mono text-foreground">{f.val || '—'}</p>
                    )}
                  </div>
                ))}
              </div>
              {budget && !budgetEdit && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Факт vs План</p>
                  {[
                    { label: 'Расходы', actual: totalSpend, plan: budget.planned_spend, fmt: fmt$ },
                    { label: 'Лиды', actual: totalLeads, plan: budget.planned_leads, fmt: fmtN },
                  ].map(row => {
                    const pct = row.plan > 0 ? Math.min(100, (row.actual / row.plan) * 100) : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium">{row.fmt(row.actual)} / {row.fmt(row.plan)}</span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% от плана</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {budgetEdit && <Button onClick={saveBudget} size="sm" className="w-full text-xs h-8">Сохранить план</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="glass-card">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Цели и KPI
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Целевой CPL ($)', val: targetCpl, set: setTargetCpl, actual: fmt$(cpl) },
                  { label: 'Целевые лиды', val: targetLeads, set: setTargetLeads, actual: fmtN(totalLeads) },
                  { label: 'Целевой ROAS', val: targetRoas, set: setTargetRoas, actual: '—' },
                ].map(f => (
                  <div key={f.label} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input type="text" inputMode="numeric" value={f.val} onChange={e => f.set(e.target.value)} placeholder="0"
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Факт: <span className="text-foreground font-medium">{f.actual}</span></p>
                  </div>
                ))}
              </div>
              <Button onClick={saveTargets} size="sm" className="text-xs h-8">Сохранить цели</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
