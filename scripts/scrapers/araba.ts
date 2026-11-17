import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, extractTopics, linkList, parseDate, pdfText, stableId } from './shared';

export const ARABA_LISTS=[
 'https://enplegupublikoa.araba.eus/es/administracion-local',
 'https://enplegupublikoa.araba.eus/es/sector-publico-foral',
 'https://enplegupublikoa.araba.eus/es/oferta-empleo-publico',
] as const;
export type ArabaListing={title:string;url:string;organization:string;published:string|null;sourcePage:string};

export function parseArabaList(html:string,sourcePage:string):ArabaListing[]{
 const $=load(html);const found:ArabaListing[]=[];
 $('a[href*="/es/-/"]').each((_,element)=>{
  const link=$(element),title=clean(link.text());const url=canonical(link.attr('href')??'',sourcePage);if(!url||title.length<8)return;
  if(!/(convoc|selecci[oó]n|empleo|plaza|bolsa|provisi[oó]n|oposici[oó]n|personal laboral)/i.test(title))return;
  const item=link.closest('li');const published=item.text().match(/(20\d{2}-\d{2}-\d{2})/)?.[1]??null;
  if(!published)return;
  const organizations=item.find('.asset-category').map((_,node)=>clean($(node).text())).get().filter(Boolean);
  const detailText=clean(item.text());const institution=detailText.match(/Organismo:\s*(.*?)(?:\s+Publicaci[oó]n:|$)/i)?.[1];
  found.push({title,url,organization:institution||organizations.join(', ')||'Entidad del sector público de Álava',published,sourcePage});
 });
 return found;
}

export function parseArabaDetail(html:string,listing:ArabaListing,now:string):Call{
 const $=load(html);const body=clean($('.journal-content-article').first().text()||$('#content').text()||$('main').text());
 const call=baseCall('araba',listing.url,now,'Euskadi');call.id=stableId('araba',listing.url);
 call.title=listing.title;call.organization=listing.organization;call.province='Araba / Álava';call.location='Álava';
 call.category=categoryFor(listing.title);call.places=null;call.deadline=null;call.status='Pendiente de confirmar';
 call.description=body.slice(0,1800)||'Anuncio oficial del portal de empleo público de Álava. Consulta el anuncio y sus documentos para confirmar el estado del proceso.';
 call.educationText='Consulta el anuncio oficial y las bases para conocer la titulación y los requisitos.';
 call.acceptedQualifications=educationIds(body);
 call.requirements=['El portal indica que algunos procesos locales pueden no haberse notificado; confirma el estado y los plazos con la entidad convocante.'];
 call.documents=linkList($,'.journal-content-article a[href], #content a[href]',listing.url).filter(doc=>/\.pdf(?:$|\?)/i.test(new URL(doc.url).pathname)||/bases|convocatoria|temario|programa|anuncio/i.test(doc.title)).slice(0,12).map(doc=>({title:doc.title||'Documento oficial del anuncio',url:doc.url,kind:/temario|programa/i.test(doc.title)?'temario' as const:/base|convocatoria|anuncio/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null}));
 call.sourceHash=hash(html);return callSchema.parse(call);
}

export async function scrapeAraba(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const listings=(await Promise.all(ARABA_LISTS.map(async url=>parseArabaList(await client.text(url),url)))).flat();
 const cutoff=new Date(Date.parse(now)-180*86400000).toISOString().slice(0,10);
 const current=[...new Map(listings.filter(item=>item.published!>=cutoff).map(item=>[item.url,item])).values()].slice(0,40);
 if(!current.length)throw new Error('No hay anuncios recientes reconocibles en el portal de empleo público de Álava');
 const calls:Call[]=[];
 for(const listing of current){try{
  const call=parseArabaDetail(await client.text(listing.url),listing,now);
  for(const doc of call.documents.filter(item=>item.kind==='temario').slice(0,1))try{const pdf=await pdfText(client,doc.url);call.topics=extractTopics(pdf.text);doc.sha256=pdf.sha256;}catch(error){onWarning(`Temario Álava ${doc.url}: ${error instanceof Error?error.message:'Error'}`);}
  calls.push(call);
 }catch(error){onWarning(`Anuncio Álava ${listing.url}: ${error instanceof Error?error.message:'Error'}`);}}
 if(!calls.length)throw new Error('No se han podido extraer anuncios recientes del portal de empleo público de Álava');return calls;
}
