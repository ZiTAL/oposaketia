import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const AIBAR_NOTICE='https://aibar-oibar.org/convocada-una-oposicion-para-la-creacion-de-una-lista-de-aspirantes-a-oficiales-administrativos/';
export const AIBAR_BASES='https://aibar-oibar.org/wp-content/uploads/2024/09/BASES-CONVOCATORIA-OFICIAL-ADMINISTRATIVO.pdf';

export function parseAibarNotice(html:string):string{
  const $=load(html);
  const title=clean($('h1').first().text());
  if(!/CONVOCADA UNA OPOSICI[ÓO]N PARA LA CREACI[ÓO]N DE UNA LISTA DE ASPIRANTES A OFICIALES ADMINISTRATIVOS/i.test(title)
    ||!$('time[datetime^="2024-08-21"]').length
    ||!clean($('article').text()).includes('Ayuntamiento de Aibar / Oibar'))throw new Error('Aibarko jatorrizko deialdia ez da identifikatu');
  const links=$('a[href]').map((_,node)=>$(node).attr('href')).get();
  if(!links.includes(AIBAR_BASES))throw new Error('Aibarko oinarrien esteka ez da identifikatu');
  return AIBAR_BASES;
}

export function parseAibarBases(text:string,sha256:string,now:string):Call{
  const content=clean(text);
  if(!/LISTA DE ASPIRANTES PARA LA CONTRATACI[ÓO]N, CON CAR[ÁA]CTER TEMPORAL[\s\S]*?OFICIALES ADMINISTRATIVOS, NIVEL C AL SERVICIO DEL AYUNTAMIENTO DE AIBAR\/OIBAR/i.test(content)
    ||!/t[ií]tulo de Bachillerato, Formaci[oó]n Profesional de segundo grado o equivalente/i.test(content)
    ||!/Estar inscrito de las oficinas de empleo como demandante o mejora de empleo/i.test(content)
    ||!/7 d[ií]as h[aá]biles, contados a partir del siguiente al de la publicaci[oó]n/i.test(content))throw new Error('Aibarko oinarriak edo baldintzak ez datoz bat');
  const topics=['Ley Foral 6/1990, de 2 de julio, de la Administración Local de Navarra.','Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas.','Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público.'];
  if(topics.some(topic=>!content.includes(topic)))throw new Error('Aibarko azterketako hiru gaiak ez datoz bat');
  const call=baseCall('aibar',AIBAR_NOTICE,now,'Navarra');
  call.id=stableId('aibar','2024-08-official-administrativo');
  call.title='Oficial administrativo/a · lista de contratación temporal';
  call.organization='Ayuntamiento de Aibar / Oibar';call.location='Aibar / Oibar';call.province='Navarra';call.category='Administración';call.group='C';
  call.educationText='Bachillerato, Formación Profesional de segundo grado o equivalente.';
  call.acceptedQualifications=['bachiller','fp-superior'];
  call.requirements=[call.educationText,'Inscripción como demandante o en mejora de empleo en una oficina de empleo.'];
  call.status='Cerrada';call.deadline=null;call.languageStatus='known';
  call.description='Lista para cubrir necesidades temporales del ayuntamiento. Las bases prevén una prueba escrita de preguntas cortas o tipo test sobre las tres leyes publicadas. El plazo era de siete días hábiles desde la publicación en el tablón y la sede; no se ha verificado una fecha absoluta de cierre.';
  call.topics=topics;call.syllabusUrl=AIBAR_BASES;
  call.sourceHash=sha256;call.documents=[{title:'Bases municipales · agosto de 2024',url:AIBAR_BASES,kind:'bases',checkedAt:now,sha256}];
  return callSchema.parse(call);
}

export async function scrapeAibar(client:OfficialClient,now:string):Promise<Call[]>{
  parseAibarNotice(await client.text(AIBAR_NOTICE));
  const pdf=await pdfText(client,AIBAR_BASES);
  return [parseAibarBases(pdf.text,pdf.sha256,now)];
}
