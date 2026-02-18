import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { TrendingUp, Users, DollarSign, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmTools() {
  const { t } = useLanguage();

  const tools = [
    { nameKey: 'afm.crmPipeline', descKey: 'afm.crmDesc', icon: TrendingUp },
    { nameKey: 'afm.leadTracker', descKey: 'afm.leadTrackerDesc', icon: Users },
    { nameKey: 'afm.plCalc', descKey: 'afm.plDesc', icon: DollarSign },
    { nameKey: 'afm.hrPanel', descKey: 'afm.hrDesc', icon: Building2 },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.tools')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map(tool => (
          <Card key={tool.nameKey} className="glass-card opacity-75">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <tool.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t(tool.nameKey as any)}</p>
                  <p className="text-xs text-muted-foreground">{t(tool.descKey as any)}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                {t('afm.inDevelopment')}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
