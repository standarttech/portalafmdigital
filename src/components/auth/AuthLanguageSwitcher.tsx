import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Languages, Moon, Sun } from 'lucide-react';
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
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
          >
            <Languages className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{language}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map(l => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={language === l.code ? 'bg-accent' : ''}
            >
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
