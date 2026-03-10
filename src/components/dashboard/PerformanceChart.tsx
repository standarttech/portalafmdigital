import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import UnifiedChart, { type ChartMetric } from '@/components/charts/UnifiedChart';
import type { ChartDataPoint } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';

interface Props {
  chartData: ChartDataPoint[];
  className?: string;
}

export default function PerformanceChart({ chartData, className }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const metrics: ChartMetric[] = useMemo(() => [
    { key: 'spend', label: t('dashboard.spend'), color: 'hsl(42, 87%, 55%)', format: 'currency', asBar: true },
    { key: 'leads', label: t('dashboard.leads'), color: 'hsl(160, 84%, 39%)', format: 'number' },
    { key: 'cpl', label: t('dashboard.cpl'), color: 'hsl(217, 91%, 60%)', format: 'currency', secondaryAxis: true },
  ], [t]);

  const formatValue = (key: string, val: number) => {
    if (key === 'spend' || key === 'cpl') return formatCurrency(val);
    return formatNumber(val);
  };

  return (
    <UnifiedChart
      data={chartData}
      metrics={metrics}
      title={t('dashboard.performance')}
      className={cn(className)}
      defaultMode="normalized"
      availableModes={['absolute', 'normalized', 'combo', 'individual']}
      formatValue={formatValue}
      height={280}
    />
  );
}
