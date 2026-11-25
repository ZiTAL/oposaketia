import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const NATURGOLF_PORTAL='https://www.izkigolf.eus/naturgolf-perfil-contratante/';
const BASES='https://www.izkigolf.eus/wp-content/uploads/2022/02/Anuncio-Bases-CONTRATACION-VIGILANTE-RECEPCIONISTA.pdf';

export function parseNaturgolfPortal(html:string):string{
 const $=load(html);
 if($('h2').filter((_,node)=>/Perfil del contratante NATURGOLF S\.A\./i.test(clean($(node).text()))).length!==1)throw new Error('Perfil oficial de Naturgolf no identificado');
 if($('h5').filter((_,node)=>/Convocatoria Contratación personal fijo discontinuo \(cerrada\)/i.test(clean($(node).text()))).length!==1)throw new Error('Convocatoria laboral de Naturgolf no identificada');
 const links=$('a[href]').filter((_,node)=>clean($(node).text())==='Bases').map((_,node)=>canonical($(node).attr('href')!,NATURGOLF_PORTAL)).get();
 if(links.length!==1||links[0]!==BASES)throw new Error('Bases laborales de Naturgolf no identificadas');
 return BASES;
}

export function parseNaturgolfBases(text:string,sha256:string,now:string):Call{
 const content=clean(text);
 if(!/BASES DE LA CONVOCATORIA DE NATURGOLF, S\.A\. PARA LA CONTRATACIÓN LABORAL DE VIGILANTE-RECEPCIONISTA/i.test(content))throw new Error('Bases de Naturgolf no identificadas');
 if(!/una plaza de carácter fijo en la plantilla de Naturgolf, SA/i.test(content)||!/fijo discontinuo/i.test(content))throw new Error('Plaza de Naturgolf no identificada');
 if(!/título de Graduado Escolar o de ESO/i.test(content)||!/10 días naturales contados a partir del siguiente al de la publicación/i.test(content)||!/CONOCIMIENTO DE EUSKERA \(máximo 3 puntos\)/i.test(content))throw new Error('Requisitos o plazo relativo de Naturgolf no identificados');
 const section=text.match(/ANEXO\s*\.\s*-\s*TEMARIO([\s\S]*)/i)?.[1];
 const topics=section?.split(/\r?\n/).map(clean).filter(line=>/^Tema\s+[1-5]\s*\.\s*-/i.test(line))??[];
 if(topics.length!==5||topics.some((topic,index)=>!new RegExp(`^Tema ${index+1}\\s*\\.\\s*-`,'i').test(topic)))throw new Error('Cinco temas de Naturgolf no identificados');
 const call=baseCall('naturgolf',NATURGOLF_PORTAL,now,'Euskadi');
 call.id=stableId('naturgolf','vigilante-recepcionista-2022');call.title='Vigilante-recepcionista';call.organization='Naturgolf';
 call.location='Urturi';call.province='Araba / Álava';call.category='Servicios';call.places=1;
 call.educationText='Graduado Escolar o ESO, como mínimo.';call.acceptedQualifications=['eso'];
 call.language=null;call.languageStatus='known';call.deadline=null;call.status='Cerrada';
 call.requirements=[call.educationText,'El euskera se valora como mérito, sin nivel mínimo obligatorio.','El plazo original era de diez días naturales desde la publicación; no consta la fecha absoluta de cierre.'];
 call.description='Concurso-oposición de 2022 para un contrato indefinido fijo discontinuo en Izki Golf. La convocatoria original figura como cerrada en el portal de Naturgolf.';
 call.topics=topics;call.syllabusUrl=BASES;call.sourceHash=sha256;
 call.documents=[{title:'Bases de vigilante-recepcionista con temario',url:BASES,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeNaturgolf(client:OfficialClient,now:string):Promise<Call[]>{
 const url=parseNaturgolfPortal(await client.text(NATURGOLF_PORTAL));
 const pdf=await pdfText(client,url);
 return [parseNaturgolfBases(pdf.text,pdf.sha256,now)];
}
