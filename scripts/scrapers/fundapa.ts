import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,educationIds,pdfText,stableId} from './shared';

export const FUNDAPA_BOARD='https://www.fundapa.org/inicio/tablon-de-anuncios/';
export const FUNDAPA_BASES='https://www.fundapa.org/site/wp-content/uploads/CONVOCATORIA-DE-FUNDAPA-SUSTITUCION-TECNICO-A-ECONOMICO-A-26-03-2026.pdf';

export function parseFundapaBoard(html:string):string{
 const $=load(html);
 const cards=$('.card').filter((_,node)=>{
  const card=$(node);
  return clean(card.find('h6').text())==='CONVOCATORIA PARA LA CREACION DE UNA LISTA DE SUSTITUCION TEMPORAL DEL PUESTO DE TECNICO ECONOMICO EN FUNDAPA'
   && clean(card.find('p.elcolor').text())==='26 marzo 2026';
 });
 if(cards.length!==1)throw new Error('Anuncio FUNDAPA no identificado');
 const links=cards.find('a[href]').toArray().map(node=>canonical($(node).attr('href')!,FUNDAPA_BOARD));
 if(links.length!==1||links[0]!==FUNDAPA_BASES)throw new Error('Bases FUNDAPA no identificadas');
 return links[0];
}

function fundapaTopics(text:string):string[]{
 const match=text.match(/\bTEMARIO:\s*([\s\S]*?)\b4\.-\s*ADMISI[ÓO]N DE ASPIRANTES/i);
 if(!match)throw new Error('Temario FUNDAPA no identificado');
 const topics:string[]=[];
 for(const line of match[1].split(/\r?\n/)){
  const item=line.match(/^\s*o\s{2,}(.+)/);
  if(item){topics.push(clean(item[1]));continue;}
  const part=clean(line);
  if(!topics.length||!part||/^(?:Fundación Pública Navarra|Desgaitasuna duten|C\/ Navas de Tolosa|www\.fundapa\.org)/i.test(part))continue;
  topics[topics.length-1]+=' '+part;
 }
 if(topics.length!==8||!topics[0].startsWith('Protección jurídica de las personas con discapacidad')||!topics[7].startsWith('Impuesto sobre Sucesiones y Donaciones en Navarra'))throw new Error('Ocho temas FUNDAPA no identificados');
 return topics.map(topic=>topic.replace(/\.\s+\./g,'.'));
}

export function parseFundapaBases(text:string,sha256:string,now:string):Call{
 const body=clean(text);
 if(!body.includes('CONVOCATORIA PARA ELABORAR UNA LISTA DE CONTRATACIÓN TEMPORAL PARA LA SUSTITUCIÓN DE TECNICO ECONÓMICO DE GRADO MEDIO')
  ||!/lista de contratación, a través de pruebas selectivas para cubrir las necesidades de sustitución temporal/i.test(body)
  ||!/hasta el 6 de abril de 2026 a las 14 horas/i.test(body)
  ||!/Grado universitario en Administración y Dirección de empresas o Economía, Diplomatura en ciencias empresariales, Licenciatura en Administración y Dirección de Empresas o Economía, o titulaciones equivalentes/i.test(body)
  ||!/La prueba consistirá en un Examen tipo Test/i.test(body))throw new Error('Bases FUNDAPA no identificadas');
 const call=baseCall('fundapa',FUNDAPA_BOARD,now,'Navarra');
 call.id=stableId('fundapa',FUNDAPA_BASES);
 call.title='Técnico/a económico/a de grado medio · lista de sustitución';
 call.organization='Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad';
 call.location='Pamplona/Iruña';call.province='Navarra';call.category='Administración';
 call.educationText='Grado en Administración y Dirección de Empresas o Economía, Diplomatura en Ciencias Empresariales, Licenciatura en Administración y Dirección de Empresas o Economía, o titulación equivalente.';
 call.acceptedQualifications=educationIds(call.educationText);
 call.deadline='2026-04-06';call.status='Cerrada';
 call.requirements=[call.educationText,'Mayor de edad y con autorización para trabajar en España conforme a las bases.','No estar inhabilitado ni separado del servicio de una Administración Pública.'];
 call.topics=fundapaTopics(text);
 call.description='Lista de contratación temporal para cubrir sustituciones de técnico/a económico/a. La prueba es un test de 50 preguntas sobre presupuestos, cuentas, Excel y los ocho temas publicados. El plazo finalizó el 6 de abril de 2026 a las 14:00.';
 call.syllabusUrl=FUNDAPA_BASES;call.sourceHash=sha256;
 call.documents=[{title:'Convocatoria y temario FUNDAPA 2026',url:FUNDAPA_BASES,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeFundapa(client:OfficialClient,now:string):Promise<Call[]>{
 const url=parseFundapaBoard(await client.text(FUNDAPA_BOARD));
 const pdf=await pdfText(client,url);
 return [parseFundapaBases(pdf.text,pdf.sha256,now)];
}
