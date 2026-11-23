import {load} from 'cheerio';
import {z} from 'zod';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';
import reviews from '../reviews/maneru.json';
export const MANERU_HOME='https://www.xn--maeru-pta.es/';
const postSchema=z.object({id:z.number().int().positive(),date:z.string(),link:z.url(),title:z.object({rendered:z.string()}),content:z.object({rendered:z.string(),protected:z.literal(false)})});
export function applyReviewedManeruScan(call:Call,url:string,sha256:string,now:string):boolean{
 const review=reviews.find(item=>item.url===url&&item.sha256===sha256);if(!review)return false;
 call.deadline=review.deadline;call.status=review.deadline<now.slice(0,10)?'Cerrada':'Abierta';call.places=review.places;call.requirements=[...review.requirements,...call.requirements];
 call.educationText='El bando revisado no especifica una titulación académica. Consulta los requisitos de inscripción, desempleo y selección en el documento oficial.';call.acceptedQualifications=[];return true;
}
export function parseManeruPosts(value:unknown,now:string):Call[]{
 const posts=z.array(postSchema).max(99).parse(value),cutoff=new Date(Date.parse(now)-365*86400000).toISOString().slice(0,10),calls:Call[]=[];
 if(new Set(posts.map(post=>post.id)).size!==posts.length)throw new Error('Mañeru search repeats a post');
 for(const post of posts){
  if(!/^\d{4}-\d{2}-\d{2}T/.test(post.date)||Number.isNaN(Date.parse(post.date)))throw new Error('Invalid Mañeru publication date');
  const $=load(post.content.rendered),title=clean(load(post.title.rendered).text()),body=normalize(clean($.text()));
  if(post.date.slice(0,10)<cutoff||!/empleo|socorrista/.test(normalize(title))||!/ayuntamiento de maneru/.test(body)||!/contratacion|contrato|busca/.test(body))continue;
  const source=new URL(post.link);if(source.origin!==new URL(MANERU_HOME).origin||source.username||source.password)throw new Error('Unexpected Mañeru article URL');
  const call=baseCall('maneru',source.href,now,'Navarra');call.id=stableId('maneru',String(post.id));call.title=title;call.organization='Ayuntamiento de Mañeru';call.location='Mañeru';call.province='Navarra';
  $('a[href]').each((_,node)=>{try{const a=$(node),caption=clean(a.text()),url=new URL(a.attr('href')!,post.link);if(url.username||url.password||url.port||url.hostname!==new URL(MANERU_HOME).hostname||!['https:','http:'].includes(url.protocol)||!/\.pdf$/i.test(url.pathname)||!/bando|bases|convocatoria/i.test(caption)||/admitid|excluid|resultado/i.test(caption))return;url.protocol='https:';call.documents.push({title:caption,url:url.href,kind:'bases',checkedAt:null,sha256:null});}catch{return;}});
  call.description='Anuncio de contratación propia publicado por el Ayuntamiento de Mañeru. Consulta el bando para los requisitos y los plazos: la inscripción previa en el SNE y la presentación del currículum son trámites distintos.';call.sourceHash=hash(post.content.rendered);calls.push(callSchema.parse(call));
 }return calls;
}
export async function scrapeManeru(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const url=new URL('wp-json/wp/v2/posts',MANERU_HOME);url.search=new URLSearchParams({search:'empleo',per_page:'100',page:'1',status:'publish',_fields:'id,link,title,content,date'}).toString();
 const calls=parseManeruPosts(JSON.parse(await client.text(url.href)),now);
 for(const call of calls)for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(!applyReviewedManeruScan(call,doc.url,pdf.sha256,now))warn(`${doc.url}: Bando requirements and dates need review`);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bando unavailable'}`);}}
 return calls.map(call=>callSchema.parse(call));
}
