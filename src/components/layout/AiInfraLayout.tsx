import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ArrowLeftCircle, Menu, LogOut, Cpu, Server, GitBranch,
  ListTodo, ScrollText, HeartPulse, BookOpen
} from 'lucide-react';
import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import FuturisticOverlay from '@/components/futuristic/FuturisticOverlay';

const navItems = [
  { label: 'Providers', icon: Server, path: '/ai-infra/providers' },
  { label: 'Routes', icon: GitBranch, path: '/ai-infra/routes' },
  { label: 'Tasks', icon: ListTodo, path: '/ai-infra/tasks' },
  { label: 'Logs', icon: ScrollText, path: '/ai-infra/logs' },
  { label: 'Health', icon: HeartPulse, path: '/ai-infra/health' },
  { label: 'Guide', icon: BookOpen, path: '/ai-infra/guide' },
];

function AiInfraSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-[hsl(200,70%,45%)] to-[hsl(220,80%,55%)]">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sidebar-foreground text-xs tracking-widest">AI INFRA</span>
          <span className="text-[9px] tracking-[0.2em] text-[hsl(200,70%,60%)] font-medium -mt-0.5">PROVIDERS</span>
        </div>
      </div>

      <div className="px-2 pt-3 pb-2">
        <Button variant="ghost" size="sm"
          onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 px-3 text-sidebar-muted hover:text-primary hover:bg-primary/10 text-xs">
          <ArrowLeftCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Back to Platform</span>
        </Button>
      </div>

      <div className="mx-3 mb-2 border-t border-sidebar-border/50" />

      <nav className="flex-1 py-1 px-2 overflow-y-auto min-h-0 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(200,70%,45%)]/15 text-[hsl(200,70%,60%)]'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}>
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-[hsl(200,70%,60%)]')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <Button variant="ghost" size="sm"
          onClick={() => { signOut(); onNavigate?.(); }}
          className="w-full justify-start gap-3 px-3 text-sidebar-muted hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /><span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}

export default function AiInfraLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <FuturisticOverlay />
      {isMobile ? (
        <div className="fixed top-0 left-0 z-40 h-14 flex items-center px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
              <AiInfraSidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <aside className="fixed top-0 left-0 h-screen z-30 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
          <AiInfraSidebarContent />
        </aside>
      )}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 h-screen', isMobile ? 'ml-0' : 'ml-56')}>
        <AppHeader />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
