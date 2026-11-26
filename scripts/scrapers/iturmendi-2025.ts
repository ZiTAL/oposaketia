import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const ITURMENDI_BASES='https://bon.navarra.es/es/anuncio/-/texto/2025/132/12';

export function parseIturmendi2025(html:string,now:string):Call{
  const $=load(html);
  const issuer=clean($('p.a-denominacion').first().text());
  const title=clean($('p.a-titulo').first().text());
  const header=$('h2').toArray().map(node=>clean($(node).text())).find(value=>value.startsWith('BOLETÍN Nº'))??'';
  const items=$('p[class^="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean);
  const start=items.indexOf('ANEXO II.–TEMARIO');
  const topics=start<0?[]:items.slice(start+1).filter(item=>/^\d{1,2}[.\u00ad–-]/.test(item)).map(item=>item.replace(/\u00ad/g,''));
  const numbers=topics.map(item=>Number(item.match(/^(\d{1,2})/)?.[1]));
  if(issuer!=='ITURMENDI'
    ||!title.startsWith('Convocatoria para la provisión, mediante concurso-oposición, y en régimen funcionarial')
    ||!header.includes('132 - 3 de julio de 2025')
    ||!items.some(item=>item.includes('una plaza de empleado/a de servicios múltiples'))
    ||!items.some(item=>item.includes('retribuciones correspondientes al nivel D'))
    ||!items.some(item=>item.includes('Graduado en ESO, Graduado Escolar, Formación Profesional de primer grado o equivalente'))
    ||!items.some(item=>item.includes('perfil lingüístico preceptivo en euskera: nivel B2'))
    ||!items.some(item=>item.includes('carnet de conducir clase B'))
    ||!items.some(item=>item.includes('plazo de 30 días naturales a contar desde el día siguiente'))
    ||numbers.join(',')!=='1,2,3,4,5,6,7,8,9,10,11,12,13,14'
    ||!topics[13].includes('aritmética y geometría'))throw new Error('Iturmendiko oinarriak edo 14 gaiak aldatu dira');

  const call=baseCall('iturmendi-2025',ITURMENDI_BASES,now,'Navarra');
  call.id=stableId('iturmendi-2025','2025-132-12-servicios-multiples');
  call.title='Empleado/a de servicios múltiples';call.organization='Ayuntamiento de Iturmendi';
  call.location='Iturmendi';call.province='Navarra';call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Graduado en ESO, Graduado Escolar, FP de primer grado o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.language={name:'euskera',level:'B2'};call.languageStatus='known';
  call.deadline=null;call.status='Cerrada';
  call.requirements=[call.educationText,'Euskera B2 acreditado o prueba de conocimiento.','Permiso de conducir B.'];
  call.description='Plaza funcionarial mediante concurso-oposición, con bolsa temporal. El BON del 03/07/2025 abrió un plazo de 30 días naturales; no se fija una fecha final absoluta por la posible incidencia de días inhábiles. El Anexo II publica 14 temas.';
  call.topics=topics;call.syllabusUrl=ITURMENDI_BASES;call.sourceHash=hash(html);
  call.documents=[{title:'BON 2025/132/12 · bases y 14 temas',url:ITURMENDI_BASES,kind:'bases',checkedAt:now,sha256:hash(html)}];
  return callSchema.parse(call);
}

export async function scrapeIturmendi2025(client:OfficialClient,now:string):Promise<Call[]>{
  return [parseIturmendi2025(await client.text(ITURMENDI_BASES),now)];
}
