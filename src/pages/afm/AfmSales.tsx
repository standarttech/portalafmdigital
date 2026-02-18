import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmSales() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.sales')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'New Deals', value: '—', icon: TrendingUp },
          { label: 'Active Clients', value: '—', icon: Users },
          { label: 'MRR', value: '—', icon: DollarSign },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card opacity-75">
          <CardContent className="p-6 text-center space-y-2">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">{t('afm.crmPipeline')} — {t('afm.inDevelopment')}</p>
            <Badge variant="outline" className="text-[10px]">{t('afm.comingSoon')}</Badge>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
