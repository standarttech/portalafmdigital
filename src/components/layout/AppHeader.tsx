import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Languages, LogOut, User, ChevronDown, Sun, Moon, Sparkles } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';

const languageOptions: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'futuristic', icon: Sparkles, label: 'Futuristic' },
];

export default function AppHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { user, agencyRole, signOut } = useAuth();
  const { theme, setTheme, isFuturistic } = useTheme();

  return (
    <header className={cn(
      "h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between pl-14 sm:pl-4 lg:pl-6 pr-3 sm:pr-4 lg:pr-6 overflow-hidden relative z-10",
      isFuturistic && "bg-card/30 border-border/30"
    )}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">
          {agencyRole === 'AgencyAdmin' ? t('role.agencyAdmin') : agencyRole === 'MediaBuyer' ? t('role.mediaBuyer') : ''}
        </span>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
        <NotificationCenter />

        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground",
                isFuturistic && "text-primary animate-pulse"
              )}
            >
              {theme === 'futuristic' ? <Sparkles className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themeOptions.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(theme === opt.value && 'bg-accent')}
              >
                <opt.icon className="h-4 w-4 mr-2" />
                {opt.label}
                {opt.value === 'futuristic' && <span className="ml-auto text-[10px] text-primary font-medium">PRO</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languageOptions.map(opt => (
              <DropdownMenuItem
                key={opt.code}
                onClick={() => setLanguage(opt.code)}
                className={language === opt.code ? 'bg-accent' : ''}
              >
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
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{agencyRole || 'User'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
