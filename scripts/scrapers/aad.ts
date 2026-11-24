import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const AAD_JOB='https://enplegupublikoa.araba.eus/es/-/alava-agencia-de-desarrollo-sa-seleccion-de-personal-laboral-ingeniera';
const BASES='https://enplegupublikoa.araba.eus/documents/d/enplegupublikoa/bases-ingeniero-202601aad';

export function isAadNotice(url:string):boolean{
 const candidate=new URL(url),original=new URL(AAD_JOB);
 return candidate.origin===original.origin&&candidate.pathname===original.pathname;
}

export function parseAadDetail(html:string):string{
 const $=load(html),card=$('.journal-content-article').filter((_,node)=>clean($(node).find('h3.titulo-aviso').text())==='Álava Agencia de Desarrollo, S.A. Selección de personal laboral. Ingeniero/a');
 if(card.length!==1||!/18\/06\/2026/.test(clean(card.text()))||!/Organismo:\s*Álava Agencia de Desarrollo, S\.A/i.test(clean(card.text())))throw new Error('Ficha de ingeniería de AAD no identificada');
 const links=card.find('a[href]').filter((_,node)=>clean($(node).text())==='Proceso de selección').map((_,node)=>canonical($(node).attr('href')!,AAD_JOB)).get();
 if(links.length!==1||links[0]!==BASES)throw new Error('Bases forales de AAD no identificadas');
 return BASES;
}

export function parseAadBases(text:string,sha256:string,now:string):Call{
 const content=clean(text);
 if(!/BASES GENERALES QUE REGULAN SELECCIÓN DE PERSONAL LABORAL, PARA CUBRIR UN PUESTO DE INGENIERO\/A AL SERVICIO DE LA SOCIEDAD ÁLAVA AGENCIA DE DESARROLLO S\.A\./i.test(content)||!content.includes('código de convocatoria: 202601aad'))throw new Error('Resolución de AAD no identificada');
 if(!/puesto de trabajo se desempeñará en las oficinas de la Sociedad sitas en C\/Joaquín José de Landázuri, 13-15 Bajo, 01008, Vitoria-Gasteiz \(Álava\)/i.test(content))throw new Error('Destino de AAD no identificado');
 if((content.match(/plazo de presentación de solicitudes será hasta el 5 de julio de 2026 inclusive/gi)??[]).length!==2)throw new Error('Plazo de AAD no coincide entre bases');
 if(!/Grado en Ingeniería Civil o Industrial O título de Ingeniero\/a técnico de obras públicas \/ industrial/i.test(content))throw new Error('Titulaciones de AAD no identificadas');
 if(!/Nivel B1 Euskera\. Puntuación: requisito obligatorio/i.test(content)||!/carnet de conducir clase B\. Puntuación: requisito obligatorio/i.test(content)||!/experiencia superior a 2 años en labores propias de la titulación requerida/i.test(content))throw new Error('Otros requisitos de AAD no identificados');
 const call=baseCall('aad',AAD_JOB,now,'Euskadi');
 call.id=stableId('aad','202601aad');call.title='Ingeniero/a';call.organization='Álava Agencia de Desarrollo';
 call.location='Vitoria-Gasteiz';call.province='Araba / Álava';call.category='Servicios';call.places=1;
 call.educationText='Grado en Ingeniería Civil o Industrial, o título de Ingeniería Técnica de Obras Públicas o Industrial.';
 call.language={name:'euskera',level:'B1'};call.languageStatus='known';
 call.deadline='2026-07-05';call.status='Cerrada';
 call.requirements=[call.educationText,'Euskera B1 obligatorio, acreditable con título o prueba.','Permiso de conducir B.','Experiencia superior a dos años en tareas propias de la titulación.'];
 call.description='Selección de personal laboral indefinido con inscripción cerrada. Las bases describen valoración de competencia técnica, experiencia y funciones del puesto; no incluyen un temario de examen.';
 call.sourceHash=sha256;call.documents=[{title:'Bases generales y específicas 202601aad',url:BASES,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeAad(client:OfficialClient,now:string):Promise<Call[]>{
 const basesUrl=parseAadDetail(await client.text(AAD_JOB));
 const pdf=await pdfText(client,basesUrl);
 return [parseAadBases(pdf.text,pdf.sha256,now)];
}
