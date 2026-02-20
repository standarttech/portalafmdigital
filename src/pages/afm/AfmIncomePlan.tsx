import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Plus, Loader2, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const NM = MONTHS.length;
const COL_LETTERS = ['A', ...MONTHS.map((_, i) => String.fromCharCode(66 + i)), String.fromCharCode(66 + NM)];

function fmt$(n: number) {
  if (n === 0) return '';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtN(n: number) { return n === 0 ? '' : String(n); }

interface ActiveCell { rowKey: string; rowIdx: number; colIdx: number; rowLabel: string; formula: string; isEditable?: boolean; }

export default function AfmIncomePlan() {
  const [newClients, setNewClients] = useState<string[]>(Array(NM).fill(''));
  const [renewals, setRenewals] = useState<string[]>(Array(NM).fill(''));
  const [avgCheck, setAvgCheck] = useState('3500');
  const [teamPct, setTeamPct] = useState('30');
  const [marketingPct, setMarketingPct] = useState('20');
  const [expensesPct, setExpensesPct] = useState('10');
  const [taxPct, setTaxPct] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const updateArr = (setter: React.Dispatch<React.SetStateAction<string[]>>, rowId: string, idx: number, val: string) => {
    setter(prev => { const a = [...prev]; a[idx] = val; return a; });
    saveCell(rowId, String(idx), Number(val) || 0);
  };

  const totRev = MONTHS.reduce((s, _, i) => s + rev(i), 0);
  const totNet = MONTHS.reduce((s, _, i) => s + net(i), 0);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  // Row definitions
  type RowDef = {
    key: string;
    label: string;
    isCount?: boolean;
    editable?: 'new' | 'ren';
    style?: string;
    pctKey?: string;
    pctVal?: string;
    setPct?: ((v: string) => void) | null;
    formula: string;
    valueFn: (i: number) => number;
  };

  const rows: RowDef[] = [
    { key: 'newClients', label: 'Новый клиент', isCount: true, editable: 'new', formula: 'Ввод вручную', valueFn: i => n(newClients, i), style: '' },
    { key: 'renewals', label: 'Продление', isCount: true, editable: 'ren', formula: 'Ввод вручную', valueFn: i => n(renewals, i), style: '' },
    { key: 'refusals', label: 'Отказы (−20%)', isCount: true, formula: '=−(Новый + Продление) × 20%', valueFn: refusals, style: 'muted' },
    { key: 'totalClients', label: 'Итого клиентов', isCount: true, formula: '=Новый + Продление + Отказы', valueFn: totalClients, style: 'sub' },
    { key: 'rev', label: 'Общая выручка', formula: '=(Новый + Продление) × Средний чек', valueFn: rev, style: 'total' },
    { key: 'team', label: 'Команда', formula: `=Выручка × ${teamPct}%`, valueFn: teamCost, style: 'neg', pctKey: 'teamPct', pctVal: teamPct, setPct: setTeamPct },
    { key: 'marketing', label: 'Маркетинг', formula: `=Выручка × ${marketingPct}%`, valueFn: mktCost, style: 'neg', pctKey: 'marketingPct', pctVal: marketingPct, setPct: setMarketingPct },
    { key: 'expenses', label: 'Расходы', formula: `=Выручка × ${expensesPct}%`, valueFn: expCost, style: 'neg', pctKey: 'expensesPct', pctVal: expensesPct, setPct: setExpensesPct },
    { key: 'margin', label: 'Маржа', formula: '=Выручка + Команда + Маркетинг + Расходы', valueFn: margin, style: 'margin' },
    { key: 'tax', label: 'Налог', formula: `=Маржа × ${taxPct}%`, valueFn: tax, style: 'neg', pctKey: 'taxPct', pctVal: taxPct, setPct: setTaxPct },
    { key: 'net', label: 'Чистая прибыль', formula: '=Маржа − Налог', valueFn: net, style: 'total' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 h-full flex flex-col">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            План по доходу на год
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Прогноз новых клиентов, выручки и рентабельности</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Средний чек ($)</label>
            <input
              type="text" inputMode="numeric" value={avgCheck}
              onChange={e => { setAvgCheck(e.target.value); saveCell('settings', 'avgCheck', Number(e.target.value) || 0); }}
              className="w-28 text-center bg-background border border-primary/40 rounded px-2 py-1 text-sm text-primary font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Выручка за год</p>
            <p className="text-sm font-bold text-primary font-mono">{fmt$(totRev) || '$0'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Чистая прибыль</p>
            <p className="text-sm font-bold text-green-400 font-mono">{fmt$(totNet) || '$0'}</p>
          </div>
          {saving && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Сохранение...</div>}
        </div>
      </motion.div>

      {/* Formula bar */}
      <motion.div variants={item} className="flex items-stretch border border-border/50 rounded-lg overflow-hidden" style={{ background: 'hsl(var(--muted)/0.3)' }}>
        <div className="flex items-center justify-center border-r border-border/40 px-2 min-w-[64px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
          <span className="text-[11px] font-mono text-muted-foreground">
            {activeCell ? `${COL_LETTERS[(activeCell.colIdx ?? 0) + 1]}${activeCell.rowIdx + 2}` : 'A1'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 px-2 py-1">
          <span className="text-[11px] text-muted-foreground italic select-none">fx</span>
          <input
            value={formulaBarValue}
            onChange={e => setFormulaBarValue(e.target.value)}
        readOnly={!activeCell?.isEditable}
        placeholder={activeCell ? '' : 'Выберите ячейку'}
            className="flex-1 bg-transparent text-[11px] font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </motion.div>

      {/* Spreadsheet */}
      <motion.div variants={item} className="flex-1 overflow-auto rounded-lg border border-border/50" style={{ maxHeight: 'calc(100vh - 340px)' }}>
        <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${30 + 200 + NM * 80 + 90}px` }}>
          <colgroup>
            <col style={{ width: '30px' }} />
            <col style={{ width: '200px' }} />
            {MONTHS.map(m => <col key={m} style={{ width: '80px' }} />)}
            <col style={{ width: '90px' }} />
          </colgroup>

          <thead className="sticky top-0 z-30">
            <tr className="h-[28px]" style={{ background: 'hsl(var(--muted)/0.9)' }}>
              <th className="border-r border-b border-border/60 w-[30px]" />
              <th className="sticky left-[30px] z-10 border-r border-b border-border/60 text-center text-[10px] font-medium text-muted-foreground" style={{ background: 'hsl(var(--muted)/0.9)' }}>A</th>
              {MONTHS.map((m, i) => (
                <th key={i} className="border-r border-b border-border/60 text-center text-[10px] font-medium text-muted-foreground px-1">
                  <div className="font-mono">{COL_LETTERS[i + 1]}</div>
                  <div className="text-[9px] text-muted-foreground/60 font-normal">{m}</div>
                </th>
              ))}
              <th className="border-b border-border/60 text-center text-[10px] font-semibold text-foreground">Итого</th>
            </tr>
            <tr className="h-[20px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>
              <th className="border-r border-b border-border/40" />
              <th className="sticky left-[30px] z-10 border-r border-b border-border/40 text-left text-[10px] font-semibold text-foreground px-2" style={{ background: 'hsl(var(--muted)/0.6)' }}>Показатель</th>
              {MONTHS.map((m, i) => (
                <th key={i} className="border-r border-b border-border/40 text-center text-[10px] font-medium text-foreground/70 px-1">{m} 2026</th>
              ))}
              <th className="border-b border-border/40 text-center text-[10px] font-medium text-foreground/70">Год</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, ri) => {
              const rn = ri + 2;
              const isTotal = row.style === 'total';
              const isMargin = row.style === 'margin';
              const isNeg = row.style === 'neg';
              const isSub = row.style === 'sub';
              const isMuted = row.style === 'muted';
              const textClass = isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg ? 'text-red-400/80' : isMuted ? 'text-muted-foreground' : 'text-foreground';
              const rowBg = isTotal ? 'bg-primary/8' : isMargin ? 'bg-green-500/8' : isSub ? 'bg-muted/20' : '';
              const total = MONTHS.reduce((s, _, i) => s + row.valueFn(i), 0);

              return (
                <tr key={row.key} className={`h-[22px] group/row ${rowBg}`}>
                  <td
                    className={`sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] ${rowBg}`}
                    style={!rowBg ? { background: 'hsl(var(--background))' } : {}}
                  >{rn}</td>
                  <td
                    className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-1.5 min-w-[200px] ${rowBg}`}
                    style={!rowBg ? { background: 'hsl(var(--background))' } : {}}
                  >
                    <div className="flex items-center gap-1.5 h-full">
                      <span
                        onClick={() => { setActiveCell({ rowKey: `label_${row.key}`, rowIdx: ri, colIdx: -1, rowLabel: row.label, formula: row.formula }); setFormulaBarValue(row.formula); }}
                        className={`flex-1 text-[11px] ${textClass} ${isTotal || isMargin ? 'font-semibold' : ''}`}
                      >{row.label}</span>
                      {row.setPct && (
                        <div className="flex items-center gap-0.5 opacity-50 group-hover/row:opacity-100 shrink-0">
                          <input
                            type="text" inputMode="numeric" value={row.pctVal}
                            onChange={e => {
                              row.setPct!(e.target.value);
                              saveCell('settings', row.pctKey!, Number(e.target.value) || 0);
                            }}
                            className="w-7 text-center bg-background border border-border/50 rounded px-0 py-0 text-[10px] focus:outline-none focus:border-primary leading-none h-4"
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {MONTHS.map((_, i) => {
                    const cellKey = `${row.key}_${i}`;
                    const isAct = activeCell?.rowKey === cellKey;

                    if (row.editable === 'new') {
                      const inputRef = useRef<HTMLInputElement>(null);
                      // NOTE: hooks inside map - using key-based input refs instead
                      return (
                        <td key={i}
                          className={`border-r border-b border-border/30 p-0 relative h-[22px] cursor-cell ${isAct ? 'ring-2 ring-inset ring-blue-500 z-20 bg-blue-500/5' : 'hover:bg-muted/20'}`}
                          onClick={() => { setActiveCell({ rowKey: cellKey, rowIdx: ri, colIdx: i, rowLabel: row.label, formula: 'Ввод вручную' }); setFormulaBarValue(newClients[i]); (document.getElementById(cellKey) as HTMLInputElement)?.focus(); }}
                        >
                          <input
                            id={cellKey}
                            defaultValue={newClients[i]}
                            type="text" inputMode="numeric"
                            className="absolute inset-0 w-full h-full bg-transparent text-center text-[11px] px-1.5 text-foreground focus:outline-none font-mono"
                            onChange={e => { updateArr(setNewClients, 'newClients', i, e.target.value); setFormulaBarValue(e.target.value); }}
                            onFocus={() => { setActiveCell({ rowKey: cellKey, rowIdx: ri, colIdx: i, rowLabel: row.label, formula: 'Ввод вручную' }); setFormulaBarValue(newClients[i]); }}
                            onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); (document.getElementById(`${row.key}_${e.shiftKey ? i - 1 : i + 1}`) as HTMLInputElement)?.focus(); } }}
                          />
                        </td>
                      );
                    }
                    if (row.editable === 'ren') {
                      return (
                        <td key={i}
                          className={`border-r border-b border-border/30 p-0 relative h-[22px] cursor-cell ${isAct ? 'ring-2 ring-inset ring-blue-500 z-20 bg-blue-500/5' : 'hover:bg-muted/20'}`}
                          onClick={() => { setActiveCell({ rowKey: cellKey, rowIdx: ri, colIdx: i, rowLabel: row.label, formula: 'Ввод вручную' }); setFormulaBarValue(renewals[i]); (document.getElementById(cellKey) as HTMLInputElement)?.focus(); }}
                        >
                          <input
                            id={cellKey}
                            defaultValue={renewals[i]}
                            type="text" inputMode="numeric"
                            className="absolute inset-0 w-full h-full bg-transparent text-center text-[11px] px-1.5 text-foreground focus:outline-none font-mono"
                            onChange={e => { updateArr(setRenewals, 'renewals', i, e.target.value); setFormulaBarValue(e.target.value); }}
                            onFocus={() => { setActiveCell({ rowKey: cellKey, rowIdx: ri, colIdx: i, rowLabel: row.label, formula: 'Ввод вручную' }); setFormulaBarValue(renewals[i]); }}
                            onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); (document.getElementById(`${row.key}_${e.shiftKey ? i - 1 : i + 1}`) as HTMLInputElement)?.focus(); } }}
                          />
                        </td>
                      );
                    }
                    const val = row.valueFn(i);
                    const display = row.isCount ? fmtN(val) : fmt$(val);
                    return (
                      <td key={i}
                        onClick={() => { setActiveCell({ rowKey: cellKey, rowIdx: ri, colIdx: i, rowLabel: row.label, formula: row.formula }); setFormulaBarValue(row.formula); }}
                        className={`border-r border-b border-border/20 h-[22px] ${row.isCount ? 'text-center' : 'text-right'} text-[11px] px-1.5 cursor-default select-none ${textClass} ${isTotal || isMargin ? 'font-semibold' : ''} hover:bg-muted/20 font-mono ${isAct ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/5' : ''}`}
                      >
                        {display}
                      </td>
                    );
                  })}

                  <td className={`border-b border-border/20 h-[22px] ${row.isCount ? 'text-center' : 'text-right'} text-[11px] px-1.5 font-semibold ${textClass} font-mono`}>
                    {row.isCount ? fmtN(total) : fmt$(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
