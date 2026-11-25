import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const INDESA_EMPLOYMENT='https://www.indesa.eus/es/empleo/';
const JOB='RESPONSABLE DEPARTAMENTO LABORAL';
const BASES='https://www.indesa.eus/wp-content/uploads/2026/05/0-0-Bases-responsable-del-dpto-laboral-1.pdf';
const FORAL_JOB='https://enplegupublikoa.araba.eus/es/-/indesa-apertura-proceso-seleccion-responsable-departamento-laboral';

export function isIndesaResponsibleNotice(url:string):boolean{
 const candidate=new URL(url),original=new URL(FORAL_JOB);
 return candidate.origin===original.origin&&candidate.pathname===original.pathname;
}

export function parseIndesaEmployment(html:string):string{
 const $=load(html);
 const item=$('.event-item').filter((_,node)=>clean($(node).find('.event-content > h3').first().text()).toUpperCase()===JOB);
 if(item.length!==1||clean(item.find('.event-meta .event-category').first().text())!=='Ofertas externas'||clean(item.find('.event-meta .event-date').first().text())!=='25 mayo 2026')throw new Error('Oferta externa de Indesa no identificada');
 const links=item.find('.event-details a[href]').filter((_,node)=>/Bases generales del proceso/i.test(clean($(node).parent().text()))).map((_,node)=>canonical($(node).attr('href')!,INDESA_EMPLOYMENT)).get();
 if(links.length!==1||links[0]!==BASES)throw new Error('Bases originales de Indesa no identificadas');
 return BASES;
}

export function indesaTopics(text:string):string[]{
 const section=text.match(/ANEXO I\s*[-–.]\s*TEMARIO\.([\s\S]*?)ANEXO II\s*[-–.]\s*DESTINO/i)?.[1];
 if(!section)return [];
 const topics:string[]=[];let current='';
 for(const line of section.split(/\r?\n/)){
  const value=line.trim();
  if(/^[-•]\s+/.test(value)){
   if(current)topics.push(clean(current));
   current=value.replace(/^[-•]\s+/,'');
  }else if(current&&value&&!/^\d{1,2}$/.test(value)&&!/^(?:FASE CONOCIMIENTOS|HERRAMIENTAS INFORMÁTICAS|TEÓRICO)/i.test(value))current+=' '+value;
 }
 if(current)topics.push(clean(current));
 return topics.filter(topic=>!/^TEÓRICO\b/i.test(topic)&&topic.length>8&&topic.length<900);
}

export function parseIndesaBases(text:string,sha256:string,now:string):Call{
 const content=clean(text);
 if(!/convocatoria conjunta interna y externa para.*?cobertura indefinida de una plaza de estructura como Responsable del Departamento Laboral/i.test(content)||!/INDESA 2010 S\.L\./i.test(content))throw new Error('Puesto y turno externo de Indesa no identificados');
 if(!/FINALIZARÁ A LAS 12:00 HORAS del 19 de Junio de 2026/i.test(content))throw new Error('Plazo de Indesa no identificado');
 if(!/TITULACIÓN REQUERIDA Y OBLIGATORIA: Grado en relaciones laborales o RRHH, Ciencias del trabajo, Derecho, o Administración y Dirección de empresas/i.test(content)||!/experiencia mínima de tres años en puesto similar/i.test(content)||!/carnet de conducir, clase B/i.test(content))throw new Error('Requisitos de Indesa no identificados');
 const topics=indesaTopics(text);
 if(topics.length<15||topics.length>35||!topics.some(topic=>/Convenio colectivo vigente/i.test(topic))||!topics.some(topic=>/Aplicación SAP de RRHH/i.test(topic)))throw new Error('Temario de Indesa no identificado');
 const call=baseCall('indesa',INDESA_EMPLOYMENT,now,'Euskadi');
 call.id=stableId('indesa','responsable-departamento-laboral-2026');call.title='Responsable del Departamento Laboral';call.organization='Indesa 2010';
 call.location='Vitoria-Gasteiz';call.province='Araba / Álava';call.category='Administración';call.places=1;
 call.educationText='Grado en Relaciones Laborales o Recursos Humanos, Ciencias del Trabajo, Derecho, o Administración y Dirección de Empresas.';
 call.language=null;call.languageStatus='known';call.deadline='2026-06-19';call.status='Cerrada';
 call.requirements=[call.educationText,'Al menos tres años de experiencia en un puesto similar.','Permiso de conducir B.','El euskera se valora como mérito, sin requisito mínimo publicado.'];
 call.description='Convocatoria conjunta interna y externa para una plaza laboral indefinida. La lista externa tiene acceso condicionado a la prioridad de la lista interna. Plazo de inscripción cerrado.';
 call.topics=topics;call.syllabusUrl=BASES;call.sourceHash=sha256;
 call.documents=[{title:'Bases generales y específicas, con temario en el anexo I',url:BASES,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeIndesa(client:OfficialClient,now:string):Promise<Call[]>{
 const url=parseIndesaEmployment(await client.text(INDESA_EMPLOYMENT));
 const pdf=await pdfText(client,url);
 return [parseIndesaBases(pdf.text,pdf.sha256,now)];
}
