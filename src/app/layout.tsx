import type { Metadata } from 'next';
import { requestLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/messages';
import { LocaleProvider } from '@/components/i18n';
import './globals.css';
export async function generateMetadata(): Promise<Metadata> {
 const locale=await requestLocale();const tagline=translate(locale,'Buscador de oposiciones de Euskal Herria');
 return {title:{default:`Oposaketia · ${tagline}`,template:`%s · ${tagline}`},description:translate(locale,'Busca oposiciones de Euskadi, Navarra y el País Vasco francés. Consulta los requisitos oficiales sin registro.'),robots:{index:false,follow:false}};
}
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 const locale=await requestLocale();return <html lang={locale} data-scroll-behavior="smooth"><body><LocaleProvider locale={locale}><a className="skip-link" href="#contenido">{translate(locale,'Saltar al contenido')}</a>{children}</LocaleProvider></body></html>;
}
