import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import logoAfm from '@/assets/logo-afm.png';
import {
  LayoutDashboard, Users, Building2, RefreshCw, FileText, Shield,
  ChevronLeft, ChevronRight, UserCircle, LogOut, Menu, X, BookOpen, Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { TranslationKey } from '@/i18n/translations';
import { useState } from 'react';

interface NavItem {
  key: TranslationKey;
  icon: typeof LayoutDashboard;
  path: string;
  adminOnly?: boolean;
  section?: 'main' | 'admin' | 'user';
}

const navItems: NavItem[] = [
  { key: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard', section: 'main' },
  { key: 'nav.clients', icon: Building2, path: '/clients', section: 'main' },
  { key: 'nav.reports', icon: FileText, path: '/reports', section: 'main' },
  { key: 'nav.sync', icon: RefreshCw, path: '/sync', section: 'main' },
  { key: 'nav.users', icon: Users, path: '/users', section: 'admin', adminOnly: true },
  { key: 'nav.audit', icon: Shield, path: '/audit', section: 'admin', adminOnly: true },
  { key: 'nav.decomposition', icon: Calculator, path: '/decomposition', section: 'admin', adminOnly: true },
  { key: 'nav.glossary', icon: BookOpen, path: '/glossary', section: 'user' },
  { key: 'nav.profile', icon: UserCircle, path: '/profile', section: 'user' },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const { agencyRole, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = agencyRole === 'AgencyAdmin';

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const mainItems = filteredItems.filter(i => i.section === 'main');
  const adminItems = filteredItems.filter(i => i.section === 'admin');
  const userItems = filteredItems.filter(i => i.section === 'user');

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
        title={collapsed ? t(item.key) : undefined}
      >
        <item.icon className={cn('h-4.5 w-4.5 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && <span>{t(item.key)}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-8 w-8 flex-shrink-0 bg-primary/20 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={logoAfm} alt="AFM" className="h-5 w-auto" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground text-sm tracking-widest">AFM</span>
            <span className="text-[10px] tracking-[0.2em] text-primary font-medium -mt-0.5">DIGITAL</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <div className="space-y-1">{mainItems.map(renderNavItem)}</div>

        {adminItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-sidebar-border/50">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/60">Admin</p>
            )}
            <div className="space-y-1">{adminItems.map(renderNavItem)}</div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-sidebar-border/50">
          <div className="space-y-1">{userItems.map(renderNavItem)}</div>
        </div>
      </nav>

      {/* Logout + Collapse */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); onNavigate?.(); }}
          className={cn(
            'w-full text-sidebar-muted hover:text-destructive hover:bg-destructive/10',
            collapsed ? 'justify-center' : 'justify-start gap-3 px-3'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm">{t('auth.logout')}</span>}
        </Button>
      </div>
    </>
  );
}

export default function AppSidebar() {
  const isMobile = useIsMobile();
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile: use Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile trigger button — rendered in header area */}
        <div className="fixed top-0 left-0 z-40 h-14 flex items-center px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-30 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
