import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Trash2, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CellInput } from '@/components/shared/CellInput';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

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

export default function AfmFinancialPlanning() {
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

  const savePctFn = useCallback((field: string, val: string) => {
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

  const addRow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, label: string) => {
    if (!label.trim()) return;
    const id = `custom_${Date.now()}`;
    setter(prev => [...prev, { id, label }]);
    setData(prev => ({ ...prev, [id]: Array(NM).fill('') }));
    saveCell(section, id, label, '0', 0);
  };

  const deleteRow = async (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, id: string) => {
    setter(prev => prev.filter(r => r.id !== id));
    await supabase.from('afm_finance_data').delete()
      .eq('tab_key', 'financial_planning').eq('section', section).eq('row_id', id);
  };

  function fmtFin(n: number) {
    if (n === 0) return '$0';
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function EditableRow({ row, section, onDelete }: { row: FinRow; section: string; onDelete?: () => void }) {
    return (
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
        <td className="sticky left-0 z-10 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-5">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate text-xs">{row.label}</span>
            {onDelete && (
              <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className="px-1 py-0.5 border-r border-border/20">
            <CellInput
              value={data[row.id]?.[mi] ?? ''}
              onChange={val => setCell(section, row.id, row.label, mi, val)}
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
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors py-0.5">
            <Plus className="h-3 w-3" /> Добавить строку
          </button>
        </td>
      </tr>
    );
    return (
      <tr className="bg-primary/5">
        <td className="sticky left-0 bg-primary/5 px-3 py-1 border-r border-border/40">
          <div className="flex gap-1.5 items-center">
            <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
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

  function ComputedRow({ label, computedFn, rowId, pct, setPct }: {
    label: string; computedFn: (mi: number) => number; rowId: string; pct: string; setPct: (v: string) => void;
  }) {
    return (
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
        <td className="sticky left-0 z-10 bg-background px-3 py-1 text-foreground/80 border-r border-border/40 pl-5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs">{label}</span>
            <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
              <input type="text" inputMode="numeric" value={pct}
                onChange={e => { setPct(e.target.value); savePctFn(`${rowId}_pct`, e.target.value); }}
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
                <CellInput
                  value={data[rowId]?.[mi] ?? ''}
                  onChange={val => {
                    setData(prev => { const arr = [...(prev[rowId] ?? Array(NM).fill(''))]; arr[mi] = val; return { ...prev, [rowId]: arr }; });
                    saveCell('overrides', rowId, rowId, String(mi), Number(val) || 0);
                  }}
                  className="bg-background border-primary/50"
                />
              ) : (
                <div title="Двойной клик — ручной ввод" onDoubleClick={() => {
                  setOverrides(p => ({ ...p, [key]: true }));
                  setData(prev => { const arr = [...(prev[rowId] ?? Array(NM).fill(''))]; arr[mi] = String(computed); return { ...prev, [rowId]: arr }; });
                  saveCell('overrides', rowId, rowId, String(mi), computed);
                }} className="text-center text-xs py-0.5 cursor-pointer hover:bg-muted/30 rounded">
                  {computed ? fmtFin(computed) : '—'}
                </div>
              )}
              {isOverride && (
                <button title="Сбросить" onClick={async () => {
                  setOverrides(p => { const n = { ...p }; delete n[key]; return n; });
                  await supabase.from('afm_finance_data').delete()
                    .eq('tab_key', 'financial_planning').eq('section', 'overrides').eq('row_id', rowId).eq('field_name', String(mi));
                }} className="absolute top-0 right-0 text-[8px] text-primary opacity-0 group-hover/cell:opacity-100 p-0.5">↺</button>
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

  function ComputedDisplayRow({ label, computedFn, textColor, bgColor }: {
    label: string; computedFn: (mi: number) => number; textColor?: string; bgColor?: string;
  }) {
    return (
      <tr className={`border-b border-border/30 ${bgColor || ''}`}>
        <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold border-r border-border/40 text-xs ${bgColor || 'bg-background'} ${textColor || ''}`}>
          {label}
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className={`px-2 py-1.5 text-center text-xs font-semibold border-r border-border/20 ${textColor || ''}`}>
            {fmtFin(computedFn(mi))}
          </td>
        ))}
        <td className={`px-2 py-1.5 text-center text-xs font-semibold ${textColor || ''}`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Финансовое планирование
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Доходы, расходы, фонды и дивиденды по месяцам</p>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
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
                <EditableRow key={row.id} row={row} section="revenue" onDelete={() => deleteRow(setRevRows, 'revenue', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setRevRows, 'revenue', label)} />

              <SectionHeader title="Salary" color="text-yellow-400" totalFn={totalSalary} />
              {salaryRows.map(row => (
                <EditableRow key={row.id} row={row} section="salary" onDelete={() => deleteRow(setSalaryRows, 'salary', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setSalaryRows, 'salary', label)} />

              <SectionHeader title="Expenses" color="text-orange-400" totalFn={totalExpenses} />
              {expenseRows.map(row => (
                <EditableRow key={row.id} row={row} section="expenses" onDelete={() => deleteRow(setExpenseRows, 'expenses', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setExpenseRows, 'expenses', label)} />

              <ComputedDisplayRow label="Available amount (= Total Revenue)" computedFn={available} bgColor="bg-blue-500/10" textColor="text-blue-400" />
              <ComputedDisplayRow label="Total costs (Salary + Expenses)" computedFn={mi => totalSalary(mi) + totalExpenses(mi)} bgColor="bg-orange-500/10" textColor="text-orange-400" />
              <ComputedDisplayRow label="Left amount (Revenue − Salary − Expenses)" computedFn={leftAmount} bgColor="bg-green-500/10" textColor="text-green-400" />

              <SectionHeader title="Funds" color="text-purple-400" totalFn={totalFunds} />
              <ComputedRow label="Taxes" computedFn={taxAmt} rowId="taxes_10" pct={taxPct} setPct={v => { setTaxPct(v); savePctFn('taxPct', v); }} />
              <ComputedRow label="Savings" computedFn={savAmt} rowId="savings_15" pct={savPct} setPct={v => { setSavPct(v); savePctFn('savPct', v); }} />
              <ComputedRow label="Marketing" computedFn={mktAmt} rowId="marketing_20" pct={mktPct} setPct={v => { setMktPct(v); savePctFn('mktPct', v); }} />

              <SectionHeader title="Dividends" color="text-green-400" totalFn={totalDivs} />
              <ComputedRow label="Denis" computedFn={denisAmt} rowId="denis_40" pct={denisPct} setPct={v => { setDenisPct(v); savePctFn('denisPct', v); }} />
              <ComputedRow label="Danil" computedFn={danilAmt} rowId="danil_40" pct={danilPct} setPct={v => { setDanilPct(v); savePctFn('danilPct', v); }} />
              <ComputedRow label="Vladimir" computedFn={vladAmt} rowId="vladimir_20" pct={vladPct} setPct={v => { setVladPct(v); savePctFn('vladPct', v); }} />
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
      </motion.div>
    </motion.div>
  );
}
