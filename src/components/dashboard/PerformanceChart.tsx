import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChartDataPoint } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';

interface Props {
  chartData: ChartDataPoint[];
  className?: string;
}

const metrics = [
  { key: 'spend', labelKey: 'dashboard.spend' as const, color: 'hsl(42, 87%, 55%)', gradientId: 'spendGrad' },
  { key: 'leads', labelKey: 'dashboard.leads' as const, color: 'hsl(160, 84%, 39%)', gradientId: 'leadsGrad' },
  { key: 'cpl', labelKey: 'dashboard.cpl' as const, color: 'hsl(217, 91%, 60%)', gradientId: 'cplGrad' },
];

export default function PerformanceChart({ chartData, className }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [visible, setVisible] = useState({ spend: true, leads: true, cpl: true });
  const [scaleMode, setScaleMode] = useState<'absolute' | 'normalized'>('normalized');

  const data = useMemo(() => {
    if (scaleMode === 'normalized' && chartData.length > 0) {
      const f = chartData[0];
      return chartData.map(d => ({
        date: d.date,
        spend: f.spend > 0 ? Math.round(d.spend / f.spend * 100) : 0,
        leads: f.leads > 0 ? Math.round(d.leads / f.leads * 100) : 0,
        cpl: f.cpl > 0 ? Math.round(d.cpl / f.cpl * 100) : 0,
      }));
    }
    return chartData;
  }, [chartData, scaleMode]);

  const toggle = (k: string) => setVisible(p => ({ ...p, [k]: !p[k as keyof typeof p] }));

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload) return null;
    const raw = chartData.find(d => d.date === label);
    if (!raw) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {visible.spend && <p style={{ color: metrics[0].color }}>{t('dashboard.spend')}: {formatCurrency(raw.spend)}</p>}
        {visible.leads && <p style={{ color: metrics[1].color }}>{t('dashboard.leads')}: {formatNumber(raw.leads)}</p>}
        {visible.cpl && <p style={{ color: metrics[2].color }}>{t('dashboard.cpl')}: {formatCurrency(raw.cpl)}</p>}
      </div>
    );
  };

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">{t('dashboard.performance')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {metrics.map(m => (
              <button key={m.key} onClick={() => toggle(m.key)}
                className={cn('flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-opacity', visible[m.key as keyof typeof visible] ? 'opacity-100' : 'opacity-30')}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                {t(m.labelKey)}
              </button>
            ))}
            <div className="flex bg-secondary/50 rounded-md p-0.5 ml-1">
              <Button variant="ghost" size="sm" onClick={() => setScaleMode('absolute')}
                className={cn('h-6 px-2 text-[10px] rounded-sm', scaleMode === 'absolute' && 'bg-primary text-primary-foreground')}>
                {t('dashboard.absolute')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setScaleMode('normalized')}
                className={cn('h-6 px-2 text-[10px] rounded-sm', scaleMode === 'normalized' && 'bg-primary text-primary-foreground')}>
                {t('dashboard.normalized')}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('common.noData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  {metrics.map(m => (
                    <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                <Tooltip content={renderTooltip} />
                {visible.spend && <Area type="monotone" dataKey="spend" stroke={metrics[0].color} fill={`url(#${metrics[0].gradientId})`} strokeWidth={2} />}
                {visible.leads && <Area type="monotone" dataKey="leads" stroke={metrics[1].color} fill={`url(#${metrics[1].gradientId})`} strokeWidth={2} />}
                {visible.cpl && <Area type="monotone" dataKey="cpl" stroke={metrics[2].color} fill={`url(#${metrics[2].gradientId})`} strokeWidth={2} />}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
