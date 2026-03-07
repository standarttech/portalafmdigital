import React, { createContext, useContext, useState, useCallback } from 'react';
import { websiteTranslations, type WebsiteLang, type WebsiteTranslationKey } from './websiteTranslations';

interface WebsiteLangContextType {
  lang: WebsiteLang;
  setLang: (l: WebsiteLang) => void;
  t: (key: WebsiteTranslationKey) => string;
}

const WebsiteLangContext = createContext<WebsiteLangContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => websiteTranslations[key]?.en ?? key,
});

export function WebsiteLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<WebsiteLang>(() => {
    const saved = localStorage.getItem('afm-website-lang');
    return (saved && ['en', 'ru', 'es', 'it'].includes(saved)) ? saved as WebsiteLang : 'en';
  });

  const setLang = useCallback((l: WebsiteLang) => {
    setLangState(l);
    localStorage.setItem('afm-website-lang', l);
  }, []);

  const t = useCallback((key: WebsiteTranslationKey): string => {
    const entry = websiteTranslations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }, [lang]);

  return (
    <WebsiteLangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </WebsiteLangContext.Provider>
  );
}

export function useWebsiteLang() {
  return useContext(WebsiteLangContext);
}
