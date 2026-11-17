'use client';
import { LocaleLink as Link, useLocale } from '@/components/i18n';
export default function ErrorPage({reset}:{reset:()=>void}){const {t}=useLocale();return <main id="contenido" className="not-found"><h1>{t('No podemos cargar esta página.')}</h1><p>{t('Vuelve a intentarlo dentro de un momento.')}</p><button className="hero-link" onClick={reset}>{t('Volver a intentar')}</button><p><Link href="/">{t('Volver al buscador')}</Link></p></main>;}
