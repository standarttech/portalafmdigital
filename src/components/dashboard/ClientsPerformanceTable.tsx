import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import type { ClientMetric } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

interface Props {
  clientsData: ClientMetric[];
}

type SortKey = 'name' | 'spend' | 'leads' | 'cpl' | 'ctr' | 'deltaCpl' | 'revenue' | 'purchases' | 'roas';

export default function ClientsPerformanceTable({ clientsData }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Determine which columns to show based on actual data
  const hasLeads = clientsData.some(c => c.leads > 0);
  const hasRevenue = clientsData.some(c => c.revenue > 0);
  const hasPurchases = clientsData.some(c => c.purchases > 0);

  const filtered = useMemo(() => {
    let result = statusFilter === 'all' ? clientsData : clientsData.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      let vA: any = a[sortKey as keyof ClientMetric];
      let vB: any = b[sortKey as keyof ClientMetric];
      // Compute derived values
      if (sortKey === 'roas') { vA = a.spend > 0 ? a.revenue / a.spend : 0; vB = b.spend > 0 ? b.revenue / b.spend : 0; }
      const cmp = typeof vA === 'string' ? (vA as string).localeCompare(vB as string) : (vA as number) - (vB as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [clientsData, sortKey, sortDir, statusFilter, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  // Dynamic columns based on data
  const columns: { key: SortKey; label: string; right?: boolean; show: boolean }[] = [
    { key: 'name', label: t('dashboard.clientName'), show: true },
    { key: 'spend', label: t('dashboard.spend'), right: true, show: true },
    { key: 'leads', label: t('dashboard.leads'), right: true, show: hasLeads },
    { key: 'cpl', label: t('dashboard.cpl'), right: true, show: hasLeads },
    { key: 'purchases', label: t('metric.purchases'), right: true, show: hasPurchases },
    { key: 'revenue', label: t('metric.revenue'), right: true, show: hasRevenue },
    { key: 'roas', label: 'ROAS', right: true, show: hasRevenue },
    { key: 'ctr', label: t('dashboard.ctr'), right: true, show: true },
  ];

  const visibleColumns = columns.filter(c => c.show);

  const statusButtons = ['all', 'active', 'paused', 'inactive'] as const;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.clientsPerformance')}</CardTitle>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={t('common.search') + '...'} className="h-7 w-full sm:w-36 pl-8 text-xs bg-secondary/50 border-border/50" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5 overflow-x-auto scrollbar-none">
              {statusButtons.map(s => (
                <Button key={s} variant="ghost" size="sm" onClick={() => setStatusFilter(s)}
                  className={cn('h-6 px-2 text-[10px] rounded-sm flex-shrink-0', statusFilter === s && 'bg-primary text-primary-foreground')}>
                  {s === 'all' ? t('dashboard.allStatuses') : t(`common.${s}` as TranslationKey)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                {visibleColumns.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} className={cn('cursor-pointer select-none', col.right && 'text-right')}>
                    <span className="inline-flex items-center">{col.label}<SortIcon column={col.key} /></span>
                  </th>
                ))}
                <th className="text-right">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="text-center py-6 text-muted-foreground font-sans">{t('common.noData')}</td></tr>
              ) : filtered.map(client => {
                const roas = client.spend > 0 ? client.revenue / client.spend : 0;
                return (
                  <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="cursor-pointer">
                    <td className="font-sans font-medium text-foreground">{client.name}</td>
                    <td className="text-right">{formatCurrency(client.spend)}</td>
                    {hasLeads && <td className="text-right">{formatNumber(client.leads)}</td>}
                    {hasLeads && <td className={cn('text-right', client.cpl === 0 && 'text-muted-foreground')}>{client.cpl > 0 ? formatCurrency(client.cpl) : '—'}</td>}
                    {hasPurchases && <td className="text-right">{client.purchases > 0 ? formatNumber(client.purchases) : '—'}</td>}
                    {hasRevenue && <td className="text-right">{client.revenue > 0 ? formatCurrency(client.revenue) : '—'}</td>}
                    {hasRevenue && <td className={cn('text-right', roas > 1 ? 'text-success' : roas > 0 ? 'text-warning' : 'text-muted-foreground')}>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</td>}
                    <td className="text-right">{client.ctr.toFixed(2)}%</td>
                    <td className="text-right">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                        client.status === 'active' && 'bg-success/15 text-success',
                        client.status === 'paused' && 'bg-warning/15 text-warning',
                        client.status === 'inactive' && 'bg-muted text-muted-foreground',
                      )}>
                        {t(`common.${client.status}` as TranslationKey)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
