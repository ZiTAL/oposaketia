import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import {enrichArabaBases} from './araba-requirements';
import { baseCall, canonical, categoryFor, clean, educationIds, linkList, pdfText, stableId } from './shared';

export const ARABA_LISTS=[
 'https://enplegupublikoa.araba.eus/es/administracion-local',
 'https://enplegupublikoa.araba.eus/es/sector-publico-foral',
 'https://enplegupublikoa.araba.eus/es/oferta-empleo-publico',
] as const;
export type ArabaListing={title:string;url:string;organization:string;published:string|null;sourcePage:string};

export function parseArabaList(html:string,sourcePage:string):ArabaListing[]{
 const $=load(html);const found:ArabaListing[]=[];
 $('a[href*="/es/-/"]').each((_,element)=>{
  const link=$(element),title=clean(link.text());let url=canonical(link.attr('href')??'',sourcePage);if(!url||title.length<8)return;
  const detail=new URL(url),root=new URL(sourcePage);
  if(detail.origin!==root.origin||detail.username||detail.password)throw new Error('Unexpected Araba detail origin');
  const rawBack=detail.searchParams.get('p_l_back_url');
  if(rawBack){
   const back=new URL(rawBack,root);
   if(back.origin!==root.origin||back.pathname!==root.pathname||[...back.searchParams.keys()].some(key=>!['delta','start'].includes(key)))throw new Error('Unexpected Araba notice return path');
   if(rawBack!==root.pathname){detail.searchParams.set('p_l_back_url',root.pathname);url=detail.href;}
  }
  if(!/(convoc|selecci[oó]n|empleo|plaza|bolsa|provisi[oó]n|oposici[oó]n|personal laboral)/i.test(title))return;
  const item=link.closest('li');const published=item.text().match(/(20\d{2}-\d{2}-\d{2})/)?.[1]??null;
  if(!published)return;
  const organizations=item.find('.asset-category').map((_,node)=>clean($(node).text())).get().filter(Boolean);
  const detailText=clean(item.text());const institution=detailText.match(/Organismo:\s*(.*?)(?:\s+Publicaci[oó]n:|$)/i)?.[1];
  found.push({title,url,organization:institution||organizations.join(', ')||'Entidad del sector público de Álava',published,sourcePage});
 });
 return found;
}

export function parseArabaPages(html:string,page:string):string[]{
 const $=load(html),base=new URL(page),found:string[]=[];
 $('a[href]').each((_,node)=>{
  if($(node).closest('.language-selector').length)return;
  const raw=$(node).attr('href')!.trim();if(raw.startsWith('#'))return;let url:URL;try{url=new URL(raw,page);}catch{return;}
  if(!url.searchParams.has('start'))return;
  if(url.origin!==base.origin||url.pathname!==base.pathname||url.username||url.password||url.hash||[...url.searchParams.keys()].some(key=>!['delta','start'].includes(key))||url.searchParams.getAll('start').length!==1||url.searchParams.getAll('delta').length!==1||!/^[1-9]\d?$/.test(url.searchParams.get('start')??'')||!['4','8','20','40','60'].includes(url.searchParams.get('delta')??''))throw new Error('Unexpected Araba published pagination URL');
  if(Number(url.searchParams.get('start'))>1&&!found.includes(url.href))found.push(url.href);
 });return found;
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
 call.documents=linkList($,'.journal-content-article a[href], #content a[href]',listing.url).filter(doc=>!/admitid|excluid|resultado|calificaci|nombramiento|acta|tribunal|instancia|solicitud|reclamaci/i.test(doc.title)&&/bases|convocatoria|temario|programa|anuncio/i.test(doc.title)).slice(0,12).map(doc=>({title:doc.title||'Documento oficial del anuncio',url:doc.url,kind:/temario|programa/i.test(doc.title)?'temario' as const:/base|convocatoria|anuncio/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:null,sha256:null}));
 call.sourceHash=hash(html);return callSchema.parse(call);
}

export async function scrapeAraba(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const listings=new Map<string,ArabaListing>();
 for(const root of ARABA_LISTS){
  const queue:string[]=[root],visited=new Set<string>(),observed=new Set<string>();
  while(queue.length){
   const page=queue.shift()!;if(visited.has(page))continue;
   if(visited.size>=50){onWarning(`Araba pagination exceeds the reviewed limit: ${root}`);break;}
   visited.add(page);
   try{
    const html=await client.text(page),items=parseArabaList(html,root);
    if(!items.length){onWarning(`No dated notices recognized in ${page}; no vacancy absence is inferred`);continue;}
    const unique=items.filter(item=>!observed.has(item.url));
    if(page!==root&&!unique.length)throw new Error('Araba pagination repeats previously published notices');
    for(const item of unique){observed.add(item.url);listings.set(item.url,item);}
    for(const next of parseArabaPages(html,page))if(!visited.has(next)&&!queue.includes(next))queue.push(next);
   }catch(error){onWarning(`Araba list ${page}: ${error instanceof Error?error.message:'List unavailable'}`);}
  }
 }
 const cutoff=new Date(Date.parse(now)-180*86400000).toISOString().slice(0,10);
 const current=[...listings.values()].filter(item=>item.published!>=cutoff&&item.published!<=now.slice(0,10));
 if(!current.length||current.length>500)throw new Error('Unexpected recent Araba notice count');
 const calls:Call[]=[];
 for(const listing of current){try{
  const call=parseArabaDetail(await client.text(listing.url),listing,now);
  for(const doc of call.documents.filter(item=>['bases','temario'].includes(item.kind)&&/\.pdf$/i.test(new URL(item.url).pathname)).slice(0,6)){
   try{
    const pdf=await pdfText(client,doc.url);enrichArabaBases(call,pdf.text,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;
   }catch(error){onWarning(`Bases Álava ${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}
  }
  call.sourceHash=hash(JSON.stringify({page:call.sourceHash,documents:call.documents.map(({url,sha256})=>({url,sha256}))}));
  if(!call.acceptedQualifications.length)onWarning(`${call.sourceUrl}: No mapped academic qualification; consult its published conditions`);
  calls.push(call);
 }catch(error){onWarning(`Anuncio Álava ${listing.url}: ${error instanceof Error?error.message:'Error'}`);}}
 if(!calls.length)throw new Error('No se han podido extraer anuncios recientes del portal de empleo público de Álava');return calls;
}
