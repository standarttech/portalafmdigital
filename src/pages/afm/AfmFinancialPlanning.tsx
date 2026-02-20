import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Trash2, Info, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const FIN_MONTHS = ['Дек 2025', 'Янв 2026', 'Фев 2026', 'Мар 2026', 'Апр 2026', 'Май 2026', 'Июн 2026', 'Июл 2026', 'Авг 2026', 'Сен 2026', 'Окт 2026', 'Ноя 2026'];
const NM = FIN_MONTHS.length;
// Column letters like in Google Sheets: A=Row label, B=Dec, C=Jan, ... last+1=Total
const COL_LETTERS = ['A', ...FIN_MONTHS.map((_, i) => String.fromCharCode(66 + i)), String.fromCharCode(66 + NM)];

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

interface ActiveCell {
  rowKey: string;
  colIdx: number; // -1 = label col
  label: string;
  formula: string;
}

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
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
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
    if (n === 0) return '';
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function getColRef(colIdx: number) {
    return COL_LETTERS[colIdx + 1] ?? '?'; // +1 because colIdx 0 = first month column = letter B
  }

  // Row number tracker
  let rowNum = 1;

  // Editable cell component — inline, sheet-like
  function SheetCell({
    value, onChange, rowKey, colIdx, rowLabel, isFormula = false
  }: {
    value: string; onChange: (v: string) => void;
    rowKey: string; colIdx: number; rowLabel: string; isFormula?: boolean;
  }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isActive = activeCell?.rowKey === rowKey && activeCell?.colIdx === colIdx;

    // Sync external value to uncontrolled input when not focused
    useEffect(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.value = value;
      }
    }, [value]);

    return (
      <td
        className={`border-r border-b border-border/30 p-0 relative h-[22px] ${isActive ? 'ring-2 ring-inset ring-blue-500 z-20' : 'hover:bg-muted/20'}`}
        onClick={() => {
          setActiveCell({ rowKey, colIdx, label: rowLabel, formula: value });
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          defaultValue={value}
          type="text"
          inputMode="numeric"
          className="absolute inset-0 w-full h-full bg-transparent text-right text-[11px] px-1.5 text-foreground focus:outline-none"
          onChange={e => {
            onChange(e.target.value);
            if (isActive) setActiveCell(ac => ac ? { ...ac, formula: e.target.value } : ac);
          }}
          onFocus={() => setActiveCell({ rowKey, colIdx, label: rowLabel, formula: value })}
          onBlur={() => setActiveCell(null)}
        />
      </td>
    );
  }

  // Computed (formula-driven) cell
  function FormulaCell({ value, rowKey, colIdx, formulaText, textClass = '' }: {
    value: number; rowKey: string; colIdx: number; formulaText: string; textClass?: string;
  }) {
    const isActive = activeCell?.rowKey === rowKey && activeCell?.colIdx === colIdx;
    const displayVal = value ? fmtFin(value) : '';
    return (
      <td
        className={`border-r border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 cursor-default select-none ${textClass} ${isActive ? 'ring-2 ring-inset ring-blue-500 z-20' : 'hover:bg-muted/20'}`}
        onClick={() => setActiveCell({ rowKey, colIdx, label: '', formula: formulaText })}
      >
        {displayVal}
      </td>
    );
  }

  // Section group header (like Google Sheets row group header)
  function GroupHeader({ title, color, totalFn, rn }: {
    title: string; color: string; totalFn: (mi: number) => number; rn: number;
  }) {
    return (
      <tr className="h-[24px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 px-0 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--muted)/0.8)' }}>{rn}</td>
        <td className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-bold text-[11px] ${color} min-w-[180px]`} style={{ background: 'hsl(var(--muted)/0.6)' }}>
          {title}
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className={`border-r border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-bold ${color}`}>
            {totalFn(mi) ? fmtFin(totalFn(mi)) : ''}
          </td>
        ))}
        <td className={`border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-bold ${color}`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + totalFn(mi), 0))}
        </td>
      </tr>
    );
  }

  // Regular editable row
  function EditableRow({ row, section, rn, onDelete }: { row: FinRow; section: string; rn: number; onDelete?: () => void }) {
    return (
      <tr className="h-[22px] group/row" style={{ background: 'hsl(var(--background))' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--background))' }}>{rn}</td>
        <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-1.5 text-foreground/80 min-w-[180px]" style={{ background: 'hsl(var(--background))' }}>
          <div className="flex items-center gap-1 h-full">
            <span className="flex-1 truncate text-[11px]">{row.label}</span>
            {onDelete && (
              <button onClick={onDelete} className="opacity-0 group-hover/row:opacity-60 hover:!opacity-100 text-destructive transition-all shrink-0">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <SheetCell
            key={mi}
            value={data[row.id]?.[mi] ?? ''}
            onChange={val => setCell(section, row.id, row.label, mi, val)}
            rowKey={`${row.id}_${mi}`}
            colIdx={mi}
            rowLabel={row.label}
          />
        ))}
        <td className="border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 text-muted-foreground font-medium">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + cell(row.id, mi), 0))}
        </td>
      </tr>
    );
  }

  // Computed/formula row (with optional manual override on double-click)
  function ComputedRow({ label, computedFn, rowId, pct, setPct, rn, formulaSuffix }: {
    label: string; computedFn: (mi: number) => number; rowId: string;
    pct: string; setPct: (v: string) => void; rn: number; formulaSuffix: string;
  }) {
    return (
      <tr className="h-[22px] group/row" style={{ background: 'hsl(var(--muted)/0.15)' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--muted)/0.2)' }}>{rn}</td>
        <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-1.5 text-foreground/80 min-w-[180px]" style={{ background: 'hsl(var(--muted)/0.2)' }}>
          <div className="flex items-center gap-1.5 h-full">
            <span className="flex-1 text-[11px] italic">{label}</span>
            <div className="flex items-center gap-0.5 opacity-60 group-hover/row:opacity-100">
              <input
                type="text" inputMode="numeric" value={pct}
                onChange={e => { setPct(e.target.value); savePctFn(`${rowId}_pct`, e.target.value); }}
                className="w-7 text-center bg-background border border-border/50 rounded px-0 py-0 text-[10px] focus:outline-none focus:border-primary leading-none"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
            </div>
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => {
          const key = `${rowId}_${mi}`;
          const isOverride = overrides[key];
          const computed = computedFn(mi);
          return isOverride ? (
            <td key={mi} className="border-r border-b border-border/30 p-0 relative h-[22px] bg-yellow-500/10 ring-1 ring-inset ring-yellow-500/40">
              <input
                type="text" inputMode="numeric"
                defaultValue={data[rowId]?.[mi] ?? ''}
                className="absolute inset-0 w-full h-full bg-transparent text-right text-[11px] px-1.5 text-yellow-400 focus:outline-none"
                onChange={e => {
                  setData(prev => { const arr = [...(prev[rowId] ?? Array(NM).fill(''))]; arr[mi] = e.target.value; return { ...prev, [rowId]: arr }; });
                  saveCell('overrides', rowId, rowId, String(mi), Number(e.target.value) || 0);
                }}
              />
              <button title="Сбросить к формуле" onClick={async () => {
                setOverrides(p => { const n = { ...p }; delete n[key]; return n; });
                await supabase.from('afm_finance_data').delete()
                  .eq('tab_key', 'financial_planning').eq('section', 'overrides').eq('row_id', rowId).eq('field_name', String(mi));
              }} className="absolute top-0 right-0 text-[8px] text-yellow-400 opacity-0 hover:opacity-100 p-0.5 z-10">
                <RotateCcw className="h-2 w-2" />
              </button>
            </td>
          ) : (
            <td
              key={mi}
              title="Двойной клик — ручной ввод"
              onDoubleClick={() => {
                setOverrides(p => ({ ...p, [key]: true }));
                setData(prev => { const arr = [...(prev[rowId] ?? Array(NM).fill(''))]; arr[mi] = String(computed); return { ...prev, [rowId]: arr }; });
                saveCell('overrides', rowId, rowId, String(mi), computed);
              }}
              onClick={() => setActiveCell({ rowKey: key, colIdx: mi, label, formula: formulaSuffix })}
              className="border-r border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 cursor-pointer hover:bg-muted/30 text-muted-foreground/90"
            >
              {computed ? fmtFin(computed) : ''}
            </td>
          );
        })}
        <td className="border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 font-medium text-muted-foreground">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  // Summary row (blue/green highlighted)
  function SummaryRow({ label, computedFn, textClass, bgClass, rn, formulaText }: {
    label: string; computedFn: (mi: number) => number;
    textClass: string; bgClass: string; rn: number; formulaText: string;
  }) {
    return (
      <tr className={`h-[23px] ${bgClass}`}>
        <td className={`sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none ${bgClass}`}>{rn}</td>
        <td className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-semibold text-[11px] ${textClass} min-w-[180px] ${bgClass}`}>{label}</td>
        {FIN_MONTHS.map((_, mi) => (
          <FormulaCell
            key={mi}
            value={computedFn(mi)}
            rowKey={`summary_${label}_${mi}`}
            colIdx={mi}
            formulaText={formulaText}
            textClass={`font-semibold ${textClass}`}
          />
        ))}
        <td className={`border-b border-border/30 h-[23px] text-right text-[11px] px-1.5 font-bold ${textClass}`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  function AddRowInline({ onAdd }: { onAdd: (label: string) => void }) {
    const [adding, setAdding] = useState(false);
    const [label, setLabel] = useState('');
    if (!adding) return (
      <tr className="h-[22px]">
        <td className="sticky left-0 z-10 border-r border-b border-border/20 w-[30px]" style={{ background: 'hsl(var(--background))' }} />
        <td colSpan={NM + 2} className="border-b border-border/20 px-2" style={{ background: 'hsl(var(--background))' }}>
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
            <Plus className="h-2.5 w-2.5" /> Добавить строку
          </button>
        </td>
      </tr>
    );
    return (
      <tr className="h-[22px] bg-primary/5">
        <td className="sticky left-0 z-10 border-r border-b border-border/20 w-[30px] bg-primary/5" />
        <td className="sticky left-[30px] z-10 border-r border-b border-border/20 bg-primary/5 px-1.5">
          <div className="flex gap-1 items-center">
            <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onAdd(label); setLabel(''); setAdding(false); }
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Название строки..."
              className="flex-1 bg-background border border-primary/40 rounded px-1.5 py-0 text-[11px] focus:outline-none h-5"
            />
            <button className="text-[10px] text-primary hover:underline" onClick={() => { onAdd(label); setLabel(''); setAdding(false); }}>OK</button>
            <button className="text-[10px] text-muted-foreground" onClick={() => setAdding(false)}>✕</button>
          </div>
        </td>
        {FIN_MONTHS.map((_, i) => <td key={i} className="border-r border-b border-border/20 bg-primary/5" />)}
        <td className="border-b border-border/20 bg-primary/5" />
      </tr>
    );
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  // Build rows with row numbers
  const revStart = 2;
  const revEnd = revStart + revRows.length - 1;
  const salStart = revEnd + 2;
  const salEnd = salStart + salaryRows.length - 1;
  const expStart = salEnd + 2;
  const expEnd = expStart + expenseRows.length - 1;
  const summaryStart = expEnd + 2;
  const fundsStart = summaryStart + 4;
  const divsStart = fundsStart + 4;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Финансовое планирование
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Доходы, расходы, фонды и дивиденды по месяцам</p>
      </motion.div>

      <motion.div variants={item}>
        {/* Google Sheets toolbar */}
        <div className="flex items-stretch border border-border/50 rounded-t-lg overflow-hidden" style={{ background: 'hsl(var(--muted)/0.3)' }}>
          {/* Cell reference box */}
          <div className="flex items-center justify-center border-r border-border/40 px-2 min-w-[60px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeCell ? `${getColRef(activeCell.colIdx)}` : 'A1'}
            </span>
          </div>
          {/* Formula bar */}
          <div className="flex items-center gap-1.5 flex-1 px-2 py-1">
            <span className="text-[11px] text-muted-foreground italic">fx</span>
            <span className="text-[11px] font-mono text-foreground">
              {activeCell?.formula || ''}
            </span>
          </div>
          {saving && (
            <div className="flex items-center gap-1 px-2 text-[11px] text-muted-foreground border-l border-border/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Сохраняю...
            </div>
          )}
        </div>

        {/* The spreadsheet */}
        <div className="overflow-auto rounded-b-lg border border-t-0 border-border/50" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${30 + 180 + NM * 88 + 90}px` }}>
            <colgroup>
              <col style={{ width: '30px' }} /> {/* row number */}
              <col style={{ width: '180px' }} /> {/* label */}
              {FIN_MONTHS.map(m => <col key={m} style={{ width: '88px' }} />)}
              <col style={{ width: '90px' }} /> {/* total */}
            </colgroup>

            {/* Column header row — like Google Sheets */}
            <thead className="sticky top-0 z-30">
              <tr className="h-[24px]" style={{ background: 'hsl(var(--muted)/0.8)' }}>
                <th className="border-r border-b border-border/50 w-[30px]" /> {/* corner */}
                <th className="sticky left-[30px] z-10 border-r border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground" style={{ background: 'hsl(var(--muted)/0.8)' }}>A</th>
                {FIN_MONTHS.map((m, i) => (
                  <th key={i} className="border-r border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground px-1">
                    <div>{COL_LETTERS[i + 1]}</div>
                    <div className="text-[9px] text-muted-foreground/60 font-normal leading-none">{m.slice(0, 6)}</div>
                  </th>
                ))}
                <th className="border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground">Итого</th>
              </tr>
            </thead>

            <tbody>
              {/* Row 1: header labels */}
              <tr className="h-[22px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
                <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>1</td>
                <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-bold text-[11px] text-foreground" style={{ background: 'hsl(var(--muted)/0.5)' }}>Статья</td>
                {FIN_MONTHS.map((m, i) => (
                  <td key={i} className="border-r border-b border-border/30 text-center text-[11px] font-semibold text-foreground px-1">{m}</td>
                ))}
                <td className="border-b border-border/30 text-center text-[11px] font-semibold text-foreground px-1">Итого за год</td>
              </tr>

              {/* === REVENUE === */}
              <GroupHeader title="Total Revenue" color="text-blue-400" totalFn={totalRevenue} rn={revStart - 1} />
              {revRows.map((row, ri) => (
                <EditableRow key={row.id} row={row} section="revenue" rn={revStart + ri}
                  onDelete={() => deleteRow(setRevRows, 'revenue', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setRevRows, 'revenue', label)} />

              {/* === SALARY === */}
              <GroupHeader title="Salary" color="text-yellow-400" totalFn={totalSalary} rn={salStart - 1} />
              {salaryRows.map((row, ri) => (
                <EditableRow key={row.id} row={row} section="salary" rn={salStart + ri}
                  onDelete={() => deleteRow(setSalaryRows, 'salary', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setSalaryRows, 'salary', label)} />

              {/* === EXPENSES === */}
              <GroupHeader title="Expenses" color="text-orange-400" totalFn={totalExpenses} rn={expStart - 1} />
              {expenseRows.map((row, ri) => (
                <EditableRow key={row.id} row={row} section="expenses" rn={expStart + ri}
                  onDelete={() => deleteRow(setExpenseRows, 'expenses', row.id)} />
              ))}
              <AddRowInline onAdd={label => addRow(setExpenseRows, 'expenses', label)} />

              {/* === SUMMARY ROWS === */}
              <SummaryRow label="Available Amount (= Total Revenue)" computedFn={available}
                textClass="text-blue-400" bgClass="bg-blue-500/10" rn={summaryStart} formulaText="=Total Revenue" />
              <SummaryRow label="Total Costs (Salary + Expenses)" computedFn={mi => totalSalary(mi) + totalExpenses(mi)}
                textClass="text-orange-400" bgClass="bg-orange-500/10" rn={summaryStart + 1} formulaText="=SUM(Salary, Expenses)" />
              <SummaryRow label="Left Amount (Revenue − Salary − Expenses)" computedFn={leftAmount}
                textClass="text-green-400" bgClass="bg-green-500/10" rn={summaryStart + 2} formulaText="=Revenue - Salary - Expenses" />
              <SummaryRow label="Dividend Base (Left − Funds)" computedFn={dividendBase}
                textClass="text-purple-400" bgClass="bg-purple-500/10" rn={summaryStart + 3} formulaText="=Left - Taxes - Savings - Marketing" />

              {/* === FUNDS === */}
              <GroupHeader title="Funds" color="text-purple-400" totalFn={totalFunds} rn={fundsStart - 1} />
              <ComputedRow label="Taxes" computedFn={taxAmt} rowId="taxes_10" pct={taxPct} rn={fundsStart}
                setPct={v => { setTaxPct(v); savePctFn('taxPct', v); }} formulaSuffix={`=Revenue × ${taxPct}%`} />
              <ComputedRow label="Savings" computedFn={savAmt} rowId="savings_15" pct={savPct} rn={fundsStart + 1}
                setPct={v => { setSavPct(v); savePctFn('savPct', v); }} formulaSuffix={`=Revenue × ${savPct}%`} />
              <ComputedRow label="Marketing" computedFn={mktAmt} rowId="marketing_20" pct={mktPct} rn={fundsStart + 2}
                setPct={v => { setMktPct(v); savePctFn('mktPct', v); }} formulaSuffix={`=Revenue × ${mktPct}%`} />

              {/* === DIVIDENDS === */}
              <GroupHeader title="Dividends" color="text-green-400" totalFn={totalDivs} rn={divsStart - 1} />
              <ComputedRow label="Denis" computedFn={denisAmt} rowId="denis_40" pct={denisPct} rn={divsStart}
                setPct={v => { setDenisPct(v); savePctFn('denisPct', v); }} formulaSuffix={`=DividendBase × ${denisPct}%`} />
              <ComputedRow label="Danil" computedFn={danilAmt} rowId="danil_40" pct={danilPct} rn={divsStart + 1}
                setPct={v => { setDanilPct(v); savePctFn('danilPct', v); }} formulaSuffix={`=DividendBase × ${danilPct}%`} />
              <ComputedRow label="Vladimir" computedFn={vladAmt} rowId="vladimir_20" pct={vladPct} rn={divsStart + 2}
                setPct={v => { setVladPct(v); savePctFn('vladPct', v); }} formulaSuffix={`=DividendBase × ${vladPct}%`} />
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-2">
          <Info className="h-3 w-3" />
          Клик на ячейку → выделение и формула в строке. Двойной клик на ячейке с формулой → ручной ввод (подсвечивается жёлтым). Клик ↺ → сброс к авторасчёту.
        </p>

        {/* Fund summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Taxes Fund', amount: totalTaxFund, color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
            { label: 'Savings Fund', amount: totalSavFund, color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
            { label: 'Marketing Fund', amount: totalMktFund, color: 'text-primary border-primary/30 bg-primary/5' },
          ].map(f => (
            <div key={f.label} className={`rounded-xl border p-3 sm:p-4 ${f.color}`}>
              <p className="text-xs font-medium mb-1 opacity-80">{f.label}</p>
              <p className="text-lg sm:text-xl font-bold font-mono">{fmtFin(f.amount) || '$0'}</p>
              <p className="text-[10px] opacity-60 mt-0.5">Накоплено за период</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
