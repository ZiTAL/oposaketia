import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const LESAKA_PEOI_NOTICE='https://www.lesaka.eus/noticias/66327/';
export const LESAKA_PEOI_BASES='https://www.lesaka.eus/wp-content/uploads/2026/03/DEIALDIAREN-OINARRIAK-PEOIA-002-1.pdf';

export function parseLesakaPeoi2026(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const notice=clean($('.noticia_text').first().text());
  const linked=$('.noticia_text a[href]').toArray().some(node=>$(node).attr('href')===LESAKA_PEOI_BASES);
  const bases=clean(basesText);
  if(clean($('h2.noticia_titulo').first().text())!=='Peoi bat kontratatzeko deialdia'
    ||!notice.includes('Lesakako Udalak, zerbitzu anitzetako peoi bat kontratatu nahi du')
    ||!linked
    ||!bases.includes('BASES DE LA CONVOCATORIA PARA LA')
    ||!bases.includes('PRUEBAS SELECTIVAS, DE PEÓN DE')
    ||!bases.includes('Graduado Escolar, Formación Profesional de')
    ||!bases.includes('nivel B1 (o equivalente)')
    ||!bases.includes('nivel B2 (o equivalente)')
    ||!bases.includes('permiso de conducir')
    ||!bases.includes('demandantes de empleo')
    ||!bases.includes('25 de marzo de 2026')
    ||!bases.includes('será de 6 meses desde la firma del contrato'))throw new Error('Lesakako peoiaren udal-iragarkia edo oinarriak aldatu dira');

  const call=baseCall('lesaka-peoi-2026',LESAKA_PEOI_NOTICE,now,'Navarra');
  call.id=stableId('lesaka-peoi-2026','2026-03-16-peoi-temporal');
  call.title='Peón/a de servicios múltiples · contrato temporal';
  call.organization='Ayuntamiento de Lesaka';call.location='Lesaka';call.province='Navarra';
  call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Graduado Escolar, Formación Profesional de primer grado o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  // La exigencia combina B1 escrito y B2 oral; el campo de nivel único no la representa.
  call.language=null;call.languageStatus='known';
  call.deadline='2026-03-25';call.status='Cerrada';
  call.requirements=[call.educationText,'Euskera B1 escrito y B2 oral, acreditado o mediante prueba.','Permiso de conducir B.','Inscripción como demandante de empleo en Nafar Lansare.'];
  call.description='Contratación temporal de seis meses para una persona desempleada y bolsa de peones para necesidades de 2026. Las bases prevén pruebas selectivas, sin temario enumerado. El requisito de euskera distingue B1 escrito y B2 oral.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Bases municipales · 16/03/2026',url:LESAKA_PEOI_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeLesakaPeoi2026(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(LESAKA_PEOI_NOTICE);
  const bases=await pdfText(client,LESAKA_PEOI_BASES);
  return [parseLesakaPeoi2026(notice,bases.text,bases.sha256,now)];
}
