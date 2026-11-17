import { SourcesView } from '@/components/sources-view';
import { requestLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/messages';
export const dynamic='force-dynamic';
export async function generateMetadata(){return{title:translate(await requestLocale(),'Fuentes y cobertura')};}
export default function SourcesPage(){return <SourcesView/>;}
