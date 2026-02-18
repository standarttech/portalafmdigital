import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Plus, Trash2, StickyNote, TrendingUp, Users, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfYear, endOfYear, addDays, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange as DRType } from 'react-day-picker';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// ─── HELPERS ───────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function num(v: number | string): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
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

// ─── WEEKLY STATS ──────────────────────────────────────────────
interface WeekRow {
  id: string;
  week: string; // "DD.MM - DD.MM"
  totalClients: number | string;
  qualLeads: number | string;
  meetings: number | string;
  newContracts: number | string;
  newPayments: number | string;
  note: string;
}

const WEEK_COLS = [
  { key: 'totalClients', label: 'Всего клиентов', color: '#60a5fa' },
  { key: 'qualLeads', label: 'Квал. лиды', color: '#34d399' },
  { key: 'meetings', label: 'Встречи', color: '#a78bfa' },
  { key: 'newContracts', label: 'Новые контракты', color: '#fbbf24' },
  { key: 'newPayments', label: 'Новые оплаты', color: '#f87171' },
] as const;

// Generate weeks (Fri→Thu) for a date range
function generateWeeks(from: Date, to: Date): WeekRow[] {
  // Find first Friday on or before `from`
  const weeks: WeekRow[] = [];
  // Get weeks starting Friday
  const interval = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 5 });
  interval.forEach((fridayStart, i) => {
    const thursdayEnd = addDays(fridayStart, 6);
    const weekLabel = `${format(fridayStart, 'dd.MM')} - ${format(thursdayEnd, 'dd.MM')}`;
    weeks.push({
      id: `w${i}-${fridayStart.getTime()}`,
      week: weekLabel,
      totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '',
    });
  });
  return weeks;
}

function WeeklyTable() {
  // Default: last 3 months
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d;
  }, []);
  const defaultTo = new Date();

  const [dateRange, setDateRange] = useState<DRType | undefined>({ from: defaultFrom, to: defaultTo });
  const [calOpen, setCalOpen] = useState(false);

  const generatedWeeks = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    return generateWeeks(dateRange.from, dateRange.to);
  }, [dateRange]);

  const [rows, setRows] = useState<Record<string, WeekRow>>({});
  const [noteRow, setNoteRow] = useState<string | null>(null);

  const getRow = (id: string, week: string): WeekRow => rows[id] || { id, week, totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' };

  const update = (id: string, week: string, key: keyof WeekRow, val: string) => {
    setRows(prev => ({ ...prev, [id]: { ...getRow(id, week), [key]: val } }));
  };

  // Build chart data only from rows that have at least one filled value, stop at last filled
  const chartData = useMemo(() => {
    const allPoints = generatedWeeks.map(gw => {
      const r = getRow(gw.id, gw.week);
      return {
        week: gw.week.slice(0, 5),
        'Клиенты': num(r.totalClients),
        'Лиды': num(r.qualLeads),
        'Встречи': num(r.meetings),
        'Контракты': num(r.newContracts),
        hasFilled: r.totalClients !== '' || r.qualLeads !== '' || r.meetings !== '' || r.newContracts !== '' || r.newPayments !== '',
      };
    });
    // Trim trailing unfilled
    let lastFilledIdx = -1;
    allPoints.forEach((p, i) => { if (p.hasFilled) lastFilledIdx = i; });
    return lastFilledIdx >= 0 ? allPoints.slice(0, lastFilledIdx + 1) : [];
  }, [generatedWeeks, rows]);

  const rangeLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd.MM.yy')} — ${format(dateRange.to, 'dd.MM.yy')}`
    : 'Выбрать период';

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="flex items-center gap-2">
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Calendar className="h-3.5 w-3.5" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setCalOpen(false); }}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">Недели: пятница → четверг</span>
      </div>

      {/* Charts */}
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
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
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
                        type="number"
                        value={row[c.key] as string}
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
interface MonthRow {
  id: string;
  month: string;
  clients: number | string;
  newRevenue: number | string;
  renewalRevenue: number | string;
  totalRevenue: number | string;
  note: string;
}

const MONTH_COLS = [
  { key: 'clients', label: 'Кол-во клиентов', color: '#60a5fa' },
  { key: 'newRevenue', label: 'Выручка новая ($)', color: '#34d399' },
  { key: 'renewalRevenue', label: 'Выручка продления ($)', color: '#a78bfa' },
  { key: 'totalRevenue', label: 'Общая выручка ($)', color: '#fbbf24' },
] as const;

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function generateMonths(year: number): MonthRow[] {
  return MONTH_NAMES.map((name, i) => ({
    id: `m-${year}-${i}`,
    month: name,
    clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '',
  }));
}

function MonthlyTable() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [calOpen, setCalOpen] = useState(false);

  const generatedMonths = useMemo(() => generateMonths(year), [year]);
  const [rows, setRows] = useState<Record<string, MonthRow>>({});
  const [noteRow, setNoteRow] = useState<string | null>(null);

  const getRow = (id: string, month: string): MonthRow => rows[id] || { id, month, clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '' };

  const update = (id: string, month: string, key: keyof MonthRow, val: string) => {
    setRows(prev => {
      const current = prev[id] || getRow(id, month);
      const updated = { ...current, [key]: val };
      if (key === 'newRevenue' || key === 'renewalRevenue') {
        const nr = key === 'newRevenue' ? num(val) : num(updated.newRevenue);
        const rr = key === 'renewalRevenue' ? num(val) : num(updated.renewalRevenue);
        updated.totalRevenue = (nr + rr) || '';
      }
      return { ...prev, [id]: updated };
    });
  };

  // Build chart data, trim trailing unfilled
  const chartData = useMemo(() => {
    const allPoints = generatedMonths.map(gm => {
      const r = getRow(gm.id, gm.month);
      return {
        month: gm.month.slice(0, 3),
        'Клиенты': num(r.clients),
        'Новая ($)': num(r.newRevenue),
        'Продление ($)': num(r.renewalRevenue),
        'Итого ($)': num(r.totalRevenue),
        hasFilled: r.clients !== '' || r.newRevenue !== '' || r.renewalRevenue !== '',
      };
    });
    let lastFilledIdx = -1;
    allPoints.forEach((p, i) => { if (p.hasFilled) lastFilledIdx = i; });
    return lastFilledIdx >= 0 ? allPoints.slice(0, lastFilledIdx + 1) : [];
  }, [generatedMonths, rows]);

  return (
    <div className="space-y-4">
      {/* Year picker */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setYear(y => y - 1)}>‹</Button>
        <span className="text-sm font-semibold text-foreground w-12 text-center">{year}</span>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setYear(y => y + 1)}>›</Button>
        <span className="text-xs text-muted-foreground">Все 12 месяцев года</span>
      </div>

      {/* Charts */}
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
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => chart.isMoney ? `$${v}` : String(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
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
                        type="number"
                        value={row[c.key] as string}
                        onChange={e => update(gm.id, gm.month, c.key, e.target.value)}
                        placeholder="—"
                        readOnly={c.key === 'totalRevenue'}
                        className={cn(
                          'w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none transition-colors',
                          c.key === 'totalRevenue' ? 'font-semibold text-primary cursor-default' : 'focus:border-primary/50 hover:border-border/50'
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
          Вносите данные — графики строятся автоматически. Иконка 📌 — добавить пометку к строке.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="weekly">
          <TabsList className="mb-4">
            <TabsTrigger value="weekly" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Еженедельно
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Ежемесячно
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Недельные показатели</CardTitle>
                <p className="text-xs text-muted-foreground">Вписывайте данные — графики обновляются автоматически</p>
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
                <p className="text-xs text-muted-foreground">Общая выручка рассчитывается автоматически (новая + продления)</p>
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
