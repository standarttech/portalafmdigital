import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2, TrendingUp, DollarSign, Plus, Trash2, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function fmt$(n: number) {
  if (n === 0) return '$0';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtN(n: number) { return String(n); }

// ─── ANNUAL INCOME PLAN ────────────────────────────────────────────────────
function AnnualIncomePlan() {
  const [newClients, setNewClients] = useState<string[]>(Array(12).fill(''));
  const [renewals, setRenewals] = useState<string[]>(Array(12).fill(''));
  const [avgCheck, setAvgCheck] = useState('3500');
  const [teamPct, setTeamPct] = useState('30');
  const [marketingPct, setMarketingPct] = useState('20');
  const [expensesPct, setExpensesPct] = useState('10');
  const [taxPct, setTaxPct] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const n = (arr: string[], i: number) => Number(arr[i]) || 0;
  const nPct = (s: string) => Number(s) || 0;
  const nAvg = () => Number(avgCheck) || 0;

  const refusals = (i: number) => -Math.round((n(newClients, i) + n(renewals, i)) * 0.2);
  const totalClients = (i: number) => n(newClients, i) + n(renewals, i) + refusals(i);
  const rev = (i: number) => (n(newClients, i) + n(renewals, i)) * nAvg();
  const teamCost = (i: number) => -Math.round(rev(i) * nPct(teamPct) / 100);
  const mktCost = (i: number) => -Math.round(rev(i) * nPct(marketingPct) / 100);
  const expCost = (i: number) => -Math.round(rev(i) * nPct(expensesPct) / 100);
  const margin = (i: number) => rev(i) + teamCost(i) + mktCost(i) + expCost(i);
  const tax = (i: number) => Math.round(margin(i) * nPct(taxPct) / 100);
  const net = (i: number) => margin(i) - tax(i);

  // Load from DB
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('afm_finance_data')
        .select('row_id, field_name, value')
        .eq('tab_key', 'income_plan')
        .eq('section', 'settings');
      if (data) {
        data.forEach(d => {
          if (d.row_id === 'newClients') setNewClients(prev => { const a = [...prev]; a[Number(d.field_name)] = String(d.value || ''); return a; });
          if (d.row_id === 'renewals') setRenewals(prev => { const a = [...prev]; a[Number(d.field_name)] = String(d.value || ''); return a; });
          if (d.row_id === 'settings') {
            if (d.field_name === 'avgCheck') setAvgCheck(String(d.value));
            if (d.field_name === 'teamPct') setTeamPct(String(d.value));
            if (d.field_name === 'marketingPct') setMarketingPct(String(d.value));
            if (d.field_name === 'expensesPct') setExpensesPct(String(d.value));
            if (d.field_name === 'taxPct') setTaxPct(String(d.value));
          }
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveCell = useCallback((rowId: string, fieldName: string, value: number) => {
    const key = `${rowId}_${fieldName}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      setSaving(true);
      await supabase.rpc('upsert_finance_data', {
        _tab_key: 'income_plan', _section: 'settings',
        _row_id: rowId, _row_label: rowId,
        _field_name: fieldName, _value: value,
      });
      setSaving(false);
    }, 600);
  }, []);

  const updateArr = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    rowId: string, idx: number, val: string
  ) => {
    setter(prev => { const a = [...prev]; a[idx] = val; return a; });
    saveCell(rowId, String(idx), Number(val) || 0);
  };

  const isCount = (label: string) => ['Новый клиент', 'Продление', `Отказы (−20%)`, 'Итого клиентов'].includes(label);

  const rows = [
    { label: 'Новый клиент', cells: (i: number) => n(newClients, i), editable: 'new' },
    { label: 'Продление', cells: (i: number) => n(renewals, i), editable: 'ren' },
    { label: `Отказы (−20%)`, cells: refusals, style: 'muted' },
    { label: 'Итого клиентов', cells: totalClients, style: 'sub' },
    { label: 'Общая выручка', cells: rev, style: 'total' },
    { label: 'Команда', cells: teamCost, style: 'neg', pctKey: 'teamPct', pctVal: teamPct, setPct: setTeamPct },
    { label: 'Маркетинг', cells: mktCost, style: 'neg', pctKey: 'marketingPct', pctVal: marketingPct, setPct: setMarketingPct },
    { label: 'Расходы', cells: expCost, style: 'neg', pctKey: 'expensesPct', pctVal: expensesPct, setPct: setExpensesPct },
    { label: 'Маржа', cells: margin, style: 'margin' },
    { label: 'Налог', cells: tax, style: 'neg', pctKey: 'taxPct', pctVal: taxPct, setPct: setTaxPct },
    { label: 'Чистая прибыль', cells: net, style: 'total' },
  ];

  const totRev = MONTHS.reduce((s, _, i) => s + rev(i), 0);
  const totNet = MONTHS.reduce((s, _, i) => s + net(i), 0);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Средний чек ($)</label>
          <input
            type="text"
            inputMode="numeric"
            value={avgCheck}
            onChange={e => { setAvgCheck(e.target.value); saveCell('settings', 'avgCheck', Number(e.target.value) || 0); }}
            className="w-28 text-center bg-background border border-primary/40 rounded px-2 py-1 text-sm text-primary font-mono focus:outline-none focus:border-primary"
          />
        </div>
        {saving && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Сохраняю...</div>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[900px] w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '200px', minWidth: '200px' }} />
            {MONTHS.map(m => <col key={m} style={{ width: '68px', minWidth: '68px' }} />)}
            <col style={{ width: '80px', minWidth: '80px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground border-r border-border/40">Показатель</th>
              {MONTHS.map(m => (
                <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20">{m}</th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">Итого</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const vals = MONTHS.map((_, i) => row.cells(i));
              const total = vals.reduce((a, b) => a + b, 0);
              const isTotal = row.style === 'total';
              const isMargin = row.style === 'margin';
              const isNeg = row.style === 'neg';
              const isSub = row.style === 'sub';

              return (
                <tr key={ri} className={`border-b border-border/20 ${isTotal ? 'bg-primary/10 font-semibold' : isMargin ? 'bg-green-500/10 font-semibold' : isSub ? 'bg-muted/20' : ''}`}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-border/40 ${isTotal ? 'bg-primary/10 text-foreground' : isMargin ? 'bg-green-500/10 text-green-400' : isSub ? 'bg-muted/30 text-foreground' : 'bg-background text-foreground'}`}>
                    <div className="flex items-center gap-2">
                      <span>{row.label}</span>
                      {'setPct' in row && row.setPct && (
                        <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.pctVal}
                            onChange={e => {
                              row.setPct!(e.target.value);
                              saveCell('settings', row.pctKey!, Number(e.target.value) || 0);
                            }}
                            className="w-10 text-center bg-background/60 border border-border/40 rounded px-1 py-0 text-[10px] focus:outline-none focus:border-primary"
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  {vals.map((val, i) => (
                    <td key={i} className={`px-1 py-1 border-r border-border/20 ${isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg || val < 0 ? 'text-destructive/80' : ''}`}>
                      {row.editable === 'new' ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newClients[i]}
                          onChange={e => updateArr(setNewClients, 'newClients', i, e.target.value)}
                          className="w-full text-center bg-background/60 border border-border/30 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                        />
                      ) : row.editable === 'ren' ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={renewals[i]}
                          onChange={e => updateArr(setRenewals, 'renewals', i, e.target.value)}
                          className="w-full text-center bg-background/60 border border-border/30 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="block text-center">{isCount(row.label) ? fmtN(val) : fmt$(val)}</span>
                      )}
                    </td>
                  ))}
                  <td className={`px-3 py-1.5 text-center font-semibold ${isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg || total < 0 ? 'text-destructive/80' : 'text-foreground'}`}>
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

interface FinRow { id: string; label: string }

const DEFAULT_REV_ROWS: FinRow[] = [
  { id: 'from_past', label: 'From past month' },
  { id: 'palm_craft', label: 'Palm Craft' },
  { id: 'kelner', label: 'Kelner Homes' },
  { id: 'mexico', label: 'Mexico Natural Slim' },
  { id: 'alice', label: 'Alice Cabinets' },
  { id: 'us_quest', label: 'US Quest' },
  { id: 'hrlme', label: 'HRLME' },
];
const DEFAULT_SALARY_ROWS: FinRow[] = [
  { id: 'media_buyer', label: 'Media buyer' },
  { id: 'project_mgr', label: 'Project manager' },
  { id: 'sales_salary', label: 'Sales' },
  { id: 'smm', label: 'SMM' },
];
const DEFAULT_EXPENSE_ROWS: FinRow[] = [
  { id: 'ghl', label: 'GHL' },
  { id: 'database', label: 'Database' },
  { id: 'google_ws', label: 'Google Workspace' },
  { id: 'panda_doc', label: 'Panda Doc' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'platform_dev', label: 'Platform Development' },
  { id: 'vsl_video', label: 'VSL Video' },
];

function FinancialPlanningTable() {
  const [revRows, setRevRows] = useState<FinRow[]>(DEFAULT_REV_ROWS);
  const [salaryRows, setSalaryRows] = useState<FinRow[]>(DEFAULT_SALARY_ROWS);
  const [expenseRows, setExpenseRows] = useState<FinRow[]>(DEFAULT_EXPENSE_ROWS);
  const [data, setData] = useState<Record<string, string[]>>({});
  const [taxPct, setTaxPct] = useState('10');
  const [savPct, setSavPct] = useState('15');
  const [mktPct, setMktPct] = useState('20');
  const [denisPct, setDenisPct] = useState('40');
  const [danilPct, setDanilPct] = useState('40');
  const [vladPct, setVladPct] = useState('20');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const nPct = (s: string) => Number(s) || 0;

  // Load all data from DB
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('afm_finance_data')
        .select('section, row_id, row_label, field_name, value')
        .eq('tab_key', 'financial_planning');

      if (rows) {
        const newData: Record<string, string[]> = {};
        const newRevRows: Record<string, FinRow> = {};
        const newSalRows: Record<string, FinRow> = {};
        const newExpRows: Record<string, FinRow> = {};
        const newOverrides: Record<string, boolean> = {};

        rows.forEach(r => {
          if (r.section === 'settings') {
            if (r.row_id === 'pcts') {
              if (r.field_name === 'taxPct') setTaxPct(String(r.value));
              if (r.field_name === 'savPct') setSavPct(String(r.value));
              if (r.field_name === 'mktPct') setMktPct(String(r.value));
              if (r.field_name === 'denisPct') setDenisPct(String(r.value));
              if (r.field_name === 'danilPct') setDanilPct(String(r.value));
              if (r.field_name === 'vladPct') setVladPct(String(r.value));
            }
          } else if (r.section === 'overrides') {
            newOverrides[`${r.row_id}_${r.field_name}`] = true;
            if (!newData[r.row_id]) newData[r.row_id] = Array(NM).fill('');
            newData[r.row_id][Number(r.field_name)] = String(r.value || 0);
          } else {
            // row data
            if (!newData[r.row_id]) newData[r.row_id] = Array(NM).fill('');
            newData[r.row_id][Number(r.field_name)] = String(r.value !== 0 ? r.value : '');
            const row = { id: r.row_id, label: r.row_label || r.row_id };
            if (r.section === 'revenue') newRevRows[r.row_id] = row;
            if (r.section === 'salary') newSalRows[r.row_id] = row;
            if (r.section === 'expenses') newExpRows[r.row_id] = row;
          }
        });

        setData(newData);
        setOverrides(newOverrides);

        // Merge with defaults for row order
        if (Object.keys(newRevRows).length > 0) {
          const merged = DEFAULT_REV_ROWS.map(d => newRevRows[d.id] || d);
          const extras = Object.values(newRevRows).filter(r => !DEFAULT_REV_ROWS.find(d => d.id === r.id));
          setRevRows([...merged, ...extras]);
        }
        if (Object.keys(newSalRows).length > 0) {
          const merged = DEFAULT_SALARY_ROWS.map(d => newSalRows[d.id] || d);
          const extras = Object.values(newSalRows).filter(r => !DEFAULT_SALARY_ROWS.find(d => d.id === r.id));
          setSalaryRows([...merged, ...extras]);
        }
        if (Object.keys(newExpRows).length > 0) {
          const merged = DEFAULT_EXPENSE_ROWS.map(d => newExpRows[d.id] || d);
          const extras = Object.values(newExpRows).filter(r => !DEFAULT_EXPENSE_ROWS.find(d => d.id === r.id));
          setExpenseRows([...merged, ...extras]);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const cell = (rowId: string, mi: number) => Number(data[rowId]?.[mi]) || 0;

  const saveCell = useCallback((section: string, rowId: string, rowLabel: string, fieldName: string, value: number) => {
    const key = `${section}_${rowId}_${fieldName}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      setSaving(true);
      await supabase.rpc('upsert_finance_data', {
        _tab_key: 'financial_planning',
        _section: section,
        _row_id: rowId,
        _row_label: rowLabel,
        _field_name: fieldName,
        _value: value,
      });
      setSaving(false);
    }, 600);
  }, []);

  const setCell = (section: string, rowId: string, rowLabel: string, mi: number, val: string) => {
    setData(prev => {
      const arr = [...(prev[rowId] ?? Array(NM).fill(''))];
      arr[mi] = val;
      return { ...prev, [rowId]: arr };
    });
    saveCell(section, rowId, rowLabel, String(mi), Number(val) || 0);
  };

  const savePct = useCallback((field: string, val: string) => {
    saveCell('settings', 'pcts', 'pcts', field, Number(val) || 0);
  }, [saveCell]);

  // Computed values
  const totalRevenue = (mi: number) => revRows.reduce((s, r) => s + cell(r.id, mi), 0);
  const totalSalary = (mi: number) => salaryRows.reduce((s, r) => s + cell(r.id, mi), 0);
  const totalExpenses = (mi: number) => expenseRows.reduce((s, r) => s + cell(r.id, mi), 0);
  const available = (mi: number) => totalRevenue(mi);
  const leftAmount = (mi: number) => available(mi) - totalSalary(mi) - totalExpenses(mi);

  const fundAmt = (pct: string, rowId: string, mi: number) => {
    const key = `${rowId}_${mi}`;
    if (overrides[key]) return cell(rowId, mi);
    return Math.round(totalRevenue(mi) * nPct(pct) / 100);
  };
  const taxAmt = (mi: number) => fundAmt(taxPct, 'taxes_10', mi);
  const savAmt = (mi: number) => fundAmt(savPct, 'savings_15', mi);
  const mktAmt = (mi: number) => fundAmt(mktPct, 'marketing_20', mi);
  const totalFunds = (mi: number) => taxAmt(mi) + savAmt(mi) + mktAmt(mi);
  const dividendBase = (mi: number) => leftAmount(mi) - totalFunds(mi);

  const divAmt = (pct: string, rowId: string, mi: number) => {
    const key = `${rowId}_${mi}`;
    if (overrides[key]) return cell(rowId, mi);
    return Math.round(dividendBase(mi) * nPct(pct) / 100);
  };
  const denisAmt = (mi: number) => divAmt(denisPct, 'denis_40', mi);
  const danilAmt = (mi: number) => divAmt(danilPct, 'danil_40', mi);
  const vladAmt = (mi: number) => divAmt(vladPct, 'vladimir_20', mi);
  const totalDivs = (mi: number) => denisAmt(mi) + danilAmt(mi) + vladAmt(mi);

  const totalTaxFund = FIN_MONTHS.reduce((s, _, mi) => s + taxAmt(mi), 0);
  const totalSavFund = FIN_MONTHS.reduce((s, _, mi) => s + savAmt(mi), 0);
  const totalMktFund = FIN_MONTHS.reduce((s, _, mi) => s + mktAmt(mi), 0);

  const addRow = (
    setter: React.Dispatch<React.SetStateAction<FinRow[]>>,
    section: string, label: string
  ) => {
    if (!label.trim()) return;
    const id = `custom_${Date.now()}`;
    setter(prev => [...prev, { id, label }]);
    setData(prev => ({ ...prev, [id]: Array(NM).fill('') }));
    // Save the row header
    saveCell(section, id, label, '0', 0);
  };

  const deleteRow = async (
    setter: React.Dispatch<React.SetStateAction<FinRow[]>>,
    section: string, id: string
  ) => {
    setter(prev => prev.filter(r => r.id !== id));
    await supabase.from('afm_finance_data')
      .delete()
      .eq('tab_key', 'financial_planning')
      .eq('section', section)
      .eq('row_id', id);
  };

  function fmtFin(n: number) {
    if (n === 0) return '$0';
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function EditableRow({ row, section, onDelete }: {
    row: FinRow; section: string; onDelete?: () => void;
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
              type="text"
              inputMode="numeric"
              value={data[row.id]?.[mi] ?? ''}
              onChange={e => setCell(section, row.id, row.label, mi, e.target.value)}
              placeholder="0"
              className="w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors"
            />
          </td>
        ))}
        <td className="px-2 py-1 text-center text-xs text-muted-foreground font-medium">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + cell(row.id, mi), 0))}
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
        <td className="sticky left-0 bg-primary/5 px-3 py-1 border-r border-border/40">
          <div className="flex gap-1.5 items-center">
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onAdd(label); setLabel(''); setAdding(false); }
                if (e.key === 'Escape') setAdding(false);
              }}
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

  function ComputedRow({ label, computedFn, rowId, pct, setPct, color }: {
    label: string; computedFn: (mi: number) => number; rowId: string;
    pct: string; setPct: (v: string) => void; color?: string;
  }) {
    return (
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
        <td className="sticky left-0 z-10 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-5">
          <div className="flex items-center gap-2">
            <span className={`flex-1 text-xs ${color || ''}`}>{label}</span>
            <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
              <input
                type="text"
                inputMode="numeric"
                value={pct}
                onChange={e => { setPct(e.target.value); savePct(`${rowId}_pct`, e.target.value); }}
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
                  type="text"
                  inputMode="numeric"
                  value={data[rowId]?.[mi] ?? ''}
                  onChange={e => {
                    setData(prev => {
                      const arr = [...(prev[rowId] ?? Array(NM).fill(''))];
                      arr[mi] = e.target.value;
                      return { ...prev, [rowId]: arr };
                    });
                    saveCell('overrides', rowId, rowId, String(mi), Number(e.target.value) || 0);
                  }}
                  className="w-full text-center bg-background border border-primary/50 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                />
              ) : (
                <div
                  title="Двойной клик — ручной ввод"
                  onDoubleClick={() => {
                    setOverrides(p => ({ ...p, [key]: true }));
                    setData(prev => {
                      const arr = [...(prev[rowId] ?? Array(NM).fill(''))];
                      arr[mi] = String(computed);
                      return { ...prev, [rowId]: arr };
                    });
                    saveCell('overrides', rowId, rowId, String(mi), computed);
                  }}
                  className="text-center text-xs py-0.5 cursor-pointer hover:bg-muted/30 rounded"
                >
                  {computed ? fmtFin(computed) : '—'}
                </div>
              )}
              {isOverride && (
                <button
                  title="Сбросить к авторасчёту"
                  onClick={async () => {
                    setOverrides(p => { const n = { ...p }; delete n[key]; return n; });
                    await supabase.from('afm_finance_data')
                      .delete()
                      .eq('tab_key', 'financial_planning')
                      .eq('section', 'overrides')
                      .eq('row_id', rowId)
                      .eq('field_name', String(mi));
                  }}
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
        <td className={`sticky left-0 z-10 bg-muted/50 px-3 py-1.5 font-bold border-r border-border/40 text-sm ${color}`}>{title}</td>
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

  function ComputedDisplayRow({ label, computedFn, rowStyle }: {
    label: string; computedFn: (mi: number) => number; rowStyle?: string;
  }) {
    return (
      <tr className={`border-b border-border/30 ${rowStyle || ''}`}>
        <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold border-r border-border/40 text-xs ${rowStyle ? 'bg-blue-500/10' : 'bg-background'}`}>
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {saving && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />Сохраняю...
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-[1200px] w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '190px', minWidth: '190px' }} />
            {FIN_MONTHS.map(m => <col key={m} style={{ width: '90px', minWidth: '90px' }} />)}
            <col style={{ width: '95px', minWidth: '95px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 text-left px-3 py-2 font-semibold text-foreground border-r border-border/40">Статья</th>
              {FIN_MONTHS.map(m => (
                <th key={m} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20">{m}</th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-foreground whitespace-nowrap">Итого</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader title="Total Revenue" color="text-blue-400" totalFn={totalRevenue} />
            {revRows.map(row => (
              <EditableRow key={row.id} row={row} section="revenue"
                onDelete={() => deleteRow(setRevRows, 'revenue', row.id)} />
            ))}
            <AddRowInline onAdd={label => addRow(setRevRows, 'revenue', label)} />

            <SectionHeader title="Salary" color="text-yellow-400" totalFn={totalSalary} />
            {salaryRows.map(row => (
              <EditableRow key={row.id} row={row} section="salary"
                onDelete={() => deleteRow(setSalaryRows, 'salary', row.id)} />
            ))}
            <AddRowInline onAdd={label => addRow(setSalaryRows, 'salary', label)} />

            <SectionHeader title="Expenses" color="text-orange-400" totalFn={totalExpenses} />
            {expenseRows.map(row => (
              <EditableRow key={row.id} row={row} section="expenses"
                onDelete={() => deleteRow(setExpenseRows, 'expenses', row.id)} />
            ))}
            <AddRowInline onAdd={label => addRow(setExpenseRows, 'expenses', label)} />

            <ComputedDisplayRow label="Available amount (= Total Revenue)" computedFn={available} rowStyle="bg-blue-500/10 text-blue-400" />
            <ComputedDisplayRow label="Total costs (Salary + Expenses)" computedFn={mi => totalSalary(mi) + totalExpenses(mi)} rowStyle="bg-orange-500/10 text-orange-400" />
            <ComputedDisplayRow label="Left amount (Revenue − Salary − Expenses)" computedFn={leftAmount} rowStyle="bg-green-500/10 text-green-400" />

            <SectionHeader title="Funds" color="text-purple-400" totalFn={totalFunds} />
            <ComputedRow label={`Taxes`} computedFn={taxAmt} rowId="taxes_10" pct={taxPct} setPct={v => { setTaxPct(v); savePct('taxPct', v); }} />
            <ComputedRow label={`Savings`} computedFn={savAmt} rowId="savings_15" pct={savPct} setPct={v => { setSavPct(v); savePct('savPct', v); }} />
            <ComputedRow label={`Marketing`} computedFn={mktAmt} rowId="marketing_20" pct={mktPct} setPct={v => { setMktPct(v); savePct('mktPct', v); }} />

            <SectionHeader title="Dividends" color="text-green-400" totalFn={totalDivs} />
            <ComputedRow label={`Denis`} computedFn={denisAmt} rowId="denis_40" pct={denisPct} setPct={v => { setDenisPct(v); savePct('denisPct', v); }} />
            <ComputedRow label={`Danil`} computedFn={danilAmt} rowId="danil_40" pct={danilPct} setPct={v => { setDanilPct(v); savePct('danilPct', v); }} />
            <ComputedRow label={`Vladimir`} computedFn={vladAmt} rowId="vladimir_20" pct={vladPct} setPct={v => { setVladPct(v); savePct('vladPct', v); }} />
          </tbody>
        </table>
      </div>

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
        Двойной клик на ячейке авторасчёта — ввести вручную. Клик на «↺» — сбросить к авторасчёту. Всё сохраняется автоматически.
      </p>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function AfmFinancePage() {
  const { t } = useLanguage();
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          {t('afm.finance.title' as any)}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.finance.subtitle' as any)}</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="income-plan">
          <TabsList className="mb-4">
            <TabsTrigger value="income-plan" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('afm.finance.incomeTab' as any)}
            </TabsTrigger>
            <TabsTrigger value="financial-planning" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {t('afm.finance.planningTab' as any)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income-plan">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t('afm.finance.incomeTitle' as any)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t('afm.finance.incomeDesc' as any)}
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
                  {t('afm.finance.planningTitle' as any)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t('afm.finance.planningDesc' as any)}
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
