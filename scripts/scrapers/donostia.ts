import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, extractTopics, linkList, parseDate, pdfText, stableId } from './shared';

export const DONOSTIA_LIST='https://www.donostia.eus/app/info/Ofertadeempleo.nsf/frmOferta?ReadForm&sf=0&id=&idioma=cas';
export type DonostiaListing={title:string;organization:string;url:string;requirements:string;summary:string;deadline:string|null;start:string|null;places:number|null};

export function parseDonostiaList(html:string):DonostiaListing[]{
 const $=load(html);const result:DonostiaListing[]=[];
 $('#lista_enmarcha a[href*="vFichaId"]').each((_,element)=>{
  const anchor=$(element),url=canonical(anchor.attr('href')??'',DONOSTIA_LIST);if(!url)return;
  const raw=clean(anchor.text()).replace(/^Ver ficha de la oferta\s*/i,'');
  const prefix=raw.match(/^(.+?):\s*(.*)$/);const organization=prefix?.[1]?.trim()||'Ayuntamiento de Donostia / San Sebastián';
  const title=(prefix?.[2]||raw).replace(/^\d+\s+(?=[A-ZÁÉÍÓÚÑ])/,'').trim();
  const firstP=anchor.closest('p');const following:string[]=[];
  firstP.nextAll('p').each((_,p)=>{if($(p).find('a[href*="vFichaId"]').length)return false;following.push(clean($(p).text()));return;});
  const text=following.join(' ');
  const range=text.match(/Plazo\s+de\s+inscripci[oó]n\s*desde\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*hasta\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const places=clean(firstP.text()).match(/\((\d+)\s+plazas?\)/i);
  const req=text.match(/Requisitos:\s*(.*?)(?=\s+Turno:|\s+Tipo de Oferta:|$)/i)?.[1]??'';
  if(title)result.push({title,organization,url,requirements:clean(req),summary:text,start:range?parseDate(range[1]):null,deadline:range?parseDate(range[2]):null,places:places&&Number(places[1])>0?Number(places[1]):null});
 });
 return [...new Map(result.map(item=>[item.url,item])).values()];
}

export function parseDonostiaDetail(html:string,listing:DonostiaListing,now:string):Call{
 const $=load(html);const call=baseCall('donostia',listing.url,now,'Euskadi');
 call.id=stableId('donostia',listing.url);call.title=listing.title;call.organization=listing.organization;
 call.province='Gipuzkoa';call.location='Donostia / San Sebastián';call.category=categoryFor(listing.title);call.places=listing.places;
 call.deadline=listing.deadline;
 const today=now.slice(0,10);
 call.status=listing.start&&listing.start>today?'Próximamente':listing.deadline&&listing.deadline>=today?'Abierta':listing.deadline?'En curso':'Pendiente de confirmar';
 call.educationText=listing.requirements||'Consulta los requisitos detallados en las bases oficiales.';
 call.acceptedQualifications=educationIds(listing.requirements);
 call.languageStatus=/euskera|euskara/i.test(listing.requirements)?'unknown':'known';
 call.description=listing.summary||`Convocatoria publicada por ${listing.organization} en el portal municipal de empleo.`;
 call.requirements=listing.requirements?[listing.requirements,'Consulta las bases oficiales para confirmar todos los requisitos y acreditaciones.']:['Consulta las bases oficiales para confirmar los requisitos y acreditaciones.'];
 call.documents=[];
 $('#documentos_ofertaempleo li').each((_,element)=>{
  const section=$(element),heading=clean(section.find('strong').first().text());
  section.find('a[href*="$file"]').each((__,anchor)=>{
   const title=clean($(anchor).text())||heading||'Documento oficial';const url=canonical($(anchor).attr('href')??'',listing.url);if(!url)return;
   call.documents.push({title,url,kind:/temario|programa/i.test(heading+' '+title)?'temario':/base|convocatoria|anexo/i.test(heading+' '+title)?'bases':'guia',checkedAt:now,sha256:null});
  });
 });
 call.sourceHash=hash(html);return callSchema.parse(call);
}

export async function scrapeDonostia(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const listings=parseDonostiaList(await client.text(DONOSTIA_LIST));if(!listings.length)throw new Error('No se reconocieron ofertas en plazo en el portal municipal de Donostia');
 const calls:Call[]=[];
 for(const listing of listings){try{
  const call=parseDonostiaDetail(await client.text(listing.url),listing,now);
  for(const doc of call.documents.filter(item=>item.kind==='temario').slice(0,1))try{const pdf=await pdfText(client,doc.url);call.topics=extractTopics(pdf.text);doc.sha256=pdf.sha256;}catch(error){onWarning(`Temario Donostia ${doc.url}: ${error instanceof Error?error.message:'Error'}`);}
  calls.push(call);
 }catch(error){onWarning(`Ficha Donostia ${listing.url}: ${error instanceof Error?error.message:'Error'}`);}}
 if(!calls.length)throw new Error('No se han podido extraer las fichas del portal municipal de Donostia');return calls;
}
