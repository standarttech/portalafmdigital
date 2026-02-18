import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Settings, Shield, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmSettings() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Security', icon: Shield, desc: 'Access control & permissions' },
          { label: 'Integrations', icon: Globe, desc: 'Connected services' },
          { label: 'Preferences', icon: Settings, desc: 'Internal workspace config' },
        ].map(s => (
          <Card key={s.label} className="glass-card opacity-75">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
