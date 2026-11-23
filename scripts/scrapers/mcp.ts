import {load} from 'cheerio';import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';import {baseCall,categoryFor,clean,linkList,parseDate,pdfText,universityRequirementIds} from './shared';import {enrichMunicipalBases} from './municipal-requirements';
export const MCP_LIST='https://www.mcp.es/ofertas-de-empleo';
type Listing={url:string;title:string;reference:string;phase:string};
function phase(value:string):string{return clean(value).replace(/^✕\s*/,'');}
export function parseMcpList(html:string):Listing[]{
 const $=load(html);$('style,script').remove();if(clean($('h1').first().text())!=='Ofertas de empleo')throw new Error('MCP official employment list changed');
 const entries:Listing[]=[];
 $('a[href]').has('h3').each((_,node)=>{
  const anchor=$(node);let url:URL;try{url=new URL(anchor.attr('href')!,MCP_LIST);}catch{return;}
  if(!url.pathname.startsWith('/oferta-de-empleo/'))return;
  if(url.origin!=='https://www.mcp.es'||!/^\/oferta-de-empleo\/[^/]+$/.test(url.pathname)||url.search||url.hash||url.username||url.password)throw new Error('Unexpected MCP process URL');
  const card=anchor.closest('li'),title=clean(anchor.find('h3').text()),reference=card.text().match(/REF\.\s*(\d{4}\/\d{6})/)?.[1];
  const status=card.find('p').map((_,p)=>phase($(p).text())).get().find(text=>/^(?:Convocatoria resuelta|Publicación de documentación|Proceso de selección)$/.test(text));
  if(!title||!reference||!status)throw new Error('MCP process card reference or phase missing');entries.push({url:url.href,title,reference,phase:status});
 });
 if(!entries.length||new Set(entries.map(item=>item.reference)).size!==entries.length||entries.length>100)throw new Error('Unexpected MCP process count');
 if($('a[rel="next"],a[aria-label="Siguiente"]').length)throw new Error('MCP publishes pagination requiring integration');return entries;
}
export function parseMcpDetail(html:string,item:Listing,now:string):Call{
 const $=load(html);$('style,script').remove();const heading=$('h1').filter((_,node)=>normalize(clean($(node).text()))===normalize(item.title));
 if(heading.length!==1)throw new Error('MCP process title differs from its list');
 const container=heading.parent().parent(),text=clean(container.text()),reference=heading.parent().text().match(/REF\.\s*(\d{4}\/\d{6})/)?.[1];
 if(reference!==item.reference||!/(?:SCPSA|Servicios de la Comarca de Pamplona)/i.test(text)||!/Comarca(?: de)? Pamplona/i.test(text))throw new Error('MCP process reference, employer or recruitment scope unconfirmed');
 const call=baseCall('mcp',item.url,now,'Navarra');call.title=item.title;call.organization='Servicios de la Comarca de Pamplona, S.A. (SCPSA)';call.location='Comarca de Pamplona';call.province='Navarra';call.category=categoryFor(item.title);
 const requirements=container.children('section').filter((_,node)=>/^Requisitos[:.]?$/i.test(clean($(node).find('h3').first().text()))).first();
 const minimum=requirements.find('li').map((_,node)=>clean($(node).text())).get();
 if(!requirements.length||!minimum.length)throw new Error('MCP minimum requirements section unrecognized');
 const degree=minimum.find(value=>/titulaci[oó]n|t[ií]tulo/i.test(value));if(degree){call.educationText=degree;call.acceptedQualifications=universityRequirementIds(degree);}call.requirements=minimum.concat(call.requirements);
 const publishedPhase=heading.parent().find('p').map((_,p)=>phase($(p).text())).get().find(value=>/^(?:Convocatoria resuelta|Publicación de documentación|Proceso de selección)$/.test(value));
 if(!publishedPhase)throw new Error('MCP detail phase missing');call.status=publishedPhase==='Convocatoria resuelta'?'Cerrada':publishedPhase==='Publicación de documentación'?'En curso':'Pendiente de confirmar';
 const section=load($.html(container));call.documents=linkList(section,'a[href]',item.url).filter(link=>{const url=new URL(link.url);return ['www.mcp.es','recursos-prod.mcp.es'].includes(url.hostname)&&url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&/\.pdf$/i.test(url.pathname)&&/^(?:convocatoria|bases|temario)$/i.test(link.title);}).filter((link,index,all)=>all.findIndex(other=>other.url===link.url)===index).map(link=>({...link,kind:/temario/i.test(link.title)?'temario':'bases',checkedAt:null,sha256:null}));
 call.description=`Proceso ${item.reference} de SCPSA, empresa pública del ámbito de la Mancomunidad de la Comarca de Pamplona. Las fechas de exposición y la etiqueta Proceso de selección no confirman inscripción abierta. Consulta las bases para los plazos y las condiciones de cada puesto.`;
 call.sourceHash=hash($.html(container));return callSchema.parse(call);
}
export async function scrapeMcp(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const items=parseMcpList(await client.text(MCP_LIST)),calls:Call[]=[];
 for(const item of items){try{const call=parseMcpDetail(await client.text(item.url),item,now);
  if(!call.documents.length)warn(`${item.url}: No positively identified bases link; programme remains unconfirmed`);
  for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(!/\b(?:bases|requisitos|convocatoria|temario|ley)\b/i.test(pdf.text)){warn(`${doc.url}: Unreadable PDF text; consult original bases`);continue;}enrichMcpBases(call,pdf.text,doc.url,now);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
  calls.push(callSchema.parse(call));
 }catch(error){warn(`${item.url}: ${error instanceof Error?error.message:'Detail unavailable'}`);}}
 if(!calls.length)throw new Error('No MCP process could be read');return calls;
}
export function enrichMcpBases(call:Call,text:string,url:string,now:string):Call{
 enrichMunicipalBases(call,text,url);
 const window=text.match(/PLAZO DE PRESENTACI[ÓO]N([\s\S]{0,800}?)(?=COMISI[ÓO]N DE SELECCI[ÓO]N|$)/i)?.[1];
 const deadline=window?.match(/Fase Externa\s*:\s*hasta el\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];
 if(deadline){call.deadline=parseDate(deadline);if(call.deadline)call.status=call.deadline<now.slice(0,10)?'Cerrada':call.status==='Cerrada'?'Cerrada':'Abierta';}
 const section=text.match(/COMPETENCIAS T[ÉE]CNICAS\s*:\s*\(Asimilable al Temario\)([\s\S]*?)\n\s*COMPETENCIAS PERSONALES\s*:/i)?.[1];
 if(section){const topics:string[]=[];let current='';
  for(const raw of section.split(/\r?\n/)){const line=clean(raw);if(!line||/^(?:P[aá]gina\s+\d+\s+de\s+\d+|Conocimientos (?:comunes|espec[ií]ficos))/i.test(line))continue;
   if(/^[•●▪]\s*/.test(line)){if(current)topics.push(current);current=line.replace(/^[•●▪]\s*/,'');}else if(current&&current.length+line.length<2500)current+=' '+line;
  }if(current)topics.push(current);if(topics.length&&topics.length<=150){call.topics=topics;call.syllabusUrl=url;}
 }return call;
}
