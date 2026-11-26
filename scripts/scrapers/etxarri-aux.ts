import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ETXARRI_AUX_NOTICE='https://www.etxarriaranatz.eus/es/noticias/onvocatoria-urgente-de-contratacion-temporal-auxiliar-administrativo';
export const ETXARRI_AUX_BASES='https://www.etxarriaranatz.eus/Argazkiak/files/20261015_Beste_Deialdia%20SNE(1).pdf';

export function parseEtxarriAux(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const links=$('a[href]').toArray().filter(node=>{
    try{return new URL($(node).attr('href')!,ETXARRI_AUX_NOTICE).href===ETXARRI_AUX_BASES;}catch{return false;}
  });
  const text=clean(basesText);
  if(links.length!==1
    ||!clean($('h1').first().text()).includes('AUXILIAR ADMINISTRATIVO')
    ||!text.includes('BASES DE LA CONVOCATORIA PARA LA')
    ||!text.includes('UNA BOLSA DE EMPLEO PARA LA')
    ||!text.includes('PARA EL AYUNTAMIENTO DE ETXARRI')
    ||!text.includes('Graduado en E.S.O., Graduado Escolar, Formación')
    ||!text.includes('Profesional de Grado Medio o equivalente')
    ||!text.includes('nivel C1 o Certificado de Aptitud equivalente')
    ||!text.includes('hasta el día 22 de octubre de 2026, inclusive')
    ||!text.includes('una prueba práctica de ofimática e informática'))throw new Error('Etxarriko administrari laguntzailearen oinarriak aldatu dira');

  const call=baseCall('etxarri-aux',ETXARRI_AUX_NOTICE,now,'Navarra');
  call.id=stableId('etxarri-aux','2026-10-15-auxiliar-administrativo');
  call.title='Auxiliar administrativo/a · bolsa de contratación temporal';
  call.organization='Ayuntamiento de Etxarri Aranatz';call.location='Etxarri Aranatz';call.province='Navarra';
  call.category='Administración';call.places=null;
  call.educationText='Graduado en ESO, Graduado Escolar, FP de Grado Medio o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.language={name:'euskera',level:'C1'};call.languageStatus='known';
  call.deadline='2026-10-22';call.status='Cerrada';
  call.requirements=[call.educationText,'Euskera C1 acreditado o prueba de conocimiento de la Mancomunidad de Sakana.'];
  call.description='Bolsa urgente para contratación temporal. La selección incluye valoración de méritos y prueba práctica de ofimática e informática. Las bases no publican temario enumerado ni número fijo de plazas.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Bases municipales bilingües · 15/10/2026',url:ETXARRI_AUX_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeEtxarriAux(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(ETXARRI_AUX_NOTICE);
  const bases=await pdfText(client,ETXARRI_AUX_BASES);
  return [parseEtxarriAux(notice,bases.text,bases.sha256,now)];
}
