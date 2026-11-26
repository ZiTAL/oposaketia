import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const EZCABARTE_BASES='https://bon.navarra.es/es/anuncio/-/texto/2025/149/12';
export const EZCABARTE_CORRECTION='https://bon.navarra.es/es/anuncio/-/texto/2025/166/9';

function article(html:string){
  const $=load(html);
  return {issuer:clean($('p.a-denominacion').first().text()),title:clean($('p.a-titulo').first().text()),
    header:$('h2').toArray().map(node=>clean($(node).text())).find(value=>value.startsWith('BOLETÍN Nº'))??'',
    items:$('p[class^="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean)};
}

export function parseEzcabarte2025(basesHtml:string,correctionHtml:string,now:string):Call{
  const bases=article(basesHtml),correction=article(correctionHtml);
  const start=bases.items.indexOf('ANEXO II.–TEMARIO');
  const end=bases.items.findIndex((item,index)=>index>start&&item.startsWith('ANEXO III.'));
  const programme=start<0||end<0?[]:bases.items.slice(start+1,end);
  const topics=programme.filter(item=>/^Tema \d{1,2}[.–-]/.test(item));
  const numbers=topics.map(item=>Number(item.match(/^Tema (\d{1,2})/)?.[1]));
  const correctionText=correction.items.join(' ');
  if(bases.issuer!=='EZCABARTE'
    ||!bases.title.startsWith('Convocatoria para la provisión, mediante concurso oposición, de tres plazas vacantes')
    ||!bases.header.includes('149 - 28 de julio de 2025')
    ||!bases.items.some(item=>item.includes('tres plazas vacantes de plantilla del puesto de trabajo de empleado/a de servicios múltiples, nivel D'))
    ||!bases.items.some(item=>item.includes('(Graduado Escolar, ESO), o la del título Formación Profesional de 1.º grado o equivalente'))
    ||!bases.items.some(item=>item.includes('permiso de conducir vehículos de la clase B'))
    ||!bases.items.some(item=>item.includes('plazo improrrogable de 20 días naturales')&&item.includes('Si el último día de plazo fuere inhábil'))
    ||numbers.join(',')!=='1,2,3,4,5,6,7,8,9,10,11,12,13'
    ||!programme.slice(-3).every(item=>item.startsWith('–'))
    ||correction.issuer!=='EZCABARTE'
    ||!correction.header.includes('166 - 21 de agosto de 2025')
    ||!correctionText.includes('Debe decir: "El proceso de selección')
    ||!correctionText.includes('aproximadamente en el mes de octubre de 2025'))throw new Error('Ezkabarteko oinarriak, 13 gaiak edo zuzenketa aldatu dira');

  topics[12]+=' '+programme.slice(-3).join(' ');
  const call=baseCall('ezcabarte-2025',EZCABARTE_BASES,now,'Navarra');
  call.id=stableId('ezcabarte-2025','2025-149-12-servicios-multiples');
  call.title='Empleado/a de servicios múltiples · tres plazas';call.organization='Ayuntamiento de Ezcabarte';
  call.location='Ezcabarte';call.province='Navarra';call.category='Servicios';call.group='D';call.places=3;
  call.educationText='Graduado Escolar, ESO, FP de primer grado o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.language=null;call.languageStatus='known';
  call.deadline='2025-08-18';call.status='Cerrada';
  call.requirements=[call.educationText,'Permiso de conducir B.'];
  call.description='Tres plazas funcionariales a jornada completa mediante concurso-oposición y bolsa temporal. El plazo de 20 días naturales desde el BON del 28/07/2025 se prorrogó al lunes 18/08/2025 porque el último día era inhábil. Euskera C1 puntúa como mérito; la corrección posterior cambió a octubre el mes previsto para el inicio de las pruebas.';
  call.topics=topics;call.syllabusUrl=EZCABARTE_BASES;call.sourceHash=hash(basesHtml+correctionHtml);
  call.documents=[
    {title:'BON 2025/149/12 · bases y 13 temas',url:EZCABARTE_BASES,kind:'bases',checkedAt:now,sha256:hash(basesHtml)},
    {title:'BON 2025/166/9 · corrección del calendario',url:EZCABARTE_CORRECTION,kind:'calendario',checkedAt:now,sha256:hash(correctionHtml)}
  ];
  return callSchema.parse(call);
}

export async function scrapeEzcabarte2025(client:OfficialClient,now:string):Promise<Call[]>{
  const bases=await client.text(EZCABARTE_BASES);
  const correction=await client.text(EZCABARTE_CORRECTION);
  return [parseEzcabarte2025(bases,correction,now)];
}
