import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,linkList,parseDate,pdfText} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';
export const ORKOIEN_LIST='https://www.orkoien.com/empleo-publico/';
type Listing={url:string;title:string};
export function parseOrkoienList(html:string):Listing[]{
 const $=load(html),links=linkList($,'.job-info h4 a[href]',ORKOIEN_LIST).filter(link=>new URL(link.url).origin===new URL(ORKOIEN_LIST).origin&&/^\/empleo\/[^/]+\/$/.test(new URL(link.url).pathname));
 if(!links.length)throw new Error('Orkoien employment list is not recognized');
 return [...new Map(links.filter(link=>!/traslado|promocion interna|turno restringido/.test(normalize(link.title))).map(link=>[link.url,link])).values()];
}
export function parseOrkoienPages(html:string):string[]{
 const $=load(html);
 return [...new Set(linkList($,'a.page-numbers[href], .pagination a[href]',ORKOIEN_LIST).map(link=>{
  const url=new URL(link.url),page=url.searchParams.get('paged');
  if(url.origin!==new URL(ORKOIEN_LIST).origin||url.pathname!=='/empleo-publico/'||url.username||url.password||[...url.searchParams.keys()].some(key=>key!=='paged')||(page!==null&&(!/^[1-9]\d?$/.test(page)||Number(page)>20)))throw new Error('Unexpected Orkoien pagination URL');
  return url.href;
 }))];
}
export function parseOrkoienDetail(html:string,listing:Listing,now:string):Call{
 const $=load(html),section=$('.sjb-detail .job-description').first(),title=clean($('.sjb-detail .job-title').first().text());
 if(!section.length||normalize(title)!==normalize(listing.title))throw new Error('Orkoien process does not match its listing');
 const call=baseCall('orkoien',listing.url,now,'Navarra');call.title=title;call.organization='Ayuntamiento de Orkoien';call.location='Orkoien';call.province='Navarra';call.category=categoryFor(title);call.places=/\buna plaza\b/i.test(title)?1:null;
 const label=section.find('p').filter((_,node)=>normalize(clean($(node).text()))==='fecha fin presentacion instancias').first();call.deadline=parseDate(clean(label.next('p').text()));
 call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
 call.documents=linkList($,'.sjb-detail .job-description a[href]',listing.url).filter(link=>/^(?:Bases(?: de la convocatoria)?|Convocatoria)\.?$/i.test(link.title)&&[new URL(ORKOIEN_LIST).hostname,'bon.navarra.es'].includes(new URL(link.url).hostname)&&!/admitid|excluid|resultado/i.test(link.url)).map(link=>({...link,kind:'bases',checkedAt:null,sha256:null}));
 call.description='Proceso publicado en la sección de empleo del Ayuntamiento de Orkoien. El plazo corresponde al campo de presentación de instancias de esta ficha. No se envían formularios de candidatura.';call.sourceHash=hash($.html(section));return callSchema.parse(call);
}
export async function scrapeOrkoien(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const pages=[ORKOIEN_LIST],seen=new Set<string>(),hashes=new Set<string>(),listings=new Map<string,Listing>(),calls:Call[]=[];
 while(pages.length){const page=pages.shift()!;if(seen.has(page))continue;if(seen.size>=20)throw new Error('Orkoien pagination exceeds its limit');seen.add(page);
  const html=await client.text(page),digest=hash(html);if(hashes.has(digest))throw new Error('Orkoien repeats a result page');hashes.add(digest);
  const entries=parseOrkoienList(html);if(seen.size>1&&entries.length&&entries.every(entry=>listings.has(entry.url)))throw new Error('Orkoien result pagination repeats all processes');
  for(const entry of entries)listings.set(entry.url,entry);for(const next of parseOrkoienPages(html))if(!seen.has(next))pages.push(next);
 }
 for(const listing of listings.values()){try{const call=parseOrkoienDetail(await client.text(listing.url),listing,now);
  for(const doc of call.documents){try{let text:string;if(new URL(doc.url).hostname==='bon.navarra.es'){const html=await client.text(doc.url),$=load(html);text=$('p[class^="foral-"]').map((_,node)=>clean($(node).text())).get().join('\n\n');if(!text)throw new Error('BON paragraphs missing');doc.sha256=hash(html);}else{const pdf=await pdfText(client,doc.url);text=pdf.text;doc.sha256=pdf.sha256;if(text.trim().length<100)warn(`${doc.url}: Scanned bases; requirements and programme need manual review`);}doc.checkedAt=now;enrichMunicipalBases(call,text,doc.url);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
  calls.push(callSchema.parse(call));
 }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Process unavailable'}`);}}
 if(!calls.length)throw new Error('No Orkoien process could be read');return calls;
}
