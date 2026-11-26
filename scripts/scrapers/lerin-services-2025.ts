import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const LERIN_BASES='https://www.lerin.es/wp-content/uploads/2025/03/BASES.pdf';

function topicsFromBases(text:string):string[]{
  const start=text.indexOf('TEMARIO EMPLEADO EN SERVICIOS MÚLTIPLES');
  if(start<0)return [];
  const lines=text.slice(start).split(/\r?\n/).map(clean).filter(Boolean);
  const topics:string[]=[];
  let topic='';
  for(const line of lines.slice(1)){
    if(/^Tema \d+\./.test(line)){
      if(topic)topics.push(topic);
      topic=line;
    }else if(topic&&!/^\d+$/.test(line))topic+=' '+line;
  }
  if(topic)topics.push(topic);
  return topics;
}

export function parseLerinServices2025(basesText:string,basesHash:string,now:string):Call{
  const text=clean(basesText);
  const topics=topicsFromBases(basesText);
  const numbers=topics.map(topic=>Number(topic.match(/^Tema (\d+)\./)?.[1]));
  if(!text.includes('La alcaldesa del Ayuntamiento de Lerín')
    ||!text.includes('resolución número 72, de fecha 4 de marzo de 2025')
    ||!text.includes('constitución de una lista de aspirantes al desempeño, mediante contratación temporal')
    ||!text.includes('Empleado de Servicios Múltiples al servicio del Ayuntamiento de Lerín')
    ||!text.includes('remuneraciones fijadas con carácter general para el nivel D')
    ||!text.includes('Graduado en E.S.O., Graduado Escolar, Formación Profesional de Grado Medio')
    ||!text.includes('Carnet de conducir clase B')
    ||!text.includes('15 días naturales contados a partir del siguiente')
    ||numbers.join(',')!=='1,2,3,4,5,6,7,8,9,10,11,12'
    ||!topics[11].includes('Word, Excel y correo electrónico'))throw new Error('Leringo udal-oinarriak edo 12 gaiak aldatu dira');

  const call=baseCall('lerin-services-2025',LERIN_BASES,now,'Navarra');
  call.id=stableId('lerin-services-2025','2025-03-04-servicios-multiples-lista');
  call.title='Empleado/a de servicios múltiples · bolsa temporal';
  call.organization='Ayuntamiento de Lerín';call.location='Lerín';call.province='Navarra';
  call.category='Servicios';call.group='D';call.places=null;
  call.educationText='Graduado en ESO, Graduado Escolar, Formación Profesional de Grado Medio o equivalente.';
  call.acceptedQualifications=['eso','fp-medio'];
  call.language=null;call.languageStatus='known';
  call.deadline=null;call.status='Cerrada';
  call.requirements=[call.educationText,'Permiso de conducir B.'];
  call.description='Lista municipal para contrataciones temporales de servicios múltiples mediante pruebas teórica y práctica. Las bases de 04/03/2025 establecen 15 días naturales desde la publicación en el BON; no se atribuye una fecha de cierre absoluta sin verificar esa publicación. El anexo II contiene 12 temas.';
  call.topics=topics;call.syllabusUrl=LERIN_BASES;call.sourceHash=basesHash;
  call.documents=[{title:'Bases municipales · 04/03/2025 · 12 temas',url:LERIN_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeLerinServices2025(client:OfficialClient,now:string):Promise<Call[]>{
  const bases=await pdfText(client,LERIN_BASES);
  return [parseLerinServices2025(bases.text,bases.sha256,now)];
}
