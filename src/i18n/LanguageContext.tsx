import React, { createContext, useContext, useState, useCallback } from 'react';
import { Language, translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || key;
  }, [language]);

  const formatCurrency = useCallback((value: number): string => {
    if (language === 'ru') {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }, [language]);

  const formatNumber = useCallback((value: number): string => {
    if (language === 'ru') {
      return new Intl.NumberFormat('ru-RU').format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
