import { SiteFooter } from '@/components/i18n';
import { Header } from '@/components/header';
import { Explorer } from '@/components/explorer';
export const dynamic = 'force-dynamic';
export default function Home() {
  return <><Header/><main id="contenido"><Explorer/></main><SiteFooter/></>;
}
