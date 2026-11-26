import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const LEITZA_AUX_BASES='https://bon.navarra.es/es/anuncio/-/texto/2026/31/42';

export function parseLeitzaAux2026(html:string,now:string):Call{
  const $=load(html);
  const issuer=clean($('p.a-denominacion').first().text());
  const title=clean($('p.a-titulo').first().text());
  const header=$('h2').toArray().map(node=>clean($(node).text())).find(value=>value.startsWith('BOLETÍN Nº'))??'';
  const items=$('p[class^="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean);
  const start=items.indexOf('ANEXO I.–TEMARIO');
  const end=items.indexOf('ANEXO II.–MODELO DE SOLICITUD');
  const topics=start<0||end<start?[]:items.slice(start+1,end).filter(item=>/^\d{1,2}\./.test(item));
  const numbers=topics.map(item=>Number(item.match(/^(\d{1,2})\./)?.[1]));
  if(issuer!=='LEITZA'
    ||title!=='Concurso-oposición, para una plaza de auxiliar administrativo/a, a tiempo parcial'
    ||!header.includes('31 - 12 de febrero de 2026')
    ||!items.some(item=>item.includes('de 1 plaza del puesto de auxiliar administrativo/a, de régimen laboral, nivel D y a tiempo parcial (60% de jornada)'))
    ||!items.some(item=>item.includes('Graduado Escolar, Formación Profesional de primer grado'))
    ||!items.some(item=>item.includes('nivel C1 de euskera'))
    ||!items.some(item=>item.includes('20 días naturales contados a partir del día siguiente'))
    ||numbers.join(',')!=='1,2,3,4,5,6,7,8,9,10,11,12,13'
    ||!topics[12].includes('Leitza'))throw new Error('Leitzako administrari laguntzailearen BONeko oinarriak edo 13 gaiak aldatu dira');

  const call=baseCall('leitza-aux-2026',LEITZA_AUX_BASES,now,'Navarra');
  call.id=stableId('leitza-aux-2026','2026-31-42-auxiliar-administrativo');
  call.title='Auxiliar administrativo/a · jornada del 60 %';
  call.organization='Ayuntamiento de Leitza';call.location='Leitza';call.province='Navarra';
  call.category='Administración';call.group='D';call.places=1;
  call.educationText='Graduado Escolar, Formación Profesional de primer grado o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.language={name:'euskera',level:'C1'};call.languageStatus='known';
  call.deadline='2026-03-04';call.status='Cerrada';
  call.requirements=[call.educationText,'Euskera C1 acreditado o superación de una prueba específica.'];
  call.description='Plaza laboral fija mediante concurso-oposición para atención en las oficinas municipales, con jornada del 60 %. El BON de 12/02/2026 abrió un plazo de 20 días naturales, hasta el 04/03/2026. El anexo I publica 13 temas.';
  call.topics=topics;call.syllabusUrl=LEITZA_AUX_BASES;call.sourceHash=hash(html);
  call.documents=[{title:'BON 2026/31/42 · bases y 13 temas',url:LEITZA_AUX_BASES,kind:'bases',checkedAt:now,sha256:hash(html)}];
  return callSchema.parse(call);
}

export async function scrapeLeitzaAux2026(client:OfficialClient,now:string):Promise<Call[]>{
  return [parseLeitzaAux2026(await client.text(LEITZA_AUX_BASES),now)];
}
