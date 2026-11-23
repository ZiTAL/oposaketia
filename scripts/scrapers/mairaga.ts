import {load} from 'cheerio';
import {z} from 'zod';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,pdfText,stableId,universityRequirementIds} from './shared';

export const MAIRAGA_HOME='https://mairaga.es/';
const postSchema=z.object({id:z.number().int().positive(),date:z.string(),link:z.url(),title:z.object({rendered:z.string()}),content:z.object({rendered:z.string(),protected:z.literal(false)})});
const phase=/valoracion (?:provisional|definitiva)|valoracion de (?:la )?fase|admitid|excluid|calificaci|resultado|plicas|fecha de examen|acta de|nombramiento|contratacion definitiva|desiert|desist|correccion|rectificacion/;
function processKey(title:string){return normalize(title.split('.')[0]).replace(/[^a-z0-9]+/g,' ').trim();}
function ownUrl(value:string,base=MAIRAGA_HOME){
 const url=new URL(value,base);
 if(url.origin!==new URL(MAIRAGA_HOME).origin||url.username||url.password||url.search||url.hash)throw new Error('Unexpected Mairaga publication URL');
 return url;
}
export function parseMairagaPosts(value:unknown,now:string):Call[]{
 // A full page requires explicit pagination support, never silent truncation.
 const posts=z.array(postSchema).max(99).parse(value);
 if(new Set(posts.map(post=>post.id)).size!==posts.length)throw new Error('Mairaga repeats a published post');
 const cutoff=new Date(Date.parse(now)-365*86400000).toISOString().slice(0,10);
 const entries=posts.map(post=>{
  if(!/^\d{4}-\d{2}-\d{2}T/.test(post.date)||Number.isNaN(Date.parse(post.date)))throw new Error('Invalid Mairaga publication date');
  return {post,title:clean(load(post.title.rendered).text())};
 }).filter(({post})=>post.date.slice(0,10)>=cutoff&&post.date.slice(0,10)<=now.slice(0,10));
 const calls:Call[]=[];
 for(const {post,title} of entries){
  const name=normalize(title);
  if(!/^convocatoria para (?:la provision|la constitucion)/.test(name)||!/mancomunidad de mairaga/.test(name)||/restringid|promocion interna/.test(name)||phase.test(name))continue;
  const url=ownUrl(post.link),call=baseCall('mairaga',url.href,now,'Navarra');
  call.id=stableId('mairaga',String(post.id));call.title=title;call.organization='Mancomunidad de Mairaga';call.province='Navarra';call.location='Navarra';call.category=categoryFor(title);
  call.description='Convocatoria propia publicada por la Mancomunidad de Mairaga. Se conservan las condiciones y el programa de las bases oficiales. Los plazos relativos no se calculan; las publicaciones posteriores se usan sólo para identificar la fase del mismo proceso.';
  const $=load(post.content.rendered);
  $('a[href]').each((_,node)=>{
   const caption=clean($(node).text());
   if(!/bases|convocatoria/i.test(caption)||phase.test(normalize(caption))||/instancia|solicitud/i.test(caption))return;
   const doc=ownUrl($(node).attr('href')!,url.href);
   if(!/^\/wp-content\/uploads\/.+\.pdf$/i.test(doc.pathname))return;
   if(!call.documents.some(item=>item.url===doc.href))call.documents.push({title:caption,url:doc.href,kind:'bases',checkedAt:null,sha256:null});
  });
  if(!call.documents.length)throw new Error('Mairaga original notice has no recognized legal bases');
  const updates=entries.filter(item=>processKey(item.title)===processKey(title)&&item.post.date>=post.date&&phase.test(normalize(item.title)));
  if(updates.length)call.status=updates.some(item=>/nombramiento|contratacion definitiva|desiert|desist/.test(normalize(item.title)))?'Cerrada':'En curso';
  call.sourceHash=hash(JSON.stringify({content:post.content.rendered,updates:updates.map(item=>({id:item.post.id,title:item.title,date:item.post.date}))}));
  calls.push(callSchema.parse(call));
 }
 return calls;
}
export function enrichMairagaBases(call:Call,text:string,url:string):Call{
 const head=normalize(clean(text.slice(0,15000)));
 const role=/chofer/.test(normalize(call.title))?'chofer':/economicas/.test(normalize(call.title))?'economicas':null;
 if(!/mancomunidad de mairaga/.test(head)||!role||!head.includes(role))throw new Error('Mairaga legal bases do not confirm the advertised employer and role');
 const minimum=text.match(/(?:^|\n)\s*2[.ªº]?[.–-]?\s*Requisitos[^\n]*[\s\S]*?(?=\n\s*3[.ªº]?[.–-]?\s*(?:Presentaci[oó]n|Solicitudes)|$)/i)?.[0];
 if(minimum){
  const academic=minimum.match(/(?:^|\n)\s*c\)\s*((?:Hallarse|Estar) en posesi[oó]n[\s\S]*?)(?=\n\s*d\)|\n\s*Las personas aspirantes|\n\s*En el caso de titulaciones|$)/i)?.[1];
  if(academic){call.educationText=clean(academic);call.acceptedQualifications=universityRequirementIds(call.educationText);}
  const driving=minimum.match(/(?:^|\n)\s*f\)\s*(Hallarse en posesi[oó]n del carnet de conducir[\s\S]*?)(?=\n\s*2\.2\.|\n\s*[g-z]\)|$)/i)?.[1];
  if(driving)call.requirements=[clean(driving),...call.requirements];
 }
 const programme=text.match(/ANEXO\s+I\s*[.\-–]*\s*TEMARIO\b([\s\S]*?)(?=ANEXO\s+II\b|$)/i)?.[1];
 if(programme){
  const topics:string[]=[];
  for(const raw of programme.split(/\r?\n/)){
   const line=clean(raw);
   if(!line||/Documento firmado electr[oó]nicamente|C[oó]d\. Validaci[oó]n|Verificaci[oó]n:|N[uú]mero:.*Fecha:|^P[áa]gina \d|^Parte [IVX]+\b/i.test(line))continue;
   if(/^\d{1,3}\.\s+/.test(line))topics.push(line);
   else if(topics.length)topics[topics.length-1]+=' '+line;
  }
  if(topics.length>150)throw new Error('Unexpected Mairaga programme size');
  if(topics.length){call.topics=topics;call.syllabusUrl=url;}
 }
 return callSchema.parse(call);
}
export async function scrapeMairaga(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const url=new URL('wp-json/wp/v2/posts',MAIRAGA_HOME);
 url.search=new URLSearchParams({search:'convocatoria',per_page:'100',page:'1',after:new Date(Date.parse(now)-365*86400000).toISOString().slice(0,19),_fields:'id,date,link,title,content'}).toString();
 const calls=parseMairagaPosts(JSON.parse(await client.text(url.href)),now);
 for(const call of calls){
  for(const doc of call.documents){
   try{const pdf=await pdfText(client,doc.url);enrichMairagaBases(call,pdf.text,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;}
   catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}
  }
  if(!call.topics.length)warn(`${call.sourceUrl}: No academic programme could be extracted; consult the original bases`);
  if(!call.acceptedQualifications.length)warn(`${call.sourceUrl}: Academic requirements need further review`);
 }
 return calls.map(call=>callSchema.parse(call));
}
