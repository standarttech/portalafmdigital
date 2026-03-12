import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Types ── */
export interface ChartMetric {
  key: string;
  label: string;
  color: string;
  format?: 'currency' | 'number' | 'percent';
  /** If true, render as bars in combo mode */
  asBar?: boolean;
  /** If true, use secondary Y axis */
  secondaryAxis?: boolean;
}

export type ChartDisplayMode = 'absolute' | 'normalized' | 'individual' | 'combo';

export interface UnifiedChartProps {
  data: Record<string, any>[];
  metrics: ChartMetric[];
  title?: string;
  className?: string;
  dateKey?: string;
  /** Height of the chart area */
  height?: number;
  /** Default display mode */
  defaultMode?: ChartDisplayMode;
  /** Available modes (defaults to all) */
  availableModes?: ChartDisplayMode[];
  /** Show metric toggle pills */
  showMetricToggles?: boolean;
  /** Format value for tooltip */
  formatValue?: (key: string, value: number) => string;
}

/* ── Premium tooltip ── */
function PremiumTooltip({
  active, payload, label, metrics, rawData, dateKey, formatValue,
}: any) {
  if (!active || !payload?.length) return null;
  const rawRow = rawData?.find((d: any) => d[dateKey] === label);

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground text-[13px] pb-1 border-b border-border/30">{label}</p>
      {payload.map((entry: any) => {
        const metric = metrics.find((m: ChartMetric) => m.key === entry.dataKey);
        if (!metric) return null;
        const rawVal = rawRow?.[`_raw_${metric.key}`] ?? rawRow?.[metric.key] ?? entry.value;
        const displayVal = formatValue ? formatValue(metric.key, rawVal) : formatDefault(metric.format, rawVal);
        return (
          <div key={metric.key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10" style={{ backgroundColor: metric.color }} />
              <span className="text-muted-foreground">{metric.label}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">{displayVal}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatDefault(format: string | undefined, val: number): string {
  if (format === 'currency') return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (format === 'percent') return `${val.toFixed(2)}%`;
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* ── Mode labels ── */
const MODE_LABELS: Record<ChartDisplayMode, { en: string; ru: string }> = {
  absolute: { en: 'Absolute', ru: 'Абсолютные' },
  normalized: { en: 'Trend', ru: 'Тренд' },
  individual: { en: 'Individual', ru: 'По отдельности' },
  combo: { en: 'Combo', ru: 'Комбо' },
};

/* ── Main component ── */
export default function UnifiedChart({
  data,
  metrics,
  title,
  className,
  dateKey = 'date',
  height = 300,
  defaultMode = 'normalized',
  availableModes = ['absolute', 'normalized', 'individual', 'combo'],
  showMetricToggles = true,
  formatValue,
}: UnifiedChartProps) {
  const { language } = useLanguage();
  const isRu = language === 'ru';
  
  const [mode, setMode] = useState<ChartDisplayMode>(defaultMode);
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    metrics.forEach(m => { v[m.key] = true; });
    return v;
  });
  const [soloMetric, setSoloMetric] = useState<string | null>(null);

  const toggleMetric = useCallback((key: string) => {
    if (mode === 'individual') {
      setSoloMetric(key);
    } else {
      setVisible(prev => ({ ...prev, [key]: !prev[key] }));
    }
  }, [mode]);

  // When switching to individual mode, select first metric
  const handleModeChange = useCallback((newMode: ChartDisplayMode) => {
    setMode(newMode);
    if (newMode === 'individual' && !soloMetric) {
      setSoloMetric(metrics[0]?.key || null);
    }
  }, [metrics, soloMetric]);

  // Active metrics based on mode
  const activeMetrics = useMemo(() => {
    if (mode === 'individual') {
      return metrics.filter(m => m.key === soloMetric);
    }
    return metrics.filter(m => visible[m.key]);
  }, [metrics, mode, visible, soloMetric]);

  // Normalized data
  const chartData = useMemo(() => {
    if (mode !== 'normalized' || data.length === 0) return data;
    // Find first non-zero value per metric for normalization base
    const bases: Record<string, number> = {};
    metrics.forEach(m => {
      for (const d of data) {
        const v = Number(d[m.key]) || 0;
        if (v > 0) { bases[m.key] = v; break; }
      }
    });
    return data.map(d => {
      const norm: Record<string, any> = { [dateKey]: d[dateKey] };
      metrics.forEach(m => {
        const base = bases[m.key] || 0;
        const val = Number(d[m.key]) || 0;
        norm[m.key] = base > 0 ? Math.round((val / base) * 100) : 0;
        norm[`_raw_${m.key}`] = val;
      });
      return norm;
    });
  }, [data, mode, metrics, dateKey]);

  // Check if we need dual axis (metrics with very different scales in absolute mode)
  const needsDualAxis = useMemo(() => {
    if (mode !== 'combo' || activeMetrics.length < 2) return false;
    return activeMetrics.some(m => m.secondaryAxis);
  }, [mode, activeMetrics]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {isRu ? 'Нет данных за этот период' : 'No data for this period'}
        </div>
      );
    }

    const commonProps = {
      data: chartData,
    };

    const xAxisProps = {
      dataKey: dateKey,
      tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      stroke: 'hsl(var(--border))',
      tickLine: false,
      axisLine: { stroke: 'hsl(var(--border))', strokeOpacity: 0.3 },
      interval: 'preserveStartEnd' as const,
    };

    const yAxisProps = {
      tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      stroke: 'hsl(var(--border))',
      tickLine: false,
      axisLine: false,
      width: 45,
    };

    const gridProps = {
      strokeDasharray: '3 3',
      stroke: 'hsl(var(--border))',
      strokeOpacity: 0.3,
      vertical: false,
    };

    const tooltipProps = {
      content: (
        <PremiumTooltip
          metrics={activeMetrics}
          rawData={mode === 'normalized' ? data : chartData}
          dateKey={dateKey}
          formatValue={formatValue}
        />
      ),
      cursor: { stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeOpacity: 0.3 },
    };

    // Combo mode: bars + lines
    if (mode === 'combo' && activeMetrics.length >= 2) {
      const barMetrics = activeMetrics.filter(m => m.asBar);
      const lineMetrics = activeMetrics.filter(m => !m.asBar);
      // If no explicit bar metrics, use first as bar
      const finalBars = barMetrics.length > 0 ? barMetrics : [activeMetrics[0]];
      const finalLines = barMetrics.length > 0 ? lineMetrics : activeMetrics.slice(1);

      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis yAxisId="left" {...yAxisProps} />
            {needsDualAxis && <YAxis yAxisId="right" {...yAxisProps} orientation="right" />}
            <Tooltip {...tooltipProps} />
            {finalBars.map(m => (
              <Bar
                key={m.key}
                yAxisId="left"
                dataKey={m.key}
                fill={m.color}
                fillOpacity={0.6}
                radius={[3, 3, 0, 0]}
                barSize={20}
              />
            ))}
            {finalLines.map(m => (
              <Line
                key={m.key}
                yAxisId={m.secondaryAxis && needsDualAxis ? 'right' : 'left'}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: m.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Area chart for normalized / absolute / individual
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...commonProps}>
          <defs>
            {activeMetrics.map(m => (
              <linearGradient key={`grad-${m.key}`} id={`unified-grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={mode === 'individual' ? 0.4 : 0.25} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          {activeMetrics.map(m => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              fill={`url(#unified-grad-${m.key})`}
              strokeWidth={mode === 'individual' ? 3 : 2}
              dot={false}
              activeDot={{ r: 4, fill: m.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {title && <CardTitle className="text-sm sm:text-base font-semibold">{title}</CardTitle>}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric toggles */}
            {showMetricToggles && (
              <div className="flex items-center gap-1 flex-wrap">
                {metrics.map(m => {
                  const isActive = mode === 'individual' ? soloMetric === m.key : visible[m.key];
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-all duration-200',
                        isActive
                          ? 'opacity-100'
                          : 'opacity-30 hover:opacity-60',
                      )}
                    >
                      <div
                        className="h-2 w-2 rounded-full ring-1 ring-white/10"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mode switcher */}
            {availableModes.length > 1 && (
              <div className="flex bg-secondary/50 rounded-lg p-0.5 ml-1">
                {availableModes.map(m => (
                  <Button
                    key={m}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleModeChange(m)}
                    className={cn(
                      'h-6 px-2.5 text-[10px] rounded-md transition-all',
                      mode === m
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-secondary',
                    )}
                  >
                    {isRu ? MODE_LABELS[m].ru : MODE_LABELS[m].en}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        {mode === 'normalized' && chartData.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {isRu ? 'Значения нормализованы к первому дню = 100%' : 'Values normalized to first day = 100%'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
