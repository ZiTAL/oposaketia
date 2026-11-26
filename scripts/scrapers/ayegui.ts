import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,extractTopics,stableId} from './shared';

export const AYEGUI_EMPLOYMENT='https://www.ayegui.org/empleo-publico/';
export const AYEGUI_BASES='https://bon.navarra.es/es/anuncio/-/texto/2023/33/36';

export function parseAyegui(employmentHtml:string,basesHtml:string,now:string):Call{
  const employment=load(employmentHtml);
  const links=employment('a[href]').toArray().filter(node=>{
    try{return new URL(employment(node).attr('href')!,AYEGUI_EMPLOYMENT).href===AYEGUI_BASES;}catch{return false;}
  });
  const $=load(basesHtml);
  const issuer=clean($('p.a-denominacion').first().text());
  const title=clean($('p.a-titulo').first().text());
  const bulletin=$('h2').toArray().map(node=>clean($(node).text())).find(value=>value.startsWith('BOLETÍN Nº 33'));
  const paragraphs=$('p[class^="foral-"]').toArray().map(node=>clean($(node).text())).filter(Boolean);
  const text=paragraphs.join('\n');
  const topics=extractTopics(text);
  if(links.length!==1||!employment('body').text().includes('OPOSICIÓN EMPLEADO/A SERVICIOS MÚLTIPLES')
    ||issuer!=='AYEGUI'
    ||!title.startsWith('Convocatoria para la provisión, a través de oposición de un puesto de trabajo de')
    ||!bulletin?.includes('16 de febrero de 2023')
    ||!text.includes('provisión mediante oposición de una plaza de operario/a de servicio múltiples en régimen funcionarial')
    ||!text.includes('título de Graduado en E.S.O., Graduado Escolar, Formación Profesional de Grado Medio o equivalente')
    ||!text.includes('en el plazo de quince días (15) naturales')
    ||!text.includes('permiso de conducir B+E en los seis meses siguientes a la toma de posesión')
    ||topics.length!==11||!topics[10].startsWith('Tema 11.–Cultura general'))throw new Error('Aiegiko udal-iragarkia, oinarriak edo 11 gaiak aldatu dira');

  const call=baseCall('ayegui',AYEGUI_EMPLOYMENT,now,'Navarra');
  call.id=stableId('ayegui','2023-33-36-servicios-multiples');
  call.title='Empleado/a de servicios múltiples';call.organization='Ayuntamiento de Ayegui / Aiegi';
  call.location='Ayegui / Aiegi';call.province='Navarra';call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Graduado en ESO, Graduado Escolar, FP de Grado Medio o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.deadline='2023-03-03';call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'La persona seleccionada debía obtener el permiso B+E dentro de los seis meses siguientes a la toma de posesión.'];
  call.description='Plaza funcionarial a jornada completa mediante oposición. El plazo de 15 días naturales desde el BON del 16/02/2023 finalizó el 03/03/2023. Las bases publican 11 temas en el Anexo II.';
  call.topics=topics;call.syllabusUrl=AYEGUI_BASES;call.sourceHash=hash(employmentHtml+basesHtml);
  call.documents=[{title:'BON 2023/33/36 · bases y 11 temas',url:AYEGUI_BASES,kind:'bases',checkedAt:now,sha256:hash(basesHtml)}];
  return callSchema.parse(call);
}

export async function scrapeAyegui(client:OfficialClient,now:string):Promise<Call[]>{
  const employment=await client.text(AYEGUI_EMPLOYMENT);
  const bases=await client.text(AYEGUI_BASES);
  return [parseAyegui(employment,bases,now)];
}
