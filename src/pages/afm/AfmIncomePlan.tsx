import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface ActiveCell { colIdx: number; rowLabel: string; formula: string }

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

  const totRev = MONTHS.reduce((s, _, i) => s + rev(i), 0);
  const totNet = MONTHS.reduce((s, _, i) => s + net(i), 0);

  // Inline editable cell
  function EditableCell({
    value, onChange, colIdx, rowLabel, formulaText, isCount = false
  }: {
    value: string; onChange: (v: string) => void;
    colIdx: number; rowLabel: string; formulaText: string; isCount?: boolean;
  }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isActive = activeCell?.colIdx === colIdx && activeCell?.rowLabel === rowLabel;

    useEffect(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.value = value;
      }
    }, [value]);

    return (
      <td
        className={`border-r border-b border-border/30 p-0 relative h-[22px] ${isActive ? 'ring-2 ring-inset ring-blue-500 z-20' : 'hover:bg-muted/20'}`}
        onClick={() => {
          setActiveCell({ colIdx, rowLabel, formula: value });
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          defaultValue={value}
          type="text"
          inputMode="numeric"
          className={`absolute inset-0 w-full h-full bg-transparent ${isCount ? 'text-center' : 'text-right'} text-[11px] px-1.5 text-foreground focus:outline-none`}
          onChange={e => {
            onChange(e.target.value);
            if (isActive) setActiveCell(ac => ac ? { ...ac, formula: e.target.value } : ac);
          }}
          onFocus={() => setActiveCell({ colIdx, rowLabel, formula: value })}
          onBlur={() => setActiveCell(null)}
        />
      </td>
    );
  }

  type RowDef = {
    label: string;
    cells: (i: number) => number;
    editable?: 'new' | 'ren';
    style?: string;
    pctKey?: string;
    pctVal?: string;
    setPct?: ((v: string) => void) | null;
    formula?: string;
    isCount?: boolean;
  };

  const rows: RowDef[] = [
    { label: 'Новый клиент', cells: i => n(newClients, i), editable: 'new', isCount: true, formula: 'Ввод вручную' },
    { label: 'Продление', cells: i => n(renewals, i), editable: 'ren', isCount: true, formula: 'Ввод вручную' },
    { label: 'Отказы (−20%)', cells: refusals, style: 'muted', isCount: true, formula: '=−(Новый + Продление) × 20%' },
    { label: 'Итого клиентов', cells: totalClients, style: 'sub', isCount: true, formula: '=Новый + Продление + Отказы' },
    { label: 'Общая выручка', cells: rev, style: 'total', formula: '=(Новый + Продление) × Средний чек' },
    { label: 'Команда', cells: teamCost, style: 'neg', pctKey: 'teamPct', pctVal: teamPct, setPct: setTeamPct, formula: `=Выручка × ${teamPct}%` },
    { label: 'Маркетинг', cells: mktCost, style: 'neg', pctKey: 'marketingPct', pctVal: marketingPct, setPct: setMarketingPct, formula: `=Выручка × ${marketingPct}%` },
    { label: 'Расходы', cells: expCost, style: 'neg', pctKey: 'expensesPct', pctVal: expensesPct, setPct: setExpensesPct, formula: `=Выручка × ${expensesPct}%` },
    { label: 'Маржа', cells: margin, style: 'margin', formula: '=Выручка + Команда + Маркетинг + Расходы' },
    { label: 'Налог', cells: tax, style: 'neg', pctKey: 'taxPct', pctVal: taxPct, setPct: setTaxPct, formula: `=Маржа × ${taxPct}%` },
    { label: 'Чистая прибыль', cells: net, style: 'total', formula: '=Маржа − Налог' },
  ];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          План по доходу на год
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Прогноз новых клиентов, выручки и рентабельности</p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {/* Settings bar */}
        <div className="flex flex-wrap gap-4 items-end px-1">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Средний чек ($)</label>
            <input
              type="text" inputMode="numeric" value={avgCheck}
              onChange={e => { setAvgCheck(e.target.value); saveCell('settings', 'avgCheck', Number(e.target.value) || 0); }}
              className="w-28 text-center bg-background border border-primary/40 rounded px-2 py-1 text-sm text-primary font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div className="ml-auto flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Выручка за год</p>
              <p className="text-sm font-bold text-primary font-mono">{fmt$(totRev) || '$0'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Чистая прибыль</p>
              <p className="text-sm font-bold text-green-400 font-mono">{fmt$(totNet) || '$0'}</p>
            </div>
            {saving && <div className="flex items-center gap-1 text-[11px] text-muted-foreground self-end"><Loader2 className="h-3 w-3 animate-spin" />Сохраняю...</div>}
          </div>
        </div>

        {/* Google Sheets toolbar */}
        <div className="flex items-stretch border border-border/50 rounded-t-lg overflow-hidden" style={{ background: 'hsl(var(--muted)/0.3)' }}>
          <div className="flex items-center justify-center border-r border-border/40 px-2 min-w-[60px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeCell ? `${COL_LETTERS[(activeCell.colIdx ?? 0) + 1]}` : 'A1'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 px-2 py-1">
            <span className="text-[11px] text-muted-foreground italic">fx</span>
            <span className="text-[11px] font-mono text-foreground">{activeCell?.formula || ''}</span>
          </div>
        </div>

        {/* The spreadsheet */}
        <div className="overflow-auto rounded-b-lg border border-t-0 border-border/50" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${30 + 200 + NM * 72 + 82}px` }}>
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '200px' }} />
              {MONTHS.map(m => <col key={m} style={{ width: '72px' }} />)}
              <col style={{ width: '82px' }} />
            </colgroup>

            {/* Column headers */}
            <thead className="sticky top-0 z-30">
              <tr className="h-[26px]" style={{ background: 'hsl(var(--muted)/0.8)' }}>
                <th className="border-r border-b border-border/50 w-[30px]" />
                <th className="sticky left-[30px] z-10 border-r border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground" style={{ background: 'hsl(var(--muted)/0.8)' }}>A</th>
                {MONTHS.map((m, i) => (
                  <th key={i} className="border-r border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground px-1">
                    <div>{COL_LETTERS[i + 1]}</div>
                    <div className="text-[9px] text-muted-foreground/60 font-normal leading-none">{m}</div>
                  </th>
                ))}
                <th className="border-b border-border/50 text-center text-[10px] font-medium text-muted-foreground">Итого</th>
              </tr>
            </thead>

            <tbody>
              {/* Header row 1 */}
              <tr className="h-[22px]" style={{ background: 'hsl(var(--muted)/0.5)' }}>
                <td className="sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px]" style={{ background: 'hsl(var(--muted)/0.6)' }}>1</td>
                <td className="sticky left-[30px] z-10 border-r border-b border-border/40 px-2 font-bold text-[11px] text-foreground" style={{ background: 'hsl(var(--muted)/0.5)' }}>Показатель</td>
                {MONTHS.map((m, i) => (
                  <td key={i} className="border-r border-b border-border/30 text-center text-[11px] font-semibold text-foreground px-1">{m}</td>
                ))}
                <td className="border-b border-border/30 text-center text-[11px] font-semibold text-foreground px-1">Итого за год</td>
              </tr>

              {rows.map((row, ri) => {
                const rn = ri + 2;
                const vals = MONTHS.map((_, i) => row.cells(i));
                const total = vals.reduce((a, b) => a + b, 0);
                const isTotal = row.style === 'total';
                const isMargin = row.style === 'margin';
                const isNeg = row.style === 'neg';
                const isSub = row.style === 'sub';
                const isMuted = row.style === 'muted';

                const rowBg = isTotal ? 'bg-primary/10' : isMargin ? 'bg-green-500/10' : isSub ? 'bg-muted/20' : '';
                const textClass = isTotal ? 'text-primary' : isMargin ? 'text-green-400' : isNeg ? 'text-destructive/80' : isMuted ? 'text-muted-foreground' : 'text-foreground';

                return (
                  <tr key={ri} className={`h-[22px] group/row ${rowBg}`}>
                    <td className={`sticky left-0 z-10 border-r border-b border-border/40 text-center text-[10px] text-muted-foreground/60 w-[30px] ${rowBg || ''}`} style={!rowBg ? { background: 'hsl(var(--background))' } : {}}>{rn}</td>
                    <td className={`sticky left-[30px] z-10 border-r border-b border-border/40 px-1.5 ${rowBg || ''}`} style={!rowBg ? { background: 'hsl(var(--background))' } : {}}>
                      <div className="flex items-center gap-1.5 h-full">
                        <span className={`flex-1 text-[11px] ${textClass} ${isTotal || isMargin ? 'font-semibold' : ''}`}>{row.label}</span>
                        {row.setPct && (
                          <div className="flex items-center gap-0.5 opacity-50 group-hover/row:opacity-100">
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

                    {vals.map((val, i) => {
                      if (row.editable === 'new') {
                        return (
                          <EditableCell
                            key={i}
                            value={newClients[i]}
                            onChange={v => updateArr(setNewClients, 'newClients', i, v)}
                            colIdx={i}
                            rowLabel={row.label}
                            formulaText="Ввод вручную"
                            isCount
                          />
                        );
                      }
                      if (row.editable === 'ren') {
                        return (
                          <EditableCell
                            key={i}
                            value={renewals[i]}
                            onChange={v => updateArr(setRenewals, 'renewals', i, v)}
                            colIdx={i}
                            rowLabel={row.label}
                            formulaText="Ввод вручную"
                            isCount
                          />
                        );
                      }
                      const display = row.isCount ? fmtN(val) : fmt$(val);
                      return (
                        <td
                          key={i}
                          onClick={() => setActiveCell({ colIdx: i, rowLabel: row.label, formula: row.formula || '' })}
                          className={`border-r border-b border-border/20 h-[22px] ${row.isCount ? 'text-center' : 'text-right'} text-[11px] px-1.5 cursor-default select-none ${textClass} ${isTotal || isMargin ? 'font-semibold' : ''} hover:bg-muted/20`}
                        >
                          {display}
                        </td>
                      );
                    })}

                    <td className={`border-b border-border/20 h-[22px] ${row.isCount ? 'text-center' : 'text-right'} text-[11px] px-1.5 font-semibold ${textClass}`}>
                      {row.isCount ? fmtN(total) : fmt$(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
