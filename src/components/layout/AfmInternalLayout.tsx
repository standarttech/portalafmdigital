import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, TrendingUp, Globe, Settings, DollarSign,
  ArrowLeftCircle, Zap, Menu, LogOut, BarChart3, BarChart2, Sun, Moon, Sparkles,
  Languages, ChevronDown, Users, Wrench, LineChart, Banknote,
} from 'lucide-react';
import { useState } from 'react';
import FuturisticOverlay from '@/components/futuristic/FuturisticOverlay';
import type { Language } from '@/i18n/translations';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Nav groups built dynamically using translation keys
function buildNavGroups(t: (key: any) => string): NavGroup[] {
  return [
    {
      id: 'overview',
      label: t('afm.overview'),
      icon: LayoutDashboard,
      items: [
        { label: t('afm.dashboard'), icon: LayoutDashboard, path: '/afm-internal' },
        { label: t('afm.statsDashboard'), icon: BarChart3, path: '/afm-internal/stats' },
      ],
    },
    {
      id: 'marketing',
      label: t('afm.marketing'),
      icon: TrendingUp,
      items: [
        { label: t('afm.mediaBuyingInternal'), icon: TrendingUp, path: '/afm-internal/media' },
        { label: t('afm.socialMediaInternal'), icon: Globe, path: '/afm-internal/social' },
      ],
    },
    {
      id: 'sales',
      label: t('afm.salesGroup'),
      icon: Users,
      items: [
        { label: t('afm.salesCrm'), icon: DollarSign, path: '/afm-internal/sales' },
      ],
    },
    {
      id: 'finance',
      label: t('afm.financeGroup'),
      icon: Banknote,
      items: [
        { label: t('afm.incomePlan'), icon: LineChart, path: '/afm-internal/income-plan' },
        { label: t('afm.financialPlanning'), icon: BarChart2, path: '/afm-internal/financial-planning' },
      ],
    },
    {
      id: 'workspace',
      label: t('afm.workspace'),
      icon: Wrench,
      items: [
        { label: t('afm.internalTools'), icon: Wrench, path: '/afm-internal/tools' },
        { label: t('afm.internalSettings'), icon: Settings, path: '/afm-internal/settings' },
      ],
    },
  ];
}

function NavGroupItem({ group, onNavigate }: { group: NavGroup; onNavigate?: () => void }) {
  const location = useLocation();

  // Check if any item in this group is active
  const isGroupActive = group.items.some(item => {
    if (item.path === '/afm-internal') return location.pathname === '/afm-internal';
    return location.pathname.startsWith(item.path);
  });

  const [open, setOpen] = useState(isGroupActive);

  const GroupIcon = group.icon;

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors',
          isGroupActive
            ? 'text-primary'
            : 'text-sidebar-muted/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30'
        )}
      >
        <GroupIcon className={cn('h-3.5 w-3.5 flex-shrink-0', isGroupActive && 'text-primary')} />
        <span className="flex-1 text-left uppercase tracking-[0.1em]">{group.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-3 pl-3 border-l border-sidebar-border/40 space-y-0.5 mt-0.5 mb-1">
          {group.items.map(item => {
            const isActive = item.path === '/afm-internal'
              ? location.pathname === '/afm-internal'
              : location.pathname.startsWith(item.path);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <ItemIcon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive && 'text-primary')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AfmSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const NAV_GROUPS = buildNavGroups(t);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-9 w-9 flex-shrink-0 bg-primary/20 rounded-lg flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sidebar-foreground text-xs tracking-widest">AFM</span>
          <span className="text-[9px] tracking-[0.2em] text-primary font-medium -mt-0.5">INTERNAL</span>
        </div>
      </div>

      {/* Back to Portal */}
      <div className="px-2 pt-3 pb-2">
      <Button
          variant="ghost"
          size="sm"
          onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 px-3 text-sidebar-muted hover:text-primary hover:bg-primary/10 text-xs"
        >
          <ArrowLeftCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('afm.backToPortal2')}</span>
        </Button>
      </div>

      <div className="mx-3 mb-2 border-t border-sidebar-border/50" />

      {/* Nav groups */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto min-h-0 space-y-0">
        {NAV_GROUPS.map(group => (
          <NavGroupItem key={group.id} group={group} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); onNavigate?.(); }}
          className="w-full justify-start gap-3 px-3 text-sidebar-muted hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">{t('auth.logout')}</span>
        </Button>
      </div>
    </div>
  );
}

function AfmHeaderControls() {
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme, fxEnabled, toggleFx } = useTheme();
  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleFx}
        title="Futuristic FX"
        className={cn(
          'p-1.5 rounded-md text-xs transition-colors',
          fxEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-xs font-medium">
            <Languages className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
            <span className="sm:hidden">{currentLang.flag}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {LANGUAGES.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn('flex items-center gap-2 text-sm cursor-pointer', language === lang.code && 'text-primary font-medium')}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {language === lang.code && <span className="ml-auto text-primary text-xs">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function AfmInternalLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
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
              <AfmSidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <aside className="fixed top-0 left-0 h-screen z-30 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
          <AfmSidebarContent />
        </aside>
      )}

      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10',
        isMobile ? 'ml-0' : 'ml-56'
      )}>
        <header className={cn(
          'h-14 flex items-center px-3 sm:px-4 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0 gap-2',
          isMobile && 'pl-14'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-foreground text-sm tracking-wide truncate">AFM Digital</span>
            <span className="text-muted-foreground text-xs hidden sm:block flex-shrink-0">— Internal</span>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <AfmHeaderControls />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <span className="text-xs text-muted-foreground hidden lg:block">Team only</span>
          </div>
        </header>

        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
