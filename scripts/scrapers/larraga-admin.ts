import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const LARRAGA_NOTICE='https://www.larraga.es/convocatoria-para-la-contratacion-en-regimen-laboral-temporal-de-un-puesto-administrativo-a-al-servicio-del-ayuntamiento-de-la-villa-de-larraga/';
export const LARRAGA_BASES='https://www.larraga.es/wp-content/uploads/2026/02/20260216_Otros_Bases-temporal-administrativa.pdf';

export function parseLarragaAdmin(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const linked=$('a[href]').toArray().some(node=>$(node).attr('href')===LARRAGA_BASES);
  const text=clean(basesText);
  if(!linked
    ||!clean($('h1').first().text()).startsWith('Convocatoria para la contratación en régimen laboral temporal de un puesto administrativo/a')
    ||!text.includes('PUESTO ADMINISTRATIVO/A AL SERVICIO DEL AYUNTAMIENTO DE LA VILLA DE LARRAGA')
    ||!text.includes('provisión, mediante concurso-oposición, de una plaza del')
    ||!text.includes('puesto de trabajo de administrativo/a')
    ||!text.includes('por un período de seis meses')
    ||!text.includes('retribuciones correspondientes al grupo C')
    ||!text.includes('Bachillerato, Formación Profesional de segundo grado o equivalente')
    ||!text.includes('Estar desempleado/a e inscrito/a como demandante de empleo')
    ||!text.includes('VIERNES 6 DE MARZO')
    ||!text.includes('día 12 de marzo de 2026')
    ||!text.includes('cinco preguntas de carácter práctico'))throw new Error('Larragako administrariaren udal-oinarriak aldatu dira');

  const call=baseCall('larraga-admin',LARRAGA_NOTICE,now,'Navarra');
  call.id=stableId('larraga-admin','2026-02-16-administrativo-temporal');
  call.title='Administrativo/a · contrato temporal de seis meses';
  call.organization='Ayuntamiento de Larraga';call.location='Larraga';call.province='Navarra';
  call.category='Administración';call.group='C';call.places=1;
  call.educationText='Bachillerato, Formación Profesional de segundo grado o equivalente.';
  call.acceptedQualifications=['bachiller','fp-superior'];
  call.language=null;call.languageStatus='known';
  call.deadline='2026-03-06';call.status='Cerrada';
  call.requirements=[call.educationText,'Inscripción como demandante de empleo o de mejora de empleo en el Servicio Navarro de Empleo.'];
  call.description='Una plaza de administración municipal mediante concurso-oposición y contrato temporal de seis meses. La prueba práctica incluía cinco preguntas y estaba convocada para el 12/03/2026. Los idiomas se valoraban como mérito; no se publicó un temario enumerado.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Bases municipales · 16/02/2026',url:LARRAGA_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeLarragaAdmin(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(LARRAGA_NOTICE);
  const bases=await pdfText(client,LARRAGA_BASES);
  return [parseLarragaAdmin(notice,bases.text,bases.sha256,now)];
}
