import React, { createContext, useContext, useState, useCallback } from 'react';
import { Language, translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

const localeMap: Record<Language, string> = {
  en: 'en-US', ru: 'ru-RU', it: 'it-IT', es: 'es-ES', ar: 'ar-SA', fr: 'fr-FR',
};

const defaultValue: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: TranslationKey) => {
    const entry = translations[key];
    return entry?.en ?? key;
  },
  formatCurrency: (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v),
  formatNumber: (v: number) => new Intl.NumberFormat('en-US').format(v),
};

const LanguageContext = createContext<LanguageContextType>(defaultValue);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved && ['en', 'ru', 'it', 'es', 'ar', 'fr'].includes(saved)) ? saved as Language : 'en';
  });

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
    // Set dir for Arabic
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  }, [language]);

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat(localeMap[language], {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }, [language]);

  const formatNumber = useCallback((value: number): string => {
    return new Intl.NumberFormat(localeMap[language]).format(value);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, formatCurrency, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
