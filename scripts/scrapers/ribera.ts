import {load} from 'cheerio';
import {z} from 'zod';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,pdfText,stableId,universityRequirementIds} from './shared';

export const RIBERA_HOME='https://mancoribera.com/';
const postSchema=z.object({id:z.number().int().positive(),date:z.string(),link:z.url(),title:z.object({rendered:z.string()}),content:z.object({rendered:z.string(),protected:z.literal(false)})});
const phase=/admitid|excluid|calificaci|resultado|plicas|nombramiento|baremo|correccion|rectificacion/;
function cutoffDate(now:string){const date=new Date(now);date.setUTCFullYear(date.getUTCFullYear()-3);return date.toISOString();}
function ownUrl(value:string,base=RIBERA_HOME){
 const url=new URL(value,base);
 if(url.origin!==new URL(RIBERA_HOME).origin||url.username||url.password||url.search||url.hash)throw new Error('Unexpected Ribera publication URL');
 return url;
}
export function parseRiberaPosts(value:unknown,now:string):Call[]{
 const posts=z.array(postSchema).max(99).parse(value);
 if(new Set(posts.map(post=>post.id)).size!==posts.length)throw new Error('Ribera repeats a published post');
 const calls:Call[]=[];
 for(const post of posts){
  if(!/^\d{4}-\d{2}-\d{2}T/.test(post.date)||Number.isNaN(Date.parse(post.date)))throw new Error('Invalid Ribera publication date');
  if(post.date.slice(0,10)<cutoffDate(now).slice(0,10)||post.date.slice(0,10)>now.slice(0,10))continue;
  const title=clean(load(post.title.rendered).text()),name=normalize(title);
  if(!/^oferta de empleo:.*convocatoria/.test(name)||phase.test(name)||/restringid|promocion interna/.test(name))continue;
  const url=ownUrl(post.link),call=baseCall('ribera',url.href,now,'Navarra');
  call.id=stableId('ribera',String(post.id));call.title=title;call.category=categoryFor(title);call.province='Navarra';call.location='Navarra';
  call.organization='Entidad empleadora pendiente de comprobar en las bases';
  call.description='Proceso publicado en el tablón de la Mancomunidad de la Ribera. El empleador contractual se confirma en las bases antes de incorporar la ficha. Incluye anuncios históricos de los últimos tres años; la fecha de publicación no confirma inscripción abierta y no se calculan plazos relativos.';
  const $=load(post.content.rendered);
  const captions=$('a[href]').map((_,node)=>clean($(node).text())).get();
  $('a[href]').each((_,node)=>{
   const caption=clean($(node).text());
   if(!/^bases de la convocatoria/i.test(caption)||phase.test(normalize(caption))||/solicitud|instancia/i.test(caption))return;
   const doc=ownUrl($(node).attr('href')!,url.href);
   if(!/^\/wp-content\/uploads\/.+\.pdf$/i.test(doc.pathname))return;
   if(!call.documents.some(item=>item.url===doc.href))call.documents.push({title:caption,url:doc.href,kind:'bases',checkedAt:null,sha256:null});
  });
  if(!call.documents.length)throw new Error('Ribera employment notice has no recognized legal bases');
  // Only the captions establish a phase; no candidate/result file is fetched.
  if(captions.some(text=>/propuesta de nombramiento|nombramiento definitivo|proceso desierto/i.test(text)))call.status='Cerrada';
  else if(captions.some(text=>phase.test(normalize(text))))call.status='En curso';
  call.sourceHash=hash(post.content.rendered);calls.push(callSchema.parse(call));
 }
 return calls;
}
export function enrichRiberaBases(call:Call,text:string,url:string):Call{
 const head=normalize(clean(text.slice(0,2500))),title=normalize(call.title);
 const expected=/oficial administrativo/.test(title)?/oficial adm(?:i)?nistrativo/:/vigilante/.test(title)?/\bvigilante\b/:null;
 if(!expected||!expected.test(head)||!/servicios publicos de la ribera/.test(head)||!/\bserinsa\b/.test(head)||!/mancomunidad de la ribera/.test(head))throw new Error('Ribera bases do not confirm the advertised role and SERINSA employer');
 call.organization='Servicios Públicos de la Ribera, S.A.U. (SERINSA)';
 if(/provision de un puesto de oficial administrativo/.test(head))call.places=1;
 const minimum=text.match(/\bBase\s+2[\s.ªº–-]*Requisitos[^\n]*[\s\S]*?(?=\bBase\s+3[\s.ªº–-]|$)/i)?.[0];
 if(minimum){
  const academic=minimum.match(/(?:^|\n)\s*c[.)]\s*([\s\S]*?)(?=\n\s*d[.)]|$)/i)?.[1];
  if(academic){call.educationText=clean(academic);call.acceptedQualifications=universityRequirementIds(call.educationText);}
  const driving=minimum.match(/(?:^|\n)\s*f[.)]\s*(Estar en posesi[oó]n del carnet de conducir[\s\S]*?)(?=\n\s*g[.)]|$)/i)?.[1];
  if(driving)call.requirements=[clean(driving),...call.requirements];
 }
 const programme=text.match(/ANEXO\s+II\b\s*[.\-–]*\s*TEMARIO\s+PRUEBA\s+TE[ÓO]RICA\b([\s\S]*?)(?=ANEXO\s+III\b|$)/i)?.[1];
 if(programme){
  const topics:string[]=[];
  for(const raw of programme.split(/\r?\n/)){
   const line=clean(raw);
   if(!line||/^\d+$/.test(line)||/Documento firmado electr[oó]nicamente|C[oó]d\. Validaci[oó]n|Verificaci[oó]n:/i.test(line))continue;
   const number=line.match(/^(\d{1,3})\.[–-]?\s+/)?.[1];
   // Wrapped legal ranges such as 'artículos 11 al\n21. CAPÍTULO...'
   // continue the current item; only consecutive programme numbers start one.
   if(number&&Number(number)===topics.length+1)topics.push(line);
   else if(topics.length)topics[topics.length-1]+=' '+line;
  }
  if(topics.length>100)throw new Error('Unexpected Ribera programme size');
  if(topics.length){call.topics=topics;call.syllabusUrl=url;}
 }
 return callSchema.parse(call);
}
export async function scrapeRibera(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const url=new URL('wp-json/wp/v2/posts',RIBERA_HOME);
 url.search=new URLSearchParams({search:'empleo',per_page:'100',page:'1',after:cutoffDate(now).slice(0,19),_fields:'id,date,link,title,content'}).toString();
 const listed=parseRiberaPosts(JSON.parse(await client.text(url.href)),now),calls:Call[]=[];
 for(const call of listed){
  let confirmed=false;
  for(const doc of call.documents){
   try{const pdf=await pdfText(client,doc.url);enrichRiberaBases(call,pdf.text,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;confirmed=true;}
   catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}
  }
  // The publishing mancomunidad must never become an assumed employer.
  if(!confirmed)continue;
  if(!call.acceptedQualifications.length)warn(`${call.sourceUrl}: Academic requirements need further extraction`);
  if(!call.topics.length)warn(`${call.sourceUrl}: Programme not extracted; consult the bases`);
  calls.push(callSchema.parse(call));
 }
 if(listed.length&&!calls.length)throw new Error('No Ribera employer and legal bases could be confirmed');
 return calls;
}
