import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, DollarSign, MousePointerClick, Users, Eye, TrendingUp,
  BarChart3, FileText, Table2, Link2, ListTodo, Clock, Target, Plus, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// Demo data generators
const generateDemoSpendData = () => [
  { date: '01', spend: 1200, leads: 24, clicks: 890 },
  { date: '02', spend: 1450, leads: 31, clicks: 1020 },
  { date: '03', spend: 980, leads: 18, clicks: 760 },
  { date: '04', spend: 1680, leads: 38, clicks: 1340 },
  { date: '05', spend: 1320, leads: 28, clicks: 980 },
  { date: '06', spend: 1550, leads: 35, clicks: 1200 },
  { date: '07', spend: 1780, leads: 42, clicks: 1450 },
  { date: '08', spend: 1420, leads: 30, clicks: 1100 },
  { date: '09', spend: 1650, leads: 37, clicks: 1280 },
  { date: '10', spend: 1890, leads: 45, clicks: 1520 },
  { date: '11', spend: 1350, leads: 27, clicks: 950 },
  { date: '12', spend: 1720, leads: 40, clicks: 1380 },
  { date: '13', spend: 1580, leads: 33, clicks: 1150 },
  { date: '14', spend: 1950, leads: 48, clicks: 1600 },
];

const generateDailyTableData = () => {
  const rows = [];
  for (let i = 1; i <= 14; i++) {
    const spend = 800 + Math.random() * 1500;
    const impressions = 15000 + Math.random() * 35000;
    const reach = impressions * (0.7 + Math.random() * 0.25);
    const clicks = 300 + Math.random() * 1200;
    const leads = Math.floor(5 + Math.random() * 45);
    const qualLeads = Math.floor(leads * (0.3 + Math.random() * 0.4));
    rows.push({
      date: `2026-02-${String(i).padStart(2, '0')}`,
      utm: `utm_camp_${i}`,
      spend: Math.round(spend * 100) / 100,
      reach: Math.round(reach),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      cpc: Math.round((spend / clicks) * 100) / 100,
      cpm: Math.round((spend / (impressions / 1000)) * 100) / 100,
      ctr: Math.round((clicks / reach) * 10000) / 100,
      leadFormCv: Math.round((leads / clicks) * 10000) / 100,
      leads,
      cpl: Math.round((spend / Math.max(leads, 1)) * 100) / 100,
      qualLeads,
    });
  }
  return rows;
};

const demoPlatformData = [
  { name: 'Meta Ads', spend: 8500, leads: 180, color: 'hsl(42, 87%, 55%)' },
  { name: 'Google Ads', spend: 5200, leads: 120, color: 'hsl(160, 84%, 39%)' },
  { name: 'TikTok Ads', spend: 3100, leads: 65, color: 'hsl(217, 91%, 60%)' },
];

interface ClientData {
  id: string; name: string; status: string; currency: string; timezone: string; notes: string | null;
}
interface Campaign {
  id: string; campaign_name: string; status: string; platform_campaign_id: string;
}
interface Task {
  id: string; title: string; description: string | null; status: string; due_date: string | null; created_at: string;
}
interface ClientTarget {
  target_cpl: number | null; target_ctr: number | null; target_leads: number | null; target_roas: number | null;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  archived: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/15 text-warning border-warning/20',
  in_progress: 'bg-info/15 text-info border-info/20',
  completed: 'bg-success/15 text-success border-success/20',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user, agencyRole } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targets, setTargets] = useState<ClientTarget | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetCpl, setTargetCpl] = useState('');
  const [targetCtr, setTargetCtr] = useState('');
  const [targetLeads, setTargetLeads] = useState('');

  // Task creation
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const isAgency = agencyRole === 'AgencyAdmin' || agencyRole === 'MediaBuyer';
  const isAdmin = agencyRole === 'AgencyAdmin';

  const spendData = useMemo(() => generateDemoSpendData(), []);
  const dailyData = useMemo(() => generateDailyTableData(), []);

  const totals = useMemo(() => {
    return dailyData.reduce(
      (acc, row) => ({
        spend: acc.spend + row.spend, reach: acc.reach + row.reach,
        impressions: acc.impressions + row.impressions, clicks: acc.clicks + row.clicks,
        leads: acc.leads + row.leads, qualLeads: acc.qualLeads + row.qualLeads,
      }),
      { spend: 0, reach: 0, impressions: 0, clicks: 0, leads: 0, qualLeads: 0 }
    );
  }, [dailyData]);

  const totalCpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalCtr = totals.reach > 0 ? (totals.clicks / totals.reach) * 100 : 0;

  const fetchClient = useCallback(async () => {
    if (!id) return;
    if (id.startsWith('demo-')) {
      const demoNames: Record<string, string> = {
        'demo-1': 'TechStart Inc.', 'demo-2': 'FashionBrand Pro',
        'demo-3': 'HealthPlus Medical', 'demo-4': 'AutoDeal Motors', 'demo-5': 'EduLearn Academy',
      };
      setClient({ id, name: demoNames[id] || 'Demo Client', status: id === 'demo-4' ? 'paused' : 'active', currency: 'USD', timezone: 'Europe/Moscow', notes: null });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('clients').select('id, name, status, currency, timezone, notes').eq('id', id).single();
    if (error || !data) { navigate('/clients'); return; }
    setClient(data);
    setLoading(false);
  }, [id, navigate]);

  const fetchCampaigns = useCallback(async () => {
    if (!id || id.startsWith('demo-')) return;
    const { data } = await supabase.from('campaigns').select('id, campaign_name, status, platform_campaign_id').eq('client_id', id).order('campaign_name');
    if (data) setCampaigns(data);
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id || id.startsWith('demo-')) return;
    const { data } = await supabase.from('tasks').select('id, title, description, status, due_date, created_at').eq('client_id', id).order('created_at', { ascending: false });
    if (data) setTasks(data);
  }, [id]);

  const fetchTargets = useCallback(async () => {
    if (!id || id.startsWith('demo-')) return;
    const { data } = await supabase.from('client_targets').select('target_cpl, target_ctr, target_leads, target_roas').eq('client_id', id).maybeSingle();
    if (data) {
      setTargets(data);
      setTargetCpl(data.target_cpl?.toString() || '');
      setTargetCtr(data.target_ctr?.toString() || '');
      setTargetLeads(data.target_leads?.toString() || '');
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchCampaigns();
    fetchTasks();
    fetchTargets();
  }, [fetchClient, fetchCampaigns, fetchTasks, fetchTargets]);

  const handleSaveTargets = async () => {
    if (!id || id.startsWith('demo-')) return;
    setSavingTargets(true);
    const payload = {
      client_id: id,
      target_cpl: targetCpl ? parseFloat(targetCpl) : null,
      target_ctr: targetCtr ? parseFloat(targetCtr) : null,
      target_leads: targetLeads ? parseInt(targetLeads) : null,
    };
    if (targets) {
      await supabase.from('client_targets').update(payload).eq('client_id', id);
    } else {
      await supabase.from('client_targets').insert(payload);
    }
    setSavingTargets(false);
    toast.success(t('targets.saved'));
    fetchTargets();
  };

  const handleCreateTask = async () => {
    if (!id || !newTaskTitle.trim() || id.startsWith('demo-')) return;
    setCreatingTask(true);
    const { error } = await supabase.from('tasks').insert({
      client_id: id,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || null,
      created_by: user?.id,
    });
    setCreatingTask(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('tasks.taskCreated'));
    setTaskDialogOpen(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    fetchTasks();
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id);
    toast.success(t('tasks.taskUpdated'));
    fetchTasks();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!client) return null;

  const kpis = [
    { label: t('dashboard.totalSpend'), value: formatCurrency(totals.spend), icon: DollarSign },
    { label: t('dashboard.totalLeads'), value: formatNumber(totals.leads), icon: Users },
    { label: t('dashboard.totalClicks'), value: formatNumber(totals.clicks), icon: MousePointerClick },
    { label: t('dashboard.totalImpressions'), value: formatNumber(totals.impressions), icon: Eye },
    { label: t('dashboard.costPerLead'), value: formatCurrency(totalCpl), icon: TrendingUp },
    { label: t('dashboard.ctr'), value: `${totalCtr.toFixed(2)}%`, icon: BarChart3 },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{client.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={statusStyles[client.status] || ''}>{t(`common.${client.status}` as any)}</Badge>
              <span className="text-xs text-muted-foreground">{client.timezone} · {client.currency}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card py-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="daily" className="gap-2"><Table2 className="h-4 w-4" />Daily</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2"><Target className="h-4 w-4" />{t('campaigns.title')}</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2"><ListTodo className="h-4 w-4" />{t('tasks.title')}</TabsTrigger>
            {isAdmin && <TabsTrigger value="targets" className="gap-2"><TrendingUp className="h-4 w-4" />{t('targets.title')}</TabsTrigger>}
            <TabsTrigger value="reports" className="gap-2"><FileText className="h-4 w-4" />{t('nav.reports')}</TabsTrigger>
            {isAgency && <TabsTrigger value="connections" className="gap-2"><Link2 className="h-4 w-4" />Connections</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.performance')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spendData}>
                        <defs>
                          <linearGradient id="clientSpendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="clientLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                        <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(40, 20%, 90%)' }} />
                        <Area type="monotone" dataKey="spend" stroke="hsl(42, 87%, 55%)" fill="url(#clientSpendGrad)" strokeWidth={2} name="Spend ($)" />
                        <Area type="monotone" dataKey="leads" stroke="hsl(160, 84%, 39%)" fill="url(#clientLeadsGrad)" strokeWidth={2} name="Leads" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.spendByPlatform')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={demoPlatformData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="spend">
                          {demoPlatformData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(40, 20%, 90%)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {demoPlatformData.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-muted-foreground">{p.name}</span>
                        </div>
                        <span className="font-mono font-medium">{formatCurrency(p.spend)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{t('dashboard.lastUpdated')}: {new Date().toLocaleDateString()}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground/60">{t('dashboard.dataDelayNote')}</span>
            </div>
          </TabsContent>

          {/* DAILY TABLE TAB */}
          <TabsContent value="daily" className="space-y-4">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="spreadsheet-table">
                    <thead>
                      <tr>
                        <th>Date</th><th>UTM</th><th className="text-right">Spend ($)</th>
                        <th className="text-right">Reach</th><th className="text-right">Clicks</th>
                        <th className="text-right">CPC ($)</th><th className="text-right">CPM ($)</th>
                        <th className="text-right">CTR (%)</th><th className="text-right">Lead CV (%)</th>
                        <th className="text-right">Leads</th><th className="text-right">CPL ($)</th>
                        <th className="text-right">Qual Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((row) => (
                        <tr key={row.date}>
                          <td className="text-foreground font-medium whitespace-nowrap">{row.date}</td>
                          <td className="text-muted-foreground text-xs">{row.utm}</td>
                          <td className="text-right text-foreground">{formatCurrency(row.spend)}</td>
                          <td className="text-right text-muted-foreground">{formatNumber(row.reach)}</td>
                          <td className="text-right text-muted-foreground">{formatNumber(row.clicks)}</td>
                          <td className="text-right text-muted-foreground">{formatCurrency(row.cpc)}</td>
                          <td className="text-right text-muted-foreground">{formatCurrency(row.cpm)}</td>
                          <td className="text-right text-muted-foreground">{row.ctr.toFixed(2)}%</td>
                          <td className="text-right text-muted-foreground">{row.leadFormCv.toFixed(2)}%</td>
                          <td className="text-right text-foreground font-medium">{row.leads}</td>
                          <td className="text-right text-foreground">{formatCurrency(row.cpl)}</td>
                          <td className="text-right text-success font-medium">{row.qualLeads}</td>
                        </tr>
                      ))}
                      <tr className="totals-row">
                        <td className="text-foreground font-bold">TOTAL</td><td></td>
                        <td className="text-right text-foreground">{formatCurrency(totals.spend)}</td>
                        <td className="text-right text-foreground">{formatNumber(totals.reach)}</td>
                        <td className="text-right text-foreground">{formatNumber(totals.clicks)}</td>
                        <td className="text-right text-foreground">{formatCurrency(totals.clicks > 0 ? totals.spend / totals.clicks : 0)}</td>
                        <td className="text-right text-foreground">{formatCurrency(totals.impressions > 0 ? totals.spend / (totals.impressions / 1000) : 0)}</td>
                        <td className="text-right text-foreground">{totalCtr.toFixed(2)}%</td>
                        <td className="text-right text-foreground">{totals.clicks > 0 ? ((totals.leads / totals.clicks) * 100).toFixed(2) : '0'}%</td>
                        <td className="text-right text-foreground font-bold">{totals.leads}</td>
                        <td className="text-right text-foreground">{formatCurrency(totalCpl)}</td>
                        <td className="text-right text-success font-bold">{totals.qualLeads}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAMPAIGNS TAB */}
          <TabsContent value="campaigns" className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t('campaigns.noCampaigns')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('campaigns.noCampaignsDesc')}</p>
              </div>
            ) : (
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="spreadsheet-table">
                      <thead>
                        <tr>
                          <th>Campaign</th>
                          <th>{t('common.status')}</th>
                          <th>Platform ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map(c => (
                          <tr key={c.id}>
                            <td className="text-foreground font-medium font-sans">{c.campaign_name}</td>
                            <td>
                              <Badge variant="outline" className={statusStyles[c.status] || ''}>{c.status}</Badge>
                            </td>
                            <td className="text-muted-foreground text-xs">{c.platform_campaign_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('tasks.title')}</h3>
              {isAgency && (
                <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{t('tasks.addTask')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t('tasks.addTask')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>{t('common.title')} *</Label>
                        <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('common.description')}</Label>
                        <Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Optional description" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                      <Button onClick={handleCreateTask} disabled={creatingTask}>
                        {creatingTask ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {t('common.create')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t('tasks.noTasks')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('tasks.noTasksDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <Card key={task.id} className="glass-card">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTaskStatus(task)} className="flex-shrink-0">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === 'completed' ? 'bg-success border-success' : task.status === 'in_progress' ? 'border-info' : 'border-muted-foreground/30'
                          }`}>
                            {task.status === 'completed' && <span className="text-white text-xs">✓</span>}
                          </div>
                        </button>
                        <div>
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                          {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                        <Badge variant="outline" className={statusStyles[task.status] || ''}>
                          {task.status === 'pending' ? t('common.pending') : task.status === 'in_progress' ? t('common.inProgress') : t('common.completed')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TARGETS TAB */}
          {isAdmin && (
            <TabsContent value="targets" className="space-y-4">
              <Card className="glass-card max-w-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t('targets.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('targets.cpl')} ($)</Label>
                    <Input type="number" step="0.01" value={targetCpl} onChange={(e) => setTargetCpl(e.target.value)} placeholder="e.g. 50.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('targets.ctr')} (%)</Label>
                    <Input type="number" step="0.01" value={targetCtr} onChange={(e) => setTargetCtr(e.target.value)} placeholder="e.g. 1.50" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('targets.leads')}</Label>
                    <Input type="number" value={targetLeads} onChange={(e) => setTargetLeads(e.target.value)} placeholder="e.g. 500" />
                  </div>
                  <Button onClick={handleSaveTargets} disabled={savingTargets}>
                    {savingTargets ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t('common.save')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">Client reports coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">Generate reports from the Reports page</p>
            </div>
          </TabsContent>

          {/* CONNECTIONS TAB */}
          {isAgency && (
            <TabsContent value="connections" className="space-y-4">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Link2 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Platform connections</p>
                <p className="text-sm text-muted-foreground mt-1">Connect ad platforms from the Sync Monitor page</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
