import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,educationIds,extractTopics,parseDate,pdfText} from './shared';

export const DEFENSOR_LIST='https://www.defensornavarra.es/es/transparencia/transparencia-de-la-institucion/transparencia-en-la-actividad-publica/informacion-sobre-personal-art-19';
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function ownUrl(raw:string,base=DEFENSOR_LIST):URL{
 const url=new URL(raw,base);
 if(url.protocol!=='https:'||!['www.defensornavarra.es','defensornavarra.es'].includes(url.hostname)||url.port||url.username||url.password||url.search||url.hash)throw new Error('Unexpected Defensor publication URL');
 url.hostname='www.defensornavarra.es';return url;
}
export function parseDefensorList(html:string):{title:string;url:string}[]{
 const $=load(html);
 if(!/^informacion sobre personal/.test(normalize(clean($('h1').first().text()))))throw new Error('Defensor personnel section not recognized');
 const entries=new Map<string,{title:string;url:string}>();
 $('a[href]').each((_,node)=>{
  const title=clean($(node).text());
  if(!/^convocatoria para (?:la provision|la contratacion|constituir)/.test(normalize(title)))return;
  try{
   const url=ownUrl($(node).attr('href')!);
   if(!url.pathname.startsWith(new URL(DEFENSOR_LIST).pathname+'/'))return;
   entries.set(url.href,{title,url:url.href});
  }catch{/* Other institutions' recommendations and external references are not calls. */}
 });
 if(!entries.size)throw new Error('Defensor personnel page has no recognized call links; review required');
 return [...entries.values()];
}
export function parseDefensorDetail(html:string,url:string,now:string):Call{
 const official=ownUrl(url),$=load(html),article=$('#content-for-layout .article').first();
 const title=clean($('h1').first().text());
 if(!article.length||!/^convocatoria para/.test(normalize(title)))throw new Error('Defensor call article not recognized');
 const call=baseCall('defensor-navarra',official.href,now,'Navarra');
 call.title=title;call.organization='Defensor del Pueblo de Navarra';call.province='Navarra';call.location='Navarra';call.category=categoryFor(title);
 const places=normalize(title).match(/\b(una|dos|tres|\d+) plazas?\b/)?.[1];
 call.places=places?({una:1,dos:2,tres:3} as Record<string,number>)[places]??Number(places):null;
 const text=normalize(clean(article.text()));
 const range=text.match(/plazo de presentacion de solicitudes:\s*(?:de|del)\s*(\d{1,2}) de ([a-z]+) de (\d{4})\s*(?:a|al)\s*(\d{1,2}) de ([a-z]+) de (\d{4})/);
 const startMonth=range?months.indexOf(range[2])+1:0,endMonth=range?months.indexOf(range[5])+1:0;
 const start=range&&startMonth?parseDate(`${range[1]}/${startMonth}/${range[3]}`):null;
 const end=range&&endMonth?parseDate(`${range[4]}/${endMonth}/${range[6]}`):null;
 call.deadline=start&&end&&start<=end?end:null;
 if(call.deadline)call.status=call.deadline<now.slice(0,10)?'Cerrada':start!>now.slice(0,10)?'Próximamente':'Abierta';
 call.description='Convocatoria propia publicada en la sección de personal del Defensor del Pueblo de Navarra. Incluye el histórico publicado y no presupone inscripción abierta. La adscripción institucional y el empleador se comprueban en las bases; no se calculan plazos relativos.';
 article.find('a[href]').each((_,node)=>{
  const caption=clean($(node).text());
  if(!/^bases (?:reguladoras )?de la convocatoria$/i.test(caption))return;
  const target=ownUrl($(node).attr('href')!,official.href);
  if(!/^\/files\/.+\.pdf$/i.test(target.pathname))throw new Error('Defensor bases are not a published legal PDF');
  if(!call.documents.some(doc=>doc.url===target.href))call.documents.push({title:caption,url:target.href,kind:'bases',checkedAt:null,sha256:null});
 });
 if(call.documents.length!==1)throw new Error('Defensor call requires one unambiguous legal bases document');
 call.sourceHash=hash(html);return callSchema.parse(call);
}
export function enrichDefensorBases(call:Call,text:string):Call{
 const head=normalize(clean(text.slice(0,3500))),title=normalize(call.title);
 const role=['administrativo','letrado','auxiliar','tecnico'].find(word=>title.includes(word));
 if(!role||!head.includes(role)||!head.includes('bases reguladoras de la convocatoria')||!head.includes('oficina del defensor del pueblo de navarra'))throw new Error('Defensor bases do not confirm the advertised role and institution');
 const minimum=text.match(/(?:^|\n)\s*2\.\s*Requisitos\.?([\s\S]*?)(?=\n\s*3\.\s|$)/i)?.[1];
 const academic=minimum?.match(/(?:^|\n)\s*c[.)]\s*([\s\S]*?)(?=\n\s*d[.)]|$)/i)?.[1];
 if(!academic)throw new Error('Defensor academic requirements need manual review');
 call.educationText=clean(academic);call.acceptedQualifications=educationIds(call.educationText);
 // Access conditions only; never export later named candidates or merit scores.
 call.requirements=[clean(minimum!),...call.requirements];
 if(/(?:caracter de funcionario o funcionaria|personal funcionario) del parlamento de navarra/.test(head))call.organization='Parlamento de Navarra · oficina del Defensor del Pueblo de Navarra';
 call.group=head.match(/\bnivel\s+([a-e])\b/)?.[1].toUpperCase()??call.group;
 call.topics=extractTopics(text);
 if(call.topics.length)call.syllabusUrl=call.documents[0].url;
 return callSchema.parse(call);
}
export async function scrapeDefensorNavarra(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const entries=parseDefensorList(await client.text(DEFENSOR_LIST)),calls:Call[]=[];
 for(const entry of entries){
  try{
   const call=parseDefensorDetail(await client.text(entry.url),entry.url,now),doc=call.documents[0];
   const pdf=await pdfText(client,doc.url);enrichDefensorBases(call,pdf.text);
   doc.checkedAt=now;doc.sha256=pdf.sha256;calls.push(callSchema.parse(call));
  }catch(error){warn(`${entry.url}: ${error instanceof Error?error.message:'Legal bases unavailable'}`);}
 }
 if(!calls.length)throw new Error('No Defensor call and legal bases could be confirmed');
 return calls;
}
