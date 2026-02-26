import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ArrowLeftCircle, Menu, LogOut, Kanban, Users2, Webhook, Settings, LayoutGrid,
  Sun, Moon, Sparkles, Languages, Tag, FileText, BarChart3,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

interface CrmNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

function buildCrmNav(t: (key: any) => string): CrmNavItem[] {
  return [
    { label: 'Pipeline', icon: Kanban, path: '/crm' },
    { label: 'Leads', icon: Users2, path: '/crm/leads' },
    { label: 'Analytics', icon: BarChart3, path: '/crm/analytics' },
    { label: 'Webhooks', icon: Webhook, path: '/crm/webhooks' },
    { label: 'Settings', icon: Settings, path: '/crm/settings' },
  ];
}

function CrmSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const navItems = buildCrmNav(t);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-3 flex-shrink-0">
        <div className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))' }}>
          <Kanban className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sidebar-foreground text-xs tracking-widest">CRM</span>
          <span className="text-[9px] tracking-[0.2em] text-primary font-medium -mt-0.5">MODULE</span>
        </div>
      </div>

      {/* Back to portal */}
      <div className="px-2 pt-3 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 px-3 text-sidebar-muted hover:text-primary hover:bg-primary/10 text-xs"
        >
          <ArrowLeftCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Back to Platform</span>
        </Button>
      </div>

      <div className="mx-3 mb-2 border-t border-sidebar-border/50" />

      {/* Nav items */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto min-h-0 space-y-0.5">
        {navItems.map(item => {
          const isActive = item.path === '/crm'
            ? location.pathname === '/crm'
            : location.pathname.startsWith(item.path);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <ItemIcon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
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
          <span className="text-sm">Logout</span>
        </Button>
      </div>
    </div>
  );
}

function CrmHeaderControls() {
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

export default function CrmLayout() {
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
              <CrmSidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <aside className="fixed top-0 left-0 h-screen z-30 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300">
          <CrmSidebarContent />
        </aside>
      )}

      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 h-screen',
        isMobile ? 'ml-0' : 'ml-56'
      )}>
        <header className={cn(
          'h-14 flex items-center px-3 sm:px-4 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0 gap-2',
          isMobile && 'pl-14'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <Kanban className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-foreground text-sm tracking-wide truncate">CRM</span>
            <span className="text-muted-foreground text-xs hidden sm:block flex-shrink-0">— Pipeline & Leads</span>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <CrmHeaderControls />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          </div>
        </header>

        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
