import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, TrendingUp, Globe, Settings, DollarSign,
  ArrowLeftCircle, Zap, Menu, LogOut, BarChart3, BarChart2, Sun, Moon,
} from 'lucide-react';
import { useState } from 'react';
import FuturisticOverlay from '@/components/futuristic/FuturisticOverlay';
import type { Language } from '@/i18n/translations';

const afmNavItems = [
  { label: 'afm.dashboard', icon: LayoutDashboard, path: '/afm-internal' },
  { label: 'afm.mediaBuying', icon: TrendingUp, path: '/afm-internal/media' },
  { label: 'afm.socialMedia', icon: Globe, path: '/afm-internal/social' },
  { label: 'afm.sales', icon: DollarSign, path: '/afm-internal/sales' },
  { label: 'afm.tools', icon: BarChart3, path: '/afm-internal/tools' },
  { label: 'afm.finance', icon: BarChart2, path: '/afm-internal/finance' },
  { label: 'afm.settings', icon: Settings, path: '/afm-internal/settings' },
] as const;

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'it', label: 'IT' },
  { code: 'es', label: 'ES' },
  { code: 'ar', label: 'AR' },
  { code: 'fr', label: 'FR' },
];

function AfmSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="px-2 pt-3 pb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 px-3 text-sidebar-muted hover:text-primary hover:bg-primary/10 text-xs"
        >
          <ArrowLeftCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('afm.backToPortal')}</span>
        </Button>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t border-sidebar-border/50" />

      {/* Nav items */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto space-y-0.5 min-h-0">
        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-muted/60">
          {t('nav.internalSection')}
        </p>
        {afmNavItems.map((item) => {
          const isActive = item.path === '/afm-internal'
            ? location.pathname === '/afm-internal'
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
              <span className="truncate">{t(item.label as any)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme & Language */}
      <div className="px-3 py-2 border-t border-sidebar-border/50 space-y-2">
        {/* Theme toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
        {/* Language switcher */}
        <div className="flex flex-wrap gap-1">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors',
                language === lang.code
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

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

export default function AfmInternalLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <FuturisticOverlay />

      {/* Sidebar */}
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

      {/* Main content */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10',
        isMobile ? 'ml-0' : 'ml-56'
      )}>
        {/* Top bar */}
        <header className={cn(
          'h-14 flex items-center px-4 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0',
          isMobile && 'pl-14'
        )}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground text-sm tracking-wide">AFM Digital</span>
            <span className="text-muted-foreground text-xs">— Internal</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Team only</span>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
