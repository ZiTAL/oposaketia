import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ABLITAS_NOTICE='https://ablitas.es/anuncios-noticias/convocatoria-para-la-provision-mediante-oposicion-de-una-plaza-de-tecnico-a-de-juventud-con-funciones-de-tecnico-a-de-cultura-y-deportes/';
export const ABLITAS_BASES='https://ablitas.es/wp-content/uploads/BASES-CONVOCATORIA.-Tecnico-de-juventud.pdf';

export function parseAblitasNotice(html:string):string{
  const $=load(html);
  const heading=clean($('h1').text());
  if(!heading.includes('Convocatoria para la provisión, mediante oposición, de una plaza de técnico/a de juventud')
    ||!clean($('body').text()).includes('23 de abril de 2025'))throw new Error('Ablitasko udal-iragarkia ez da identifikatu');
  const links=[...new Set($('a[href]').toArray().map(node=>new URL($(node).attr('href')!,ABLITAS_NOTICE).href))];
  if(!links.includes(ABLITAS_BASES))throw new Error('Ablitasko oinarrien esteka ez da identifikatu');
  return ABLITAS_BASES;
}

function parseTopics(text:string):string[]{
  const section=text.match(/ANEXO II\.\s*[–-]\s*TEMARIO([\s\S]*?)Nota: desde el Ayuntamiento/i)?.[1];
  if(!section)throw new Error('Ablitasko II. eranskina ez da identifikatu');
  const withoutFooters=section.replace(/\f/g,'\n').split(/\r?\n/).filter(line=>!/Cód\. Validación:|Verificación: https:\/\/ablitas\.sedelectronica\.es\/|Documento firmado electrónicamente/.test(line)).join('\n');
  const parts=[...withoutFooters.matchAll(/^Tema\s+(\d{1,2})[.\s]*[–—._-]\s*/gm)];
  const topics=parts.map((part,index)=>`${part[1]}. ${clean(withoutFooters.slice(part.index!+part[0].length,parts[index+1]?.index??withoutFooters.length))}`);
  if(topics.length!==12||topics.some((topic,index)=>!topic.startsWith(`${index+1}. `))
    ||!topics[11].includes('Recursos culturales, de ocio, deporte y juventud de Ablitas'))throw new Error('Ablitasko 12 gaiak ez datoz bat');
  return topics;
}

export function parseAblitasBases(text:string,sha256:string,now:string):Call{
  const content=clean(text);
  if(!content.includes('plaza de técnico/a de juventud (nivel B) del ayuntamiento de Ablitas')
    ||!content.includes('título de diplomado o graduado universitario, ingeniero técnico, arquitecto técnico o formación profesional de tercer grado')
    ||!content.includes('23 de abril de 2025')
    ||!content.includes('cuestionario de 50 preguntas tipo test'))throw new Error('Ablitasko oinarriak edo baldintzak ez datoz bat');
  const call=baseCall('ablitas',ABLITAS_NOTICE,now,'Navarra');
  call.id=stableId('ablitas','2025-tecnico-juventud');
  call.title='Técnico/a de juventud · cultura y deportes';
  call.organization='Ayuntamiento de Ablitas';call.location='Ablitas';call.province='Navarra';
  call.category='Servicios';call.group='B';call.places=1;
  call.educationText='Diplomatura o grado universitario, ingeniería técnica, arquitectura técnica o formación profesional de tercer grado.';
  call.acceptedQualifications=[];
  call.deadline='2025-04-23';call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'Permiso de conducir B o compromiso de desplazarse por medios propios.'];
  call.description='Plaza temporal de hasta tres años. Oposición con prueba teórica tipo test de 50 preguntas y entrevista. El ayuntamiento aclara que no se exige pagar tasa y que la mención al permiso B1 en las bases se refiere al B.';
  call.topics=parseTopics(text);call.syllabusUrl=ABLITAS_BASES;
  call.sourceHash=sha256;call.documents=[{title:'Bases municipales · Anexo II, 12 temas',url:ABLITAS_BASES,kind:'bases',checkedAt:now,sha256}];
  return callSchema.parse(call);
}

export async function scrapeAblitas(client:OfficialClient,now:string):Promise<Call[]>{
  const basesUrl=parseAblitasNotice(await client.text(ABLITAS_NOTICE));
  const pdf=await pdfText(client,basesUrl);
  return [parseAblitasBases(pdf.text,pdf.sha256,now)];
}
