import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Languages, Moon, Sun, Sparkles } from 'lucide-react';
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

export default function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, isFuturistic } = useTheme();

  const isDark = theme === 'dark' || theme === 'futuristic';

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
      <TooltipProvider delayDuration={300}>
        {/* Dark / Light toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isDark ? 'Light mode' : 'Dark mode'}</TooltipContent>
        </Tooltip>

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
              onClick={() => setTheme(isFuturistic ? (isDark ? 'dark' : 'light') : 'futuristic')}
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
