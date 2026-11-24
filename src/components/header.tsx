'use client';
import { ArrowUpRight } from 'lucide-react';
import { LocaleLink as Link, LanguageSwitcher, useLocale } from './i18n';
export function Header() {
  const {t}=useLocale();
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" className="brand" aria-label={t('Oposaketia Beta, inicio')}><span className="brand-symbol">o<span>↗</span></span>oposaketia<span className="brand-dot">.</span><span className="beta-badge">Beta</span></Link>
    <nav aria-label={t('Navegación principal')}><Link href="/">{t('Explorar oposiciones')} <ArrowUpRight size={15}/></Link><Link href="/fuentes" className="sources-nav">{t('Fuentes')}</Link><a href="/api/docs" className="api-nav">API</a><span className="private-pill"><span/> {t('Sin registro. A tu ritmo.')}</span><LanguageSwitcher/></nav>
  </div></header>;
}
