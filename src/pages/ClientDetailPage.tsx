import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  MousePointerClick,
  Users,
  Eye,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Table2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

interface ClientData {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
  notes: string | null;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  const spendData = useMemo(() => generateDemoSpendData(), []);
  const dailyData = useMemo(() => generateDailyTableData(), []);

  const totals = useMemo(() => {
    return dailyData.reduce(
      (acc, row) => ({
        spend: acc.spend + row.spend,
        reach: acc.reach + row.reach,
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        leads: acc.leads + row.leads,
        qualLeads: acc.qualLeads + row.qualLeads,
      }),
      { spend: 0, reach: 0, impressions: 0, clicks: 0, leads: 0, qualLeads: 0 }
    );
  }, [dailyData]);

  const totalCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const totalCpm = totals.impressions > 0 ? totals.spend / (totals.impressions / 1000) : 0;
  const totalCtr = totals.reach > 0 ? (totals.clicks / totals.reach) * 100 : 0;
  const totalCpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalLeadCv = totals.clicks > 0 ? (totals.leads / totals.clicks) * 100 : 0;

  const fetchClient = useCallback(async () => {
    if (!id) return;

    // Check for demo IDs
    if (id.startsWith('demo-')) {
      const demoNames: Record<string, string> = {
        'demo-1': 'TechStart Inc.',
        'demo-2': 'FashionBrand Pro',
        'demo-3': 'HealthPlus Medical',
        'demo-4': 'AutoDeal Motors',
        'demo-5': 'EduLearn Academy',
      };
      setClient({
        id,
        name: demoNames[id] || 'Demo Client',
        status: id === 'demo-4' ? 'paused' : 'active',
        currency: 'USD',
        timezone: 'Europe/Moscow',
        notes: null,
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, currency, timezone, notes')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/clients');
      return;
    }

    setClient(data);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
              <Badge variant="outline" className={statusStyles[client.status] || ''}>
                {t(`common.${client.status}` as any)}
              </Badge>
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
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-2">
              <Table2 className="h-4 w-4" />
              Daily Table
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('nav.reports')}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('dashboard.performance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spendData}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(225, 30%, 9%)',
                          border: '1px solid hsl(225, 20%, 14%)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'hsl(40, 20%, 90%)',
                        }}
                      />
                      <Area type="monotone" dataKey="spend" stroke="hsl(42, 87%, 55%)" fill="url(#spendGrad)" strokeWidth={2} name="Spend ($)" />
                      <Area type="monotone" dataKey="leads" stroke="hsl(160, 84%, 39%)" fill="url(#leadsGrad)" strokeWidth={2} name="Leads" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DAILY TABLE TAB */}
          <TabsContent value="daily" className="space-y-4">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="spreadsheet-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>UTM</th>
                        <th className="text-right">Spend ($)</th>
                        <th className="text-right">Reach</th>
                        <th className="text-right">Clicks</th>
                        <th className="text-right">CPC ($)</th>
                        <th className="text-right">CPM ($)</th>
                        <th className="text-right">CTR (%)</th>
                        <th className="text-right">Lead CV (%)</th>
                        <th className="text-right">Leads</th>
                        <th className="text-right">CPL ($)</th>
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
                      {/* Totals Row */}
                      <tr className="totals-row">
                        <td className="text-foreground font-bold">TOTAL</td>
                        <td></td>
                        <td className="text-right text-foreground">{formatCurrency(totals.spend)}</td>
                        <td className="text-right text-foreground">{formatNumber(totals.reach)}</td>
                        <td className="text-right text-foreground">{formatNumber(totals.clicks)}</td>
                        <td className="text-right text-foreground">{formatCurrency(totalCpc)}</td>
                        <td className="text-right text-foreground">{formatCurrency(totalCpm)}</td>
                        <td className="text-right text-foreground">{totalCtr.toFixed(2)}%</td>
                        <td className="text-right text-foreground">{totalLeadCv.toFixed(2)}%</td>
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

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Reports for this client will appear here once configured.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
