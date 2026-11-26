import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const ARTAJONA_BASES='https://bon.navarra.es/es/anuncio/-/texto/2025/15/25';
export const ARTAJONA_CORRECTION='https://bon.navarra.es/es/anuncio/-/texto/2025/30/25';

function paragraphs(html:string):{organization:string;title:string;items:string[]}{
  const $=load(html);
  return {organization:clean($('p.a-denominacion').first().text()),title:clean($('p.a-titulo').first().text()),items:$('p[class*="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean)};
}

export function parseArtajonaFamiliar(basesHtml:string,correctionHtml:string,now:string):Call{
  const bases=paragraphs(basesHtml),correction=paragraphs(correctionHtml);
  if(bases.organization!=='ARTAJONA'
    ||!bases.title.includes('Convocatoria para la contratación laboral, mediante concurso-oposición, de trabajador/a familiar')
    ||!bases.items.some(item=>item.includes('una plaza de trabajador/a familiar, en régimen laboral, a 66% de jornada'))
    ||!bases.items.some(item=>item.includes('certificado de escolaridad o equivalente'))
    ||!bases.items.some(item=>item.includes('permiso de conducir tipo B y disposición de vehículo'))
    ||!bases.items.some(item=>item.includes('plazo de treinta días naturales contados a partir del día siguiente al de su publicación'))
    ||correction.organization!=='ARTAJONA'
    ||!correction.title.startsWith('Corrección de errores de la convocatoria para la contratación laboral'))throw new Error('Artaxoako langile familiarraren oinarriak ez datoz bat');

  const start=bases.items.indexOf('ANEXO II.–TEMARIO');
  if(start<0)throw new Error('Artaxoako gai-zerrenda ez da identifikatu');
  const topics=bases.items.slice(start+1,start+11);
  const numbering=topics.map(topic=>Number(topic.match(/^(\d{1,2})[.\s]*[–-]/)?.[1]));
  if(numbering.join(',')!=='1,2,3,4,5,6,7,8,9,10'||!topics[9].includes('Atención Integral centrada en la persona'))throw new Error('Artaxoako 10 gaiak ez datoz bat');

  const before=correction.items.findIndex(item=>item==='Donde dice:');
  const after=correction.items.findIndex(item=>item==='Debe decir:');
  const corrected=correction.items[after+1];
  if(before<0||after<0||!correction.items[before+1]?.includes('Decreto Foral 32/2013')
    ||!corrected?.startsWith('Tema 2.–Decreto Foral 48/2020'))throw new Error('Artaxoako 2. gaiaren zuzenketa ez da identifikatu');
  topics[1]=corrected;

  const call=baseCall('artajona-familiar',ARTAJONA_BASES,now,'Navarra');
  call.id=stableId('artajona-familiar','2025-15-25');
  call.title='Trabajador/a familiar · Servicio Social de Base';
  call.organization='Ayuntamiento de Artajona';call.location='Artajona';call.province='Navarra';
  call.category='Servicios';call.group='E';call.places=1;
  call.educationText='Certificado de escolaridad o equivalente.';
  call.acceptedQualifications=[];
  call.deadline=null;call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'Permiso de conducir B y disponibilidad de vehículo.'];
  call.description='Plaza laboral al 66 % de jornada mediante concurso-oposición, con bolsa de contratación temporal. El plazo era de 30 días naturales desde el BON; no se calcula una fecha absoluta. El tema 2 incorpora la corrección publicada el 13/02/2025.';
  call.topics=topics;call.syllabusUrl=ARTAJONA_BASES;
  call.sourceHash=hash(basesHtml+correctionHtml);
  call.documents=[
    {title:'BON 2025/15/25 · bases y diez temas',url:ARTAJONA_BASES,kind:'bases',checkedAt:now,sha256:hash(basesHtml)},
    {title:'BON 2025/30/25 · corrección del tema 2',url:ARTAJONA_CORRECTION,kind:'temario',checkedAt:now,sha256:hash(correctionHtml)}
  ];
  return callSchema.parse(call);
}

export async function scrapeArtajonaFamiliar(client:OfficialClient,now:string):Promise<Call[]>{
  const bases=await client.text(ARTAJONA_BASES);
  const correction=await client.text(ARTAJONA_CORRECTION);
  return [parseArtajonaFamiliar(bases,correction,now)];
}
