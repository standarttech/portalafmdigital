import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  BarChart3, Users, TrendingUp, DollarSign, Target, Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmDashboard() {
  const { t } = useLanguage();

  const kpis = [
    { label: t('afm.adBudget'), value: '$12 400', icon: DollarSign, trend: '+8%', up: true },
    { label: t('afm.monthlyLeads'), value: '184', icon: Users, trend: '+23%', up: true },
    { label: 'CPL', value: '$67.4', icon: TrendingUp, trend: '-5%', up: false },
    { label: t('afm.activeCampaigns'), value: '6', icon: Target, trend: null, up: true },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            {kpi.trend && (
              <p className={`text-xs mt-1 ${kpi.up ? 'text-green-500' : 'text-destructive'}`}>
                {kpi.trend} {t('afm.vsLastMonth')}
              </p>
            )}
          </div>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('afm.mediaBuyingInfo')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('afm.connectAdAccount')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Placeholder chart area */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-2">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">{t('afm.mediaBuying')} — {t('afm.comingSoon')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
