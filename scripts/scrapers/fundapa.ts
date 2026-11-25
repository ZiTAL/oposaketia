import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,educationIds,pdfText,stableId} from './shared';

export const FUNDAPA_BOARD='https://www.fundapa.org/inicio/tablon-de-anuncios/';
export const FUNDAPA_BASES='https://www.fundapa.org/site/wp-content/uploads/CONVOCATORIA-DE-FUNDAPA-SUSTITUCION-TECNICO-A-ECONOMICO-A-26-03-2026.pdf';
export const FUNDAPA_SOCIAL_BASES='https://www.fundapa.org/site/wp-content/uploads/Bases-TS-ES-Concurso-Oposicion.pdf';

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

export function parseFundapaSocialBoard(html:string):string{
 const $=load(html);
 const card=$('.card').filter((_,node)=>/Bases de la Convocatoria para la provisión, mediante concurso oposición, de una plaza de Trabajo Social-Educación Social al servicio de la fundación pública Navarra/i.test(clean($(node).find('h6').text())));
 const final=$('.card').filter((_,node)=>clean($(node).find('h6').text())==='CONCURSO OPOSICIÓN: Anuncio final del proceso'&&clean($(node).find('p.elcolor').text())==='6 junio 2023');
 if(card.length!==1||final.length!==1)throw new Error('Concurso-oposición social de FUNDAPA no identificado');
 const links=card.find('a[href]').toArray().map(node=>canonical($(node).attr('href')!,FUNDAPA_BOARD));
 if(links.length!==1||links[0]!==FUNDAPA_SOCIAL_BASES)throw new Error('Bases sociales FUNDAPA no identificadas');
 return links[0];
}

function socialTopics(text:string):string[]{
 const section=text.match(/ANEXO I\s+Temario\s+([\s\S]*)/i)?.[1];
 if(!section)throw new Error('Temario social FUNDAPA no identificado');
 const topics:string[]=[];
 for(const line of section.split(/\r?\n/)){
  const start=line.match(/^\s*(\d{1,2})\.-\s*(.+)/);
  if(start){topics.push(`${start[1]}.- ${clean(start[2])}`);continue;}
  const part=clean(line);
  if(topics.length&&part&&!/^(?:Fundación Pública Navarra|Desgaitasuna duten|C\/ Abejeras)/i.test(part))topics[topics.length-1]+=' '+part;
 }
 const numbering=topics.map(topic=>Number(topic.match(/^\d+/)?.[0]));
 if(topics.length!==23||numbering.join(',')!==[1,2,3,4,5,5,...Array.from({length:17},(_,i)=>i+6)].join(',')||!topics[22].includes('Código deontológico de Trabajo Social'))throw new Error('Epígrafes sociales FUNDAPA no identificados');
 return topics;
}

export function parseFundapaSocialBases(text:string,sha256:string,now:string):Call{
 const body=clean(text);
 if(!/CONVOCATORIA PARA LA PROVISIÓN, MEDIANTE CONCURSO OPOSICIÓN, DE UN PUESTO DE TRABAJO SOCIAL-EDUCACIÓN SOCIAL/i.test(body)
  ||!/provisión de una plaza del puesto de trabajo de Trabajo Social- Educación Social/i.test(body)
  ||!/título de Diplomado o Graduado Universitario en Trabajo Social o Educación Social o título declarado equivalente/i.test(body)
  ||!/plazo de 10 días naturales, contados a partir del siguiente al de la publicación en el Boletín Oficial de Navarra/i.test(body))throw new Error('Bases sociales FUNDAPA no identificadas');
 const call=baseCall('fundapa',FUNDAPA_BOARD,now,'Navarra');
 call.id=stableId('fundapa',FUNDAPA_SOCIAL_BASES);
 call.title='Trabajo Social / Educación Social · concurso-oposición';
 call.organization='Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad';
 call.location='Pamplona/Iruña';call.province='Navarra';call.category='Servicios';call.places=1;
 call.educationText='Diplomatura o Grado universitario en Trabajo Social o Educación Social, o título declarado equivalente.';
 call.acceptedQualifications=educationIds(call.educationText);
 call.deadline=null;call.status='Cerrada';
 call.requirements=[call.educationText,'Tener cumplidos dieciséis años y no exceder la edad de jubilación forzosa.','No estar inhabilitado ni separado del servicio de una Administración Pública.'];
 call.topics=socialTopics(text);
 call.description='Concurso-oposición de estabilización para una plaza laboral indefinida. El tablón oficial publicó el anuncio final el 6 de junio de 2023. Las bases fijan diez días naturales desde su publicación en el BON; sin fecha absoluta comprobada, el plazo queda sin determinar.';
 call.syllabusUrl=FUNDAPA_SOCIAL_BASES;call.sourceHash=sha256;
 call.documents=[{title:'Bases y temario social de FUNDAPA',url:FUNDAPA_SOCIAL_BASES,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
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
 const board=await client.text(FUNDAPA_BOARD);
 const economicUrl=parseFundapaBoard(board);
 const socialUrl=parseFundapaSocialBoard(board);
 const economic=await pdfText(client,economicUrl);
 const social=await pdfText(client,socialUrl);
 return [parseFundapaBases(economic.text,economic.sha256,now),parseFundapaSocialBases(social.text,social.sha256,now)];
}
