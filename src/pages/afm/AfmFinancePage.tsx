import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2, TrendingUp, DollarSign, Plus, Trash2, Info } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fmt$(n: number) {
  if (!n) return '$0';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtN(n: number) { return n === 0 ? '0' : String(n); }

// ─── ANNUAL INCOME PLAN ────────────────────────────────────────────────────
function AnnualIncomePlan() {
  const [newClients, setNewClients] = useState<number[]>([1, 3, 3, 3, 4, 5, 7, 9, 10, 12, 15, 18]);
  const [renewals,   setRenewals]   = useState<number[]>([2, 2, 3, 6, 9, 12, 16, 21, 28, 37, 47, 59]);
  const [avgCheck, setAvgCheck] = useState(3500);
  // Editable percentages
  const [teamPct,       setTeamPct]       = useState(30);
  const [marketingPct,  setMarketingPct]  = useState(20);
  const [expensesPct,   setExpensesPct]   = useState(10);
  const [taxPct,        setTaxPct]        = useState(10);

  const n = (arr: number[], i: number) => arr[i] ?? 0;

  const refusals     = (i: number) => -Math.round((n(newClients,i) + n(renewals,i)) * 0.2);
  const totalClients = (i: number) => n(newClients,i) + n(renewals,i) + refusals(i);
  const rev          = (i: number) => (n(newClients,i) + n(renewals,i)) * avgCheck;
  const teamCost     = (i: number) => -Math.round(rev(i) * teamPct / 100);
  const mktCost      = (i: number) => -Math.round(rev(i) * marketingPct / 100);
  const expCost      = (i: number) => -Math.round(rev(i) * expensesPct / 100);
  const margin       = (i: number) => rev(i) + teamCost(i) + mktCost(i) + expCost(i);
  const tax          = (i: number) => Math.round(margin(i) * taxPct / 100);
  const net          = (i: number) => margin(i) - tax(i);

  const setCellArr = (setter: React.Dispatch<React.SetStateAction<number[]>>, idx: number, val: string) => {
    setter(prev => { const a = [...prev]; a[idx] = parseInt(val) || 0; return a; });
  };

  const totRev = MONTHS.reduce((s, _, i) => s + rev(i), 0);
  const totNet = MONTHS.reduce((s, _, i) => s + net(i), 0);

  const rows: { label: string; cells: (i: number) => number; style?: string; editable?: boolean; pct?: number; setPct?: (v: number) => void }[] = [
    { label: 'Новый клиент',         cells: i => n(newClients, i), editable: true },
    { label: 'Продление',            cells: i => n(renewals, i), editable: true },
    { label: 'Отказы (−20%)',        cells: refusals, style: 'muted' },
    { label: 'Итого клиентов',       cells: totalClients, style: 'sub' },
    { label: 'Общая выручка',        cells: rev, style: 'total' },
    { label: `Команда (${teamPct}%)`, cells: teamCost, style: 'neg', pct: teamPct, setPct: setTeamPct },
    { label: `Маркетинг (${marketingPct}%)`, cells: mktCost, style: 'neg', pct: marketingPct, setPct: setMarketingPct },
    { label: `Расходы (${expensesPct}%)`, cells: expCost, style: 'neg', pct: expensesPct, setPct: setExpensesPct },
    { label: 'Маржа',                cells: margin, style: 'margin' },
    { label: `Налог (${taxPct}%)`,   cells: tax, style: 'neg', pct: taxPct, setPct: setTaxPct },
    { label: 'Чистая прибыль',       cells: net, style: 'total' },
  ];

  const isCount = (label: string) => ['Новый клиент','Продление','Отказы (−20%)','Итого клиентов'].includes(label);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Средний чек ($)</label>
          <input
            type="number"
            value={avgCheck}
            onChange={e => setAvgCheck(parseInt(e.target.value) || 0)}
            className="w-28 text-center bg-background border border-primary/40 rounded px-2 py-1 text-sm text-primary font-mono focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[900px] w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '180px', minWidth: '180px' }} />
            {MONTHS.map(m => <col key={m} style={{ width: '68px', minWidth: '68px' }} />)}
            <col style={{ width: '80px', minWidth: '80px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground border-r border-border/40">
                Показатель
              </th>
              {MONTHS.map(m => (
                <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20">
                  {m}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">Итого</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const vals = MONTHS.map((_, i) => row.cells(i));
              const total = vals.reduce((a, b) => a + b, 0);
              const isTotal  = row.style === 'total';
              const isMargin = row.style === 'margin';
              const isNeg    = row.style === 'neg';
              const isSub    = row.style === 'sub';

              return (
                <tr key={ri} className={`border-b border-border/20 ${isTotal ? 'bg-primary/10 font-semibold' : isMargin ? 'bg-green-500/10 font-semibold' : isSub ? 'bg-muted/20' : ''}`}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-border/40 ${
                    isTotal ? 'bg-primary/10 text-foreground' :
                    isMargin ? 'bg-green-500/10 text-green-400' :
                    isSub ? 'bg-muted/30 text-foreground' : 'bg-background text-foreground'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{row.label}</span>
                      {row.setPct && (
                        <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="number"
                            value={row.pct}
                            min={0} max={100}
                            onChange={e => row.setPct!(parseInt(e.target.value) || 0)}
                            className="w-10 text-center bg-background/60 border border-border/40 rounded px-1 py-0 text-[10px] focus:outline-none focus:border-primary"
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  {vals.map((val, i) => (
                    <td key={i} className={`px-1 py-1 border-r border-border/20 ${
                      isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg || val < 0 ? 'text-destructive/80' : ''
                    }`}>
                      {ri === 0 ? (
                        <input type="number" value={newClients[i]}
                          onChange={e => setCellArr(setNewClients, i, e.target.value)}
                          className="w-full text-center bg-background/60 border border-border/30 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary" />
                      ) : ri === 1 ? (
                        <input type="number" value={renewals[i]}
                          onChange={e => setCellArr(setRenewals, i, e.target.value)}
                          className="w-full text-center bg-background/60 border border-border/30 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary" />
                      ) : (
                        <span className="block text-center">{isCount(row.label) ? fmtN(val) : fmt$(val)}</span>
                      )}
                    </td>
                  ))}
                  <td className={`px-3 py-1.5 text-center font-semibold ${
                    isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg || total < 0 ? 'text-destructive/80' : 'text-foreground'
                  }`}>
                    {isCount(row.label) ? fmtN(total) : fmt$(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FINANCIAL PLANNING ────────────────────────────────────────────────────
const FIN_MONTHS = ['Дек 2025', 'Янв 2026', 'Фев 2026', 'Мар 2026', 'Апр 2026', 'Май 2026', 'Июн 2026', 'Июл 2026', 'Авг 2026', 'Сен 2026', 'Окт 2026', 'Ноя 2026'];
const NM = FIN_MONTHS.length;

interface FinRow { id: string; label: string; manual?: boolean }

// Initial data matching the screenshot
const INIT_DATA: Record<string, number[]> = {
  // Revenue
  from_past:    [0, 1206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  palm_craft:   [0,  500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  kelner:       [0,    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  mexico:       [0,    0, 648, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  alice:        [0,    0, 2500, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  us_quest:     [0,    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  hrlme:        [0, 5000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Salary
  media_buyer:  Array(NM).fill(0),
  project_mgr:  Array(NM).fill(0),
  sales_salary: Array(NM).fill(0),
  smm:          Array(NM).fill(0),
  // Expenses
  ghl:          [0,  97,  97, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  database:     [0, 370, 449, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  google_ws:    [0,   0,  24, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  panda_doc:    [0, 739,  35, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  meta_ads:     Array(NM).fill(0),
  platform_dev: [0,   0,  80, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  vsl_video:    [0,   0, 150, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Funds (10%, 15%, 20% of net revenue after salary+expenses)
  taxes_10:     Array(NM).fill(0),
  savings_15:   Array(NM).fill(0),
  marketing_20: Array(NM).fill(0),
  // Dividends (% of what's left after funds)
  denis_40:     Array(NM).fill(0),
  danil_40:     Array(NM).fill(0),
  vladimir_20:  Array(NM).fill(0),
};

type SectionDef = {
  id: string;
  title: string;
  color: string;
  rowsKey: string;
};

function FinancialPlanningTable() {
  // Revenue rows (addable)
  const [revRows, setRevRows] = useState<FinRow[]>([
    { id: 'from_past', label: 'From past month' },
    { id: 'palm_craft', label: 'Palm Craft' },
    { id: 'kelner', label: 'Kelner Homes' },
    { id: 'mexico', label: 'Mexico Natural Slim' },
    { id: 'alice', label: 'Alice Cabinets' },
    { id: 'us_quest', label: 'US Quest' },
    { id: 'hrlme', label: 'HRLME' },
  ]);
  const [salaryRows, setSalaryRows] = useState<FinRow[]>([
    { id: 'media_buyer', label: 'Media buyer' },
    { id: 'project_mgr', label: 'Project manager' },
    { id: 'sales_salary', label: 'Sales' },
    { id: 'smm', label: 'SMM' },
  ]);
  const [expenseRows, setExpenseRows] = useState<FinRow[]>([
    { id: 'ghl', label: 'GHL' },
    { id: 'database', label: 'Database' },
    { id: 'google_ws', label: 'Google Workspace' },
    { id: 'panda_doc', label: 'Panda Doc' },
    { id: 'meta_ads', label: 'Meta Ads' },
    { id: 'platform_dev', label: 'Platform Development' },
    { id: 'vsl_video', label: 'VSL Video' },
  ]);

  const [data, setData] = useState<Record<string, number[]>>(() => ({ ...INIT_DATA }));

  // Fund percentages
  const [taxPct, setTaxPct] = useState(10);
  const [savPct, setSavPct] = useState(15);
  const [mktPct, setMktPct] = useState(20);
  // Dividend percentages
  const [denisPct, setDenisPct] = useState(40);
  const [danilPct, setDanilPct] = useState(40);
  const [vladPct, setVladPct] = useState(20);

  // Manual override: { rowId_mi: true } means this cell is overridden manually
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const cell = (rowId: string, mi: number) => data[rowId]?.[mi] ?? 0;
  const setCell = (rowId: string, mi: number, val: string) => {
    const n = parseFloat(val) || 0;
    setData(prev => {
      const arr = [...(prev[rowId] ?? Array(NM).fill(0))];
      arr[mi] = n;
      return { ...prev, [rowId]: arr };
    });
  };

  // Computed values
  const totalRevenue = (mi: number) => revRows.reduce((s, r) => s + cell(r.id, mi), 0);
  const totalSalary  = (mi: number) => salaryRows.reduce((s, r) => s + cell(r.id, mi), 0);
  const totalExpenses = (mi: number) => expenseRows.reduce((s, r) => s + cell(r.id, mi), 0);
  // Available = Total Revenue (matching sheet: "Available amount" = Revenue before deductions)
  const available    = (mi: number) => totalRevenue(mi);

  // Fund amounts: % of Total Revenue (matching Google Sheet formula)
  const fundAmt = (pct: number, rowId: string, mi: number) => {
    const key = `${rowId}_${mi}`;
    if (overrides[key]) return cell(rowId, mi);
    // Sheet: Taxes/Savings/Marketing = % of Total Revenue
    const auto = Math.round(totalRevenue(mi) * pct / 100);
    return auto;
  };

  const taxAmt  = (mi: number) => fundAmt(taxPct, 'taxes_10', mi);
  const savAmt  = (mi: number) => fundAmt(savPct, 'savings_15', mi);
  const mktAmt  = (mi: number) => fundAmt(mktPct, 'marketing_20', mi);
  const totalFunds = (mi: number) => taxAmt(mi) + savAmt(mi) + mktAmt(mi);
  // Left amount = Available - Total costs (salary + expenses) — shown in sheet as separate from funds
  const leftAmount = (mi: number) => available(mi) - totalSalary(mi) - totalExpenses(mi);
  // Dividends base = Left amount after removing funds
  const dividendBase = (mi: number) => leftAmount(mi) - totalFunds(mi);

  // Dividend amounts: % of dividendBase (Left - Funds)
  const divAmt = (pct: number, rowId: string, mi: number) => {
    const key = `${rowId}_${mi}`;
    if (overrides[key]) return cell(rowId, mi);
    const base = dividendBase(mi);
    return Math.round(base * pct / 100);
  };
  const denisAmt   = (mi: number) => divAmt(denisPct, 'denis_40', mi);
  const danilAmt   = (mi: number) => divAmt(danilPct, 'danil_40', mi);
  const vladAmt    = (mi: number) => divAmt(vladPct, 'vladimir_20', mi);
  const totalDivs  = (mi: number) => denisAmt(mi) + danilAmt(mi) + vladAmt(mi);

  // Fund totals (accumulated)
  const totalTaxFund = FIN_MONTHS.reduce((s, _, mi) => s + taxAmt(mi), 0);
  const totalSavFund = FIN_MONTHS.reduce((s, _, mi) => s + savAmt(mi), 0);
  const totalMktFund = FIN_MONTHS.reduce((s, _, mi) => s + mktAmt(mi), 0);

  const addRow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, label: string) => {
    if (!label.trim()) return;
    const id = `custom_${Date.now()}`;
    setter(prev => [...prev, { id, label }]);
    setData(prev => ({ ...prev, [id]: Array(NM).fill(0) }));
  };

  const deleteRow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, id: string) => {
    setter(prev => prev.filter(r => r.id !== id));
  };

  function fmtFin(n: number) {
    if (!n) return '$0.00';
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function EditableRow({ row, onDelete, value, onChange }: {
    row: FinRow; onDelete?: () => void;
    value: (mi: number) => number;
    onChange: (mi: number, v: string) => void;
  }) {
    return (
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
        <td className="sticky left-0 z-10 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-5">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate text-xs">{row.label}</span>
            {onDelete && (
              <button onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className="px-1 py-0.5 border-r border-border/20">
            <input
              type="number"
              value={value(mi) || ''}
              onChange={e => onChange(mi, e.target.value)}
              placeholder="0"
              className="w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors"
            />
          </td>
        ))}
        <td className="px-2 py-1 text-center text-xs text-muted-foreground font-medium">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + value(mi), 0))}
        </td>
      </tr>
    );
  }

  function AddRowInline({ onAdd }: { onAdd: (label: string) => void }) {
    const [adding, setAdding] = useState(false);
    const [label, setLabel] = useState('');
    if (!adding) return (
      <tr>
        <td colSpan={NM + 2} className="px-3 py-1">
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors py-0.5">
            <Plus className="h-3 w-3" /> Добавить строку
          </button>
        </td>
      </tr>
    );
    return (
      <tr className="bg-primary/5">
        <td className="sticky left-0 bg-primary/5 px-3 py-1 border-r border-border/40" colSpan={1}>
          <div className="flex gap-1.5 items-center">
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onAdd(label); setLabel(''); setAdding(false); } if (e.key === 'Escape') setAdding(false); }}
              placeholder="Название строки..."
              className="flex-1 bg-background border border-primary/40 rounded px-2 py-0.5 text-xs focus:outline-none"
            />
            <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => { onAdd(label); setLabel(''); setAdding(false); }}>OK</Button>
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => setAdding(false)}>✕</Button>
          </div>
        </td>
        {FIN_MONTHS.map((_, i) => <td key={i} />)}
        <td />
      </tr>
    );
  }

  // Auto-computed row (fund/dividend) with override option
  function ComputedRow({ label, computedFn, rowId, pct, setPct, color }: {
    label: string; computedFn: (mi: number) => number; rowId: string;
    pct: number; setPct: (v: number) => void; color?: string;
  }) {
    return (
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
        <td className="sticky left-0 z-10 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-5">
          <div className="flex items-center gap-2">
            <span className={`flex-1 text-xs ${color || ''}`}>{label}</span>
            <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
              <input
                type="number" value={pct} min={0} max={100}
                onChange={e => setPct(parseInt(e.target.value) || 0)}
                className="w-8 text-center bg-background/60 border border-border/40 rounded px-1 py-0 text-[10px] focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
            </div>
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => {
          const key = `${rowId}_${mi}`;
          const isOverride = overrides[key];
          const computed = computedFn(mi);
          return (
            <td key={mi} className="px-1 py-0.5 border-r border-border/20 relative group/cell">
              {isOverride ? (
                <input
                  type="number"
                  value={cell(rowId, mi) || ''}
                  onChange={e => setCell(rowId, mi, e.target.value)}
                  className="w-full text-center bg-background border border-primary/50 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                />
              ) : (
                <div
                  title="Двойной клик — ручной ввод"
                  onDoubleClick={() => {
                    setOverrides(p => ({ ...p, [key]: true }));
                    setCell(rowId, mi, String(computed));
                  }}
                  className="text-center text-xs py-0.5 cursor-pointer hover:bg-muted/30 rounded"
                >
                  {computed ? fmtFin(computed) : '—'}
                </div>
              )}
              {isOverride && (
                <button
                  title="Сбросить к авторасчёту"
                  onClick={() => setOverrides(p => { const n = { ...p }; delete n[key]; return n; })}
                  className="absolute top-0 right-0 text-[8px] text-primary opacity-0 group-hover/cell:opacity-100 p-0.5"
                >↺</button>
              )}
            </td>
          );
        })}
        <td className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  function SectionHeader({ title, color, totalFn }: { title: string; color: string; totalFn: (mi: number) => number }) {
    return (
      <tr className="bg-muted/30 border-y border-border/40">
        <td className={`sticky left-0 z-10 bg-muted/50 px-3 py-1.5 font-bold border-r border-border/40 text-sm ${color}`}>
          {title}
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className={`px-2 py-1.5 text-center font-bold border-r border-border/20 text-xs ${color}`}>
            {totalFn(mi) ? fmtFin(totalFn(mi)) : '—'}
          </td>
        ))}
        <td className={`px-2 py-1.5 text-center font-bold text-xs ${color}`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + totalFn(mi), 0))}
        </td>
      </tr>
    );
  }

  function ComputedDisplayRow({ label, computedFn, style }: {
    label: string; computedFn: (mi: number) => number; style?: string;
  }) {
    return (
      <tr className={`border-b border-border/30 ${style || ''}`}>
        <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold border-r border-border/40 text-xs ${style ? 'bg-blue-500/10' : 'bg-background'}`}>
          {label}
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className="px-2 py-1.5 text-center text-xs font-semibold border-r border-border/20">
            {fmtFin(computedFn(mi))}
          </td>
        ))}
        <td className="px-2 py-1.5 text-center text-xs font-semibold">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[1200px] w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '190px', minWidth: '190px' }} />
            {FIN_MONTHS.map(m => <col key={m} style={{ width: '90px', minWidth: '90px' }} />)}
            <col style={{ width: '95px', minWidth: '95px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground border-r border-border/40">
                Статья
              </th>
              {FIN_MONTHS.map(m => (
                <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20">
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-foreground whitespace-nowrap">Итого</th>
            </tr>
          </thead>
          <tbody>
            {/* ── REVENUE ─────────────────────────────────────── */}
            <SectionHeader title="Total Revenue" color="text-blue-400" totalFn={totalRevenue} />
            {revRows.map(row => (
              <EditableRow
                key={row.id} row={row}
                onDelete={() => deleteRow(setRevRows, row.id)}
                value={mi => cell(row.id, mi)}
                onChange={(mi, v) => setCell(row.id, mi, v)}
              />
            ))}
            <AddRowInline onAdd={label => addRow(setRevRows, label)} />

            {/* ── SALARY ─────────────────────────────────────── */}
            <SectionHeader title="Salary" color="text-yellow-400" totalFn={totalSalary} />
            {salaryRows.map(row => (
              <EditableRow
                key={row.id} row={row}
                onDelete={() => deleteRow(setSalaryRows, row.id)}
                value={mi => cell(row.id, mi)}
                onChange={(mi, v) => setCell(row.id, mi, v)}
              />
            ))}
            <AddRowInline onAdd={label => addRow(setSalaryRows, label)} />

            {/* ── EXPENSES ────────────────────────────────────── */}
            <SectionHeader title="Expenses" color="text-orange-400" totalFn={totalExpenses} />
            {expenseRows.map(row => (
              <EditableRow
                key={row.id} row={row}
                onDelete={() => deleteRow(setExpenseRows, row.id)}
                value={mi => cell(row.id, mi)}
                onChange={(mi, v) => setCell(row.id, mi, v)}
              />
            ))}
            <AddRowInline onAdd={label => addRow(setExpenseRows, label)} />

            {/* Available = Total Revenue */}
            <ComputedDisplayRow label="Available amount (= Total Revenue)" computedFn={available}
              style="bg-blue-500/10 text-blue-400" />
            <ComputedDisplayRow label="Total costs (Salary + Expenses)" computedFn={mi => totalSalary(mi) + totalExpenses(mi)}
              style="bg-orange-500/10 text-orange-400" />
            {/* Left amount = Revenue - Salary - Expenses */}
            <ComputedDisplayRow label="Left amount (Revenue − Salary − Expenses)" computedFn={leftAmount}
              style="bg-green-500/10 text-green-400" />

            {/* ── FUNDS ──────────────────────────────────────── */}
            <SectionHeader title="Funds" color="text-purple-400" totalFn={totalFunds} />
            <ComputedRow label={`Taxes ${taxPct}%`} computedFn={taxAmt} rowId="taxes_10" pct={taxPct} setPct={setTaxPct} color="text-foreground/80" />
            <ComputedRow label={`Savings ${savPct}%`} computedFn={savAmt} rowId="savings_15" pct={savPct} setPct={setSavPct} color="text-foreground/80" />
            <ComputedRow label={`Marketing ${mktPct}%`} computedFn={mktAmt} rowId="marketing_20" pct={mktPct} setPct={setMktPct} color="text-foreground/80" />

            {/* ── DIVIDENDS ──────────────────────────────────── */}
            <SectionHeader title="Dividends" color="text-green-400" totalFn={totalDivs} />
            <ComputedRow label={`Denis ${denisPct}%`} computedFn={denisAmt} rowId="denis_40" pct={denisPct} setPct={setDenisPct} color="text-foreground/80" />
            <ComputedRow label={`Danil ${danilPct}%`} computedFn={danilAmt} rowId="danil_40" pct={danilPct} setPct={setDanilPct} color="text-foreground/80" />
            <ComputedRow label={`Vladimir ${vladPct}%`} computedFn={vladAmt} rowId="vladimir_20" pct={vladPct} setPct={setVladPct} color="text-foreground/80" />
          </tbody>
        </table>
      </div>

      {/* Fund Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Taxes Fund', amount: totalTaxFund, color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
          { label: 'Savings Fund', amount: totalSavFund, color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
          { label: 'Marketing Fund', amount: totalMktFund, color: 'text-primary border-primary/30 bg-primary/5' },
        ].map(f => (
          <div key={f.label} className={`rounded-xl border p-3 sm:p-4 ${f.color}`}>
            <p className="text-xs font-medium mb-1 opacity-80">{f.label}</p>
            <p className="text-lg sm:text-xl font-bold font-mono">{fmtFin(f.amount)}</p>
            <p className="text-[10px] opacity-60 mt-0.5">Накоплено за период</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Двойной клик на ячейке авторасчёта — ввести вручную. Клик на «↺» — сбросить к авторасчёту.
      </p>
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
                <p className="text-xs text-muted-foreground">
                  Введите количество новых клиентов и продлений. Проценты расходов редактируемые. Расчёты автоматические.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Добавляйте клиентов, расходы и зарплаты. Фонды и дивиденды считаются автоматически по процентам.
                  Двойной клик на ячейке авторасчёта — ввести вручную.
                </p>
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
