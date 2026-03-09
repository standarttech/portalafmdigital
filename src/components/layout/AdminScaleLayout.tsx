import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeftCircle, Menu, LogOut, ChevronDown, ChevronRight,
  Home, PenLine, Eye, BookOpen, Trash2, FileText,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import FuturisticOverlay from '@/components/futuristic/FuturisticOverlay';
import AppHeader from '@/components/layout/AppHeader';
import type { ScaleData } from '@/pages/adminscale/AdminScaleEditor';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Главная', icon: Home, path: '/adminscale' },
  { label: 'Редактор', icon: PenLine, path: '/adminscale/editor' },
  { label: 'Обзор', icon: Eye, path: '/adminscale/overview' },
  { label: 'Справочник', icon: BookOpen, path: '/adminscale/reference' },
];

function AdminScaleSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ name: string; date: string; data: ScaleData }[]>([]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('adminscale_history') || '[]');
      setHistory(h);
    } catch {}
  }, [location.pathname]);

  const loadScale = (data: ScaleData) => {
    localStorage.setItem('adminscale_current', JSON.stringify(data));
    navigate('/adminscale/editor');
    onNavigate?.();
  };

  const deleteHistoryItem = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem('adminscale_history', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-9 w-9 flex-shrink-0 bg-amber-500/20 rounded-lg flex items-center justify-center">
          <span className="text-lg font-bold text-amber-500">A</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sidebar-foreground text-xs tracking-widest">ADMIN</span>
          <span className="text-[9px] tracking-[0.2em] text-amber-500 font-medium -mt-0.5">SCALE PRO</span>
        </div>
      </div>

      <div className="px-2 pt-3 pb-2">
        <Button variant="ghost" size="sm"
          onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 px-3 text-sidebar-muted hover:text-amber-500 hover:bg-amber-500/10 text-xs">
          <ArrowLeftCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Назад в портал</span>
        </Button>
      </div>
      <div className="mx-3 mb-2 border-t border-sidebar-border/50" />

      <nav className="flex-1 py-1 px-2 overflow-y-auto min-h-0 space-y-0.5">
        {navItems.map(item => {
          const isActive = item.path === '/adminscale'
            ? location.pathname === '/adminscale'
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} onClick={onNavigate}
              className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-amber-500/15 text-amber-500 font-medium' : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50')}>
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-amber-500')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Saved Scales Collapsible */}
        {history.length > 0 && (
          <>
            <div className="mx-1 my-2 border-t border-sidebar-border/50" />
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors">
                {historyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <FileText className="h-3.5 w-3.5" />
                <span className="flex-1 text-left truncate">Сохранённые ({history.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {history.slice(0, 10).map((h, i) => (
                  <button key={i} onClick={() => loadScale(h.data)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-sidebar-muted hover:text-amber-500 hover:bg-amber-500/10 w-full transition-colors group">
                    <span className="flex-1 text-left truncate">{h.name || 'Без названия'}</span>
                    <span className="text-[9px] text-sidebar-muted/50 flex-shrink-0">{new Date(h.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                    <button onClick={(e) => deleteHistoryItem(i, e)}
                      className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 text-sidebar-muted hover:text-destructive transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </nav>

      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <Button variant="ghost" size="sm"
          onClick={() => { signOut(); onNavigate?.(); }}
          className="w-full justify-start gap-3 px-3 text-sidebar-muted hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Выйти</span>
        </Button>
      </div>
    </div>
  );
}

export default function AdminScaleLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <FuturisticOverlay />
      {isMobile ? (
        <div className="fixed top-0 left-0 z-40 h-14 flex items-center px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
              <AdminScaleSidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <aside className="fixed top-0 left-0 h-screen z-30 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
          <AdminScaleSidebarContent />
        </aside>
      )}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 h-screen',
        isMobile ? 'ml-0' : 'ml-56'
      )}>
        <AppHeader />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
