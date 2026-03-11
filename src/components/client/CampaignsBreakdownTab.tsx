import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ArrowLeft, ChevronDown, Loader2, Play, Layers, LayoutGrid, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { isAfmCampaign } from '@/lib/afmCampaignFilter';
import CampaignColumnSettings, { type ColumnDef } from './CampaignColumnSettings';

type Level = 'campaign' | 'adset' | 'ad';

const DEFAULT_VISIBLE = ['name', 'spend', 'impressions', 'clicks', 'cpc', 'ctr', 'leads', 'cpl', 'purchases', 'revenue'];
const STORAGE_KEY = 'campaigns-visible-cols';

export default function CampaignsBreakdownTab({ clientId, dateFrom, dateTo }: { clientId: string; dateFrom?: string; dateTo?: string }) {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [breadcrumb, setBreadcrumb] = useState<{ level: Level; platformId?: string; name?: string }[]>([
    { level: 'campaign' },
  ]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Visible columns — persisted in localStorage as quick access
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
    } catch { return DEFAULT_VISIBLE; }
  });

  const handleChangeVisible = useCallback((keys: string[]) => {
    setVisibleKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }, []);

  const current = breadcrumb[breadcrumb.length - 1];
  const isFlatView = breadcrumb.length === 1;

  useEffect(() => { loadData(); }, [clientId, breadcrumb, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    const level = current.level;

    if (level === 'campaign') {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, campaign_name, status, platform_campaign_id')
        .eq('client_id', clientId);

      // AFM FILTER: only campaigns with "AFM" in name
      const realCampaigns = (campaigns || []).filter(c => !c.platform_campaign_id.startsWith('sheets-') && isAfmCampaign(c.campaign_name));
      if (!realCampaigns.length) { setData([]); setLoading(false); return; }

      let query = supabase
        .from('daily_metrics')
        .select('campaign_id, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts, date')
        .eq('client_id', clientId);

      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data: metrics } = await query;

      const agg: Record<string, any> = {};
      realCampaigns.forEach(c => {
        agg[c.id] = {
          id: c.id, name: c.campaign_name, status: c.status, platform_id: c.platform_campaign_id,
          spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, addToCart: 0, checkouts: 0,
        };
      });
      (metrics || []).forEach(m => {
        const a = agg[m.campaign_id];
        if (!a) return;
        a.spend += Number(m.spend); a.impressions += m.impressions; a.clicks += m.link_clicks;
        a.leads += m.leads; a.purchases += (m.purchases || 0); a.revenue += Number(m.revenue || 0);
        a.addToCart += (m.add_to_cart || 0); a.checkouts += (m.checkouts || 0);
      });
      setData(Object.values(agg).filter(a => a.spend > 0 || a.impressions > 0 || a.leads > 0));
    } else {
      // AFM FILTER: get AFM campaign IDs to restrict adset/ad data
      const { data: afmCampaigns } = await supabase
        .from('campaigns')
        .select('id, platform_campaign_id')
        .eq('client_id', clientId);
      const afmCampIds = (afmCampaigns || [])
        .filter(c => !c.platform_campaign_id.startsWith('sheets-') && isAfmCampaign(c.campaign_name || ''))
        .map(c => c.id);

      if (afmCampIds.length === 0) { setData([]); setLoading(false); return; }

      let query = supabase
        .from('ad_level_metrics')
        .select('platform_id, name, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts, status, parent_platform_id, date, campaign_id')
        .eq('client_id', clientId)
        .eq('level', level)
        .in('campaign_id', afmCampIds);

      if (current.platformId) query = query.eq('parent_platform_id', current.platformId);
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data: rows } = await query;

      const agg: Record<string, any> = {};
      (rows || []).forEach(r => {
        if (!agg[r.platform_id]) {
          agg[r.platform_id] = {
            name: r.name, platform_id: r.platform_id, status: r.status,
            parent_platform_id: r.parent_platform_id,
            spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, addToCart: 0, checkouts: 0,
          };
        }
        const a = agg[r.platform_id];
        a.spend += Number(r.spend); a.impressions += r.impressions; a.clicks += r.link_clicks;
        a.leads += r.leads; a.purchases += r.purchases; a.revenue += Number(r.revenue);
        a.addToCart += r.add_to_cart; a.checkouts += r.checkouts;
      });
      setData(Object.values(agg));
    }
    setLoading(false);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const drillDown = (row: any) => {
    if (current.level === 'campaign') {
      setBreadcrumb(prev => [...prev, { level: 'adset', platformId: row.platform_id, name: row.name }]);
    } else if (current.level === 'adset') {
      setBreadcrumb(prev => [...prev, { level: 'ad', platformId: row.platform_id, name: row.name }]);
    }
  };

  const navigateTo = (index: number) => setBreadcrumb(prev => prev.slice(0, index + 1));
  const switchLevel = (level: Level) => setBreadcrumb([{ level }]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [data, sortKey, sortDir]);

  // ALL possible columns
  const allColumns: ColumnDef[] = useMemo(() => [
    { key: 'name', label: t('common.name'), right: false },
    { key: 'spend', label: t('metric.spend'), right: true },
    { key: 'impressions', label: t('metric.impressions'), right: true },
    { key: 'clicks', label: t('metric.clicks'), right: true },
    { key: 'cpc', label: t('metric.cpc'), right: true },
    { key: 'ctr', label: t('metric.ctr'), right: true },
    { key: 'leads', label: t('metric.leads'), right: true },
    { key: 'cpl', label: t('metric.cpl'), right: true },
    { key: 'addToCart', label: t('metric.addToCart'), right: true },
    { key: 'checkouts', label: t('metric.checkouts'), right: true },
    { key: 'purchases', label: t('metric.purchases'), right: true },
    { key: 'revenue', label: t('metric.revenue'), right: true },
    { key: 'roas', label: t('metric.roas'), right: true },
  ], [t]);

  // Filtered columns based on user selection
  const cols = useMemo(() => allColumns.filter(c => visibleKeys.includes(c.key)), [allColumns, visibleKeys]);

  const formatVal = (key: string, row: any) => {
    if (key === 'name') return row.name;
    if (key === 'spend' || key === 'revenue') return formatCurrency(row[key] || 0);
    if (key === 'cpc') {
      const clicks = row.clicks || 0;
      return clicks > 0 ? formatCurrency(row.spend / clicks) : '—';
    }
    if (key === 'ctr') {
      const imp = row.impressions || 0;
      return imp > 0 ? ((row.clicks / imp) * 100).toFixed(2) + '%' : '—';
    }
    if (key === 'cpl') {
      const leads = row.leads || 0;
      return leads > 0 ? formatCurrency(row.spend / leads) : '—';
    }
    if (key === 'roas') {
      const spend = row.spend || 0;
      return spend > 0 ? ((row.revenue || 0) / spend).toFixed(2) : '—';
    }
    return formatNumber(row[key] || 0);
  };

  const canDrillDown = current.level !== 'ad';
  const levelLabels: Record<string, string> = {
    campaign: t('campaigns.campaigns'),
    adset: t('campaigns.adsets'),
    ad: t('campaigns.ads'),
  };

  const levelIcons: Record<string, React.ReactNode> = {
    campaign: <Layers className="h-3.5 w-3.5" />,
    adset: <LayoutGrid className="h-3.5 w-3.5" />,
    ad: <FileText className="h-3.5 w-3.5" />,
  };

  const levels: Level[] = ['campaign', 'adset', 'ad'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isFlatView && (
            <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => switchLevel(lvl)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    current.level === lvl
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {levelIcons[lvl]}
                  {levelLabels[lvl]}
                </button>
              ))}
            </div>
          )}

          {!isFlatView && (
            <div className="flex items-center gap-1.5 text-sm">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground">/</span>}
                  <button
                    onClick={() => navigateTo(i)}
                    className={`hover:underline transition-colors ${i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {b.name || levelLabels[b.level]}
                  </button>
                </span>
              ))}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground ml-1" onClick={() => switchLevel('campaign')}>
                <ArrowLeft className="h-3 w-3 mr-1" /> {t('common.total')}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CampaignColumnSettings
            allColumns={allColumns}
            visibleKeys={visibleKeys}
            onChangeVisible={handleChangeVisible}
          />
          {dateFrom && dateTo && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {dateFrom} → {dateTo}
            </Badge>
          )}
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Play className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {current.level === 'campaign'
                  ? t('campaigns.noDataForPeriod')
                  : t('campaigns.noDataAtLevel')}
              </p>
              {!isFlatView && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigateTo(breadcrumb.length - 2)}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> {t('common.back')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px]">
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    {cols.map(col => (
                      <th key={col.key} className={`${col.right ? 'text-right' : ''} cursor-pointer select-none hover:bg-secondary/50`}
                        onClick={() => handleSort(col.key)}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i}
                      className={canDrillDown ? 'cursor-pointer hover:bg-primary/5 transition-colors' : ''}
                      onClick={() => canDrillDown && drillDown(row)}
                    >
                      {cols.map(col => (
                        <td key={col.key} className={`${col.right ? 'text-right' : ''} ${col.key === 'name' ? 'font-medium text-foreground max-w-[300px] truncate' : 'text-muted-foreground'}`}>
                          {col.key === 'name' && canDrillDown ? (
                            <span className="inline-flex items-center gap-1.5 group">
                              <span className="truncate">{row.name}</span>
                              <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </span>
                          ) : formatVal(col.key, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 font-semibold">
                    {cols.map(col => {
                      if (col.key === 'name') return <td key={col.key} className="text-foreground">{t('common.total')} ({sorted.length})</td>;
                      const totalRow = {
                        spend: sorted.reduce((s, r) => s + (r.spend || 0), 0),
                        impressions: sorted.reduce((s, r) => s + (r.impressions || 0), 0),
                        clicks: sorted.reduce((s, r) => s + (r.clicks || 0), 0),
                        leads: sorted.reduce((s, r) => s + (r.leads || 0), 0),
                        purchases: sorted.reduce((s, r) => s + (r.purchases || 0), 0),
                        revenue: sorted.reduce((s, r) => s + (r.revenue || 0), 0),
                        addToCart: sorted.reduce((s, r) => s + (r.addToCart || 0), 0),
                        checkouts: sorted.reduce((s, r) => s + (r.checkouts || 0), 0),
                      };
                      return <td key={col.key} className="text-right text-foreground">{formatVal(col.key, totalRow)}</td>;
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
