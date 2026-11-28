import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const AMESCOA_BANDOS='https://amescoabaja.org/es/ayuntamiento/bandos-y-otros.html';
const NOTICE_LABEL='Convocatoria prueba selectiva contratación. Peón de la construcción';
const BASES_LABEL='Condicionado prueba selectiva y modelo de instancia';

export function parseAmescoaLinks(html:string):{notice:string;bases:string}{
  const $=load(html);
  const links=$('a[href]').toArray().map(node=>({title:clean($(node).text()),url:$(node).attr('href')!}));
  const find=(label:string)=>{
    const matches=links.filter(link=>link.title.includes(label)&&link.title.includes('14 Octubre 2026'));
    if(matches.length!==1)throw new Error(`Améscoa Baja: ${label} ez da identifikatu`);
    const url=new URL(matches[0].url,AMESCOA_BANDOS);
    if(url.protocol!=='https:'||url.hostname!=='amescoabaja.org'||!/^\/documents\/\d+_.*\.pdf$/.test(url.pathname))
      throw new Error('Améscoa Baja: udal-PDFaren lotura baliogabea');
    return url.href;
  };
  return {notice:find(NOTICE_LABEL),bases:find(BASES_LABEL)};
}

export function parseAmescoaCall(noticeText:string,basesText:string,noticeUrl:string,basesUrl:string,noticeHash:string,basesHash:string,now:string):Call{
  const notice=clean(noticeText),bases=clean(basesText);
  for(const evidence of [
    'AYUNTAMIENTO DE AMÉSCOA BAJA','PEÓN DE LA CONSTRUCCIÓN','26 de octubre y el 3 de noviembre de 2026',
    'permiso de conducción B','9 de noviembre de 2026'
  ])if(!notice.includes(evidence))throw new Error(`Améscoa Baja: bandoa aldatu da (${evidence})`);
  for(const evidence of [
    'Ayuntamiento de Améscoa Baja realiza la presente convocatoria','una persona para realizar trabajos relacionados con la red de abastecimiento del agua',
    'permiso de conducir tipo B','graduado en educación secundaria obligatoria o de Formación Profesional de primer grado o equivalente',
    'demandante de empleo en la categoría de PEÓN DE LA CONSTRUCCIÓN','TEMARIO','Tema 1.– Elementos de una red de abastecimiento de agua',
    'Tema 4.– Seguridad y salud en el trabajo'
  ])if(!bases.includes(evidence))throw new Error(`Améscoa Baja: oinarriak aldatu dira (${evidence})`);
  const call=baseCall('amescoa-baja',AMESCOA_BANDOS,now,'Navarra');
  call.id=stableId('amescoa-baja','2026-10-14-peon-construccion');
  call.title='Peón/a de la construcción · red de abastecimiento';
  call.sourceUrl=noticeUrl;
  call.organization='Ayuntamiento de Améscoa Baja';call.location='Améscoa Baja';call.province='Navarra';
  call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Graduado en educación secundaria obligatoria, Formación Profesional de primer grado o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];call.languageStatus='known';
  call.deadline='2026-11-03';call.status='Cerrada';
  call.requirements=[call.educationText,'Inscripción como demandante de empleo en Nafar Lansare en la categoría de peón de la construcción.','Permiso de conducir B y vehículo apropiado para el puesto.'];
  call.description='Contrato temporal de diez meses para una persona desempleada. Inscripción en Nafar Lansare hasta el 23/10/2026 y en la bolsa municipal del 26/10 al 03/11/2026. Pruebas el 09/11/2026. El temario de cuatro temas figura en las bases.';
  call.topics=[
    'Tema 1.– Elementos de una red de abastecimiento de agua. Válvulas. Ventosas. Hidrantes. Bocas de riego. Desagües.',
    'Tema 2.– Reparación de averías de abastecimiento en la vía pública. Actuaciones a seguir. Maquinaria y herramientas a utilizar. Seguridad.',
    'Tema 3.– Reparación de tuberías de saneamiento en la vía pública. Actuaciones a seguir. Maquinaria y herramientas a utilizar.',
    'Tema 4.– Seguridad y salud en el trabajo en los trabajos de reparación de redes de abastecimiento. Medios y dispositivos correctores. Medios y dispositivos colectivos de seguridad. Medios y dispositivos individuales de seguridad.'
  ];
  for(const topic of call.topics)if(!bases.includes(topic))throw new Error('Améscoa Baja: gai-zerrenda aldatu da');
  call.syllabusUrl=basesUrl;call.sourceHash=hash(noticeHash+basesHash);
  call.documents=[{title:'Bases y temario municipales · 14/10/2026',url:basesUrl,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeAmescoaBaja(client:OfficialClient,now:string):Promise<Call[]>{
  const links=parseAmescoaLinks(await client.text(AMESCOA_BANDOS));
  const notice=await pdfText(client,links.notice);
  const bases=await pdfText(client,links.bases);
  return [parseAmescoaCall(notice.text,bases.text,links.notice,links.bases,notice.sha256,bases.sha256,now)];
}
