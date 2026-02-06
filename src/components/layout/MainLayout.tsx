import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import { useSidebarState } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { collapsed } = useSidebarState();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        collapsed ? 'ml-16' : 'ml-60'
      )}>
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
