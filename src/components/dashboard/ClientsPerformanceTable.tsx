import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import type { DashboardFilters } from './dashboardData';
import { getClientPerformanceData } from './dashboardData';
import type { ClientMetric } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

interface Props {
  filters: DashboardFilters;
  realClientsData?: ClientMetric[];
  hasRealData?: boolean;
}

type SortKey = 'name' | 'spend' | 'leads' | 'cpl' | 'ctr' | 'deltaCpl';

export default function ClientsPerformanceTable({ filters, realClientsData, hasRealData }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('cpl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const clients = useMemo(() => {
    if (hasRealData && realClientsData && realClientsData.length > 0) return realClientsData;
    return getClientPerformanceData(filters);
  }, [filters, realClientsData, hasRealData]);

  const filtered = useMemo(() => {
    let result = statusFilter === 'all' ? clients : clients.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const vA = a[sortKey];
      const vB = b[sortKey];
      const cmp = typeof vA === 'string' ? (vA as string).localeCompare(vB as string) : (vA as number) - (vB as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [clients, sortKey, sortDir, statusFilter, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const columns: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'name', label: t('dashboard.clientName') },
    { key: 'spend', label: t('dashboard.spend'), right: true },
    { key: 'leads', label: t('dashboard.leads'), right: true },
    { key: 'cpl', label: t('dashboard.cpl'), right: true },
    { key: 'ctr', label: t('dashboard.ctr'), right: true },
    { key: 'deltaCpl', label: t('dashboard.deltaCpl'), right: true },
  ];

  const statusButtons = ['all', 'active', 'paused', 'inactive'] as const;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">{t('dashboard.clientsPerformance')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={t('common.search') + '...'} className="h-7 w-36 pl-8 text-xs bg-secondary/50 border-border/50" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5">
              {statusButtons.map(s => (
                <Button key={s} variant="ghost" size="sm" onClick={() => setStatusFilter(s)}
                  className={cn('h-6 px-2 text-[10px] rounded-sm', statusFilter === s && 'bg-primary text-primary-foreground')}>
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
                {columns.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} className={cn('cursor-pointer select-none', col.right && 'text-right')}>
                    <span className="inline-flex items-center">{col.label}<SortIcon column={col.key} /></span>
                  </th>
                ))}
                <th className="text-right">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-muted-foreground font-sans">{t('common.noData')}</td></tr>
              ) : filtered.map(client => (
                <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="cursor-pointer">
                  <td className="font-sans font-medium text-foreground">{client.name}</td>
                  <td className="text-right">{formatCurrency(client.spend)}</td>
                  <td className="text-right">{formatNumber(client.leads)}</td>
                  <td className={cn('text-right', client.cpl === 0 && 'text-muted-foreground')}>{client.cpl > 0 ? formatCurrency(client.cpl) : '—'}</td>
                  <td className="text-right">{client.ctr.toFixed(2)}%</td>
                  <td className={cn('text-right', client.deltaCpl < 0 ? 'text-success' : client.deltaCpl > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {client.deltaCpl !== 0 ? `${client.deltaCpl > 0 ? '+' : ''}${client.deltaCpl.toFixed(1)}%` : '—'}
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
