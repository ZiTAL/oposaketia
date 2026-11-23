import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,extractTopics,linkList,parseDate,pdfText,stableId,universityRequirementIds} from './shared';
export const EUSKALMET_JOBS='https://euskalmet.euskadi.eus/oferta-de-empleo/';
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export function parseEuskalmetJobs(html:string,now:string):Call[]{
 const $=load(html),heading=$('h2').filter((_,node)=>normalize(clean($(node).text()))==='ofertas activas:').first();
 if(!heading.length)throw new Error('Euskalmet employment sections are not recognized');
 const root=heading.parent(),calls:Call[]=[];let phase:'active'|'closed'|undefined;
 root.children('h2,h3').each((_,node)=>{
  const title=clean($(node).text()).replace(/^[-–]\s*/,''),normalized=normalize(title);
  if($(node).is('h2')){if(normalized==='ofertas activas:')phase='active';if(normalized==='ofertas cerradas:')phase='closed';return;}
  if(!phase||!title)return;
  const content=$(node).nextUntil('h2,h3'),section=load(content.toArray().map(node=>$.html(node)).join(''));
  const bases=linkList(section,'a[href]',EUSKALMET_JOBS).find(link=>{
   const url=new URL(link.url);return url.origin===new URL(EUSKALMET_JOBS).origin&&!url.username&&!url.password&&/\.pdf$/i.test(url.pathname)&&/^Bases(?:\s|\(|$)/i.test(link.title);
  });
  if(!bases)throw new Error('Euskalmet process has no recognized bases document');
  const call=baseCall('euskalmet',EUSKALMET_JOBS,now,'Euskadi');call.id=stableId('euskalmet',bases.url);call.title=title;call.organization='Euskalmet · Agencia Vasca de Meteorología';call.category=categoryFor(title);
  const date=clean(content.text()).match(/plazo de inscripci[oó]n abierto hasta el (\d{1,2}) de ([a-záéíóú]+) de (\d{4})/i);
  if(date){const month=months.indexOf(normalize(date[2]))+1;if(month)call.deadline=parseDate(`${date[1]}/${month}/${date[3]}`);}
  call.status=phase==='closed'?'Cerrada':call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
  call.description='Proceso publicado en la página oficial de empleo de Euskalmet. La fase se contrasta con el plazo de inscripción expresamente impreso. Consulta las bases completas para las condiciones académicas, lingüísticas y de selección.';
  call.documents=[{...bases,kind:'bases',checkedAt:null,sha256:null}];call.sourceHash=hash(title+section.html());calls.push(callSchema.parse(call));
 });
 if(!calls.length)throw new Error('Euskalmet process headings are missing');return calls;
}
export function enrichEuskalmetBases(call:Call,text:string,url:string):Call{
 const education=text.match(/Titulaci[oó]n(?:\s+Acad[eé]mica|\s+Requerida)?\s*:\s*([\s\S]*?)(?=\n\s*\n|\n\s*(?:4\.2\.11|[b-d]\)|[•●]\s*Funciones)|$)/i)?.[1];
 if(education){call.educationText=clean(education);call.acceptedQualifications=universityRequirementIds(call.educationText);}
 const languages=text.match(/4\.2\.11\s+Requisitos Ling[uü][ií]sticos\s*:\s*([\s\S]*?)(?=\n\s*4\.2\.12\b|$)/i)?.[1].slice(0,2000);
 if(languages){
  call.requirements=[clean(languages),...call.requirements];
  if(/Euskera:\s*Acreditar un nivel m[ií]nimo B2/i.test(languages)){call.language={name:'euskera',level:'B2'};call.languageStatus='known';}
 }
 const topics=extractTopics(text);if(topics.length){call.topics=topics;call.syllabusUrl=url;}return call;
}
export async function scrapeEuskalmet(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseEuskalmetJobs(await client.text(EUSKALMET_JOBS),now);
 for(const call of calls){const doc=call.documents[0];try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(pdf.text.trim().length<100)warn(`${doc.url}: Scanned bases require review`);enrichEuskalmetBases(call,pdf.text,doc.url);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
 return calls.map(call=>callSchema.parse(call));
}
