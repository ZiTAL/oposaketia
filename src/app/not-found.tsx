'use client';
import { LocaleLink as Link, useLocale } from '@/components/i18n';
import { Header } from '@/components/header';
export default function NotFound(){const {t}=useLocale();return <><Header/><main id="contenido" className="not-found"><h1>{t('No encontramos esa oposición.')}</h1><p>{t('Puede que la dirección haya cambiado o que ya no esté en el catálogo.')}</p><Link href="/">{t('Volver al buscador')}</Link></main></>;}
