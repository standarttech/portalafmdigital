import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { CATEGORY_OPTIONS } from '@/components/dashboard/categoryMetrics';
import type { TranslationKey } from '@/i18n/translations';

interface ClientData {
  id: string;
  name: string;
  category: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  revenue: number;
  purchases: number;
}

interface Props {
  clients: ClientData[];
}

const categoryColors: Record<string, string> = {
  ecom: 'border-blue-500/30 bg-blue-500/5',
  info_product: 'border-purple-500/30 bg-purple-500/5',
  online_business: 'border-emerald-500/30 bg-emerald-500/5',
  local_business: 'border-orange-500/30 bg-orange-500/5',
  real_estate: 'border-cyan-500/30 bg-cyan-500/5',
  saas: 'border-indigo-500/30 bg-indigo-500/5',
  other: 'border-border bg-secondary/5',
};

export default function CategoryBreakdown({ clients }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const categories = useMemo(() => {
    const groups: Record<string, { clients: ClientData[]; spend: number; leads: number; revenue: number; purchases: number; clicks: number; impressions: number }> = {};
    
    clients.forEach(c => {
      const cat = c.category || 'other';
      if (!groups[cat]) groups[cat] = { clients: [], spend: 0, leads: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0 };
      groups[cat].clients.push(c);
      groups[cat].spend += c.spend;
      groups[cat].leads += c.leads;
      groups[cat].revenue += c.revenue;
      groups[cat].purchases += c.purchases;
      groups[cat].clicks += c.clicks;
      groups[cat].impressions += c.impressions;
    });

    return Object.entries(groups)
      .sort(([, a], [, b]) => b.spend - a.spend)
      .map(([cat, data]) => ({
        category: cat,
        label: CATEGORY_OPTIONS.find(o => o.value === cat)?.labelKey || 'clients.other',
        ...data,
        cpl: data.leads > 0 ? data.spend / data.leads : 0,
        roas: data.spend > 0 ? data.revenue / data.spend : 0,
      }));
  }, [clients]);

  if (categories.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base">{t('dashboard.categoryBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map(cat => (
          <div key={cat.category} className={`rounded-lg border p-3 ${categoryColors[cat.category] || categoryColors.other}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t(cat.label as TranslationKey)}</Badge>
                <span className="text-[10px] text-muted-foreground">{cat.clients.length} {t('dashboard.clients')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <span className="text-[9px] text-muted-foreground">{t('dashboard.spend')}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold">{formatCurrency(cat.spend)}</p>
              </div>
              {cat.leads > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Users className="h-3 w-3 text-primary" />
                    <span className="text-[9px] text-muted-foreground">{t('dashboard.leads')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">{formatNumber(cat.leads)}</p>
                </div>
              )}
              {cat.leads > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-[9px] text-muted-foreground">{t('dashboard.cpl')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">{formatCurrency(cat.cpl)}</p>
                </div>
              )}
              {cat.revenue > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <DollarSign className="h-3 w-3 text-success" />
                    <span className="text-[9px] text-muted-foreground">{t('metric.revenue')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">{formatCurrency(cat.revenue)}</p>
                </div>
              )}
              {cat.purchases > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <ShoppingBag className="h-3 w-3 text-primary" />
                    <span className="text-[9px] text-muted-foreground">{t('metric.purchases')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">{formatNumber(cat.purchases)}</p>
                </div>
              )}
              {cat.roas > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-[9px] text-muted-foreground">{t('metric.roas')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">{cat.roas.toFixed(2)}x</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
