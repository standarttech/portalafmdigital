import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Languages, Sparkles, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/i18n/translations';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

const themeOptions: { id: ColorScheme | 'dark' | 'light'; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'midnight-blue', label: 'Midnight Blue', icon: '🌊' },
  { id: 'midnight-red', label: 'Midnight Red', icon: '🔥' },
  { id: 'clean-light', label: 'Clean Light', icon: '💎' },
];

export default function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, fxEnabled, toggleFx, colorScheme, setColorScheme } = useTheme();
  const isFuturistic = fxEnabled;
  const activeThemeId = colorScheme !== 'default' ? colorScheme : theme;

  const handleThemeSelect = (id: string) => {
    if (id === 'dark' || id === 'light') setTheme(id);
    else setColorScheme(id as ColorScheme);
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
      <TooltipProvider delayDuration={300}>
        {/* Theme Picker */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Theme</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {themeOptions.map(opt => (
              <DropdownMenuItem key={opt.id} onClick={() => handleThemeSelect(opt.id)} className={activeThemeId === opt.id ? 'bg-accent' : ''}>
                {opt.icon} {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* FX toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-colors",
                isFuturistic ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={toggleFx}
            >
              <Sparkles className={cn("h-4 w-4", isFuturistic && "animate-pulse")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isFuturistic ? 'Disable FX' : 'FX ✨'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8">
            <Languages className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{language}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map(l => (
            <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)} className={language === l.code ? 'bg-accent' : ''}>
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
