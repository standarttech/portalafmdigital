import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MousePointerClick, Users, ShoppingBag } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

interface FunnelStep {
  key: string;
  labelKey: TranslationKey;
  icon: typeof Eye;
  value: number;
  color: string;
}

interface Props {
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
}

export default function ConversionFunnel({ impressions, clicks, leads, purchases }: Props) {
  const { t, formatNumber } = useLanguage();

  const steps: FunnelStep[] = useMemo(() => [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, value: impressions, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, value: clicks, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, value: leads, color: 'hsl(160, 84%, 39%)' },
    { key: 'purchases', labelKey: 'metric.purchases', icon: ShoppingBag, value: purchases, color: 'hsl(280, 65%, 60%)' },
  ], [impressions, clicks, leads, purchases]);

  const maxVal = Math.max(...steps.map(s => s.value), 1);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold">{t('funnel.title' as TranslationKey)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, idx) => {
          const prevVal = idx > 0 ? steps[idx - 1].value : 0;
          const convRate = prevVal > 0 ? ((step.value / prevVal) * 100).toFixed(1) : null;
          const barWidth = Math.max((step.value / maxVal) * 100, 4);
          const Icon = step.icon;

          return (
            <div key={step.key}>
              {idx > 0 && convRate && (
                <div className="flex items-center justify-center my-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>↓</span>
                    <span className="font-semibold text-foreground">{convRate}%</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-24 sm:w-28 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: step.color }} />
                  <span className="text-xs text-muted-foreground truncate">{t(step.labelKey)}</span>
                </div>
                <div className="flex-1 h-7 bg-secondary/30 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                    style={{ width: `${barWidth}%`, backgroundColor: step.color, opacity: 0.85 }}
                  >
                    <span className="text-[10px] font-bold text-white whitespace-nowrap">
                      {formatNumber(step.value)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
