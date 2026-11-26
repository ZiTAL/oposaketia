import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const CASEDA_NOTICE='https://www.caseda.es/bases-convocatoria-oficial-administrativ-temporal/';
export const CASEDA_BASES='https://www.caseda.es/wp-content/uploads/sites/62/2025/10/20251029-Bases-convocatoria.pdf';

export function parseCaseda(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const linked=$('a[href]').toArray().some(node=>{
    const href=$(node).attr('href');
    if(!href)return false;
    try{return new URL(href,CASEDA_NOTICE).pathname===new URL(CASEDA_BASES).pathname;}catch{return false;}
  });
  const text=clean(basesText);
  if(!linked
    ||!text.includes('Ayuntamiento de Cáseda')
    ||!text.includes('oficial administrativo/a')
    ||!text.includes('constitución, a través de méritos, de una relación')
    ||!text.includes('Titulo de Bachiller, Formación Profesional de Segundo Grado o equivalente')
    ||!text.includes('hasta las 14:00 horas del día 5 de noviembre de 2025'))throw new Error('Casedako oinarriak edo udal-lotura aldatu dira');

  const call=baseCall('caseda',CASEDA_NOTICE,now,'Navarra');
  call.id=stableId('caseda','2025-10-29-oficial-administrativo-temporal');
  call.title='Oficial administrativo/a · lista de contratación temporal';
  call.organization='Ayuntamiento de Cáseda';call.location='Cáseda';call.province='Navarra';
  call.category='Administración';call.group='C';call.places=null;
  call.educationText='Título de Bachiller, Formación Profesional de Segundo Grado o equivalente.';
  call.acceptedQualifications=['bachiller','fp-superior'];
  call.deadline='2025-11-05';call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'Inscripción como demandante de empleo o de mejora de empleo, según las bases.'];
  call.description='Lista municipal para contratación temporal mediante valoración de méritos. No se publica un número de plazas ni un temario de oposición; el baremo de méritos figura en las bases.';
  call.topics=[];call.syllabusUrl=null;
  call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Bases municipales · 29/10/2025',url:CASEDA_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeCaseda(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(CASEDA_NOTICE);
  const bases=await pdfText(client,CASEDA_BASES);
  return [parseCaseda(notice,bases.text,bases.sha256,now)];
}
