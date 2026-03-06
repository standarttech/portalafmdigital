import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Languages, LogOut, User, ChevronDown, Sparkles, Palette, UserCircle, Eye, X } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const languageOptions: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const themeOptions: { id: ColorScheme | 'dark' | 'light'; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'midnight-blue', label: 'Midnight Blue', icon: '🌊' },
  { id: 'clean-light', label: 'Clean Light', icon: '💎' },
];

const previewRoles = [
  { role: null as any, labelKey: 'role.agencyAdmin', emoji: '👑', descKey: 'admin.fullAccess' },
  { role: 'MediaBuyer' as const, labelKey: 'role.mediaBuyer', emoji: '📊', descKey: 'admin.clientAccess' },
  { role: 'Client' as const, labelKey: 'role.client', emoji: '👤', descKey: 'admin.minimalAccess' },
];

export default function AppHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { user, agencyRole, effectiveRole, viewAsRole, setViewAsRole, signOut } = useAuth();
  const { theme, setTheme, fxEnabled, toggleFx, colorScheme, setColorScheme } = useTheme();
  const navigate = useNavigate();
  const isFuturistic = fxEnabled;
  const isRealAdmin = agencyRole === 'AgencyAdmin';
  const isPreviewing = viewAsRole && viewAsRole !== agencyRole;

  const activeThemeId = colorScheme !== 'default' ? colorScheme : theme;

  const handleThemeSelect = (id: string) => {
    if (id === 'dark' || id === 'light') setTheme(id);
    else setColorScheme(id as ColorScheme);
  };

  return (
    <div className="flex flex-col relative z-10">
      {/* Preview Banner */}
      {isPreviewing && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">
              {t('admin.viewingAs' as any) || 'Viewing as'}: <strong>{viewAsRole === 'MediaBuyer' ? t('role.mediaBuyer') : viewAsRole === 'Client' ? t('role.client' as any) || 'Client' : viewAsRole}</strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setViewAsRole(null)}
            className="h-6 text-xs text-amber-500 hover:text-amber-400 gap-1 px-2">
            <X className="h-3 w-3" /> {t('common.back')}
          </Button>
        </div>
      )}

      {/* Main Header */}
      <header className={cn(
        "h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between pl-14 sm:pl-4 lg:pl-6 pr-3 sm:pr-4 lg:pr-6 overflow-hidden",
        isFuturistic && "bg-card/30 border-border/30"
      )}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">
            {effectiveRole === 'AgencyAdmin' ? t('role.agencyAdmin') : effectiveRole === 'MediaBuyer' ? t('role.mediaBuyer') : effectiveRole === 'Client' ? (t('role.client' as any) || 'Client') : ''}
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
          <NotificationCenter />

          {/* Theme */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              {themeOptions.map(opt => (
                <DropdownMenuItem key={opt.id} onClick={() => handleThemeSelect(opt.id)}
                  className={activeThemeId === opt.id ? 'bg-accent' : ''}>
                  {opt.icon} {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* FX */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon"
                  className={cn("h-8 w-8 transition-colors",
                    isFuturistic ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
                  )} onClick={toggleFx}>
                  <Sparkles className={cn("h-4 w-4", isFuturistic && "animate-pulse")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {isFuturistic ? 'Disable FX' : 'Enable FX ✨'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Languages className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languageOptions.map(opt => (
                <DropdownMenuItem key={opt.code} onClick={() => setLanguage(opt.code)}
                  className={language === opt.code ? 'bg-accent' : ''}>
                  {opt.flag} {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-1.5 text-muted-foreground px-1.5 sm:px-3">
                <User className="h-4 w-4" />
                <span className="text-xs font-medium max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">
                  {user?.email}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{agencyRole || 'User'}</p>
              </div>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2">
                <UserCircle className="h-4 w-4" /> {t('nav.profile')}
              </DropdownMenuItem>

              {/* Role Preview — only for real admins */}
              {isRealAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> {t('admin.viewAsRole' as any) || 'View as role'}
                  </DropdownMenuLabel>
                  {previewRoles.map(pr => {
                    const isActive = pr.role === null ? !viewAsRole : viewAsRole === pr.role;
                    return (
                      <DropdownMenuItem
                        key={pr.role || 'admin'}
                        onClick={() => setViewAsRole(pr.role)}
                        className={cn('flex flex-col items-start gap-0', isActive && 'bg-primary/10')}
                      >
                        <span className="text-sm">{pr.emoji} {t(pr.labelKey as any) || pr.labelKey}</span>
                        <span className="text-[10px] text-muted-foreground">{t(pr.descKey as any) || pr.descKey}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive gap-2">
                <LogOut className="h-4 w-4" /> {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
