import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Plus, Trash2, StickyNote, TrendingUp, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// ─── WEEKLY STATS ──────────────────────────────────────────────
interface WeekRow {
  id: string;
  week: string;
  totalClients: number | string;
  qualLeads: number | string;
  meetings: number | string;
  newContracts: number | string;
  newPayments: number | string;
  note: string;
}

const INIT_WEEKS: WeekRow[] = [
  { id: 'w1', week: '26.31 - 01.01', totalClients: 2, qualLeads: 1, meetings: 1, newContracts: 0, newPayments: 0, note: '' },
  { id: 'w2', week: '02.01 - 08.01', totalClients: 2, qualLeads: 2, meetings: 2, newContracts: 1, newPayments: 0, note: '' },
  { id: 'w3', week: '9.01 - 15.01', totalClients: 2, qualLeads: 5, meetings: 2, newContracts: 0, newPayments: 0, note: '' },
  { id: 'w4', week: '16.01 - 22.01', totalClients: 2, qualLeads: 0, meetings: 4, newContracts: 0, newPayments: 0, note: '' },
  { id: 'w5', week: '23.01 - 29.01', totalClients: 2, qualLeads: 2, meetings: 2, newContracts: 1, newPayments: 0, note: '' },
  { id: 'w6', week: '30.01 - 05.02', totalClients: 3, qualLeads: 6, meetings: 0, newContracts: 0, newPayments: 1, note: '' },
  { id: 'w7', week: '06.02 - 12.02', totalClients: 3, qualLeads: 13, meetings: 5, newContracts: 2, newPayments: 0, note: '' },
  { id: 'w8', week: '13.02 - 19.02', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
  { id: 'w9', week: '20.02 - 26.02', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
  { id: 'w10', week: '27.02 - 5.03', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
  { id: 'w11', week: '06.03 - 12.03', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
  { id: 'w12', week: '13.03 - 19.03', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
  { id: 'w13', week: '20.03 - 26.03', totalClients: '', qualLeads: '', meetings: '', newContracts: '', newPayments: '', note: '' },
];

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

const INIT_MONTHS: MonthRow[] = [
  { id: 'm1', month: 'Ноябрь', clients: 2, newRevenue: 0, renewalRevenue: 2000, totalRevenue: 2000, note: '' },
  { id: 'm2', month: 'Декабрь', clients: 2, newRevenue: 0, renewalRevenue: 2000, totalRevenue: 2000, note: '' },
  { id: 'm3', month: 'Январь', clients: 3, newRevenue: 5000, renewalRevenue: 500, totalRevenue: 5500, note: '' },
  { id: 'm4', month: 'Февраль', clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '' },
  { id: 'm5', month: 'Март', clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '' },
  { id: 'm6', month: 'Апрель', clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '' },
];

const WEEK_COLS = [
  { key: 'totalClients', label: 'Всего клиентов' },
  { key: 'qualLeads', label: 'Квал. лиды' },
  { key: 'meetings', label: 'Встречи' },
  { key: 'newContracts', label: 'Новые контракты' },
  { key: 'newPayments', label: 'Новые оплаты' },
] as const;

const MONTH_COLS = [
  { key: 'clients', label: 'Кол-во клиентов' },
  { key: 'newRevenue', label: 'Выручка новая ($)' },
  { key: 'renewalRevenue', label: 'Выручка продления ($)' },
  { key: 'totalRevenue', label: 'Общая выручка ($)' },
] as const;

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

// ─── WEEK TABLE ────────────────────────────────────────────────
function WeeklyTable() {
  const [rows, setRows] = useState<WeekRow[]>(INIT_WEEKS);
  const [noteRow, setNoteRow] = useState<string | null>(null);

  const update = (id: string, key: keyof WeekRow, val: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, {
      id: `w${Date.now()}`, week: '', totalClients: '', qualLeads: '',
      meetings: '', newContracts: '', newPayments: '', note: '',
    }]);
  };

  const delRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Build chart data from rows that have totalClients value
  const chartData = rows
    .filter(r => r.week)
    .map(r => ({
      week: r.week.length > 11 ? r.week.slice(0, 5) + '..' : r.week,
      'Клиенты': num(r.totalClients),
      'Лиды': num(r.qualLeads),
      'Встречи': num(r.meetings),
      'Контракты': num(r.newContracts),
    }));

  return (
    <div className="space-y-4">
      {/* Charts */}
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
                  <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[700px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[130px] border-r border-border/40">Неделя</th>
              {WEEK_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[90px]">{c.label}</th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-muted-foreground min-w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                <td className="sticky left-0 bg-background px-2 py-1 border-r border-border/40">
                  <div className="flex items-center gap-1">
                    <input
                      value={row.week}
                      onChange={e => update(row.id, 'week', e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none focus:border-b focus:border-primary/50"
                      placeholder="DD.MM - DD.MM"
                    />
                    <button
                      onClick={() => setNoteRow(noteRow === row.id ? null : row.id)}
                      className={cn('p-0.5 rounded transition-colors', row.note ? 'text-primary' : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100')}
                    >
                      <StickyNote className="h-3 w-3" />
                    </button>
                    <button onClick={() => delRow(row.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {noteRow === row.id && (
                    <input
                      value={row.note}
                      onChange={e => update(row.id, 'note', e.target.value)}
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
                      onChange={e => update(row.id, c.key, e.target.value)}
                      placeholder="—"
                      className="w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors"
                    />
                  </td>
                ))}
                <td className="px-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors py-1">
        <Plus className="h-3.5 w-3.5" /> Добавить неделю
      </button>
    </div>
  );
}

// ─── MONTH TABLE ───────────────────────────────────────────────
function MonthlyTable() {
  const [rows, setRows] = useState<MonthRow[]>(INIT_MONTHS);
  const [noteRow, setNoteRow] = useState<string | null>(null);

  const update = (id: string, key: keyof MonthRow, val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [key]: val };
      // Auto-calc totalRevenue
      if (key === 'newRevenue' || key === 'renewalRevenue') {
        updated.totalRevenue = num(updated.newRevenue) + num(updated.renewalRevenue) || '';
      }
      return updated;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, {
      id: `m${Date.now()}`, month: '', clients: '', newRevenue: '', renewalRevenue: '', totalRevenue: '', note: '',
    }]);
  };

  const delRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const chartData = rows.filter(r => r.month).map(r => ({
    month: r.month,
    'Клиенты': num(r.clients),
    'Новая ($)': num(r.newRevenue),
    'Продление ($)': num(r.renewalRevenue),
    'Итого ($)': num(r.totalRevenue),
  }));

  return (
    <div className="space-y-4">
      {/* Charts */}
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
                  <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[600px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[120px] border-r border-border/40">Месяц</th>
              {MONTH_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[120px]">{c.label}</th>
              ))}
              <th className="px-2 py-2 min-w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
                <td className="sticky left-0 bg-background px-2 py-1 border-r border-border/40">
                  <div className="flex items-center gap-1">
                    <input
                      value={row.month}
                      onChange={e => update(row.id, 'month', e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none"
                      placeholder="Месяц"
                    />
                    <button
                      onClick={() => setNoteRow(noteRow === row.id ? null : row.id)}
                      className={cn('p-0.5 rounded transition-colors', row.note ? 'text-primary' : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100')}
                    >
                      <StickyNote className="h-3 w-3" />
                    </button>
                    <button onClick={() => delRow(row.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {noteRow === row.id && (
                    <input
                      value={row.note}
                      onChange={e => update(row.id, 'note', e.target.value)}
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
                      onChange={e => update(row.id, c.key, e.target.value)}
                      placeholder="—"
                      className={cn(
                        'w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors',
                        c.key === 'totalRevenue' ? 'font-semibold text-primary' : ''
                      )}
                    />
                  </td>
                ))}
                <td className="px-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors py-1">
        <Plus className="h-3.5 w-3.5" /> Добавить месяц
      </button>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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
                <p className="text-xs text-muted-foreground">Вписывайте данные в таблицу — графики обновляются автоматически</p>
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
