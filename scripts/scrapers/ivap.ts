import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, extractTopics, linkList, parseDate, stableId } from './shared';

export const IVAP_HOME='https://www.ivap.euskadi.eus/empleo-ivap/';
export type IvapListing={title:string;url:string;summary:string;places:number|null;deadline:string|null;open:boolean;documents:{title:string;url:string}[]};

function listUrlFromHome(html:string,now:string){
 const $=load(html);const href=$('a').filter((_,a)=>/Ofertas de empleo/i.test(clean($(a).text()))).first().attr('href');
 if(!href)throw new Error('No se encuentra en el portal IVAP el enlace a ofertas de empleo');
 const url=new URL(href,IVAP_HOME);const query=url.searchParams.get('r01kQry');
 if(query)url.searchParams.set('r01kQry',query);
 return url.href;
}
export function parseIvapList(html:string){
 const $=load(html);const results:IvapListing[]=[];
 $('.r01srItem').each((_,element)=>{
  const card=$(element),link=card.find('.r01srItemDocName a[href*="/empleo_publico/"]').first();if(!link.length)return;
  const url=canonical(link.attr('href')??'',IVAP_HOME);if(!url)return;const title=clean(link.text());const summary=clean(card.text());
  const count=summary.match(/N[ºo.]?\s*Plazas:\s*(\d+)/i);const range=summary.match(/Plazo de inscripci[oó]n\s+(abierto|cerrado)\s*\((\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\)/i);
  const documents=card.find('.r01srItemMetaData a[href]').map((__,anchor)=>({title:clean($(anchor).attr('title')??$(anchor).text()),url:canonical($(anchor).attr('href')??'',url)})).get().filter((item):item is {title:string;url:string}=>!!item.url&&/base|temario|programa|bibliograf/i.test(item.title));
  results.push({title,url,summary,places:count?Number(count[1])||null:null,deadline:range?parseDate(range[3]):null,open:!!range&&/abierto/i.test(range[1]),documents});
 });return results;
}
export function parseIvapDetail(html:string,listing:IvapListing,now:string):Call{
 const $=load(html);const fields:Record<string,string>={};
 $('.r01gContentTabSeccion').each((_,element)=>{const row=$(element);const label=normalize(clean(row.find('.r01gContentSeccionTitulo').text())).replace(/:$/,'');const value=clean(row.find('.r01gContentSeccionTexto').text());if(label&&value)fields[label]=value;});
 const pageText=clean($('body').text());const title=$('h2,h3').map((_,e)=>clean($(e).text())).get().find(value=>value.length>3&&value.length<180&&!/servicios mas demandados/i.test(value))||listing.title;
 const call=baseCall('ivap',listing.url,now,'Euskadi');call.id=stableId('ivap',listing.url);call.title=title||listing.title;
 call.organization=fields['ofertante']?.split(' (')[0]||'Administración General de la Comunidad Autónoma de Euskadi';
 call.location='Comunidad Autónoma de Euskadi';call.category=categoryFor(call.title);call.group=fields['grupo']||'Sin clasificar';
 call.places=listing.places;call.deadline=listing.deadline;
 call.status=listing.open&&listing.deadline&&listing.deadline>=now.slice(0,10)?'Abierta':listing.open&&!listing.deadline?'Pendiente de confirmar':listing.deadline?'En curso':'Pendiente de confirmar';
 const education=fields['titulacion']||'';const linguistic=fields['perfil linguistico']||'';
 call.educationText=education||'Consulta las bases específicas para conocer la titulación y requisitos del puesto.';
 call.acceptedQualifications=educationIds(education);call.languageStatus=linguistic?'unknown':'known';
 call.requirements=[education,linguistic,fields['otros requisitos']].filter(Boolean);
 if(!call.requirements.length)call.requirements=['Consulta las bases específicas para confirmar los requisitos de acceso.'];
 call.description=listing.summary||fields['observaciones']||`Proceso selectivo publicado por el IVAP para ${call.organization}.`;
 const temarioField=Object.entries(fields).find(([key])=>key.includes('temario'))?.[1]??'';
 call.topics=extractTopics(temarioField||pageText);
 call.documents=[...listing.documents,...linkList($,'a[href]',listing.url).filter(doc=>/temario|programa|bibliograf/i.test(doc.title))]
  .filter((doc,index,array)=>array.findIndex(other=>other.url===doc.url)===index)
  .map(doc=>({title:doc.title,url:doc.url,kind:/temario|programa/i.test(doc.title)?'temario' as const:/base|convocatoria/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null}));
 call.sourceHash=hash(html);return callSchema.parse(call);
}

export async function scrapeIvap(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const first=listUrlFromHome(await client.text(IVAP_HOME),now);const listings=new Map<string,IvapListing>();
 // The IVAP search portal disallows its pagination commands in robots.txt.
 // Read only the first public results page and follow its permitted detail links.
 const html=await client.text(first);for(const item of parseIvapList(html))listings.set(item.url,item);
 if(!listings.size)throw new Error('No se reconocieron procesos convocados en el buscador oficial del IVAP');
 const calls:Call[]=[];for(const listing of listings.values()){try{calls.push(parseIvapDetail(await client.text(listing.url),listing,now));}catch(error){onWarning(`Proceso IVAP ${listing.title}: ${error instanceof Error?error.message:'Error'}`);}}
 if(!calls.length)throw new Error('No se pudo extraer ninguna convocatoria del IVAP');return calls;
}
