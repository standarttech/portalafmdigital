import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ReportsPage() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('nav.reports')}</h1>
      </motion.div>
      <motion.div variants={item} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Reports will appear here once clients and campaigns are configured.
        </p>
      </motion.div>
    </motion.div>
  );
}
