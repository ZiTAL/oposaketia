import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,educationIds,stableId} from './shared';

export const MONCAYO_BASES='https://bon.navarra.es/es/anuncio/-/texto/2020/26/23';

export function parseMoncayoBases(html:string,now:string):Call{
 const $=load(html);
 const organization=clean($('p.a-denominacion').first().text());
 const title=clean($('p.a-titulo').first().text());
 const paragraphs=$('p[class*="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean);
 if(organization!=='MANCOMUNIDAD DE AGUAS DEL MONCAYO'
  ||!title.startsWith('Modificación convocatoria para la provisión, mediante concurso-oposición de dos puestos de trabajo de Encargado/a')
  ||!paragraphs.some(p=>/Resolución de Presidencia número 3\/2020, de 10 de enero/i.test(p))
  ||!paragraphs.some(p=>/La primera, al turno libre/i.test(p))
  ||!paragraphs.some(p=>/La segunda, al turno de promoción/i.test(p))
  ||!paragraphs.some(p=>/título de Bachiller, del título de FPII o titulación equivalente/i.test(p))
  ||!paragraphs.some(p=>/carnet de conducir, clase C/i.test(p))
  ||!paragraphs.some(p=>/tarjeta de cualificación del conductor \(CAP\)/i.test(p))
  ||!paragraphs.some(p=>/plazo de 30 días naturales a partir del siguiente al de la publicación/i.test(p)))throw new Error('Bases BON de Moncayo no identificadas');
 const index=paragraphs.findIndex(p=>p==='Temario');
 const topics=index<0?[]:paragraphs.slice(index+1).filter(p=>/^\d{1,2}\.\s/.test(p));
 const numbering=topics.map(topic=>Number(topic.match(/^\d+/)?.[0]));
 if(topics.length!==15||numbering.join(',')!==[1,2,3,4,5,6,7,8,9,10,11,12,11,13,14].join(',')||!topics[14].includes('Seguridad y salud en el trabajo'))throw new Error('Anexo II de Moncayo no identificado');
 const call=baseCall('moncayo',MONCAYO_BASES,now,'Navarra');
 call.id=stableId('moncayo','2020-26-23-turno-libre');
 call.title='Encargado/a · turno libre';
 call.organization='Mancomunidad de Aguas del Moncayo';
 call.location='Ribera de Navarra';call.province='Navarra';call.category='Servicios';call.places=1;
 call.educationText='Bachiller, FPII o titulación equivalente.';
 call.acceptedQualifications=educationIds(call.educationText);
 call.deadline=null;call.status='Cerrada';
 call.requirements=[call.educationText,'Permiso de conducir C.','Tarjeta de cualificación del conductor (CAP) antes del nombramiento.'];
 call.topics=topics;
 call.description='Bases corregidas del BON de 7 de febrero de 2020: dos plazas en total, una de turno libre y otra de promoción. Se incorpora solo la plaza de turno libre. El plazo era de treinta días naturales desde la publicación; no se calcula una fecha absoluta.';
 call.syllabusUrl=MONCAYO_BASES;call.sourceHash=hash(html);
 call.documents=[{title:'BON 2020/26/23 · bases y anexo II',url:MONCAYO_BASES,kind:'bases',checkedAt:now,sha256:hash(html)}];
 return callSchema.parse(call);
}

export async function scrapeMoncayo(client:OfficialClient,now:string):Promise<Call[]>{
 return [parseMoncayoBases(await client.text(MONCAYO_BASES),now)];
}
