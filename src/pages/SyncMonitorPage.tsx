import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const syncHistory = [
  { id: '1', client: 'TechStart Inc.', platform: 'Meta', status: 'success', time: '2 hours ago', duration: '12s', records: 145 },
  { id: '2', client: 'TechStart Inc.', platform: 'Google', status: 'success', time: '2 hours ago', duration: '8s', records: 89 },
  { id: '3', client: 'FashionBrand Pro', platform: 'Meta', status: 'success', time: '1 hour ago', duration: '15s', records: 203 },
  { id: '4', client: 'FashionBrand Pro', platform: 'TikTok', status: 'error', time: '1 hour ago', duration: '3s', records: 0 },
  { id: '5', client: 'HealthPlus Medical', platform: 'Google', status: 'success', time: '3 hours ago', duration: '6s', records: 67 },
  { id: '6', client: 'AutoDeal Motors', platform: 'Meta', status: 'running', time: 'Now', duration: '—', records: 0 },
];

const statusIcon: Record<string, any> = {
  success: CheckCircle2,
  error: AlertCircle,
  running: RefreshCw,
};

const statusStyle: Record<string, string> = {
  success: 'text-success',
  error: 'text-destructive',
  running: 'text-primary animate-spin',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function SyncMonitorPage() {
  const { t } = useLanguage();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('nav.sync')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('dashboard.syncStatus')}</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm text-muted-foreground">Successful</span></div>
          <p className="text-2xl font-bold text-foreground">4</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">Errors</span></div>
          <p className="text-2xl font-bold text-foreground">1</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Next Sync</span></div>
          <p className="text-2xl font-bold text-foreground">10h 23m</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncHistory.map((s) => {
                const Icon = statusIcon[s.status];
                return (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${statusStyle[s.status]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{s.client}</p>
                      <p className="text-xs text-muted-foreground">{s.platform} • {s.time}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{s.duration}</p>
                      {s.records > 0 && <p>{s.records} records</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
