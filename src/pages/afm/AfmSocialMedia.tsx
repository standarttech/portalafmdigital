import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Lock, ShieldCheck, Instagram, Facebook, Youtube, Linkedin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const socialNetworks = [
  { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
];

export default function AfmSocialMedia() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.socialMedia')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('afm.socialSecurity')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('afm.socialSecurityDesc')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {socialNetworks.map(net => (
          <Card key={net.name} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <net.icon className={`h-5 w-5 ${net.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{net.name}</p>
                  <p className="text-xs text-muted-foreground">{t('afm.notConnected')}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground gap-1">
                <Lock className="h-2.5 w-2.5" />
                {t('afm.comingSoon')}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
