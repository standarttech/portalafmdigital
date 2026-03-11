import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SimulatedUser } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Languages, LogOut, User, ChevronDown, Sparkles, Palette, UserCircle, Eye, X, Users, Repeat2, UserPlus } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const ALL_PREVIEW_ROLES = [
  { role: null as any, label: 'Agency Admin', emoji: '👑' },
  { role: 'MediaBuyer', label: 'Media Buyer', emoji: '📊' },
  { role: 'Manager', label: 'Manager', emoji: '📋' },
  { role: 'SalesManager', label: 'Sales Manager', emoji: '💼' },
  { role: 'AccountManager', label: 'Account Manager', emoji: '🤝' },
  { role: 'Designer', label: 'Designer', emoji: '🎨' },
  { role: 'Copywriter', label: 'Copywriter', emoji: '✍️' },
  { role: 'Client', label: 'Client', emoji: '👤' },
];

export default function AppHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { user, agencyRole, effectiveRole, viewAsRole, setViewAsRole, simulatedUser, setSimulatedUser, signOut, linkedAccounts, switchAccount } = useAuth();
  const { theme, setTheme, fxEnabled, toggleFx, colorScheme, setColorScheme } = useTheme();
  const navigate = useNavigate();
  const isFuturistic = fxEnabled;
  const isRealAdmin = agencyRole === 'AgencyAdmin';
  const isPreviewing = (viewAsRole && viewAsRole !== agencyRole) || simulatedUser;

  const activeThemeId = colorScheme !== 'default' ? colorScheme : theme;

  const handleThemeSelect = (id: string) => {
    if (id === 'dark' || id === 'light') setTheme(id);
    else setColorScheme(id as ColorScheme);
  };

  // Lazy-load all users only when simulation submenu is opened
  const [simMenuOpened, setSimMenuOpened] = useState(false);
  const { data: allUsers = [] } = useQuery({
    queryKey: ['header-all-users-for-sim'],
    queryFn: async () => {
      const { data } = await supabase.from('agency_users').select('user_id, display_name, agency_role').order('display_name');
      return data || [];
    },
    enabled: isRealAdmin && simMenuOpened,
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectRole = (role: any) => {
    setSimulatedUser(null);
    setViewAsRole(role);
  };

  const handleSelectUser = (u: { user_id: string; display_name: string | null; agency_role: string }) => {
    setViewAsRole(null);
    setSimulatedUser({
      userId: u.user_id,
      displayName: u.display_name || u.user_id.slice(0, 8),
      role: u.agency_role as any,
    });
  };

  const handleExitSimulation = () => {
    setViewAsRole(null);
    setSimulatedUser(null);
  };

  const previewLabel = simulatedUser
    ? `${simulatedUser.displayName} (${simulatedUser.role})`
    : viewAsRole === 'MediaBuyer' ? t('role.mediaBuyer')
    : viewAsRole === 'Client' ? (t('role.client' as any) || 'Client')
    : viewAsRole || '';

  const handleQuickSwitch = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === user?.id) return;
    const { error } = await switchAccount(targetUserId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('profile.accountSwitched'));
  };

  return (
    <div className="flex flex-col relative z-10 sticky top-0 bg-background/95 backdrop-blur-sm">
      {/* Preview Banner */}
      {isPreviewing && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">
              {simulatedUser ? '👁 Просмотр как' : (t('admin.viewingAs' as any) || 'Viewing as')}: <strong>{previewLabel}</strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExitSimulation}
            className="h-6 text-xs text-amber-500 hover:text-amber-400 gap-1 px-2">
            <X className="h-3 w-3" /> {t('common.back')}
          </Button>
        </div>
      )}

      {/* Main Header */}
      <header className={cn(
        "h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between pl-14 sm:pl-4 lg:pl-6 pr-3 sm:pr-4 lg:pr-6",
        isFuturistic && "bg-card/30 border-border/30"
      )}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">
            {effectiveRole || ''}
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
          <NotificationCenter />

          {/* Theme - hide on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex">
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

          {/* FX - hide on mobile */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon"
                  className={cn("h-8 w-8 transition-colors hidden sm:flex",
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
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{agencyRole || 'User'}</p>
              </div>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2">
                <UserCircle className="h-4 w-4" /> {t('nav.profile')}
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm">
                  <Repeat2 className="h-3.5 w-3.5" /> {t('profile.multiAccount')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72 max-h-[320px] overflow-y-auto">
                  {linkedAccounts.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">{t('profile.noLinkedAccounts')}</div>
                  ) : (
                    linkedAccounts.map((account) => (
                      <DropdownMenuItem
                        key={account.userId}
                        disabled={account.userId === user?.id}
                        onClick={() => handleQuickSwitch(account.userId)}
                        className="flex flex-col items-start gap-0"
                      >
                        <span className="text-sm font-medium truncate max-w-full">{account.displayName || account.email}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full">
                          {account.email} {account.agencyRole ? `• ${account.agencyRole}` : ''}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2">
                    <UserPlus className="h-3.5 w-3.5" /> {t('profile.addAccount')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Role Preview — only for real admins */}
              {isRealAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> Симуляция роли
                  </DropdownMenuLabel>
                  {ALL_PREVIEW_ROLES.map(pr => {
                    const isActive = !simulatedUser && (pr.role === null ? !viewAsRole : viewAsRole === pr.role);
                    return (
                      <DropdownMenuItem
                        key={pr.role || 'admin'}
                        onClick={() => handleSelectRole(pr.role)}
                        className={cn('text-sm gap-2', isActive && 'bg-primary/10')}
                      >
                        <span>{pr.emoji}</span> {pr.label}
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-sm" onClick={() => setSimMenuOpened(true)}>
                      <Users className="h-3.5 w-3.5" /> Просмотр как пользователь
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto w-56">
                      {allUsers.filter(u => u.user_id !== user?.id).map(u => (
                        <DropdownMenuItem
                          key={u.user_id}
                          onClick={() => handleSelectUser(u)}
                          className={cn(
                            'flex flex-col items-start gap-0',
                            simulatedUser?.userId === u.user_id && 'bg-primary/10'
                          )}
                        >
                          <span className="text-sm font-medium">{u.display_name || u.user_id.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground">{u.agency_role}</span>
                        </DropdownMenuItem>
                      ))}
                      {allUsers.length <= 1 && (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">Нет других пользователей</div>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
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
