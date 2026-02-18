import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function fmt$(n: number) {
  if (n === 0) return '$0';
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtN(n: number) { return String(n); }

export default function AfmIncomePlan() {
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          План по доходу на год
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Прогноз новых клиентов, выручки и рентабельности</p>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
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
          {/* KPI summary */}
          <div className="ml-auto flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Выручка за год</p>
              <p className="text-sm font-bold text-primary font-mono">{fmt$(totRev)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Чистая прибыль</p>
              <p className="text-sm font-bold text-green-400 font-mono">{fmt$(totNet)}</p>
            </div>
            {saving && <div className="flex items-center gap-1 text-xs text-muted-foreground self-end"><Loader2 className="h-3 w-3 animate-spin" />Сохраняю...</div>}
          </div>
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
      </motion.div>
    </motion.div>
  );
}
