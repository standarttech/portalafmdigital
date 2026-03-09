import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Info, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import DashboardControls from '@/components/dashboard/DashboardControls';
import KpiSection from '@/components/dashboard/KpiSection';
import AttentionRequired from '@/components/dashboard/AttentionRequired';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import PlatformBreakdown from '@/components/dashboard/PlatformBreakdown';
import ClientsPerformanceTable from '@/components/dashboard/ClientsPerformanceTable';
import DataStatusPanel from '@/components/dashboard/DataStatusPanel';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { DateRange, Comparison, PlatformFilter, DashboardFilters } from '@/components/dashboard/dashboardData';

const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

const itemAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

const STORAGE_KEY = 'dashboard-section-order';
const DEFAULT_SECTIONS = ['kpis', 'categories', 'attention', 'charts', 'clients', 'status'];

function SortableSection({ id, children, isAdmin }: { id: string; children: React.ReactNode; isAdmin: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isAdmin });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-secondary/80 rounded-md p-1 hidden sm:flex"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user, effectiveRole, simulatedUser } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);

  const filters: DashboardFilters = useMemo(
    () => ({ dateRange, comparison, platform }),
    [dateRange, comparison, platform]
  );

  const { kpis, chartData, platformData, clientsData, loading: metricsLoading } = useDashboardMetrics({
    ...filters,
    customDateRange,
    clientIds: simulatedClientIds,
  });

  const isAdmin = effectiveRole === 'AgencyAdmin';
  const isBuyer = effectiveRole === 'MediaBuyer' || effectiveRole === 'Manager' || effectiveRole === 'SalesManager' || effectiveRole === 'AccountManager' || effectiveRole === 'Designer' || effectiveRole === 'Copywriter';
  const isClient = effectiveRole === 'Client';
  const isAgencyMember = isAdmin || isBuyer;

  // Draggable section order — cached with react-query
  const { data: savedOrder } = useQuery({
    queryKey: ['dashboard-section-order'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'dashboard_section_order').maybeSingle();
      return data?.value && Array.isArray(data.value) ? data.value as string[] : DEFAULT_SECTIONS;
    },
    staleTime: 10 * 60 * 1000,
  });
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTIONS);
  useEffect(() => { if (savedOrder) setSectionOrder(savedOrder); }, [savedOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        // Save to DB for all users
        supabase
          .from('platform_settings')
          .upsert({ key: 'dashboard_section_order', value: newOrder as any, updated_by: user?.id }, { onConflict: 'key' })
          .then(() => {});
        return newOrder;
      });
    }
  };

  // Display name — cached with react-query
  const targetUserId = simulatedUser ? simulatedUser.userId : user?.id;
  const { data: displayName = '' } = useQuery({
    queryKey: ['dashboard-display-name', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return '';
      const { data } = await supabase.from('agency_users').select('display_name').eq('user_id', targetUserId).maybeSingle();
      if (data?.display_name) return data.display_name;
      if (simulatedUser) return simulatedUser.displayName;
      return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Load target user's client assignments for fully accurate scope
  useEffect(() => {
    if (!user) {
      setSimulatedClientIds(null);
      return;
    }

    const role = effectiveRole;
    if (role === 'AgencyAdmin') {
      setSimulatedClientIds(null);
      return;
    }

    const targetUserId = simulatedUser ? simulatedUser.userId : user.id;

    supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', targetUserId)
      .then(({ data }) => {
        setSimulatedClientIds((data || []).map(d => d.client_id));
      });
  }, [user, effectiveRole, simulatedUser]);

  useEffect(() => { fetchDisplayName(); }, [fetchDisplayName]);

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'kpis':
        return (
          <motion.div variants={itemAnim}>
            <KpiSection data={kpis} showComparison={compareEnabled && comparison !== 'none'} hideOperations={isClient} />
          </motion.div>
        );
      case 'categories':
        return isAgencyMember && clientsData.length > 0 ? (
          <motion.div variants={itemAnim}>
            <CategoryBreakdown clients={clientsData} />
          </motion.div>
        ) : null;
      case 'attention':
        return isAgencyMember ? (
          <motion.div variants={itemAnim}>
            <AttentionRequired />
          </motion.div>
        ) : null;
      case 'charts':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div variants={itemAnim} className="lg:col-span-2">
              <PerformanceChart chartData={chartData} />
            </motion.div>
            <motion.div variants={itemAnim}>
              <PlatformBreakdown platformData={platformData} onPlatformChange={setPlatform} />
            </motion.div>
          </div>
        );
      case 'clients':
        return isAgencyMember ? (
          <motion.div variants={itemAnim}>
            <ClientsPerformanceTable clientsData={clientsData} />
          </motion.div>
        ) : null;
      case 'status':
        return (
          <motion.div variants={itemAnim}>
            <DataStatusPanel isAdmin={isAdmin} />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">
      <DashboardControls
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparison={comparison}
        onComparisonChange={setComparison}
        platform={platform}
        onPlatformChange={setPlatform}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
        compareEnabled={compareEnabled}
        onCompareEnabledChange={setCompareEnabled}
      />

      <motion.div variants={itemAnim} className="flex items-center justify-between">
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4 sm:space-y-6">
            {sectionOrder.map(sectionId => {
              const content = renderSection(sectionId);
              if (!content) return null;
              return (
                <SortableSection key={sectionId} id={sectionId} isAdmin={isAdmin}>
                  {content}
                </SortableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}
