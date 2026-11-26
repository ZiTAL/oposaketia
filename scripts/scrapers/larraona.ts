import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const LARRAONA_NOTICE='https://www.larraona.es/portal/seccion.aspx?N=415';
export const LARRAONA_BASES='https://www.larraona.es/docs/ImagenesEditor/2020/11/CONDICIONADO_LARRAONA_2024.pdf';

export function parseLarraona(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const linked=$('a[href]').toArray().some(node=>new URL($(node).attr('href')!,LARRAONA_NOTICE).href===LARRAONA_BASES);
  const notice=clean($('body').text());
  const bases=clean(basesText);
  if(!linked
    ||!notice.includes('Contratación temporal de una persona para prestación de trabajos de mantenimiento')
    ||!notice.includes('finalización el día 30 de noviembre de 2024')
    ||!bases.includes('CONTRATACIÓN DE UNA PERSONA A MEDIA JORNADA')
    ||!bases.includes('puesto con categoría de Peón, a media jornada')
    ||!bases.includes('27 de mayo de 2024')
    ||!bases.includes('duración de seis meses')
    ||!bases.includes('Certificado de Escolaridad, Graduado Escolar')
    ||!bases.includes('carnet de conducir de la clase B')
    ||!bases.includes('Servicio Navarro de Empleo como demandante de empleo'))throw new Error('Larraonako udal-iragarkia edo oinarriak aldatu dira');

  const call=baseCall('larraona',LARRAONA_NOTICE,now,'Navarra');
  call.id=stableId('larraona','2024-05-mantenimiento-municipal');
  call.title='Peón/a de mantenimiento municipal · media jornada';
  call.organization='Ayuntamiento de Larraona';call.location='Larraona';call.province='Navarra';
  call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Certificado de Escolaridad, Graduado Escolar, Formación Profesional de Primer Grado o equivalente.';
  call.acceptedQualifications=[];call.language=null;call.languageStatus='unknown';
  call.deadline='2024-05-27';call.status='Cerrada';
  call.requirements=[call.educationText,'Permiso de conducir B y vehículo apropiado.','Inscripción como demandante de empleo en el Servicio Navarro de Empleo.'];
  call.description='Contrato laboral temporal de seis meses a media jornada para mantenimiento municipal. Selección mediante valoración de méritos entre demandantes de empleo remitidos por el Servicio Navarro de Empleo. Las bases no publican temario de oposición.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Condicionado municipal · 2024',url:LARRAONA_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeLarraona(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(LARRAONA_NOTICE);
  const bases=await pdfText(client,LARRAONA_BASES);
  return [parseLarraona(notice,bases.text,bases.sha256,now)];
}
