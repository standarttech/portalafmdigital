import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import DashboardControls from '@/components/dashboard/DashboardControls';
import KpiSection from '@/components/dashboard/KpiSection';
import AttentionRequired from '@/components/dashboard/AttentionRequired';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import PlatformBreakdown from '@/components/dashboard/PlatformBreakdown';
import ClientsPerformanceTable from '@/components/dashboard/ClientsPerformanceTable';
import DataStatusPanel from '@/components/dashboard/DataStatusPanel';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { DateRange, Comparison, PlatformFilter, DashboardFilters } from '@/components/dashboard/dashboardData';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user, agencyRole } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('previous_period');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [displayName, setDisplayName] = useState<string>('');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();

  const filters: DashboardFilters = useMemo(
    () => ({ dateRange, comparison, platform }),
    [dateRange, comparison, platform]
  );

  const { kpis, chartData, platformData, clientsData, loading: metricsLoading } = useDashboardMetrics({
    ...filters,
    customDateRange,
  });

  const isAdmin = agencyRole === 'AgencyAdmin';
  const isBuyer = agencyRole === 'MediaBuyer';
  const isAgencyMember = isAdmin || isBuyer;

  const fetchDisplayName = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('agency_users')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.display_name) {
      setDisplayName(data.display_name);
    } else {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Admin');
    }
  }, [user]);

  useEffect(() => { fetchDisplayName(); }, [fetchDisplayName]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <DashboardControls
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparison={comparison}
        onComparisonChange={setComparison}
        platform={platform}
        onPlatformChange={setPlatform}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
      />

      <motion.div variants={item} className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {t('dashboard.welcome')}, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1.5 mt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t('dashboard.syncStatus')}</span>
          </p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <KpiSection data={kpis} showComparison={comparison !== undefined && dateRange !== '30d'} />
      </motion.div>

      {isAgencyMember && (
        <motion.div variants={item}>
          <AttentionRequired />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <PerformanceChart chartData={chartData} />
        </motion.div>
        <motion.div variants={item}>
          <PlatformBreakdown platformData={platformData} onPlatformChange={setPlatform} />
        </motion.div>
      </div>

      {isAgencyMember && (
        <motion.div variants={item}>
          <ClientsPerformanceTable clientsData={clientsData} />
        </motion.div>
      )}

      {isAgencyMember && clientsData.length > 0 && (
        <motion.div variants={item}>
          <CategoryBreakdown clients={clientsData} />
        </motion.div>
      )}

      <motion.div variants={item}>
        <DataStatusPanel isAdmin={isAdmin} />
      </motion.div>
    </motion.div>
  );
}
