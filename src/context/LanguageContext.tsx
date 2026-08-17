import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getInitialLanguage, setLanguagePreference, TRANSLATIONS, t as translate } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => getInitialLanguage());

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    setLanguagePreference(lang);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'de' ? 'en' : 'de';
    setLanguage(nextLang);
  };

  const t = (key: string) => {
    return translate(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'de',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string) => translate(key, 'de'),
    };
  }
  return context;
};
