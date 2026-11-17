import { notFound } from 'next/navigation';
import { CallView } from '@/components/call-view';
import { getCallFromApi } from '@/lib/api/server';
import { ApiError } from '@/lib/api/client';
import { requestLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/messages';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const locale=await requestLocale();
 try {const {call}=await getCallFromApi(id);return{title:call?.title??translate(locale,'Oposición no encontrada')};}
 catch{return{title:translate(locale,'Catálogo no disponible')};}
}
export default async function CallPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;try{const {call}=await getCallFromApi(id);return <CallView call={call}/>;}catch(error){if(error instanceof ApiError&&error.status===404)notFound();throw error;}
}
