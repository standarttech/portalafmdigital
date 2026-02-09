import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, TrendingUp, Users, MousePointerClick, BarChart3, Building2, Zap } from 'lucide-react';
import type { DashboardFilters } from './dashboardData';
import { getScaledValue, getChanges } from './dashboardData';
import type { TranslationKey } from '@/i18n/translations';
import type { KpiData } from '@/hooks/useDashboardMetrics';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface KpiCard {
  label: string;
  displayValue: string;
  icon: LucideIcon;
  change: string;
  positive: boolean;
}

interface KpiGroup {
  titleKey: TranslationKey;
  cards: KpiCard[];
}

interface Props {
  filters: DashboardFilters;
  realData?: KpiData | null;
  hasRealData?: boolean;
}

function pctChange(cur: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: cur > 0 ? '+∞' : '—', positive: cur > 0 };
  const pct = ((cur - prev) / prev) * 100;
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

export default function KpiSection({ filters, realData, hasRealData }: Props) {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const changes = useMemo(() => getChanges(filters.comparison), [filters.comparison]);

  const sections: KpiGroup[] = useMemo(() => {
    if (hasRealData && realData) {
      const spendChange = pctChange(realData.spend, realData.prevSpend);
      const leadsChange = pctChange(realData.leads, realData.prevLeads);
      const clicksChange = pctChange(realData.clicks, realData.prevClicks);
      const cplChange = pctChange(realData.cpl, realData.prevCpl);
      // For CPL, lower is better, so flip positive
      cplChange.positive = !cplChange.positive || realData.cpl === 0;
      const ctrChange = pctChange(realData.ctr, realData.prevCtr);

      return [
        {
          titleKey: 'dashboard.financial',
          cards: [
            { label: t('dashboard.totalSpend'), displayValue: formatCurrency(realData.spend), icon: DollarSign, change: spendChange.value, positive: !spendChange.positive },
            { label: t('dashboard.costPerLead'), displayValue: formatCurrency(realData.cpl), icon: TrendingUp, change: cplChange.value, positive: cplChange.positive },
          ],
        },
        {
          titleKey: 'dashboard.performanceSection',
          cards: [
            { label: t('dashboard.totalLeads'), displayValue: formatNumber(realData.leads), icon: Users, change: leadsChange.value, positive: leadsChange.positive },
            { label: t('dashboard.totalClicks'), displayValue: formatNumber(realData.clicks), icon: MousePointerClick, change: clicksChange.value, positive: clicksChange.positive },
            { label: t('dashboard.ctr'), displayValue: `${realData.ctr.toFixed(2)}%`, icon: BarChart3, change: ctrChange.value, positive: ctrChange.positive },
          ],
        },
        {
          titleKey: 'dashboard.operations',
          cards: [
            { label: t('dashboard.activeClients'), displayValue: String(realData.activeClients), icon: Building2, change: '', positive: true },
            { label: t('dashboard.activeCampaigns'), displayValue: String(realData.activeCampaigns), icon: Zap, change: '', positive: true },
          ],
        },
      ];
    }

    // Fallback to demo data
    const spend = getScaledValue(233900, filters);
    const leads = Math.round(getScaledValue(4821, filters));
    const clicks = Math.round(getScaledValue(142350, filters));
    const cpl = leads > 0 ? spend / leads : 0;

    return [
      {
        titleKey: 'dashboard.financial',
        cards: [
          { label: t('dashboard.totalSpend'), displayValue: formatCurrency(spend), icon: DollarSign, change: changes.spend.value, positive: changes.spend.positive },
          { label: t('dashboard.costPerLead'), displayValue: formatCurrency(cpl), icon: TrendingUp, change: changes.cpl.value, positive: changes.cpl.positive },
        ],
      },
      {
        titleKey: 'dashboard.performanceSection',
        cards: [
          { label: t('dashboard.totalLeads'), displayValue: formatNumber(leads), icon: Users, change: changes.leads.value, positive: changes.leads.positive },
          { label: t('dashboard.totalClicks'), displayValue: formatNumber(clicks), icon: MousePointerClick, change: changes.clicks.value, positive: changes.clicks.positive },
          { label: t('dashboard.ctr'), displayValue: '1.14%', icon: BarChart3, change: changes.ctr.value, positive: changes.ctr.positive },
        ],
      },
      {
        titleKey: 'dashboard.operations',
        cards: [
          { label: t('dashboard.activeClients'), displayValue: '12', icon: Building2, change: changes.clients.value, positive: changes.clients.positive },
          { label: t('dashboard.activeCampaigns'), displayValue: '47', icon: Zap, change: changes.campaigns.value, positive: changes.campaigns.positive },
        ],
      },
    ];
  }, [filters, t, formatCurrency, formatNumber, changes, realData, hasRealData]);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.titleKey}>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {t(section.titleKey)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {section.cards.map((kpi) => (
              <motion.div key={kpi.label} variants={itemAnim} className="kpi-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <kpi.icon className="h-4 w-4 text-primary" />
                  </div>
                  {kpi.change && (
                    <span className={`text-xs font-medium ${kpi.positive ? 'text-success' : 'text-destructive'}`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.displayValue}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('dashboard.vsPrevious')}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
