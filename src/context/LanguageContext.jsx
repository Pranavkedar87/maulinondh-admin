import React, { createContext, useContext, useState, useEffect } from 'react';
import mr from '../locales/mr.json';
import hi from '../locales/hi.json';
import en from '../locales/en.json';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('maulinondh_lang') || 'mr';
  });

  useEffect(() => {
    if (language) {
      localStorage.setItem('maulinondh_lang', language);
    }
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  const getTranslation = (path, params = {}) => {
    const translations = { mr, hi, en };
    const currentLang = language || 'mr';
    const dict = translations[currentLang] || translations['mr'];

    const keys = path.split('.');
    let value = dict;

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        return path; // Fallback to path key
      }
    }

    if (typeof value === 'string' && Object.keys(params).length > 0) {
      let templated = value;
      for (const [k, v] of Object.entries(params)) {
        templated = templated.replace(`{${k}}`, v);
      }
      return templated;
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t: getTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
};
