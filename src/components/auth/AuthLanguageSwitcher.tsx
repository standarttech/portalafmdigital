import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export default function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Languages className="h-4 w-4" />
        <span className="text-xs font-medium">{language === 'ru' ? 'EN' : 'RU'}</span>
      </Button>
    </div>
  );
}
