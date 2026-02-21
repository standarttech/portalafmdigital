import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Plus, Trash2, RotateCcw, Loader2, ChevronUp, ChevronDown, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FinanceSheetSync from '@/components/afm/FinanceSheetSync';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const FIN_MONTHS = ['Дек 2025', 'Янв 2026', 'Фев 2026', 'Мар 2026', 'Апр 2026', 'Май 2026', 'Июн 2026', 'Июл 2026', 'Авг 2026', 'Сен 2026', 'Окт 2026', 'Ноя 2026'];
const NM = FIN_MONTHS.length;
const COL_LETTERS = ['A', ...FIN_MONTHS.map((_, i) => String.fromCharCode(66 + i)), String.fromCharCode(66 + NM)];

interface FinRow { id: string; label: string; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right'; color?: string; }
interface ActiveCell { rowKey: string; rowIdx: number; colIdx: number; label: string; formula: string; isLabel?: boolean; }

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

function fmtFin(n: number) {
  if (n === 0) return '';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function getColRef(colIdx: number) {
  return COL_LETTERS[colIdx + 1] ?? '?';
}
function getCellRef(rowIdx: number, colIdx: number) {
  return `${getColRef(colIdx)}${rowIdx + 2}`;
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
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [editingLabel, setEditingLabel] = useState<{ rowId: string; section: string } | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [addingRow, setAddingRow] = useState<{ section: string; label: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string; section: string; rowIdx: number; setter: React.Dispatch<React.SetStateAction<FinRow[]>> } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const formulaBarRef = useRef<HTMLInputElement>(null);

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

    const closeCtx = () => setContextMenu(null);
    window.addEventListener('click', closeCtx);
    return () => window.removeEventListener('click', closeCtx);
  }, []);

  const cell = (rowId: string, mi: number) => Number(data[rowId]?.[mi]) || 0;

  const saveCell = useCallback((section: string, rowId: string, rowLabel: string, fieldName: string, value: number) => {
    const key = `${section}_${rowId}_${fieldName}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      setSaving(true);
      await supabase.rpc('upsert_finance_data', {
        _tab_key: 'financial_planning', _section: section,
        _row_id: rowId, _row_label: rowLabel, _field_name: fieldName, _value: value,
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
  const leftAmount = (mi: number) => totalRevenue(mi) - totalSalary(mi) - totalExpenses(mi);

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

  const addRow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, label: string) => {
    if (!label.trim()) return;
    const id = `custom_${Date.now()}`;
    setter(prev => [...prev, { id, label }]);
    setData(prev => ({ ...prev, [id]: Array(NM).fill('') }));
    saveCell(section, id, label, '0', 0);
    setAddingRow(null);
  };

  const deleteRow = async (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, id: string) => {
    setter(prev => prev.filter(r => r.id !== id));
    await supabase.from('afm_finance_data').delete()
      .eq('tab_key', 'financial_planning').eq('section', section).eq('row_id', id);
    setContextMenu(null);
    toast.success('Строка удалена');
  };

  const moveRow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, id: string, dir: 'up' | 'down') => {
    setter(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setContextMenu(null);
  };

  const insertRowAbove = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, rowIdx: number) => {
    const id = `custom_${Date.now()}`;
    setter(prev => {
      const next = [...prev];
      next.splice(rowIdx, 0, { id, label: 'Новая строка' });
      return next;
    });
    setData(prev => ({ ...prev, [id]: Array(NM).fill('') }));
    saveCell(section, id, 'Новая строка', '0', 0);
    setContextMenu(null);
    toast.success('Строка добавлена выше');
  };

  const insertRowBelow = (setter: React.Dispatch<React.SetStateAction<FinRow[]>>, section: string, rowIdx: number) => {
    const id = `custom_${Date.now()}`;
    setter(prev => {
      const next = [...prev];
      next.splice(rowIdx + 1, 0, { id, label: 'Новая строка' });
      return next;
    });
    setData(prev => ({ ...prev, [id]: Array(NM).fill('') }));
    saveCell(section, id, 'Новая строка', '0', 0);
    setContextMenu(null);
    toast.success('Строка добавлена ниже');
  };

  const saveLabel = async (rowId: string, section: string, newLabel: string) => {
    const setterMap: Record<string, React.Dispatch<React.SetStateAction<FinRow[]>>> = {
      revenue: setRevRows, salary: setSalaryRows, expenses: setExpenseRows,
    };
    const setter = setterMap[section];
    if (setter) {
      setter(prev => prev.map(r => r.id === rowId ? { ...r, label: newLabel } : r));
    }
    await supabase.from('afm_finance_data')
      .update({ row_label: newLabel })
      .eq('tab_key', 'financial_planning').eq('section', section).eq('row_id', rowId);
    setEditingLabel(null);
    toast.success('Название обновлено');
  };

  // Formula bar edit commit
  const commitFormulaBar = () => {
    if (!activeCell || activeCell.isLabel) return;
    const { rowKey, colIdx } = activeCell;
    // rowKey format: `${row.id}_${mi}` for editable cells
    const parts = rowKey.split('_');
    const mi = parseInt(parts[parts.length - 1]);
    if (!isNaN(mi) && mi >= 0 && mi < NM) {
      // Find which section
      const rowId = parts.slice(0, -1).join('_');
      const revRow = revRows.find(r => r.id === rowId);
      const salRow = salaryRows.find(r => r.id === rowId);
      const expRow = expenseRows.find(r => r.id === rowId);
      const section = revRow ? 'revenue' : salRow ? 'salary' : expRow ? 'expenses' : null;
      if (section) {
        const row = revRow || salRow || expRow!;
        setCell(section, rowId, row.label, mi, formulaBarValue);
        const ref = inputRefs.current[`${rowId}_${mi}`];
        if (ref) ref.value = formulaBarValue;
      }
    }
  };

  // Keyboard navigation
  const navigateCell = (rowKey: string, colIdx: number, dir: 'up' | 'down' | 'left' | 'right' | 'tab') => {
    // We'll use the inputRefs to find adjacent cells
    const keys = Object.keys(inputRefs.current);
    // ... simplified: just blur current and let user click
  };

  let globalRowNum = 1;

  // Inline editable cell
  function SheetCell({
    value, onChange, rowId, rowLabel, mi, rowIdx, section,
  }: {
    value: string; onChange: (v: string) => void;
    rowId: string; rowLabel: string; mi: number; rowIdx: number; section: string;
  }) {
    const key = `${rowId}_${mi}`;
    const inputRef = useRef<HTMLInputElement>(null);
    const isActive = activeCell?.rowKey === key && activeCell?.colIdx === mi;

    useEffect(() => {
      inputRefs.current[key] = inputRef.current;
      return () => { delete inputRefs.current[key]; };
    }, [key]);

    useEffect(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.value = value;
      }
    }, [value]);

    const handleFocus = () => {
      setActiveCell({ rowKey: key, rowIdx, colIdx: mi, label: rowLabel, formula: value });
      setFormulaBarValue(value);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setFormulaBarValue(e.target.value);
      if (activeCell?.rowKey === key) {
        setActiveCell(ac => ac ? { ...ac, formula: e.target.value } : ac);
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextKey = `${inputRefs.current[`next_${rowId}_${mi}`] || ''}`;
        inputRef.current?.blur();
      }
      if (e.key === 'Escape') inputRef.current?.blur();
      if (e.key === 'Tab') {
        e.preventDefault();
        // Move to next column
        const nextMi = e.shiftKey ? mi - 1 : mi + 1;
        if (nextMi >= 0 && nextMi < NM) {
          const nextRef = inputRefs.current[`${rowId}_${nextMi}`];
          if (nextRef) { nextRef.focus(); nextRef.select(); }
        }
      }
    };

    return (
      <td
        className={`border-r border-b border-border/30 p-0 relative h-[22px] cursor-cell
          ${isActive ? 'ring-2 ring-inset ring-blue-500 z-20 bg-blue-500/5' : 'hover:bg-muted/20'}`}
        onClick={() => { setActiveCell({ rowKey: key, rowIdx, colIdx: mi, label: rowLabel, formula: value }); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          defaultValue={value}
          type="text"
          inputMode="numeric"
          className="absolute inset-0 w-full h-full bg-transparent text-right text-[11px] px-1.5 text-foreground focus:outline-none font-mono"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => {}}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  // Computed cell (formula-driven, double-click to override)
  function FormulaCell({ value, rowId, mi, rowIdx, formulaText, textClass = '' }: {
    value: number; rowId: string; mi: number; rowIdx: number; formulaText: string; textClass?: string;
  }) {
    const key = `formula_${rowId}_${mi}`;
    const isActive = activeCell?.rowKey === key && activeCell?.colIdx === mi;
    return (
      <td
        className={`border-r border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 cursor-default select-none font-mono
          ${textClass} ${isActive ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/5 z-20' : 'hover:bg-muted/20'}`}
        onClick={() => {
          setActiveCell({ rowKey: key, rowIdx, colIdx: mi, label: '', formula: formulaText });
          setFormulaBarValue(formulaText);
        }}
        onDoubleClick={() => {
          // Enable manual override
          const k = `${rowId}_${mi}`;
          setOverrides(p => ({ ...p, [k]: true }));
          setData(prev => {
            const arr = [...(prev[rowId] ?? Array(NM).fill(''))];
            arr[mi] = String(value);
            return { ...prev, [rowId]: arr };
          });
        }}
        title="Двойной клик — ручной ввод"
      >
        {value ? fmtFin(value) : ''}
      </td>
    );
  }

  // Override cell (manual override on formula cell)
  function OverrideCell({ rowId, mi, rowIdx, textClass = '' }: {
    rowId: string; mi: number; rowIdx: number; textClass?: string;
  }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const key = `override_${rowId}_${mi}`;
    const isActive = activeCell?.rowKey === key;
    const curVal = data[rowId]?.[mi] ?? '';

    useEffect(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.value = curVal;
      }
    }, [curVal]);

    return (
      <td className={`border-r border-b border-border/30 p-0 relative h-[22px] bg-amber-500/10 
        ${isActive ? 'ring-2 ring-inset ring-amber-400 z-20' : ''}`}>
        <input
          ref={inputRef}
          defaultValue={curVal}
          type="text" inputMode="numeric"
          className={`absolute inset-0 w-full h-full bg-transparent text-right text-[11px] px-1.5 focus:outline-none font-mono ${textClass || 'text-amber-300'}`}
          onFocus={() => {
            setActiveCell({ rowKey: key, rowIdx, colIdx: mi, label: rowId, formula: inputRef.current?.value || '' });
            setFormulaBarValue(inputRef.current?.value || '');
          }}
          onChange={e => {
            setData(prev => { const arr = [...(prev[rowId] ?? Array(NM).fill(''))]; arr[mi] = e.target.value; return { ...prev, [rowId]: arr }; });
            saveCell('overrides', rowId, rowId, String(mi), Number(e.target.value) || 0);
            setFormulaBarValue(e.target.value);
          }}
        />
        <button title="Сбросить к формуле" onClick={async () => {
          const k = `${rowId}_${mi}`;
          setOverrides(p => { const n = { ...p }; delete n[k]; return n; });
          await supabase.from('afm_finance_data').delete()
            .eq('tab_key', 'financial_planning').eq('section', 'overrides')
            .eq('row_id', rowId).eq('field_name', String(mi));
        }} className="absolute top-0 right-0 text-[8px] text-amber-400 opacity-0 hover:opacity-100 p-0.5 z-10 bg-amber-500/20 rounded-bl">
          <RotateCcw className="h-2 w-2" />
        </button>
      </td>
    );
  }

  // Section group header
  function GroupHeader({ title, color, totalFn, rn }: {
    title: string; color: string; totalFn: (mi: number) => number; rn: number;
  }) {
    return (
      <tr className="h-[24px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 px-0 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--muted)/0.8)' }}>{rn}</td>
        <td className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-bold text-[11px] ${color} min-w-[200px]`} style={{ background: 'hsl(var(--muted)/0.6)' }} colSpan={1}>
          {title}
        </td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi} className={`border-r border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-bold ${color} font-mono`}>
            {totalFn(mi) ? fmtFin(totalFn(mi)) : ''}
          </td>
        ))}
        <td className={`border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-bold ${color} font-mono`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + totalFn(mi), 0))}
        </td>
      </tr>
    );
  }

  // Editable row with context menu
  function EditableRow({
    row, section, rn, rowIdx,
    setter, rows: allRows, onDelete,
  }: {
    row: FinRow; section: string; rn: number; rowIdx: number;
    setter: React.Dispatch<React.SetStateAction<FinRow[]>>;
    rows: FinRow[];
    onDelete?: () => void;
  }) {
    const isEditingLabel = editingLabel?.rowId === row.id && editingLabel?.section === section;

    return (
      <tr
        className="h-[22px] group/row"
        style={{ background: 'hsl(var(--background))' }}
        onContextMenu={e => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, rowId: row.id, section, rowIdx, setter });
        }}
      >
        <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--background))' }}>
          <span className="group-hover/row:hidden">{rn}</span>
          <span className="hidden group-hover/row:flex items-center justify-center gap-0.5 h-full">
            <button onClick={() => moveRow(setter, row.id, 'up')} className="hover:text-foreground text-muted-foreground/40 transition-colors">
              <ChevronUp className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => moveRow(setter, row.id, 'down')} className="hover:text-foreground text-muted-foreground/40 transition-colors">
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </span>
        </td>
        <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-1 text-foreground/80 min-w-[200px]" style={{ background: 'hsl(var(--background))' }}>
          <div className="flex items-center gap-1 h-full w-full">
            {isEditingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={e => setLabelDraft(e.target.value)}
                onBlur={() => saveLabel(row.id, section, labelDraft || row.label)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveLabel(row.id, section, labelDraft || row.label);
                  if (e.key === 'Escape') setEditingLabel(null);
                }}
                className="flex-1 h-full bg-blue-500/10 border border-blue-500/50 rounded-none text-[11px] px-1 text-foreground focus:outline-none"
              />
            ) : (
              <span
                className={`flex-1 truncate text-[11px] ${row.bold ? 'font-bold' : ''} ${row.italic ? 'italic' : ''}`}
                onDoubleClick={() => { setEditingLabel({ rowId: row.id, section }); setLabelDraft(row.label); }}
                title="Двойной клик — редактировать"
              >
                {row.label}
              </span>
            )}
            {onDelete && !isEditingLabel && (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover/row:opacity-50 hover:!opacity-100 text-destructive transition-all shrink-0 ml-auto"
              >
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
            rowId={row.id}
            rowLabel={row.label}
            mi={mi}
            rowIdx={rowIdx}
            section={section}
          />
        ))}
        <td className="border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 text-muted-foreground font-medium font-mono">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + cell(row.id, mi), 0))}
        </td>
      </tr>
    );
  }

  // Computed row (pct-based formula, overridable)
  function ComputedRow({ label, computedFn, rowId, pct, setPct, rn, rowIdx, formulaSuffix }: {
    label: string; computedFn: (mi: number) => number; rowId: string;
    pct: string; setPct: (v: string) => void; rn: number; rowIdx: number; formulaSuffix: string;
  }) {
    return (
      <tr className="h-[22px] group/row" style={{ background: 'hsl(var(--muted)/0.1)' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] select-none" style={{ background: 'hsl(var(--muted)/0.15)' }}>{rn}</td>
        <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-1.5 text-foreground/80 min-w-[200px]" style={{ background: 'hsl(var(--muted)/0.15)' }}>
          <div className="flex items-center gap-1.5 h-full">
            <span className="flex-1 text-[11px] italic text-muted-foreground">{label}</span>
            <div className="flex items-center gap-0.5 opacity-60 group-hover/row:opacity-100">
              <input
                type="text" inputMode="numeric" value={pct}
                onChange={e => { setPct(e.target.value); savePctFn(`${rowId}_pct`, e.target.value); }}
                className="w-7 text-center bg-background border border-border/50 rounded px-0 py-0 text-[10px] focus:outline-none focus:border-primary leading-none h-4"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
            </div>
          </div>
        </td>
        {FIN_MONTHS.map((_, mi) => {
          const k = `${rowId}_${mi}`;
          return overrides[k]
            ? <OverrideCell key={mi} rowId={rowId} mi={mi} rowIdx={rowIdx} />
            : <FormulaCell key={mi} value={computedFn(mi)} rowId={rowId} mi={mi} rowIdx={rowIdx}
                formulaText={`=Выручка × ${pct}% (${formulaSuffix})`} textClass="text-foreground/70" />;
        })}
        <td className="border-b border-border/30 h-[22px] text-right text-[11px] px-1.5 text-muted-foreground font-mono">
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + computedFn(mi), 0))}
        </td>
      </tr>
    );
  }

  // Summary / total row
  function SummaryRow({ label, valueFn, rn, rowIdx, textClass = '', formulaText = '' }: {
    label: string; valueFn: (mi: number) => number; rn: number; rowIdx: number;
    textClass?: string; formulaText?: string;
  }) {
    const key = `sum_${label}`;
    return (
      <tr className="h-[24px]" style={{ background: 'hsl(var(--muted)/0.25)' }}>
        <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px]" style={{ background: 'hsl(var(--muted)/0.35)' }}>{rn}</td>
        <td className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-semibold text-[11px] ${textClass} min-w-[200px]`} style={{ background: 'hsl(var(--muted)/0.25)' }}>{label}</td>
        {FIN_MONTHS.map((_, mi) => (
          <td key={mi}
            onClick={() => { setActiveCell({ rowKey: `${key}_${mi}`, rowIdx, colIdx: mi, label, formula: formulaText }); setFormulaBarValue(formulaText); }}
            className={`border-r border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-semibold cursor-default ${textClass} hover:bg-muted/20 font-mono`}
          >
            {valueFn(mi) ? fmtFin(valueFn(mi)) : ''}
          </td>
        ))}
        <td className={`border-b border-border/30 h-[24px] text-right text-[11px] px-1.5 font-bold ${textClass} font-mono`}>
          {fmtFin(FIN_MONTHS.reduce((s, _, mi) => s + valueFn(mi), 0))}
        </td>
      </tr>
    );
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  // Build the full row list
  let rn = 1;

  // Context menu for rows
  const CtxMenu = contextMenu && (
    <div
      className="fixed z-50 bg-card border border-border/60 rounded-lg shadow-xl py-1 min-w-[180px] text-[12px]"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => insertRowAbove(contextMenu.setter, contextMenu.section, contextMenu.rowIdx)}
        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex items-center gap-2">
        <Plus className="h-3 w-3 text-muted-foreground" /> Вставить строку выше
      </button>
      <button onClick={() => insertRowBelow(contextMenu.setter, contextMenu.section, contextMenu.rowIdx)}
        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex items-center gap-2">
        <Plus className="h-3 w-3 text-muted-foreground" /> Вставить строку ниже
      </button>
      <button onClick={() => moveRow(contextMenu.setter, contextMenu.rowId, 'up')}
        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex items-center gap-2">
        <ChevronUp className="h-3 w-3 text-muted-foreground" /> Переместить вверх
      </button>
      <button onClick={() => moveRow(contextMenu.setter, contextMenu.rowId, 'down')}
        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex items-center gap-2">
        <ChevronDown className="h-3 w-3 text-muted-foreground" /> Переместить вниз
      </button>
      <div className="border-t border-border/40 my-1" />
      <button onClick={() => deleteRow(contextMenu.setter, contextMenu.section, contextMenu.rowId)}
        className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-destructive flex items-center gap-2">
        <Trash2 className="h-3 w-3" /> Удалить строку
      </button>
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 h-full flex flex-col">
      {CtxMenu}

      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Финансовое планирование
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Двойной клик на название — редактировать · ПКМ на строке — меню</p>
        </div>
        {saving && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Сохранение...</div>}
      </motion.div>

      {/* Google Sheets sync */}
      <motion.div variants={item}>
        <FinanceSheetSync tabKey="financial_planning" onSyncComplete={() => window.location.reload()} />
      </motion.div>

      {/* Google Sheets toolbar */}
      <motion.div variants={item} className="flex items-stretch border border-border/50 rounded-lg overflow-hidden select-none" style={{ background: 'hsl(var(--muted)/0.3)' }}>
        {/* Cell reference box */}
        <div className="flex items-center justify-center border-r border-border/40 px-2 min-w-[64px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
          <span className="text-[11px] font-mono text-muted-foreground">
            {activeCell ? getCellRef(activeCell.rowIdx, activeCell.colIdx) : 'A1'}
          </span>
        </div>
        {/* Divider */}
        <div className="w-px bg-border/40" />
        {/* Formula bar */}
        <div className="flex items-center gap-1.5 flex-1 px-2 py-1">
          <span className="text-[11px] text-muted-foreground font-mono italic select-none">fx</span>
          <input
            ref={formulaBarRef}
            value={formulaBarValue}
            onChange={e => {
              setFormulaBarValue(e.target.value);
              if (activeCell) setActiveCell(ac => ac ? { ...ac, formula: e.target.value } : ac);
            }}
            onKeyDown={e => { if (e.key === 'Enter') commitFormulaBar(); if (e.key === 'Escape') setFormulaBarValue(activeCell?.formula || ''); }}
            placeholder={activeCell ? '' : 'Выберите ячейку'}
            className="flex-1 bg-transparent text-[11px] font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </motion.div>

      {/* Hint about overrides */}
      <div className="flex gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/40" /> Ячейка с ручным вводом (ДКМ — сброс)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500/20 border border-blue-500/40" /> Активная ячейка</span>
        <span>ДКМ на формульной ячейке — ручной ввод</span>
      </div>

      {/* Spreadsheet */}
      <motion.div variants={item} className="flex-1 overflow-auto rounded-lg border border-border/50" style={{ maxHeight: 'calc(100vh - 310px)' }}>
        <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${30 + 200 + NM * 80 + 90}px` }}>
          <colgroup>
            <col style={{ width: '30px' }} />
            <col style={{ width: '200px' }} />
            {FIN_MONTHS.map(m => <col key={m} style={{ width: '80px' }} />)}
            <col style={{ width: '90px' }} />
          </colgroup>

          {/* Frozen column headers */}
          <thead className="sticky top-0 z-30">
            <tr className="h-[28px]" style={{ background: 'hsl(var(--muted)/0.9)' }}>
              <th className="border-r border-b border-border/60 w-[30px]" />
              <th className="sticky left-[30px] z-10 border-r border-b border-border/60 text-center text-[10px] font-medium text-muted-foreground" style={{ background: 'hsl(var(--muted)/0.9)' }}>A</th>
              {FIN_MONTHS.map((m, i) => (
                <th key={i} className="border-r border-b border-border/60 text-center text-[10px] font-medium text-muted-foreground px-1">
                  <div className="font-mono">{COL_LETTERS[i + 1]}</div>
                  <div className="text-[9px] text-muted-foreground/60 font-normal leading-none">{m.split(' ')[0]}</div>
                </th>
              ))}
              <th className="border-b border-border/60 text-center text-[10px] font-semibold text-foreground">Итого</th>
            </tr>
            {/* Sub-header */}
            <tr className="h-[20px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>
              <th className="border-r border-b border-border/40" />
              <th className="sticky left-[30px] z-10 border-r border-b border-border/40 text-left text-[10px] font-semibold text-foreground px-2" style={{ background: 'hsl(var(--muted)/0.6)' }}>Показатель</th>
              {FIN_MONTHS.map((m, i) => (
                <th key={i} className="border-r border-b border-border/40 text-center text-[10px] font-medium text-foreground/70 px-1">{m}</th>
              ))}
              <th className="border-b border-border/40 text-center text-[10px] font-medium text-foreground/70">Год</th>
            </tr>
          </thead>

          <tbody>
            {/* ── REVENUE ── */}
            {(() => { const r = rn++; return <GroupHeader key="rev" title="📈 Доходы (Revenue)" color="text-green-400" totalFn={totalRevenue} rn={r} />; })()}
            {revRows.map((row, ri) => {
              const r = rn++;
              return <EditableRow key={row.id} row={row} section="revenue" rn={r} rowIdx={ri}
                setter={setRevRows} rows={revRows}
                onDelete={() => deleteRow(setRevRows, 'revenue', row.id)} />;
            })}
            {/* Add revenue row */}
            {(() => {
              const r = rn++;
              return (
                <tr key="add-rev" className="h-[22px]" style={{ background: 'hsl(var(--background))' }}>
                  <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/40 w-[30px]" style={{ background: 'hsl(var(--background))' }}>{r}</td>
                  <td className="sticky left-[30px] z-10 border-r border-b border-border/40 min-w-[200px]" style={{ background: 'hsl(var(--background))' }} colSpan={NM + 1}>
                    {addingRow?.section === 'revenue' ? (
                      <div className="flex items-center h-full px-1 gap-1">
                        <input autoFocus value={addingRow.label}
                          onChange={e => setAddingRow({ section: 'revenue', label: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addRow(setRevRows, 'revenue', addingRow.label); if (e.key === 'Escape') setAddingRow(null); }}
                          placeholder="Название строки..." className="flex-1 h-full bg-blue-500/10 border border-blue-500/40 text-[11px] px-2 text-foreground focus:outline-none rounded-sm" />
                        <button onClick={() => addRow(setRevRows, 'revenue', addingRow.label)} className="text-[10px] text-primary px-1.5 py-0.5 bg-primary/10 rounded hover:bg-primary/20">OK</button>
                        <button onClick={() => setAddingRow(null)} className="text-[10px] text-muted-foreground px-1 py-0.5 hover:text-foreground">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingRow({ section: 'revenue', label: '' })}
                        className="flex items-center gap-1 h-full w-full px-2 text-[11px] text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Plus className="h-3 w-3" /> Добавить строку
                      </button>
                    )}
                  </td>
                </tr>
              );
            })()}

            {/* Spacer */}
            <tr className="h-[6px]"><td colSpan={NM + 3} /></tr>

            {/* ── SALARY ── */}
            {(() => { const r = rn++; return <GroupHeader key="sal" title="👥 Зарплаты (Salary)" color="text-blue-400" totalFn={totalSalary} rn={r} />; })()}
            {salaryRows.map((row, ri) => {
              const r = rn++;
              return <EditableRow key={row.id} row={row} section="salary" rn={r} rowIdx={ri}
                setter={setSalaryRows} rows={salaryRows}
                onDelete={() => deleteRow(setSalaryRows, 'salary', row.id)} />;
            })}
            {(() => {
              const r = rn++;
              return (
                <tr key="add-sal" className="h-[22px]" style={{ background: 'hsl(var(--background))' }}>
                  <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/40 w-[30px]" style={{ background: 'hsl(var(--background))' }}>{r}</td>
                  <td className="sticky left-[30px] z-10 border-r border-b border-border/40 min-w-[200px]" style={{ background: 'hsl(var(--background))' }} colSpan={NM + 1}>
                    {addingRow?.section === 'salary' ? (
                      <div className="flex items-center h-full px-1 gap-1">
                        <input autoFocus value={addingRow.label}
                          onChange={e => setAddingRow({ section: 'salary', label: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addRow(setSalaryRows, 'salary', addingRow.label); if (e.key === 'Escape') setAddingRow(null); }}
                          placeholder="Название строки..." className="flex-1 h-full bg-blue-500/10 border border-blue-500/40 text-[11px] px-2 text-foreground focus:outline-none rounded-sm" />
                        <button onClick={() => addRow(setSalaryRows, 'salary', addingRow.label)} className="text-[10px] text-primary px-1.5 py-0.5 bg-primary/10 rounded hover:bg-primary/20">OK</button>
                        <button onClick={() => setAddingRow(null)} className="text-[10px] text-muted-foreground px-1 py-0.5 hover:text-foreground">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingRow({ section: 'salary', label: '' })}
                        className="flex items-center gap-1 h-full w-full px-2 text-[11px] text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Plus className="h-3 w-3" /> Добавить строку
                      </button>
                    )}
                  </td>
                </tr>
              );
            })()}

            {/* Spacer */}
            <tr className="h-[6px]"><td colSpan={NM + 3} /></tr>

            {/* ── EXPENSES ── */}
            {(() => { const r = rn++; return <GroupHeader key="exp" title="💸 Расходы (Expenses)" color="text-red-400" totalFn={totalExpenses} rn={r} />; })()}
            {expenseRows.map((row, ri) => {
              const r = rn++;
              return <EditableRow key={row.id} row={row} section="expenses" rn={r} rowIdx={ri}
                setter={setExpenseRows} rows={expenseRows}
                onDelete={() => deleteRow(setExpenseRows, 'expenses', row.id)} />;
            })}
            {(() => {
              const r = rn++;
              return (
                <tr key="add-exp" className="h-[22px]" style={{ background: 'hsl(var(--background))' }}>
                  <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/40 w-[30px]" style={{ background: 'hsl(var(--background))' }}>{r}</td>
                  <td className="sticky left-[30px] z-10 border-r border-b border-border/40 min-w-[200px]" style={{ background: 'hsl(var(--background))' }} colSpan={NM + 1}>
                    {addingRow?.section === 'expenses' ? (
                      <div className="flex items-center h-full px-1 gap-1">
                        <input autoFocus value={addingRow.label}
                          onChange={e => setAddingRow({ section: 'expenses', label: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addRow(setExpenseRows, 'expenses', addingRow.label); if (e.key === 'Escape') setAddingRow(null); }}
                          placeholder="Название строки..." className="flex-1 h-full bg-blue-500/10 border border-blue-500/40 text-[11px] px-2 text-foreground focus:outline-none rounded-sm" />
                        <button onClick={() => addRow(setExpenseRows, 'expenses', addingRow.label)} className="text-[10px] text-primary px-1.5 py-0.5 bg-primary/10 rounded hover:bg-primary/20">OK</button>
                        <button onClick={() => setAddingRow(null)} className="text-[10px] text-muted-foreground px-1 py-0.5 hover:text-foreground">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingRow({ section: 'expenses', label: '' })}
                        className="flex items-center gap-1 h-full w-full px-2 text-[11px] text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Plus className="h-3 w-3" /> Добавить строку
                      </button>
                    )}
                  </td>
                </tr>
              );
            })()}

            {/* Spacer */}
            <tr className="h-[6px]"><td colSpan={NM + 3} /></tr>

            {/* ── SUMMARIES ── */}
            {(() => { const r = rn++; return <SummaryRow key="left" label="💰 Остаток (Left)" valueFn={leftAmount} rn={r} rowIdx={r} textClass="text-foreground" formulaText="=Доходы − Зарплаты − Расходы" />; })()}

            {/* Spacer */}
            <tr className="h-[6px]"><td colSpan={NM + 3} /></tr>

            {/* ── FUNDS ── */}
            {(() => { const r = rn++; return <GroupHeader key="funds" title="🏦 Фонды (Funds)" color="text-purple-400" totalFn={totalFunds} rn={r} />; })()}
            {(() => { const r = rn++; return <ComputedRow key="tax" label="Налоги" computedFn={taxAmt} rowId="taxes_10" pct={taxPct} setPct={setTaxPct} rn={r} rowIdx={r} formulaSuffix="tax" />; })()}
            {(() => { const r = rn++; return <ComputedRow key="sav" label="Сбережения" computedFn={savAmt} rowId="savings_15" pct={savPct} setPct={setSavPct} rn={r} rowIdx={r} formulaSuffix="savings" />; })()}
            {(() => { const r = rn++; return <ComputedRow key="mkt" label="Маркетинг" computedFn={mktAmt} rowId="marketing_20" pct={mktPct} setPct={setMktPct} rn={r} rowIdx={r} formulaSuffix="marketing" />; })()}
            {(() => { const r = rn++; return <SummaryRow key="divbase" label="База дивидендов" valueFn={dividendBase} rn={r} rowIdx={r} textClass="text-foreground/80" formulaText="=Остаток − Итого фондов" />; })()}

            {/* Spacer */}
            <tr className="h-[6px]"><td colSpan={NM + 3} /></tr>

            {/* ── DIVIDENDS ── */}
            {(() => { const r = rn++; return <GroupHeader key="divs" title="💎 Дивиденды (Dividends)" color="text-amber-400" totalFn={totalDivs} rn={r} />; })()}
            {(() => { const r = rn++; return <ComputedRow key="denis" label="Denis" computedFn={denisAmt} rowId="denis_40" pct={denisPct} setPct={setDenisPct} rn={r} rowIdx={r} formulaSuffix="Denis" />; })()}
            {(() => { const r = rn++; return <ComputedRow key="danil" label="Danil" computedFn={danilAmt} rowId="danil_40" pct={danilPct} setPct={setDanilPct} rn={r} rowIdx={r} formulaSuffix="Danil" />; })()}
            {(() => { const r = rn++; return <ComputedRow key="vlad" label="Vladimir" computedFn={vladAmt} rowId="vladimir_20" pct={vladPct} setPct={setVladPct} rn={r} rowIdx={r} formulaSuffix="Vladimir" />; })()}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
