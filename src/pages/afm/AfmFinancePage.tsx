import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BarChart2, TrendingUp, DollarSign } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// ─── MONTHS ────────────────────────────────────────────────────────────────
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// ─── ANNUAL INCOME PLAN ────────────────────────────────────────────────────
type IncomeRow = {
  id: string;
  label: string;
  editable?: boolean;
  computed?: (rows: Record<string, number[]>, averageCheck: number) => number[];
  style?: 'total' | 'margin' | 'sub' | 'tax';
};

const AVG_CHECK_INIT = 3500;

const INCOME_ROWS: IncomeRow[] = [
  { id: 'new_clients',    label: 'Новый клиент',       editable: true },
  { id: 'renewals',       label: 'Продление',           editable: true },
  { id: 'refusals',       label: 'Отказы 20%',          computed: (r) => MONTHS.map((_, i) => -Math.round((r.new_clients[i] + r.renewals[i]) * 0.2)) },
  { id: 'total_clients',  label: 'Итого клиентов',      computed: (r) => MONTHS.map((_, i) => r.new_clients[i] + r.renewals[i] + r.refusals[i]), style: 'sub' },
  { id: 'new_rev',        label: 'Выручка новых клиентов', computed: (r, avg) => MONTHS.map((_, i) => r.new_clients[i] * avg) },
  { id: 'renewal_rev',    label: 'Выручка продления',   computed: (r, avg) => MONTHS.map((_, i) => r.renewals[i] * avg) },
  { id: 'total_rev',      label: 'Общая выручка',       computed: (r, avg) => MONTHS.map((_, i) => r.new_clients[i] * avg + r.renewals[i] * avg), style: 'total' },
  { id: 'avg_check',      label: 'Средний чек',         computed: (_r, avg) => MONTHS.map(() => avg), style: 'sub' },
  { id: 'team_30',        label: 'Команда 30%',         computed: (r, avg) => MONTHS.map((_, i) => -Math.round((r.new_clients[i] * avg + r.renewals[i] * avg) * 0.3)) },
  { id: 'marketing_20',   label: 'Маркетинг 20%',       computed: (r, avg) => MONTHS.map((_, i) => -Math.round((r.new_clients[i] * avg + r.renewals[i] * avg) * 0.2)) },
  { id: 'expenses_other', label: 'Расходы',             computed: (r, avg) => MONTHS.map((_, i) => -Math.round((r.new_clients[i] * avg + r.renewals[i] * avg) * 0.1)) },
  { id: 'margin',         label: 'Маржа',               computed: (r, avg) => MONTHS.map((_, i) => {
    const rev = r.new_clients[i] * avg + r.renewals[i] * avg;
    return Math.round(rev - rev * 0.3 - rev * 0.2 - rev * 0.1);
  }), style: 'margin' },
  { id: 'tax_10',         label: 'Налог', style: 'tax' },
  { id: 'net',            label: 'Чистая прибыль',      computed: (r, avg) => MONTHS.map((_, i) => {
    const rev = r.new_clients[i] * avg + r.renewals[i] * avg;
    const margin = Math.round(rev - rev * 0.3 - rev * 0.2 - rev * 0.1);
    return Math.round(margin * 0.9);
  }), style: 'total' },
];

const EDITABLE_ROWS = ['new_clients', 'renewals'];

function fmt(n: number): string {
  if (n === 0) return '$0';
  if (Math.abs(n) < 100) return String(n); // count rows
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString();
}

function isCount(rowId: string) {
  return ['new_clients', 'renewals', 'refusals', 'total_clients'].includes(rowId);
}

function AnnualIncomePlan() {
  const [values, setValues] = useState<Record<string, number[]>>(() => ({
    new_clients: [1, 3, 3, 3, 4, 5, 7, 9, 10, 12, 15, 18],
    renewals:    [2, 2, 3, 6, 9, 12, 16, 21, 28, 37, 47, 59],
    refusals:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    total_clients: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }));
  const [avgCheck, setAvgCheck] = useState(AVG_CHECK_INIT);

  const getRow = useCallback((row: IncomeRow): number[] => {
    if (row.computed) return row.computed(values, avgCheck);
    return values[row.id] || Array(12).fill(0);
  }, [values, avgCheck]);

  const handleCell = (rowId: string, monthIdx: number, val: string) => {
    const n = parseInt(val) || 0;
    setValues(prev => {
      const arr = [...(prev[rowId] || Array(12).fill(0))];
      arr[monthIdx] = n;
      return { ...prev, [rowId]: arr };
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border/40">
      <table className="min-w-[900px] w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[160px] border-r border-border/40">
              12 месяцев
            </th>
            {MONTHS.map(m => (
              <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 last:border-0">
                {m.slice(0, 3)}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">Итого</th>
          </tr>
        </thead>
        <tbody>
          {/* Avg check row */}
          <tr className="bg-muted/20 border-b border-border/30">
            <td className="sticky left-0 bg-muted/40 px-3 py-1.5 font-medium text-foreground border-r border-border/40">
              Средний чек ($)
            </td>
            {MONTHS.map((_, i) => (
              <td key={i} className="px-1 py-1 border-r border-border/20 last:border-0">
                {i === 0 ? (
                  <input
                    type="number"
                    value={avgCheck}
                    onChange={e => setAvgCheck(parseInt(e.target.value) || 0)}
                    className="w-full text-center bg-background/60 border border-primary/30 rounded px-1 py-0.5 text-xs text-primary font-mono focus:outline-none focus:border-primary"
                  />
                ) : (
                  <span className="block text-center text-muted-foreground">${avgCheck.toLocaleString()}</span>
                )}
              </td>
            ))}
            <td className="px-3 py-1.5 text-center font-semibold text-foreground">${avgCheck.toLocaleString()}</td>
          </tr>

          {INCOME_ROWS.filter(r => r.id !== 'avg_check').map((row) => {
            const data = getRow(row);
            const total = data.reduce((a, b) => a + b, 0);
            const isTotal = row.style === 'total';
            const isMargin = row.style === 'margin';
            const isTaxRow = row.style === 'tax';
            const isSub = row.style === 'sub';

            if (isTaxRow) return (
              <tr key={row.id} className="border-b border-border/30">
                <td className="sticky left-0 bg-background px-3 py-1.5 text-muted-foreground border-r border-border/40">
                  {row.label} (10%)
                </td>
                {MONTHS.map((_, i) => {
                  const rev = (values.new_clients?.[i] || 0) * avgCheck + (values.renewals?.[i] || 0) * avgCheck;
                  const margin = Math.round(rev - rev * 0.3 - rev * 0.2 - rev * 0.1);
                  const tax = Math.round(margin * 0.1);
                  return (
                    <td key={i} className="px-2 py-1.5 text-center text-muted-foreground border-r border-border/20">
                      {tax ? `$${tax.toLocaleString()}` : '—'}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-center text-muted-foreground">
                  ${Math.round(data.reduce((_,__, i) => {
                    const rev = (values.new_clients?.[i] || 0) * avgCheck + (values.renewals?.[i] || 0) * avgCheck;
                    const margin = Math.round(rev - rev * 0.3 - rev * 0.2 - rev * 0.1);
                    return _ + Math.round(margin * 0.1);
                  }, 0)).toLocaleString()}
                </td>
              </tr>
            );

            return (
              <tr
                key={row.id}
                className={`border-b border-border/30 ${
                  isTotal ? 'bg-primary/10 font-semibold' :
                  isMargin ? 'bg-green-500/10 font-semibold' :
                  isSub ? 'bg-muted/20' : ''
                }`}
              >
                <td className={`sticky left-0 px-3 py-1.5 border-r border-border/40 font-${isTotal || isMargin ? 'semibold' : 'normal'} ${
                  isTotal ? 'bg-primary/10 text-foreground' :
                  isMargin ? 'bg-green-500/10 text-green-400' :
                  isSub ? 'bg-muted/30 text-foreground' : 'bg-background text-foreground'
                }`}>
                  {row.label}
                </td>
                {data.map((val, i) => (
                  <td key={i} className={`px-1 py-1 border-r border-border/20 last:border-0 ${
                    isTotal ? 'text-primary' : isMargin ? 'text-green-400' : val < 0 ? 'text-destructive' : ''
                  }`}>
                    {EDITABLE_ROWS.includes(row.id) ? (
                      <input
                        type="number"
                        value={val}
                        onChange={e => handleCell(row.id, i, e.target.value)}
                        className="w-full text-center bg-background/60 border border-border/40 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary hover:border-primary/50 transition-colors"
                      />
                    ) : (
                      <span className="block text-center">
                        {isCount(row.id) ? val : fmt(val)}
                      </span>
                    )}
                  </td>
                ))}
                <td className={`px-3 py-1.5 text-center font-semibold ${
                  isTotal ? 'text-primary' : isMargin ? 'text-green-400' : total < 0 ? 'text-destructive' : 'text-foreground'
                }`}>
                  {isCount(row.id) ? total : fmt(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── FINANCIAL PLANNING ────────────────────────────────────────────────────
const MONTHS_WITH_PREV = ['Декабрь 2025', ...MONTHS.map(m => m + ' 2026')];

type FinSection = {
  title: string;
  color: string;
  rows: { id: string; label: string; computed?: (data: Record<string, number[]>, mIdx: number) => number }[];
};

const FIN_SECTIONS: FinSection[] = [
  {
    title: 'Total Revenue',
    color: 'text-blue-400',
    rows: [
      { id: 'from_past', label: 'From past month' },
      { id: 'palm_craft', label: 'Palm Craft' },
      { id: 'kelner', label: 'Kelner Homes' },
      { id: 'mexico', label: 'Mexico Natural Slim' },
      { id: 'alice', label: 'Alice Cabinets' },
      { id: 'us_quest', label: 'US Quest' },
      { id: 'hrlme', label: 'HRLME' },
    ],
  },
  {
    title: 'Salary',
    color: 'text-yellow-400',
    rows: [
      { id: 'media_buyer', label: 'Media buyer' },
      { id: 'project_mgr', label: 'Project manager' },
      { id: 'sales', label: 'Sales' },
      { id: 'smm', label: 'SMM' },
    ],
  },
  {
    title: 'Expenses',
    color: 'text-orange-400',
    rows: [
      { id: 'ghl', label: 'GHL' },
      { id: 'database', label: 'Database' },
      { id: 'google_ws', label: 'Google Workspace' },
      { id: 'panda_doc', label: 'Panda Doc' },
      { id: 'meta_ads', label: 'Meta Ads' },
      { id: 'platform_dev', label: 'Platform Development' },
      { id: 'vsl_video', label: 'VSL Video' },
    ],
  },
  {
    title: 'Funds',
    color: 'text-purple-400',
    rows: [
      { id: 'taxes_10', label: 'Taxes 10%' },
      { id: 'savings_15', label: 'Savings 15%' },
      { id: 'marketing_20', label: 'Marketing 20%' },
    ],
  },
  {
    title: 'Dividends',
    color: 'text-green-400',
    rows: [
      { id: 'denis_40', label: 'Denis 40%' },
      { id: 'danil_40', label: 'Danil 40%' },
      { id: 'vladimir_20', label: 'Vladimir 20%' },
    ],
  },
];

function fmtFin(n: number) {
  if (!n) return '$0.00';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function FinancialPlanningTable() {
  const NUM_MONTHS = MONTHS_WITH_PREV.length;

  // Flat map of all row IDs → editable values per month
  const allRowIds = FIN_SECTIONS.flatMap(s => s.rows.map(r => r.id));
  const [data, setData] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(allRowIds.map(id => [id, Array(NUM_MONTHS).fill(0)]))
  );

  const handleCell = (rowId: string, mi: number, val: string) => {
    const n = parseFloat(val) || 0;
    setData(prev => {
      const arr = [...(prev[rowId] || Array(NUM_MONTHS).fill(0))];
      arr[mi] = n;
      return { ...prev, [rowId]: arr };
    });
  };

  // Computed section totals per month
  const sectionTotal = (sectionTitle: string, mi: number): number => {
    const sec = FIN_SECTIONS.find(s => s.title === sectionTitle);
    if (!sec) return 0;
    return sec.rows.reduce((sum, row) => sum + (data[row.id]?.[mi] || 0), 0);
  };

  const totalRevenue = (mi: number) => sectionTotal('Total Revenue', mi);
  const totalSalary = (mi: number) => sectionTotal('Salary', mi);
  const totalExpenses = (mi: number) => sectionTotal('Expenses', mi);
  const available = (mi: number) => totalRevenue(mi) - totalSalary(mi) - totalExpenses(mi);
  const totalFunds = (mi: number) => sectionTotal('Funds', mi);
  const leftAmount = (mi: number) => available(mi) - totalFunds(mi);
  const totalDividends = (mi: number) => sectionTotal('Dividends', mi);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/40">
      <table className="min-w-[1200px] w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground min-w-[180px] border-r border-border/40">
              Статья
            </th>
            {MONTHS_WITH_PREV.map(m => (
              <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[90px]">
                {m.length > 8 ? m.slice(0, 3) + ' ' + m.slice(-4) : m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIN_SECTIONS.map((section, si) => (
            <>
              {/* Section header */}
              <tr key={`sec-${si}`} className="bg-muted/30 border-y border-border/40">
                <td className={`sticky left-0 bg-muted/50 px-3 py-1.5 font-bold border-r border-border/40 ${section.color}`}>
                  {section.title}
                </td>
                {Array.from({ length: NUM_MONTHS }).map((_, mi) => {
                  const tot = sectionTotal(section.title, mi);
                  const isAvailRow = section.title === 'Expenses';
                  return (
                    <td key={mi} className={`px-2 py-1.5 text-center font-bold border-r border-border/20 ${section.color}`}>
                      {tot ? fmtFin(tot) : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Section rows */}
              {section.rows.map(row => (
                <tr key={row.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="sticky left-0 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-6">
                    {row.label}
                  </td>
                  {Array.from({ length: NUM_MONTHS }).map((_, mi) => (
                    <td key={mi} className="px-1 py-0.5 border-r border-border/20">
                      <input
                        type="number"
                        value={data[row.id]?.[mi] || ''}
                        onChange={e => handleCell(row.id, mi, e.target.value)}
                        placeholder="0"
                        className="w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/60 transition-colors"
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Special computed rows after Expenses section */}
              {section.title === 'Expenses' && (
                <>
                  <tr className="bg-blue-500/10 border-b border-border/30">
                    <td className="sticky left-0 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-400 border-r border-border/40">
                      Available amount
                    </td>
                    {Array.from({ length: NUM_MONTHS }).map((_, mi) => (
                      <td key={mi} className="px-2 py-1.5 text-center font-semibold text-blue-400 border-r border-border/20">
                        {fmtFin(available(mi))}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* After Funds section */}
              {section.title === 'Funds' && (
                <>
                  <tr className="bg-green-500/10 border-b border-border/30">
                    <td className="sticky left-0 bg-green-500/10 px-3 py-1.5 font-semibold text-green-400 border-r border-border/40">
                      Left amount
                    </td>
                    {Array.from({ length: NUM_MONTHS }).map((_, mi) => (
                      <td key={mi} className="px-2 py-1.5 text-center font-semibold text-green-400 border-r border-border/20">
                        {fmtFin(leftAmount(mi))}
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </>
          ))}

          {/* Dividends total */}
          <tr className="bg-primary/10 border-t border-border/40">
            <td className="sticky left-0 bg-primary/10 px-3 py-1.5 font-bold text-primary border-r border-border/40">
              Total Dividends
            </td>
            {Array.from({ length: NUM_MONTHS }).map((_, mi) => (
              <td key={mi} className="px-2 py-1.5 text-center font-bold text-primary border-r border-border/20">
                {fmtFin(totalDividends(mi))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function AfmFinancePage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          Финансы
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Планирование доходов и финансовый контроль</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="income-plan">
          <TabsList className="mb-4">
            <TabsTrigger value="income-plan" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              План по доходу на год
            </TabsTrigger>
            <TabsTrigger value="financial-planning" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Финансовое планирование
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income-plan">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  План по доходу — 12 месяцев
                </CardTitle>
                <p className="text-xs text-muted-foreground">Введите количество новых клиентов и продлений. Все расчёты — автоматически.</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <AnnualIncomePlan />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial-planning">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Финансовое планирование
                </CardTitle>
                <p className="text-xs text-muted-foreground">Вносите суммы по каждой статье — итоги, остаток и дивиденды считаются автоматически.</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <FinancialPlanningTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
