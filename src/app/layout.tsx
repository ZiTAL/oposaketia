import type { Metadata } from 'next';
import { requestLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/messages';
import { LocaleProvider } from '@/components/i18n';
import './globals.css';
export async function generateMetadata(): Promise<Metadata> {
 const locale=await requestLocale();return {title:{default:translate(locale,'Oposaketia · Tu próximo paso empieza aquí'),template:'%s · Oposaketia'},description:translate(locale,'Explora oposiciones de Euskadi, Navarra y el País Vasco francés según tus estudios e idiomas. Sin registro.'),robots:{index:false,follow:false}};
}
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 const locale=await requestLocale();return <html lang={locale} data-scroll-behavior="smooth"><body><LocaleProvider locale={locale}><a className="skip-link" href="#contenido">{translate(locale,'Saltar al contenido')}</a>{children}</LocaleProvider></body></html>;
}
