'use client';
import NextLink from 'next/link';
import { createContext, useContext, useEffect, type ComponentProps, type ReactNode } from 'react';
import { defaultLocale, isLocale, localeStorageKey, localizedPath, pathLocale, type Locale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/messages';
const LocaleContext = createContext<Locale>(defaultLocale);
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    const path = window.location.pathname + window.location.search + window.location.hash;
    try {
      const saved = localStorage.getItem(localeStorageKey);
      if (!pathLocale(window.location.pathname) && isLocale(saved) && saved !== locale) {
        window.location.replace(localizedPath(path, saved)); return;
      }
      localStorage.setItem(localeStorageKey, locale);
    } catch { /* Language URLs remain usable when browser storage is blocked. */ }
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const locale = useContext(LocaleContext);
  return { locale, t: (key: string, values?: Record<string,string|number>) => translate(locale,key,values),
    date: (value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }) => new Intl.DateTimeFormat(locale,{...options,timeZone:'Europe/Madrid'}).format(new Date(value)) };
}
export function LocaleLink({ href, ...props }: Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string }) {
  const {locale}=useLocale();return <NextLink href={localizedPath(href,locale)} {...props}/>;
}
export function LanguageSwitcher() {
  const {locale,t}=useLocale();
  const languages = [['eu','Euskara'],['es','Español'],['fr','Français']] as const;
  return <div className="locale-switch" role="group" aria-label={t('Idioma de la interfaz')} data-testid="language-switcher">{languages.map(([code,name])=><button type="button" key={code} lang={code} title={name} aria-label={name} aria-pressed={locale===code} onClick={()=>{
    try{localStorage.setItem(localeStorageKey,code);}catch{}
    window.location.assign(localizedPath(window.location.pathname+window.location.search+window.location.hash,code));
  }}>{code.toUpperCase()}</button>)}</div>;
}
export function SiteFooter() {
  return <footer className="shell footer"><span className="footer-brand">oposaketia.</span><span>Euskal Herriko oposaketa bilatzailea</span></footer>;
}
