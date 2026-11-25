import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const AGOITZ_NOTICE='https://www.agoitz.eus/noticias/oferta-publica-de-empleo-jardineria/';

export function parseAgoitzGardening(html:string,now:string):Call{
  const $=load(html);
  const article=$('.noticia_text');
  const body=clean(article.text());
  if(article.length!==1
    ||!body.includes('una plaza de empleado/a servicios múltiples (adscrito/a a la prestación del servicio de jardinería)')
    ||!body.includes('Nivel D. 100,00% de jornada')
    ||!body.includes('Graduado en ESO, Graduado Escolar, Formación Profesional de Grado Medio o equivalente')
    ||!body.includes('treinta días naturales contados a partir del siguiente al de la publicación')
    ||!body.includes('Código del anuncio: L2600622'))throw new Error('Agoizko lorezaintza-deialdia edo baldintzak ez datoz bat');

  const paragraphs=article.find('p').toArray().map(node=>clean($(node).text()));
  const start=paragraphs.findIndex(text=>text==='ANEXO II.–TEMARIO');
  const end=paragraphs.findIndex((text,index)=>index>start&&text.startsWith('Nota: Todas las materias se exigirán'));
  if(start<0||end<0)throw new Error('Agoizko II. eranskina ez da identifikatu');
  const topics=paragraphs.slice(start+1,end).map(text=>{
    const match=text.match(/^Tema\s+(\d{1,2})\.\s*[–-]\s*(.+)$/i);
    return match?`${match[1]}. ${match[2]}`:null;
  });
  if(topics.length!==11||topics.some((topic,index)=>!topic?.startsWith(`${index+1}. `))
    ||!topics[10]?.includes('maquinaria y herramientas de jardinería y monte'))throw new Error('Agoizko 11 gaiak ez datoz bat');

  const call=baseCall('agoitz',AGOITZ_NOTICE,now,'Navarra');
  call.id=stableId('agoitz','2026-jardineria-L2600622');
  call.title='Empleado/a de servicios múltiples · jardinería';
  call.organization='Ayuntamiento de Aoiz / Agoitz';call.location='Aoiz / Agoitz';call.province='Navarra';
  call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Graduado en ESO, Graduado Escolar, FP de grado medio o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.deadline=null;call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'Permiso de conducir clase B.','No haber sido condenado por sentencia firme por delitos contra la libertad e indemnidad sexual o trata de seres humanos.'];
  call.description='Plaza fija mediante concurso-oposición y lista de contratación temporal. Las bases fijan 30 días naturales desde la publicación en el BON; no se infiere una fecha absoluta. El euskera puntúa como mérito, hasta 10 puntos.';
  call.topics=topics as string[];call.syllabusUrl=AGOITZ_NOTICE;
  call.sourceHash=hash(body);
  return callSchema.parse(call);
}

export async function scrapeAgoitz(client:OfficialClient,now:string):Promise<Call[]>{
  return [parseAgoitzGardening(await client.text(AGOITZ_NOTICE),now)];
}
