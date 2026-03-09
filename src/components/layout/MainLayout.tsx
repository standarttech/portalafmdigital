import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import FuturisticOverlay from '@/components/futuristic/FuturisticOverlay';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/shared/PageSkeleton';

function RouteLoader() {
  return <PageSkeleton variant="dashboard" kpiCards={4} tableRows={4} />;
}

export default function MainLayout() {
  const { collapsed } = useSidebarState();
  const isMobile = useIsMobile();
  usePresence();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <FuturisticOverlay />
      <AppSidebar />
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10',
        isMobile ? 'ml-0' : collapsed ? 'ml-16' : 'ml-60'
      )}>
        <AppHeader />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
