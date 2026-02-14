import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Users, TrendingUp, Loader2, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import type { TranslationKey } from '@/i18n/translations';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Client { id: string; name: string; }
interface BudgetPlan {
  id: string; client_id: string; month: string; planned_spend: number;
  planned_leads: number; planned_cpl: number | null; notes: string | null;
  actual_spend?: number; actual_leads?: number;
}

export default function BudgetPlannerPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user, agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';
  const isAgency = isAdmin || agencyRole === 'MediaBuyer';

  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formClient, setFormClient] = useState('');
  const [formSpend, setFormSpend] = useState('');
  const [formLeads, setFormLeads] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const months = useMemo(() => {
    const m = [];
    for (let i = -3; i <= 3; i++) {
      const d = i === 0 ? startOfMonth(new Date()) : i > 0 ? addMonths(startOfMonth(new Date()), i) : subMonths(startOfMonth(new Date()), Math.abs(i));
      m.push(format(d, 'yyyy-MM-01'));
    }
    return m;
  }, []);

  const fetchData = useCallback(async () => {
    const [{ data: cl }, { data: bp }] = await Promise.all([
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
      supabase.from('budget_plans').select('*').eq('month', selectedMonth),
    ]);
    setClients(cl || []);

    // Get actuals for the selected month
    const monthStart = selectedMonth;
    const monthEnd = format(addMonths(new Date(selectedMonth), 1), 'yyyy-MM-dd');
    const { data: metrics } = await supabase
      .from('daily_metrics')
      .select('client_id, spend, leads')
      .gte('date', monthStart)
      .lt('date', monthEnd);

    const actuals = new Map<string, { spend: number; leads: number }>();
    metrics?.forEach(m => {
      const prev = actuals.get(m.client_id) || { spend: 0, leads: 0 };
      actuals.set(m.client_id, { spend: prev.spend + Number(m.spend), leads: prev.leads + m.leads });
    });

    setPlans((bp || []).map(p => ({
      ...p,
      planned_spend: Number(p.planned_spend),
      planned_cpl: p.planned_cpl ? Number(p.planned_cpl) : null,
      actual_spend: actuals.get(p.client_id)?.spend || 0,
      actual_leads: actuals.get(p.client_id)?.leads || 0,
    })));
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!formClient || !formSpend) return;
    setSaving(true);
    const plannedSpend = parseFloat(formSpend);
    const plannedLeads = parseInt(formLeads) || 0;
    const plannedCpl = plannedLeads > 0 ? plannedSpend / plannedLeads : null;

    const { error } = await supabase.from('budget_plans').upsert({
      client_id: formClient,
      month: selectedMonth,
      planned_spend: plannedSpend,
      planned_leads: plannedLeads,
      planned_cpl: plannedCpl,
      notes: formNotes || null,
      created_by: user?.id,
    }, { onConflict: 'client_id,month' });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('common.save' as TranslationKey));
    setDialogOpen(false);
    setFormClient(''); setFormSpend(''); setFormLeads(''); setFormNotes('');
    fetchData();
  };

  const handleDelete = async (planId: string) => {
    const { error } = await supabase.from('budget_plans').delete().eq('id', planId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    fetchData();
  };

  const getVariance = (actual: number, planned: number) => {
    if (planned === 0) return null;
    return ((actual - planned) / planned * 100).toFixed(0);
  };

  if (!isAgency) return <div className="p-8 text-center text-muted-foreground">Access restricted</div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t('budget.title' as TranslationKey)}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('budget.subtitle' as TranslationKey)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m} value={m}>{format(new Date(m), 'MMMM yyyy')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t('common.add')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('budget.addPlan' as TranslationKey)}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t('nav.clients')}</Label>
                  <Select value={formClient} onValueChange={setFormClient}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t('budget.plannedSpend' as TranslationKey)}</Label><Input type="number" step="0.01" value={formSpend} onChange={e => setFormSpend(e.target.value)} placeholder="5000" /></div>
                  <div className="space-y-2"><Label>{t('budget.plannedLeads' as TranslationKey)}</Label><Input type="number" value={formLeads} onChange={e => setFormLeads(e.target.value)} placeholder="100" /></div>
                </div>
                <div className="space-y-2"><Label>{t('common.description')}</Label><Input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes..." /></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('common.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Planned Spend', value: formatCurrency(plans.reduce((s, p) => s + p.planned_spend, 0)), icon: DollarSign },
          { label: 'Actual Spend', value: formatCurrency(plans.reduce((s, p) => s + (p.actual_spend || 0), 0)), icon: DollarSign },
          { label: 'Planned Leads', value: formatNumber(plans.reduce((s, p) => s + p.planned_leads, 0)), icon: Users },
          { label: 'Actual Leads', value: formatNumber(plans.reduce((s, p) => s + (p.actual_leads || 0), 0)), icon: Users },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card py-3 px-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <kpi.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Plans table */}
      <motion.div variants={item}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{t('common.noData')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>{t('dashboard.clientName')}</th>
                      <th className="text-right">Plan $</th>
                      <th className="text-right">Fact $</th>
                      <th className="text-right">Δ $</th>
                      <th className="text-right">Plan Leads</th>
                      <th className="text-right">Fact Leads</th>
                      <th className="text-right">Δ Leads</th>
                      <th className="text-right">Plan CPL</th>
                      <th className="text-right">Fact CPL</th>
                      <th className="text-right w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(p => {
                      const client = clients.find(c => c.id === p.client_id);
                      const spendVar = getVariance(p.actual_spend || 0, p.planned_spend);
                      const leadsVar = getVariance(p.actual_leads || 0, p.planned_leads);
                      const factCpl = (p.actual_leads || 0) > 0 ? (p.actual_spend || 0) / (p.actual_leads || 1) : 0;
                      return (
                        <tr key={p.id}>
                          <td className="font-medium text-foreground">{client?.name || '—'}</td>
                          <td className="text-right">{formatCurrency(p.planned_spend)}</td>
                          <td className="text-right">{formatCurrency(p.actual_spend || 0)}</td>
                          <td className="text-right">
                            {spendVar && <Badge variant="outline" className={Number(spendVar) > 10 ? 'text-destructive' : Number(spendVar) < -10 ? 'text-success' : ''}>{spendVar}%</Badge>}
                          </td>
                          <td className="text-right">{formatNumber(p.planned_leads)}</td>
                          <td className="text-right">{formatNumber(p.actual_leads || 0)}</td>
                          <td className="text-right">
                            {leadsVar && <Badge variant="outline" className={Number(leadsVar) > 0 ? 'text-success' : 'text-destructive'}>{leadsVar}%</Badge>}
                          </td>
                          <td className="text-right">{p.planned_cpl ? formatCurrency(p.planned_cpl) : '—'}</td>
                          <td className="text-right">{factCpl > 0 ? formatCurrency(factCpl) : '—'}</td>
                          <td className="text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
