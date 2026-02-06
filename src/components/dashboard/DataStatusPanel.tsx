import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { getSyncStatusData } from './dashboardData';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

interface Props {
  isAdmin: boolean;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: TranslationKey }> = {
  ok: { icon: CheckCircle2, color: 'text-success', label: 'dashboard.syncOk' },
  delayed: { icon: AlertTriangle, color: 'text-warning', label: 'dashboard.syncDelayed' },
  error: { icon: XCircle, color: 'text-destructive', label: 'dashboard.syncError' },
};

function getTimeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return '<1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function DataStatusPanel({ isAdmin }: Props) {
  const { t } = useLanguage();
  const syncData = getSyncStatusData();

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{t('dashboard.lastUpdated')}: {new Date().toLocaleDateString()}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/60">{t('dashboard.dataDelayNote')}</span>
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('dashboard.dataStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex flex-wrap gap-4">
          {syncData.map((item) => {
            const config = statusConfig[item.status];
            const Icon = config.icon;
            return (
              <div key={item.platform} className="flex items-center gap-2 text-xs">
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
                <span className="text-muted-foreground">{item.platform}:</span>
                <span className="text-foreground font-medium">{t(config.label)}</span>
                <span className="text-muted-foreground/50">({getTimeAgo(item.lastSync)})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
