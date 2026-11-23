import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,extractTopics,linkList,pdfText} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';
export const EGUES_LIST='https://www.valledeegues.com/convocatorias/';
type Listing={url:string;title:string;state:string};
export function parseEguesList(html:string,pageUrl:string):{items:Listing[];next:string|null}{
 const $=load(html),cards=$('.call-item');if(!cards.length)throw new Error('Egues employment cards missing');
 const items:Listing[]=[];
 cards.each((_,node)=>{const card=$(node),title=clean(card.find('.call-item-title').text()),state=clean(card.find('.call-status-container').text());
  if(!title)throw new Error('Egues card title missing');
  if(!/^(?:Abierta|En resolución)$/.test(state)||/promocion interna|ascenso de categoria|traslado/.test(normalize(title)))return;
  const url=new URL(card.children('a[href]').attr('href')||'',pageUrl);
  if(url.origin!==new URL(EGUES_LIST).origin||!/^\/convocatorias\/[^/]+\/$/.test(url.pathname)||url.username||url.password||url.search||url.hash)throw new Error('Unexpected Egues detail URL');
  items.push({title,state,url:url.href});
 });
 const nextHref=$('a.next.page-numbers').attr('href');let next:string|null=null;
 if(nextHref){const url=new URL(nextHref,pageUrl),match=url.pathname.match(/^\/convocatorias\/page\/(\d+)\/$/);if(url.origin!==new URL(EGUES_LIST).origin||!match||Number(match[1])!==Number(new URL(pageUrl).pathname.match(/\/page\/(\d+)\/$/)?.[1]??1)+1||Number(match[1])>50||url.username||url.password||url.search||url.hash)throw new Error('Unexpected Egues pagination URL');next=url.href;}
 return {items,next};
}
export function parseEguesDetail(html:string,item:Listing,now:string):Call{
 const $=load(html),body=$('main .contenido.content').first(),title=clean($('main h2').first().text());
 if(!body.length||normalize(title)!==normalize(item.title))throw new Error('Egues native process title or content does not match its listing');
 const call=baseCall('egues',item.url,now,'Navarra');call.title=title;call.organization=/andacelay/i.test(title)?'Sociedad Mercantil Municipal Andacelay, S.L.':'Ayuntamiento del Valle de Egüés';call.location='Valle de Egüés / Eguesibar';call.province='Navarra';call.category=categoryFor(title);
 const section=load($.html(body)),links=linkList(section,'a[href]',item.url),phase=normalize(links.map(link=>link.title).join(' '));
 call.status=/resultados definitivos|nombramiento|contratacion definitiva/.test(phase)?'Cerrada':item.state==='En resolución'||/lista.*admitid|resultados provisionales/.test(phase)?'En curso':'Pendiente de confirmar';
 call.documents=links.filter(link=>{const url=new URL(link.url),caption=normalize(link.title);return url.origin===new URL(EGUES_LIST).origin&&!url.username&&!url.password&&!url.port&&/\.pdf$/i.test(url.pathname)&&/^(?:bases\b|convocatoria\b)/.test(caption)&&!/instancia|solicitud|admitid|excluid|resultado|tribunal|respuesta|examen|prueba/.test(caption);}).filter((link,index,all)=>all.findIndex(other=>other.url===link.url)===index).map(link=>({...link,kind:'bases',checkedAt:null,sha256:null}));
 call.description='Proceso cuyo estado publicado es abierto o en resolución en el catálogo municipal. Se recorren todas las páginas y se contrastan las bases. Las fases documentales pueden revelar estados desactualizados. No se calculan plazos a partir de fechas de publicación ni se deducen estudios del puesto. Las listas de formación y contratación temporal pueden tener requisitos diferentes: consulta el turno que corresponda.';
 call.sourceHash=hash($.html(body));return callSchema.parse(call);
}
export function isRestrictedEguesBases(text:string):boolean{
 return /ostentar la condicion de personal fijo del area de bienestar social/.test(normalize(clean(text)));
}
export function enrichEguesBases(call:Call,text:string,url:string):Call{
 enrichMunicipalBases(call,text,url);
 if(!call.topics.length){
  const normalized=text.replace(/^\s*(?:ANEXO\s+[IVX]+[.–-]+TEMARIO PARA LA PRIMERA PRUEBA[^\n]*|TEMARIO CONVOCATORIA[^\n]*)$/gm,'TEMARIO').replace(/^\s*Tema (\d+) ([^.\d\s][^\n]*)$/gm,'$1.–$2');
  const topics=extractTopics(normalized);if(topics.length){call.topics=topics;call.syllabusUrl=url;}
 }
 return call;
}
export async function scrapeEgues(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const items:Listing[]=[],seenPages=new Set<string>(),seenItems=new Set<string>();let page:string|null=EGUES_LIST;
 while(page){if(seenPages.has(page))throw new Error('Egues pagination repeats a page');seenPages.add(page);const result=parseEguesList(await client.text(page),page);for(const item of result.items){if(seenItems.has(item.url))throw new Error('Egues pagination repeats a current process');seenItems.add(item.url);items.push(item);}page=result.next;}
 if(!items.length)throw new Error('Egues has no recognizable current public processes');const calls:Call[]=[];
 for(const item of items){try{
  const call=parseEguesDetail(await client.text(item.url),item,now);
  if(!call.documents.length){warn(`${item.url}: No positively identified public bases; employer and access conditions need verification; process not imported`);continue;}
  let restricted=false;
  for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;
   if(isRestrictedEguesBases(pdf.text)){restricted=true;break;}
   if(!/\b(?:bases|requisitos|convocatoria|temario|ley)\b/i.test(pdf.text)){warn(`${doc.url}: PDF text encoding unreadable; consult original bases`);continue;}
   enrichEguesBases(call,pdf.text,doc.url);
  }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
  if(!restricted)calls.push(callSchema.parse(call));
 }catch(error){warn(`${item.url}: ${error instanceof Error?error.message:'Detail unavailable'}`);}}
 if(!calls.length)throw new Error('No Egues public process could be imported');return calls;
}
