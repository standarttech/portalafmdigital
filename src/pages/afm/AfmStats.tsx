import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, StickyNote, TrendingUp, Users, Calendar, History, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, addDays, eachWeekOfInterval } from 'date-fns';
import type { DateRange as DRType } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
function num(v: number | string): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function hasValue(v: number | string): boolean {
  return v !== '' && v !== null && v !== undefined;
}

// Persist chart settings per stat_type to localStorage
function usePersistedState<T>(key: string, defaultVal: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`afm_stats_${key}`);
      return stored !== null ? JSON.parse(stored) : defaultVal;
    } catch { return defaultVal; }
  });
  const set = useCallback((v: T) => {
    setState(v);
    try { localStorage.setItem(`afm_stats_${key}`, JSON.stringify(v)); } catch {}
  }, [key]);
  return [state, set];
}

// ─── CHART TOOLTIP ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
}

// ─── CHART CONTROLS ────────────────────────────────────────────
interface ChartControlsProps {
  lineType: 'monotone' | 'linear';
  setLineType: (v: 'monotone' | 'linear') => void;
  tickCount: number;
  setTickCount: (v: number) => void;
}
function ChartControls({ lineType, setLineType, tickCount, setTickCount }: ChartControlsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Линии:</span>
        <div className="flex bg-muted/50 rounded-md p-0.5">
          <button onClick={() => setLineType('monotone')}
            className={cn('text-[10px] px-2 py-0.5 rounded transition-colors', lineType === 'monotone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Гладкие
          </button>
          <button onClick={() => setLineType('linear')}
            className={cn('text-[10px] px-2 py-0.5 rounded transition-colors', lineType === 'linear' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Прямые
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Делений Y:</span>
        <Select value={String(tickCount)} onValueChange={v => setTickCount(Number(v))}>
          <SelectTrigger className="h-6 text-[10px] w-14 px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 4, 5, 6, 8, 10].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ─────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  period_key: string;
  field_name: string;
  old_value: number | null;
  new_value: number;
  changed_at: string;
}

function HistoryPanel({ statType, yearRange }: { statType: string; yearRange: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('afm_stats_history')
        .select('id, period_key, field_name, old_value, new_value, changed_at')
        .eq('stat_type', statType)
        .eq('year_range', yearRange)
        .order('changed_at', { ascending: false })
        .limit(50);
      setHistory(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [statType, yearRange]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (!history.length) return <p className="text-xs text-muted-foreground text-center py-4">Нет истории изменений</p>;

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {history.map(h => (
        <div key={h.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono">{h.period_key}</span>
            <span className="text-foreground">{h.field_name}</span>
          </div>
          <div className="flex items-center gap-2">
            {h.old_value !== null && <span className="text-muted-foreground line-through">{h.old_value}</span>}
            <span className="text-primary font-medium">→ {h.new_value}</span>
            <span className="text-muted-foreground text-[10px]">{format(new Date(h.changed_at), 'dd.MM HH:mm')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DATE RANGE PICKER (styled like the rest of the app) ───────
function DateRangePicker({ value, onChange }: { value: DRType | undefined; onChange: (r: DRType | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const label = value?.from && value?.to
    ? `${format(value.from, 'dd.MM.yy')} — ${format(value.to, 'dd.MM.yy')}`
    : 'Выбрать период';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Calendar className="h-3.5 w-3.5" />{label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <CalendarComponent
          mode="range" selected={value}
          onSelect={r => { onChange(r); if (r?.from && r?.to) setOpen(false); }}
          numberOfMonths={2} className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── WEEKLY STATS ──────────────────────────────────────────────
interface WeekRow {
  id: string;
  week: string;
  totalClients: string;
  qualLeads: string;
  meetings: string;
  newContracts: string;
  newPayments: string;
  note: string;
}

const WEEK_COLS = [
  { key: 'totalClients' as const, label: 'Всего клиентов', color: '#60a5fa' },
  { key: 'qualLeads' as const, label: 'Квал. лиды', color: '#34d399' },
  { key: 'meetings' as const, label: 'Встречи', color: '#a78bfa' },
  { key: 'newContracts' as const, label: 'Новые контракты', color: '#fbbf24' },
  { key: 'newPayments' as const, label: 'Новые оплаты', color: '#f87171' },
];

function generateWeeks(from: Date, to: Date): { id: string; week: string }[] {
  const weeks: { id: string; week: string }[] = [];
  const interval = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 5 });
  interval.forEach((fridayStart, i) => {
    const thursdayEnd = addDays(fridayStart, 6);
    const weekLabel = `${format(fridayStart, 'dd.MM')} - ${format(thursdayEnd, 'dd.MM')}`;
    weeks.push({ id: `w_${format(fridayStart, 'yyyy-MM-dd')}`, week: weekLabel });
  });
  return weeks;
}

function getWeeklyYearRange(from: Date, to: Date) {
  return `${format(from, 'yyyy-MM-dd')}_${format(to, 'yyyy-MM-dd')}`;
}

function WeeklyTable() {
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d;
  }, []);

  const [dateRange, setDateRange] = usePersistedState<DRType | undefined>('weekly_range', { from: defaultFrom, to: new Date() });
  const [lineType, setLineType] = usePersistedState<'monotone' | 'linear'>('weekly_lineType', 'monotone');
  const [tickCount, setTickCount] = usePersistedState<number>('weekly_tickCount', 5);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const yearRange = useMemo(() =>
    dateRange?.from && dateRange?.to ? getWeeklyYearRange(dateRange.from, dateRange.to) : '',
    [dateRange]
  );

  const generatedWeeks = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    return generateWeeks(dateRange.from, dateRange.to);
  }, [dateRange]);

  const [rows, setRows] = useState<Record<string, WeekRow>>({});
  const [noteRow, setNoteRow] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load data from DB when yearRange changes
  useEffect(() => {
    if (!yearRange) return;
    setLoading(true);
    supabase
      .from('afm_stats_data')
      .select('period_key, field_name, value, note')
      .eq('stat_type', 'weekly')
      .eq('year_range', yearRange)
      .then(({ data }) => {
        if (data) {
          const loaded: Record<string, WeekRow> = {};
          data.forEach(d => {
            if (!loaded[d.period_key]) {
              const gw = generatedWeeks.find(w => w.id === d.period_key);
              loaded[d.period_key] = {
                id: d.period_key,
                week: gw?.week || d.period_key,
                totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '',
              };
            }
            if (d.field_name !== 'note') {
              (loaded[d.period_key] as any)[d.field_name] = String(d.value);
            }
            if (d.note) loaded[d.period_key].note = d.note;
          });
          setRows(prev => ({ ...prev, ...loaded }));
        }
        setLoading(false);
      });
  }, [yearRange, generatedWeeks.length]);

  const getRow = (id: string, week: string): WeekRow =>
    rows[id] || { id, week, totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' };

  const saveToDb = useCallback(async (id: string, row: WeekRow) => {
    if (!yearRange) return;
    setSaving(true);
    await Promise.all(WEEK_COLS.map(async (c) => {
      const val = num(row[c.key]);
      await supabase.rpc('upsert_afm_stat', {
        _stat_type: 'weekly',
        _period_key: id,
        _year_range: yearRange,
        _field_name: c.key,
        _value: val,
        _note: row.note || null,
      });
    }));
    setSaving(false);
  }, [yearRange]);

  const update = (id: string, week: string, key: keyof WeekRow, val: string) => {
    setRows(prev => {
      const updated = { ...prev, [id]: { ...getRow(id, week), [key]: val } };
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => saveToDb(id, updated[id]), 600);
      return updated;
    });
  };

  // Chart: 0 is valid, only empty string means "not filled"
  const chartData = useMemo(() => {
    const allPoints = generatedWeeks.map(gw => {
      const r = getRow(gw.id, gw.week);
      const filledAny = WEEK_COLS.some(c => hasValue(r[c.key]));
      return {
        week: gw.week.slice(0, 5),
        'Клиенты': hasValue(r.totalClients) ? num(r.totalClients) : null,
        'Лиды': hasValue(r.qualLeads) ? num(r.qualLeads) : null,
        'Встречи': hasValue(r.meetings) ? num(r.meetings) : null,
        'Контракты': hasValue(r.newContracts) ? num(r.newContracts) : null,
        hasFilled: filledAny,
      };
    });
    // Find first filled index
    const firstIdx = allPoints.findIndex(p => p.hasFilled);
    let lastIdx = -1;
    allPoints.forEach((p, i) => { if (p.hasFilled) lastIdx = i; });
    if (firstIdx === -1) return [];
    return allPoints.slice(firstIdx, lastIdx + 1);
  }, [generatedWeeks, rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={r => setDateRange(r)}
          />
          <span className="text-xs text-muted-foreground">Пт → Чт</span>
          {saving && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Сохраняю...</div>}
          {loading && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Загрузка...</div>}
        </div>
        <div className="flex items-center gap-2">
          <ChartControls lineType={lineType} setLineType={setLineType} tickCount={tickCount} setTickCount={setTickCount} />
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowHistory(h => !h)}>
            <History className="h-3.5 w-3.5" />История
          </Button>
        </div>
      </div>

      {showHistory && (
        <Card className="glass-card">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />История изменений
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <HistoryPanel statType="weekly" yearRange={yearRange} />
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Общее кол-во клиентов', dataKey: 'Клиенты', color: '#60a5fa' },
            { title: 'Количество новых лидов', dataKey: 'Лиды', color: '#34d399' },
            { title: 'Количество встреч', dataKey: 'Встречи', color: '#a78bfa' },
            { title: 'Новые контракты', dataKey: 'Контракты', color: '#fbbf24' },
          ].map(chart => (
            <Card key={chart.title} className="glass-card">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="week" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" tickCount={tickCount} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type={lineType}
                      dataKey={chart.dataKey}
                      stroke={chart.color}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[700px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[140px] border-r border-border/40">Неделя</th>
              {WEEK_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[100px]">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {generatedWeeks.map(gw => {
              const row = getRow(gw.id, gw.week);
              return (
                <tr key={gw.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                  <td className="sticky left-0 bg-background px-2 py-1 border-r border-border/40">
                    <div className="flex items-center gap-1">
                      <span className="flex-1 text-xs text-muted-foreground">{gw.week}</span>
                      <button
                        onClick={() => setNoteRow(noteRow === gw.id ? null : gw.id)}
                        className={cn('p-0.5 rounded transition-colors', row.note ? 'text-primary' : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100')}
                      >
                        <StickyNote className="h-3 w-3" />
                      </button>
                    </div>
                    {noteRow === gw.id && (
                      <input
                        value={row.note}
                        onChange={e => update(gw.id, gw.week, 'note', e.target.value)}
                        placeholder="Пометка..."
                        autoFocus
                        className="w-full mt-1 bg-primary/5 border border-primary/30 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-primary text-primary"
                      />
                    )}
                  </td>
                  {WEEK_COLS.map(c => (
                    <td key={c.key} className="px-1 py-1 border-r border-border/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row[c.key]}
                        onChange={e => update(gw.id, gw.week, c.key, e.target.value)}
                        placeholder="—"
                        className="w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MONTHLY STATS ─────────────────────────────────────────────
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface MonthRow {
  id: string;
  month: string;
  clients: string;
  newRevenue: string;
  renewalRevenue: string;
  totalRevenue: string;
  note: string;
}

const MONTH_COLS = [
  { key: 'clients' as const, label: 'Кол-во клиентов', color: '#60a5fa' },
  { key: 'newRevenue' as const, label: 'Выручка новая ($)', color: '#34d399' },
  { key: 'renewalRevenue' as const, label: 'Выручка продления ($)', color: '#a78bfa' },
  { key: 'totalRevenue' as const, label: 'Общая выручка ($)', color: '#fbbf24', readOnly: true },
] as const;

function generateMonths(year: number): { id: string; month: string }[] {
  return MONTH_NAMES.map((name, i) => ({ id: `m-${year}-${i}`, month: name }));
}

function MonthlyTable() {
  const currentYear = new Date().getFullYear();
  const [year, setYearState] = usePersistedState<number>('monthly_year', currentYear);
  const setYear = (fn: number | ((y: number) => number)) => setYearState(typeof fn === 'function' ? fn(year) : fn);
  const [lineType, setLineType] = usePersistedState<'monotone' | 'linear'>('monthly_lineType', 'monotone');
  const [tickCount, setTickCount] = usePersistedState<number>('monthly_tickCount', 5);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const yearRange = String(year);
  const generatedMonths = useMemo(() => generateMonths(year), [year]);
  const [rows, setRows] = useState<Record<string, MonthRow>>({});
  const [noteRow, setNoteRow] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setLoading(true);
    supabase
      .from('afm_stats_data')
      .select('period_key, field_name, value, note')
      .eq('stat_type', 'monthly')
      .eq('year_range', yearRange)
      .then(({ data }) => {
        if (data) {
          const loaded: Record<string, MonthRow> = {};
          data.forEach(d => {
            if (!loaded[d.period_key]) {
              const gm = generatedMonths.find(m => m.id === d.period_key);
              loaded[d.period_key] = {
                id: d.period_key, month: gm?.month || d.period_key,
                clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '',
              };
            }
            (loaded[d.period_key] as any)[d.field_name] = String(d.value);
            if (d.note) loaded[d.period_key].note = d.note;
          });
          // Recalculate totalRevenue
          Object.values(loaded).forEach(row => {
            const nr = num(row.newRevenue);
            const rr = num(row.renewalRevenue);
            row.totalRevenue = String(nr + rr);
          });
          setRows(prev => ({ ...prev, ...loaded }));
        }
        setLoading(false);
      });
  }, [year]);

  const getRow = (id: string, month: string): MonthRow =>
    rows[id] || { id, month, clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '' };

  const saveToDb = useCallback(async (id: string, row: MonthRow) => {
    setSaving(true);
    const fields = ['clients', 'newRevenue', 'renewalRevenue'] as const;
    await Promise.all(fields.map(async (field) => {
      const val = num((row as any)[field]);
      await supabase.rpc('upsert_afm_stat', {
        _stat_type: 'monthly',
        _period_key: id,
        _year_range: yearRange,
        _field_name: field,
        _value: val,
        _note: row.note || null,
      });
    }));
    setSaving(false);
  }, [yearRange]);

  const update = (id: string, month: string, key: keyof MonthRow, val: string) => {
    setRows(prev => {
      const current = prev[id] || getRow(id, month);
      const updated = { ...current, [key]: val };
      if (key === 'newRevenue' || key === 'renewalRevenue') {
        const nr = key === 'newRevenue' ? num(val) : num(updated.newRevenue);
        const rr = key === 'renewalRevenue' ? num(val) : num(updated.renewalRevenue);
        updated.totalRevenue = String(nr + rr);
      }
      const newRows = { ...prev, [id]: updated };
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => saveToDb(id, updated), 600);
      return newRows;
    });
  };

  // Chart: 0 is valid, only empty string = not filled
  const chartData = useMemo(() => {
    const allPoints = generatedMonths.map(gm => {
      const r = getRow(gm.id, gm.month);
      const filledAny = hasValue(r.clients) || hasValue(r.newRevenue) || hasValue(r.renewalRevenue);
      return {
        month: gm.month.slice(0, 3),
        'Клиенты': hasValue(r.clients) ? num(r.clients) : null,
        'Новая ($)': hasValue(r.newRevenue) ? num(r.newRevenue) : null,
        'Продление ($)': hasValue(r.renewalRevenue) ? num(r.renewalRevenue) : null,
        'Итого ($)': (hasValue(r.newRevenue) || hasValue(r.renewalRevenue)) ? num(r.totalRevenue) : null,
        hasFilled: filledAny,
      };
    });
    const firstIdx = allPoints.findIndex(p => p.hasFilled);
    let lastIdx = -1;
    allPoints.forEach((p, i) => { if (p.hasFilled) lastIdx = i; });
    if (firstIdx === -1) return [];
    return allPoints.slice(firstIdx, lastIdx + 1);
  }, [generatedMonths, rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setYear(y => y - 1)}>‹</Button>
          <span className="text-sm font-semibold text-foreground w-12 text-center">{year}</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setYear(y => y + 1)}>›</Button>
          <span className="text-xs text-muted-foreground">Все 12 месяцев</span>
          {saving && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Сохраняю...</div>}
          {loading && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Загрузка...</div>}
        </div>
        <div className="flex items-center gap-2">
          <ChartControls lineType={lineType} setLineType={setLineType} tickCount={tickCount} setTickCount={setTickCount} />
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowHistory(h => !h)}>
            <History className="h-3.5 w-3.5" />История
          </Button>
        </div>
      </div>

      {showHistory && (
        <Card className="glass-card">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />История изменений — {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <HistoryPanel statType="monthly" yearRange={yearRange} />
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Количество клиентов', dataKey: 'Клиенты', color: '#60a5fa', isMoney: false },
            { title: 'Выручка новая', dataKey: 'Новая ($)', color: '#34d399', isMoney: true },
            { title: 'Выручка продления', dataKey: 'Продление ($)', color: '#a78bfa', isMoney: true },
            { title: 'Общая выручка', dataKey: 'Итого ($)', color: '#fbbf24', isMoney: true },
          ].map(chart => (
            <Card key={chart.title} className="glass-card">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: chart.isMoney ? -10 : -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="month" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" tickCount={tickCount} tickFormatter={v => chart.isMoney ? `$${v}` : String(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type={lineType}
                      dataKey={chart.dataKey}
                      stroke={chart.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[600px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[120px] border-r border-border/40">Месяц</th>
              {MONTH_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[130px]">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {generatedMonths.map(gm => {
              const row = getRow(gm.id, gm.month);
              return (
                <tr key={gm.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                  <td className="sticky left-0 bg-background px-2 py-1 border-r border-border/40">
                    <div className="flex items-center gap-1">
                      <span className="flex-1 text-xs text-foreground">{gm.month}</span>
                      <button
                        onClick={() => setNoteRow(noteRow === gm.id ? null : gm.id)}
                        className={cn('p-0.5 rounded transition-colors', row.note ? 'text-primary' : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100')}
                      >
                        <StickyNote className="h-3 w-3" />
                      </button>
                    </div>
                    {noteRow === gm.id && (
                      <input
                        value={row.note}
                        onChange={e => update(gm.id, gm.month, 'note', e.target.value)}
                        placeholder="Пометка..."
                        autoFocus
                        className="w-full mt-1 bg-primary/5 border border-primary/30 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-primary text-primary"
                      />
                    )}
                  </td>
                  {MONTH_COLS.map(c => (
                    <td key={c.key} className={cn('px-1 py-1 border-r border-border/20', c.key === 'totalRevenue' ? 'bg-primary/5' : '')}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row[c.key]}
                        onChange={e => !('readOnly' in c && c.readOnly) && update(gm.id, gm.month, c.key as keyof MonthRow, e.target.value)}
                        placeholder="—"
                        readOnly={'readOnly' in c && c.readOnly}
                        className={cn(
                          'w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none transition-colors',
                          'readOnly' in c && c.readOnly ? 'font-semibold text-primary cursor-default' : 'focus:border-primary/50 hover:border-border/50'
                        )}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function AfmStats() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Статистики и состояния
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Данные сохраняются автоматически. 📌 — пометка к строке. История изменений по кнопке.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="weekly">
          <TabsList className="mb-4">
            <TabsTrigger value="weekly" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" />Еженедельно
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />Ежемесячно
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Недельные показатели</CardTitle>
                <p className="text-xs text-muted-foreground">Недели пятница → четверг. Данные сохраняются в базу автоматически.</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <WeeklyTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Месячные показатели</CardTitle>
                <p className="text-xs text-muted-foreground">Общая выручка рассчитывается автоматически. Данные сохраняются в базу.</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <MonthlyTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
