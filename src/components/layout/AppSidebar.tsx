import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarState } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import logoAfm from '@/assets/logo-afm-new.png';
import {
  LayoutDashboard, Users, Building2, RefreshCw, FileText, Shield,
  ChevronLeft, ChevronRight, UserCircle, LogOut, Menu, BookOpen, Calculator, DollarSign, Calendar, MessageSquare, ClipboardList,
  ChevronDown, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TranslationKey } from '@/i18n/translations';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  key: TranslationKey;
  icon: typeof LayoutDashboard;
  path: string;
  adminOnly?: boolean;
  badgeKey?: 'accessRequests' | 'unreadChats';
}

interface NavSection {
  labelKey: TranslationKey;
  id: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    id: 'analytics',
    labelKey: 'nav.dashboard' as TranslationKey,
    items: [
      { key: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { key: 'nav.clients', icon: Building2, path: '/clients' },
      { key: 'nav.reports', icon: FileText, path: '/reports' },
    ],
  },
  {
    id: 'workspace',
    labelKey: 'nav.calendar' as TranslationKey,
    items: [
      { key: 'nav.calendar', icon: Calendar, path: '/calendar' },
      { key: 'nav.tasks' as TranslationKey, icon: ClipboardList, path: '/tasks' },
      { key: 'nav.chat', icon: MessageSquare, path: '/chat', badgeKey: 'unreadChats' },
    ],
  },
  {
    id: 'data',
    labelKey: 'nav.dataSection' as TranslationKey,
    items: [
      { key: 'nav.sync', icon: RefreshCw, path: '/sync' },
      { key: 'nav.audit', icon: Shield, path: '/audit', adminOnly: true },
    ],
  },
  {
    id: 'admin',
    labelKey: 'nav.users' as TranslationKey,
    adminOnly: true,
    items: [
      { key: 'nav.users', icon: Users, path: '/users', adminOnly: true, badgeKey: 'accessRequests' },
      { key: 'nav.broadcasts' as TranslationKey, icon: Megaphone, path: '/broadcasts', adminOnly: true },
      { key: 'nav.budget', icon: DollarSign, path: '/budget', adminOnly: true },
      { key: 'nav.decomposition', icon: Calculator, path: '/decomposition', adminOnly: true },
    ],
  },
  {
    id: 'account',
    labelKey: 'nav.profile' as TranslationKey,
    items: [
      { key: 'nav.glossary', icon: BookOpen, path: '/glossary' },
      { key: 'nav.profile', icon: UserCircle, path: '/profile' },
    ],
  },
];

const sectionLabels: Record<string, TranslationKey> = {
  analytics: 'nav.analyticsSection' as TranslationKey,
  workspace: 'nav.workspaceSection' as TranslationKey,
  data: 'nav.dataSection' as TranslationKey,
  admin: 'nav.adminSection' as TranslationKey,
  account: 'nav.accountSection' as TranslationKey,
};

function useSidebarBadges(isAdmin: boolean) {
  const [badges, setBadges] = useState<Record<string, number>>({});

  const fetchBadges = useCallback(async () => {
    if (!isAdmin) return;
    const [{ count: reqCount }, { count: unreadCount }] = await Promise.all([
      supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false).like('link', '/chat%'),
    ]);
    setBadges({ accessRequests: reqCount || 0, unreadChats: unreadCount || 0 });
  }, [isAdmin]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return badges;
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { agencyRole } = useAuth();
  const location = useLocation();
  const isAdmin = agencyRole === 'AgencyAdmin';
  const isClient = agencyRole === 'Client';
  const badges = useSidebarBadges(isAdmin);

  const clientAllowedPaths = ['/dashboard', '/chat', '/glossary', '/profile'];

  const filteredSections = navSections
    .filter(s => !s.adminOnly || isAdmin)
    .map(s => ({
      ...s,
      items: s.items.filter(item => {
        if (isClient) return clientAllowedPaths.includes(item.path);
        return !item.adminOnly || isAdmin;
      }),
    }))
    .filter(s => s.items.length > 0);

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const badgeCount = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
        title={collapsed ? t(item.key) : undefined}
      >
        <div className="relative flex-shrink-0">
          <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
          {badgeCount > 0 && collapsed && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center px-0.5">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </div>
        {!collapsed && <span className="flex-1 truncate">{t(item.key)}</span>}
        {!collapsed && badgeCount > 0 && (
          <span className="h-5 min-w-[20px] rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center px-1">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-9 w-9 flex-shrink-0 bg-primary/20 rounded-lg flex items-center justify-center overflow-hidden p-0.5">
          <img src={logoAfm} alt="AFM" className="h-8 w-8 object-contain" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground text-sm tracking-widest">AFM</span>
            <span className="text-[10px] tracking-[0.2em] text-primary font-medium -mt-0.5">DIGITAL</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-2">
        {filteredSections.map((section) => {
          const sectionActive = section.items.some(
            item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          );

          if (collapsed) {
            return (
              <div key={section.id} className="space-y-0.5">
                {section.items.map(renderNavItem)}
              </div>
            );
          }

          if (section.items.length === 1) {
            return (
              <div key={section.id}>
                {section.items.map(renderNavItem)}
              </div>
            );
          }

          return (
            <Collapsible key={section.id} defaultOpen={sectionActive || section.id === 'analytics'}>
              <CollapsibleTrigger className="flex items-center w-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-muted/70 hover:text-sidebar-foreground transition-colors group rounded-md hover:bg-sidebar-accent/30">
                <span className="flex-1 text-left">{t(sectionLabels[section.id])}</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90 opacity-50 group-hover:opacity-100" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1 ml-1 border-l border-sidebar-border/40 pl-2">
                {section.items.map(renderNavItem)}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Logout - always at bottom */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
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

  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 z-40 h-14 flex items-center px-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

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
