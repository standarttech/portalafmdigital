import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmMediaBuying() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.mediaBuying')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.mediaBuyingInfo')}</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-3">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-medium text-foreground">{t('afm.mediaBuying')}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t('afm.connectAdAccount')}</p>
              <Badge variant="outline">{t('afm.comingSoon')}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
