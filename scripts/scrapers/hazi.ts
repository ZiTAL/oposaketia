import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,educationIds,parseDate,pdfText,stableId} from './shared';

export const HAZI_JOBS='https://hazi.eus/es/trabaja-en-hazi/';
function role(text:string):'formacion'|'marcas'|'juridico'|null{
 const value=normalize(clean(text));
 if(/formacion para el empleo/.test(value))return 'formacion';
 if(/marcas y mercados/.test(value))return 'marcas';
 if(/juridico.*contratacion|secretaria tecnica.*tecnico.*contratacion/.test(value))return 'juridico';
 return null;
}
function legalUrl(raw:string):URL{
 const url=new URL(raw,HAZI_JOBS);
 if(url.origin!=='https://hazi.eus'||url.username||url.password||url.search||url.hash||!/^\/wp-content\/uploads\/.+\.pdf$/i.test(url.pathname))throw new Error('Unexpected HAZI legal document URL');
 return url;
}
export function parseHaziList(html:string,now:string):Call[]{
 const $=load(html);
 if(!$('h1,h2,h3').toArray().some(node=>normalize(clean($(node).text()))==='trabaja en hazi'))throw new Error('HAZI employment heading not recognized');
 const calls:Call[]=[];
 $('h2,h3').filter((_,node)=>/^convocatoria externa de un puesto indefinido/.test(normalize(clean($(node).text())))).each((_,heading)=>{
  const title=clean($(heading).text());
  if(!role(title))throw new Error('New HAZI role requires legal identity review');
  let section=$(heading).parent();
  for(let depth=0;depth<8;depth++){
   const count=section.find('h2,h3').filter((_,node)=>/^convocatoria externa/.test(normalize(clean($(node).text())))).length;
   if(count!==1)throw new Error('HAZI call section cannot be isolated');
   if(section.find('a[href]').filter((_,node)=>/^perfil requerido$/i.test(clean($(node).text()))).length)break;
   section=section.parent();
  }
  const call=baseCall('hazi',HAZI_JOBS,now,'Euskadi');call.title=title;call.organization='Fundación HAZI Fundazioa';call.places=1;call.category=categoryFor(title);
  section.find('a[href]').each((_,node)=>{
   const caption=clean($(node).text());
   const kind=/^perfil requerido$/i.test(caption)?'bases':/^calendario(?: del proceso)?$/i.test(caption)?'calendario':null;
   if(!kind)return;
   const url=legalUrl($(node).attr('href')!);
   if(!call.documents.some(doc=>doc.url===url.href))call.documents.push({title:caption,url:url.href,kind,checkedAt:null,sha256:null});
  });
  const bases=call.documents.filter(doc=>doc.kind==='bases');
  if(bases.length!==1||call.documents.filter(doc=>doc.kind==='calendario').length>1)throw new Error('HAZI call requires unambiguous legal profile and calendar');
  call.id=stableId('hazi',bases[0].url);
  call.description='Convocatoria externa de contratación indefinida publicada por Fundación HAZI Fundazioa. Las bases determinan los estudios, idiomas, destinos posibles y bloques de conocimientos de la prueba escrita. No se descargan listados de candidatos ni se accede al formulario de la empresa de selección.';
  call.sourceHash=hash($.html(section));calls.push(callSchema.parse(call));
 });
 if(!calls.length||new Set(calls.map(call=>call.id)).size!==calls.length)throw new Error('HAZI call list is empty or repeats legal profiles; review required');
 return calls;
}
function readable(text:string):string{return text.replace(/\f/g,'\n').split(/\r?\n/).filter(line=>!/^\s*\d+\s*$/.test(line)).join('\n');}
function bullets(text:string):string[]{return text.split(/(?:^|\n)\s*[•➢]\s+/).slice(1).map(clean).filter(Boolean);}
export function enrichHaziBases(call:Call,raw:string,now:string):Call{
 const text=readable(raw),head=normalize(clean(text.slice(0,500)));
 if(role(head)!==role(call.title)||!/convocatoria.*externa|seleccion externa/.test(head)||!head.includes('indefinido')||!normalize(clean(text)).includes('hazi fundazioa'))throw new Error('HAZI bases do not confirm the role, contract and employer');
 const minimum=text.match(/(?:^|\n)\s*1[.\s-]*Requisitos imprescindibles y excluyentes[.:]?([\s\S]*?)(?=\n\s*2[.\s-]*Requisitos valorables)/i)?.[1];
 const required=minimum?bullets(minimum):[];
 const academic=required.find(line=>/^(?:Titulaci[oó]n:\s*)?(?:Diplomatura|Licenciatura|Grado)/i.test(line));
 if(!academic)throw new Error('HAZI mandatory academic section not recognized');
 const location=text.match(/(?:^|\n)\s*3[.\s-]*LUGAR DE TRABAJO\s*([\s\S]*?)(?=\n\s*4[.\s-]*TRIBUNAL)/i)?.[1];
 if(!location||!/donostia.*gipuzkoa.*abadino.*bizkaia.*arkaute.*araba/.test(normalize(clean(location))))throw new Error('HAZI possible work locations not confirmed in the bases');
 call.location=clean(location);call.province=null;
 call.educationText=academic;
 // ADE is the literal alternative in HAZI's official academic requirement.
 // Keep the original wording and expand the abbreviation only for matching.
 call.acceptedQualifications=educationIds(academic.replace(/\bADE\b/g,'Administración y Dirección de Empresas'));
 call.requirements=required;
 const basque=required.find(line=>/^euskera a nivel de (?:B1|B2|C1|C2)\b/i.test(line));
 if(basque){call.language={name:'euskera',level:basque.match(/\b(B1|B2|C1|C2)\b/i)![1].toUpperCase() as 'B1'|'B2'|'C1'|'C2'};call.languageStatus='known';}
 const closing=normalize(clean(text)).match(/presentacion de candidaturas, que finalizara el (\d{1,2}\/\d{1,2}\/\d{4})\b/)?.[1];
 call.deadline=closing?parseDate(closing):null;
 call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
 const programme=text.match(/(?:^|\n)\s*2[.\s-]*1[.\s-]*(?:Conocimientos\s+)?Espec[ií]ficos(?: del puesto)?[.:]?([\s\S]*?)(?=\n\s*2[.\s-]*2[.\s-]*Experiencia)/i)?.[1];
 if(programme&&/prueba escrita/i.test(programme)){
  call.topics=bullets(programme.split(/\bPara superar esta fase\b/i)[0]);
  if(call.topics.length)call.syllabusUrl=call.documents.find(doc=>doc.kind==='bases')!.url;
 }
 return callSchema.parse(call);
}
export function applyHaziCalendar(call:Call,text:string,now:string):void{
 if(!/^calendario proceso externo/.test(normalize(clean(text)))||role(text.slice(0,200))!==role(call.title))throw new Error('HAZI calendar belongs to a different role');
 const range=clean(text).match(/Del\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+hasta el\s+(\d{1,2}\/\d{1,2}\/\d{4}):\s*plazo de recepci[oó]n de solicitudes/i);
 const start=range?parseDate(range[1]):null,end=range?parseDate(range[2]):null;
 if(!start||!end||start>end)throw new Error('HAZI calendar application period not recognized');
 if(call.deadline&&call.deadline!==end){
  call.requirements.unshift(`Plazo contradictorio en los documentos oficiales: bases ${call.deadline}, calendario ${end}. Confirma el plazo con HAZI antes de solicitar.`);
  call.deadline=null;call.status='Pendiente de confirmar';
 }else{call.deadline=end;call.status=end<now.slice(0,10)?'Cerrada':start>now.slice(0,10)?'Próximamente':'Abierta';}
}
export async function scrapeHazi(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listed=parseHaziList(await client.text(HAZI_JOBS),now),calls:Call[]=[];
 for(const call of listed){
  try{
   const bases=call.documents.find(doc=>doc.kind==='bases')!,pdf=await pdfText(client,bases.url);
   enrichHaziBases(call,pdf.text,now);bases.checkedAt=now;bases.sha256=pdf.sha256;
   const calendar=call.documents.find(doc=>doc.kind==='calendario');
   if(calendar)try{
    const content=await pdfText(client,calendar.url);applyHaziCalendar(call,content.text,now);calendar.checkedAt=now;calendar.sha256=content.sha256;
    if(call.requirements.some(line=>line.startsWith('Plazo contradictorio')))warn(`${call.id}: Conflicting official application deadlines`);
   }catch(error){
    // A linked application calendar must be reviewed before advertising an
    // open period from the profile alone: it may amend or contradict it.
    call.deadline=null;call.status='Pendiente de confirmar';warn(`${calendar.url}: ${error instanceof Error?error.message:'Calendar unavailable'}`);
   }
   if(!call.acceptedQualifications.length)warn(`${call.id}: Literal academic restriction requires review; no broad degree match inferred`);
   if(!call.topics.length)warn(`${call.id}: Written examination knowledge blocks not extracted`);
   calls.push(callSchema.parse(call));
  }catch(error){warn(`${call.id}: ${error instanceof Error?error.message:'Legal bases unavailable'}`);}
 }
 if(!calls.length)throw new Error('No HAZI call could be confirmed from its legal profile');
 return calls;
}
