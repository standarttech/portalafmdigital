import { useMemo } from 'react';
import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const categoryDots: Record<string, string> = {
  ecom: 'bg-blue-500',
  info_product: 'bg-purple-500',
  online_business: 'bg-emerald-500',
  local_business: 'bg-orange-500',
  real_estate: 'bg-cyan-500',
  saas: 'bg-indigo-500',
  other: 'bg-muted-foreground',
};

const CategoryBreakdown = React.forwardRef<HTMLDivElement, Props>(function CategoryBreakdown({ clients }, ref) {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const categories = useMemo(() => {
    const groups: Record<string, { clients: ClientData[]; spend: number; leads: number; revenue: number; purchases: number }> = {};

    clients.forEach(c => {
      const cat = c.category || 'other';
      if (!groups[cat]) groups[cat] = { clients: [], spend: 0, leads: 0, revenue: 0, purchases: 0 };
      groups[cat].clients.push(c);
      groups[cat].spend += c.spend;
      groups[cat].leads += c.leads;
      groups[cat].revenue += c.revenue;
      groups[cat].purchases += c.purchases;
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
    <Card ref={ref} className="glass-card">
      <CardHeader className="pb-1.5 pt-3 px-4">
        <CardTitle className="text-sm">{t('dashboard.categoryBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map(cat => {
            const isEcom = cat.revenue > 0;
            return (
              <div key={cat.category} className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${categoryDots[cat.category] || categoryDots.other}`} />
                  <span className="text-[11px] font-medium text-foreground truncate">{t(cat.label as TranslationKey)}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{cat.clients.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                  <Metric icon={DollarSign} label={t('dashboard.spend')} value={formatCurrency(cat.spend)} color="text-primary" />
                  {isEcom ? (
                    <>
                      <Metric icon={DollarSign} label={t('metric.revenue')} value={formatCurrency(cat.revenue)} color="text-emerald-500" />
                      <Metric icon={TrendingUp} label={t('metric.roas')} value={`${cat.roas.toFixed(2)}x`} color="text-emerald-500" />
                    </>
                  ) : (
                    <>
                      <Metric icon={Users} label={t('dashboard.leads')} value={formatNumber(cat.leads)} color="text-primary" />
                      <Metric icon={TrendingUp} label={t('dashboard.cpl')} value={formatCurrency(cat.cpl)} color="text-primary" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

function Metric({ icon: Icon, label, value, color }: { icon: typeof DollarSign; label: string; value: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-0.5">
        <Icon className={`h-2.5 w-2.5 ${color}`} />
        <span className="text-[9px] text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

CategoryBreakdown.displayName = 'CategoryBreakdown';
export default CategoryBreakdown;
