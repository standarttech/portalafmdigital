import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  DollarSign,
  MousePointerClick,
  Users,
  Eye,
  TrendingUp,
  BarChart3,
  Building2,
  Zap,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Demo data
const spendData = [
  { date: 'Янв', meta: 12400, google: 8200, tiktok: 5100 },
  { date: 'Фев', meta: 15600, google: 9800, tiktok: 6300 },
  { date: 'Мар', meta: 18200, google: 11400, tiktok: 7800 },
  { date: 'Апр', meta: 16800, google: 13200, tiktok: 9200 },
  { date: 'Май', meta: 21000, google: 14800, tiktok: 10600 },
  { date: 'Июн', meta: 24500, google: 16200, tiktok: 12800 },
];

const platformData = [
  { name: 'Meta Ads', value: 108500, color: 'hsl(42, 87%, 55%)' },
  { name: 'Google Ads', value: 73600, color: 'hsl(160, 84%, 39%)' },
  { name: 'TikTok Ads', value: 51800, color: 'hsl(217, 91%, 60%)' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';

  const kpis = [
    { label: t('dashboard.totalSpend'), value: formatCurrency(233900), icon: DollarSign, change: '+12.3%', positive: false },
    { label: t('dashboard.totalLeads'), value: formatNumber(4821), icon: Users, change: '+18.2%', positive: true },
    { label: t('dashboard.totalClicks'), value: formatNumber(142350), icon: MousePointerClick, change: '+8.7%', positive: true },
    { label: t('dashboard.totalImpressions'), value: formatNumber(12450000), icon: Eye, change: '+5.1%', positive: true },
    { label: t('dashboard.costPerLead'), value: formatCurrency(48.52), icon: TrendingUp, change: '-4.8%', positive: true },
    { label: t('dashboard.activeClients'), value: '12', icon: Building2, change: '+2', positive: true },
    { label: t('dashboard.activeCampaigns'), value: '47', icon: Zap, change: '+5', positive: true },
    { label: t('dashboard.ctr'), value: '1.14%', icon: BarChart3, change: '+0.2%', positive: true },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('dashboard.welcome')}, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
            <Info className="h-3.5 w-3.5" />
            {t('dashboard.syncStatus')}
          </p>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <kpi.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className={`text-xs font-medium ${kpi.positive ? 'text-success' : 'text-destructive'}`}>
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('dashboard.performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendData}>
                    <defs>
                      <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="googleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tiktokGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
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
                    <Area type="monotone" dataKey="meta" stroke="hsl(42, 87%, 55%)" fill="url(#metaGrad)" strokeWidth={2} name="Meta Ads" />
                    <Area type="monotone" dataKey="google" stroke="hsl(160, 84%, 39%)" fill="url(#googleGrad)" strokeWidth={2} name="Google Ads" />
                    <Area type="monotone" dataKey="tiktok" stroke="hsl(217, 91%, 60%)" fill="url(#tiktokGrad)" strokeWidth={2} name="TikTok Ads" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Split */}
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('dashboard.spendByPlatform')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(225, 30%, 9%)',
                        border: '1px solid hsl(225, 20%, 14%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'hsl(40, 20%, 90%)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {platformData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="font-medium text-foreground">${p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
