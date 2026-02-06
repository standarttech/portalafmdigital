import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardFilters, PlatformFilter } from './dashboardData';
import { getPlatformData } from './dashboardData';

interface Props {
  filters: DashboardFilters;
  onPlatformChange: (p: PlatformFilter) => void;
}

export default function PlatformBreakdown({ filters, onPlatformChange }: Props) {
  const { t, formatCurrency } = useLanguage();
  const data = useMemo(() => getPlatformData(filters), [filters]);

  const avgCpl = useMemo(() => {
    const withLeads = data.filter(d => d.leads > 0);
    return withLeads.length > 0 ? withLeads.reduce((s, d) => s + d.spend / d.leads, 0) / withLeads.length : 0;
  }, [data]);

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t('dashboard.spendByPlatform')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="spend">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(225, 30%, 9%)',
                  border: '1px solid hsl(225, 20%, 14%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(40, 20%, 90%)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Platform table */}
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5 border-b border-border/30">
            <span>{t('dashboard.platform')}</span>
            <span className="text-right">{t('dashboard.spend')}</span>
            <span className="text-right">{t('dashboard.leads')}</span>
            <span className="text-right">{t('dashboard.cpl')}</span>
          </div>
          {data.map((p) => {
            const cpl = p.leads > 0 ? p.spend / p.leads : 0;
            const cplRatio = avgCpl > 0 && cpl > 0 ? cpl / avgCpl : 1;
            const cplColor = cpl === 0
              ? 'text-muted-foreground'
              : cplRatio < 0.9
                ? 'text-success'
                : cplRatio > 1.1
                  ? 'text-destructive'
                  : 'text-warning';

            return (
              <button
                key={p.name}
                onClick={() => onPlatformChange(p.key as PlatformFilter)}
                className="grid grid-cols-4 gap-2 text-xs px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-muted-foreground truncate">{p.name}</span>
                </div>
                <span className="text-right font-medium font-mono">{formatCurrency(p.spend)}</span>
                <span className="text-right font-medium font-mono">{p.leads.toLocaleString()}</span>
                <span className={`text-right font-medium font-mono ${cplColor}`}>
                  {cpl > 0 ? formatCurrency(cpl) : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
