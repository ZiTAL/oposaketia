import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,linkList,pdfText,stableId} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';
export const LEIOA_LIST='https://www.leioa.net/eu/bolsa_trabajo.html';
type Listing={url:string;title:string;reference:string};
export function parseLeioaList(html:string):Listing[]{
  const $=load(html),entries:Listing[]=[];
  for(const link of linkList($,'td a[href]',LEIOA_LIST)){
    const url=new URL(link.url),match=url.pathname.match(/^\/eu\/bolsa_trabajo\/(\d+)\/[^/]+\.html$/);
    if(url.origin!==new URL(LEIOA_LIST).origin||!match||!link.title||/barne.?sustapen|barne.?promoz|promocion interna|zerbitzu.?eginkizun|comision de servicios/.test(normalize(link.title)))continue;
    entries.push({...link,reference:match[1]});
  }
  if(!entries.length)throw new Error('Leioa employment list is not recognized');
  return [...new Map(entries.map(entry=>[entry.reference,entry])).values()];
}
export function parseLeioaDetail(html:string,listing:Listing,now:string):Call{
  const $=load(html),section=$('#leer'),title=clean(section.children('h3').first().text());
  if(!title||normalize(title)!==normalize(listing.title))throw new Error('Leioa process title does not match its listing');
  const call=baseCall('leioa',listing.url,now,'Euskadi');call.id=stableId('leioa',listing.reference);call.title=title;call.organization='Ayuntamiento de Leioa';call.location='Leioa';call.province='Bizkaia';call.category=categoryFor(title);
  const links=linkList($,'#leer p.documento a[href]',listing.url);
  // Accept the same anchors in a minimal section too, but never global links.
  const candidates=links.length?links:linkList($,'#leer a[href]',listing.url);
  call.documents=candidates.filter(link=>new URL(link.url).origin===new URL(LEIOA_LIST).origin&&/\.pdf$/i.test(new URL(link.url).pathname)&&/oinarri|\bbases\b|temario|gai.?zerrenda/i.test(link.title)&&!/onartut|baztert|admitid|excluid|resultado|emaitz/i.test(link.title)).map(link=>({...link,kind:/temario|gai.?zerrenda/i.test(link.title)?'temario':'bases',checkedAt:null,sha256:null}));
  const phase=normalize(candidates.map(link=>link.title).join(' '));
  if(/onartut.*baztert|admitid.*excluid|examen|azterketa|resultado|emaitz/.test(phase))call.status='En curso';
  call.description='Proceso de acceso público del listado de empleo del Ayuntamiento de Leioa. La fecha de publicación no es la fecha de cierre. Consulta las bases y las correcciones en la ficha municipal.';call.sourceHash=hash($.html(section));
  return callSchema.parse(call);
}
export async function scrapeLeioa(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const listings=parseLeioaList(await client.text(LEIOA_LIST)),calls:Call[]=[];
  for(const listing of listings){try{const call=parseLeioaDetail(await client.text(listing.url),listing,now);
    for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(pdf.text.trim().length<100)warn(`${doc.url}: Scanned bases; requirements and programme need manual review`);enrichMunicipalBases(call,pdf.text,doc.url);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
    calls.push(callSchema.parse(call));
  }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Process unavailable'}`);}}
  if(!calls.length)throw new Error('No Leioa process could be read');return calls;
}
