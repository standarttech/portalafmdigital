import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'futuristic', icon: Sparkles, label: 'Futuristic' },
];

export default function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme, isFuturistic } = useTheme();

  const ThemeIcon = theme === 'futuristic' ? Sparkles : theme === 'dark' ? Moon : Sun;

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isFuturistic && "text-primary")}
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {themeOptions.map(opt => (
            <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)} className={cn(theme === opt.value && 'bg-accent')}>
              <opt.icon className="h-4 w-4 mr-2" />
              {opt.label}
              {opt.value === 'futuristic' && <span className="ml-auto text-[10px] text-primary font-medium">PRO</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
