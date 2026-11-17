import { load } from 'cheerio';
import { type Call, callSchema, normalize } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, extractTopics, linkList, parseDate } from './shared';
export const NAVARRA_LIST = 'https://www.navarra.es/es/empleo-publico/convocatorias';
export type NavarraListing = { title: string; url: string; summary: string; state: string };
export function parseNavarraList(html: string) {
  const $ = load(html); const listings: NavarraListing[] = [];
  $('.searcher-result').each((_, e) => {
    const a = $(e).find('a.searcher-result-title').first(); const href = a.attr('href');
    if (href && href.includes('/es/tramites/on/-/line/')) listings.push({title:clean(a.text()),url:canonical(href,NAVARRA_LIST)!,summary:clean($(e).find('.searcher-result-description').text()),state:clean($(e).find('.searcher-result-category').text())});
  });
  if (!listings.length) throw new Error('No se reconocen las fichas del buscador de Navarra');
  const pages = Math.max(1, ...[...html.matchAll(/_cur\.value\s*=\s*'(\d+)'/g)].map(m=>Number(m[1])));
  return { listings, pages };
}
export function parseNavarraDetail(html: string, listing: NavarraListing, now: string): Call {
  const $=load(html); const title=clean($('h1').first().text());
  if (!title || !$('#infoDirigido').length) throw new Error('Estructura de ficha de Navarra no reconocida');
  const call=baseCall('navarra',listing.url,now,'Navarra');
  call.title=title;call.category=categoryFor(title);call.organization='Gobierno de Navarra';call.location='Navarra';call.province='Navarra';
  $('strong').filter((_,e)=>/Organismo responsable.*convocante/i.test($(e).text())).each((_,e)=>{
    const parent=$(e).parent().clone();parent.find('strong').remove();const text=clean(parent.text());if(text) call.organization=text;
  });
  call.description=listing.summary || 'Proceso selectivo publicado por el Gobierno de Navarra. Consulta las bases oficiales para conocer los turnos y las condiciones de participación.';
  const n=listing.summary.match(/(?:\b(?:las|los|convocan|de|son)\s+)?(\d+)\s+plazas?\b/i);
  call.places=n&&Number(n[1])>0?Number(n[1]):null;
  call.group=listing.summary.match(/\bnivel\s+([A-E])\b/i)?.[1] ?? 'Sin clasificar';
  const education=clean($('#infoDirigido').text());
  call.educationText=education || call.educationText;
  call.acceptedQualifications=educationIds(education);
  call.requirements=['Consulta los requisitos específicos de cada turno y las titulaciones o especialidades admitidas.',...call.requirements];
  const infoLinks=linkList($,'#infoNormativa a[href]',listing.url);
  call.documents=infoLinks.slice(0,8).map(a=>({...a,kind:'bases' as const,checkedAt:null,sha256:null}));
  const themeLinks=linkList($,'#infoDescripcion a[href], #infoDirigido a[href]',listing.url).filter(a=>/temario|programa de (?:la|las) (?:oposici[oó]n|pruebas)/i.test(a.title));
  call.documents.push(...themeLinks.map(a=>({...a,kind:'temario' as const,checkedAt:null,sha256:null})));
  call.syllabusUrl=themeLinks[0]?.url ?? null;
  const text=clean($('#content').text());
  // Never use appeal/submission dates from the results area as the entry deadline.
  const explicit=text.match(/Abierto el plazo de presentaci[oó]n de solicitudes hasta el (\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (explicit) call.deadline=parseDate(explicit[1]);
  call.status=/^En resoluci[oó]n$/i.test(listing.state)?'En curso':/^Finalizado$/i.test(listing.state)?'Cerrada':call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
  call.sourceHash=hash(html);
  return callSchema.parse(call);
}
export function enrichFromBon(call: Call, html: string, url: string, now: string) {
  const $=load(html); const paragraphs=$('p[class^="foral-"]').map((_,e)=>clean($(e).text())).get();
  const topics=extractTopics(paragraphs.join('\n'));
  const doc=call.documents.find(doc=>doc.url===url);
  if (doc) { doc.checkedAt=now;doc.sha256=hash(html); }
  if (topics.length) {call.topics=topics;call.syllabusUrl=url; if(doc) doc.kind='temario';}
  if (!call.acceptedQualifications.length) {
    const education=paragraphs.find(p=>/estar en posesi[oó]n/.test(p)&&/t[ií]tulo|titulaci[oó]n/.test(p));
    if (education) {call.educationText=education;call.acceptedQualifications=educationIds(education);}
  }
  return call;
}
export async function scrapeNavarra(client: OfficialClient, now: string, onWarning:(message:string)=>void) {
  const pageUrl=(page:number)=>`${NAVARRA_LIST}/-/buscador/filter/0/sort/publishDate_desc/facet/0/tag/0/date/0/type/0/rpp/75/page/${page}`;
  const first=parseNavarraList(await client.text(pageUrl(1))); const listings=[...first.listings];
  const seen=new Set(first.listings.map(item=>item.url));
  if(first.pages>50)throw new Error('Paginación inesperada en Navarra');
  for(let page=2;page<=first.pages;page++){
    const result=parseNavarraList(await client.text(pageUrl(page)));
    const unique=result.listings.filter(item=>!seen.has(item.url));
    if(!unique.length)throw new Error(`Navarra repite la página ${page}; se rechaza una importación incompleta`);
    for(const item of unique){listings.push(item);seen.add(item.url);}
  }
  const calls:Call[]=[];
  // Historic completed procedures are excluded; all ongoing and open entries are followed.
  for(const listing of listings.filter(item=>item.state!=='Finalizado')) {
    try{
      const call=parseNavarraDetail(await client.text(listing.url),listing,now);
      for(const doc of call.documents.filter(doc=>new URL(doc.url).hostname==='bon.navarra.es').slice(0,2)){
        try{enrichFromBon(call,await client.text(doc.url),doc.url,now);}catch(error){onWarning(`Bases ${doc.url}: ${error instanceof Error?error.message:'Error'}`);}
      }
      calls.push(call);
      if(calls.length%20===0)console.log(`[navarra] ${calls.length} fichas procesadas`);
    }catch(error){onWarning(`Ficha ${listing.url}: ${error instanceof Error?error.message:'Error'}`);}
  }
  if(!calls.length)throw new Error('No se ha podido extraer ninguna convocatoria de Navarra');
  return calls;
}
