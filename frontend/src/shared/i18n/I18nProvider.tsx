import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { dictionaries, type Locale, type TranslationKey } from './dictionaries';

const STORAGE_KEY = 'prezgen.locale';

type Params = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, params?: Params) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyParams(text: string, params?: Params): string {
  if (!params) return text;
  return Object.entries(params).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)), text);
}

function getInitialLocale(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'ru' || saved === 'en') return saved;
  return 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => {
        const dictionary = dictionaries[locale];
        const template = dictionary[key] || dictionaries.en[key] || key;
        return applyParams(template, params);
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
