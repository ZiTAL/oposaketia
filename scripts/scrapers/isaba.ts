import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ISABA_NOTICE='https://isaba.es/el-ayuntamiento-de-isaba-saca-una-plaza-de-empleado-de-servicios-multiples-para-6-meses/';
export const ISABA_BASES='https://isaba.es/wp-content/uploads/2026/04/CONVO.-Ayuntamiento-de-Isaba.-SERV.MULTIPLES.pdf';

export function parseIsaba(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const linked=$('a[href]').toArray().some(node=>$(node).attr('href')===ISABA_BASES);
  const text=clean(basesText);
  if(!linked
    ||!clean($('h1').first().text()).includes('plaza de empleado de servicios múltiples para 6 meses')
    ||!text.includes('Ayuntamiento de Isaba / Izaba')
    ||!text.includes('empleado de Servicios Múltiples, por SEIS MESES')
    ||!text.includes('certificado de estudios primarios o equivalente')
    ||!text.includes('Disponer de Carnet de conducir B')
    ||!text.includes('demandante de empleo o de mejora')
    ||!text.includes('Euskera: 2 puntos máximo')
    ||!text.includes('PRUEBA PRÁCTICA: 35 PUNTOS MÁXIMO')
    ||!text.includes('LUNES, día 20 de abril, a las 12:00 horas')
    ||!text.includes('Isaba/Izaba, 13 de abril de 2026'))throw new Error('Izabako udal-iragarkia edo oinarriak aldatu dira');

  const call=baseCall('isaba',ISABA_NOTICE,now,'Navarra');
  call.id=stableId('isaba','2026-04-13-servicios-multiples-refuerzo');
  call.title='Peón/a de servicios múltiples · refuerzo temporal';
  call.organization='Ayuntamiento de Isaba / Izaba';call.location='Isaba / Izaba';call.province='Navarra';
  call.category='Servicios';call.places=1;
  call.educationText='Certificado de estudios primarios o equivalente.';
  call.acceptedQualifications=[];
  call.language=null;call.languageStatus='known';
  call.deadline='2026-04-20';call.status='Cerrada';
  call.requirements=[call.educationText,'Permiso de conducir B.','Inscripción como demandante de empleo o de mejora de empleo en el Servicio Navarro de Empleo.'];
  call.description='Contrato temporal de refuerzo durante seis meses. Selección con valoración de formación y experiencia, prueba teórica o práctica y entrevista. El euskera puntúa como mérito. Las bases describen las materias de la prueba, pero no publican temario enumerado.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Bases municipales · 13/04/2026',url:ISABA_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeIsaba(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(ISABA_NOTICE);
  const bases=await pdfText(client,ISABA_BASES);
  return [parseIsaba(notice,bases.text,bases.sha256,now)];
}
