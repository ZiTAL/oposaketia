import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,categoryFor,clean,educationIds,extractTopics,linkList,pdfText} from './shared';

export const BARANAIN_LIST='https://www.baranain.es/category/empleo-2/';
type Listing={title:string;url:string};
const excluded=/concurso de (?:traslado|ascenso)|promoci[oó]n interna|nuevo concurso de ascenso|^actualizaci[oó]n|^relaci[oó]n|^baremaci[oó]n|^tomas? de posesi[oó]n|^elecci[oó]n de vacantes|^documentaci[oó]n proceso|^empleo p[uú]blico\s*[–-]\s*ampliaci[oó]n/i;
const recruitment=/convocatoria|oposici[oó]n|pruebas selectivas|lista de contrataci[oó]n/i;

export function parseBaranainList(html:string):{listings:Listing[];pages:number}{
  const $=load(html);
  const cards=$('main article.entrada .list-title a[href]');
  if(!cards.length)throw new Error('No se reconoce el archivo de empleo de Barañáin');
  const pages=Math.max(1,...$('main a[href*="/category/empleo-2/page/"]').map((_,node)=>{
    const match=canonical($(node).attr('href')??'',BARANAIN_LIST)?.match(/^https:\/\/www\.baranain\.es\/category\/empleo-2\/page\/(\d+)\/$/);
    return match?Number(match[1]):null;
  }).get());
  if(pages>20)throw new Error('Paginación inesperada en Barañáin');
  const listings=cards.map((_,node)=>{
    const title=clean($(node).text()),url=canonical($(node).attr('href')??'',BARANAIN_LIST);
    if(!title||!url||new URL(url).hostname!=='www.baranain.es')throw new Error('Entrada no reconocida en Barañáin');
    return {title,url};
  }).get().filter(item=>recruitment.test(item.title)&&!excluded.test(item.title));
  return {listings,pages};
}

export function parseBaranainDetail(html:string,listing:Listing,now:string):Call|null|undefined{
  const $=load(html),title=clean($('main h2.titulo-single').first().text());
  if(title!==listing.title)throw new Error('El título de Barañáin no coincide con el archivo');
  const published=$('meta[property="article:published_time"]').attr('content')?.slice(0,10);
  if(!published||!/^\d{4}-\d{2}-\d{2}$/.test(published))throw new Error('Fecha de publicación de Barañáin no reconocida');
  if(published<'2025-01-01')return null;
  const documents=linkList($,'main a[href]',listing.url)
    .filter(link=>/^https:\/\/www\.baranain\.es\/wp-content\/uploads\/\d{4}\/\d{2}\/[^?#]+\.pdf$/i.test(link.url))
    .filter(link=>/bases|convocatoria|oinarriak|temario|programa/i.test(link.title)&&!/instancia|solicitud|listad|admitid|aspirantes|resultado|acta|baremaci[oó]n|plantilla|cuestionario|resoluci[oó]n|aprobados|elecci[oó]n/i.test(link.title))
    .map(link=>({...link,kind:/temario|programa/i.test(link.title)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}));
  if(!documents.some(doc=>doc.kind==='bases'))return undefined;
  const call=baseCall('baranain',listing.url,now,'Navarra');
  call.title=title;call.organization='Ayuntamiento de Barañáin';call.location='Barañáin';call.province='Navarra';call.category=categoryFor(title);
  const quantity=title.match(/\b(\d+|una?|dos|tres|nueve)\s+plazas?\b/i)?.[1].toLowerCase();
  call.places=quantity?({un:1,una:1,dos:2,tres:3,nueve:9}[quantity]??Number(quantity)):null;
  call.status='Pendiente de confirmar';
  call.description='Proceso publicado por el Ayuntamiento de Barañáin. Las bases oficiales determinan los requisitos y el plazo de solicitud; el archivo de noticias no confirma por sí solo que la inscripción siga abierta.';
  call.documents=documents;call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export function enrichBaranainBases(call:Call,text:string,url:string):Call{
  const start=text.search(/^[ \t]*[a-f]\)[ \t]*(?:Hallarse|Estar) en posesi[oó]n/im);
  if(start>=0){
    const tail=text.slice(start,start+1800);
    const next=tail.slice(2).search(/\n[ \t]*[a-f]\)[ \t]/i);
    const academic=clean(tail.slice(0,next>=0?next+2:tail.length));
    if(/t[ií]tulo|titulaci[oó]n|diplomatura/i.test(academic)){
      call.educationText=academic;
      call.acceptedQualifications=educationIds(academic);
      if(!call.acceptedQualifications.length&&/t[ií]tulo universitario de grado,\s*diplomatura universitaria,\s*ingenier[ií]a t[eé]cnica,\s*arquitectura t[eé]cnica/i.test(academic))call.acceptedQualifications=['grado'];
    }
  }
  const topics=extractTopics(text);
  if(topics.length<2)topics.push(...extractBaranainAnnexTopics(text));
  if(topics.length>=2){call.topics=topics;call.syllabusUrl=url;}
  return call;
}

export function extractBaranainAnnexTopics(text:string):string[]{
  const normalized=text.replace(/\f/g,'\n');
  const match=/^ANEXO\s+II(?:\.\s*Temario\.?)?\s*$/im.exec(normalized);
  if(!match)return [];
  const rest=normalized.slice(match.index+match[0].length);
  const end=/^ANEXO\s+III\b/im.exec(rest);
  const section=end?rest.slice(0,end.index):rest;
  const topics:string[]=[];
  let current='';
  for(const raw of section.split(/\r?\n/)){
    const line=clean(raw);
    if(/^Nota:\s*Todas las materias/i.test(line))break;
    if(!line||/^(?:Plaza Consistorial|C[oó]digo Seguro|P[aá]g\.?\s*\d|Udaletxe plaza|Ayuntamiento de Barañ|Barañaingo Udala|Navarra[–-]Nafarroa|31010 BARAÑAIN|www\.bara(?:nain|ñain)\.|\d{1,2}$)/i.test(line))continue;
    if(/^(?:Tema\s+)?\d{1,3}\.(?=\s|[–-])\s*[–-]?\s*/i.test(line)){
      if(current)topics.push(current);
      current=line;
    }else if(current&&current.length+line.length<2000)current+=` ${line}`;
    if(topics.length>=150)break;
  }
  if(current&&topics.length<150)topics.push(current);
  return topics.length>=2?topics:[];
}

export async function scrapeBaranain(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const first=parseBaranainList(await client.text(BARANAIN_LIST));
  const listings=[...first.listings];
  for(let page=2;page<=first.pages;page++){
    const next=parseBaranainList(await client.text(`${BARANAIN_LIST}page/${page}/`));
    listings.push(...next.listings);
  }
  if(new Set(listings.map(item=>item.url)).size!==listings.length)throw new Error('Páginas repetidas en Barañáin');
  const calls:Call[]=[];
  for(const listing of listings){
    try{
      const call=parseBaranainDetail(await client.text(listing.url),listing,now);
      if(call){
        const base=call.documents.find(doc=>doc.kind==='bases');
        if(base)try{
          const pdf=await pdfText(client,base.url);
          base.checkedAt=now;base.sha256=pdf.sha256;
          enrichBaranainBases(call,pdf.text,base.url);
        }catch(error){warn(`${base.url}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
        calls.push(callSchema.parse(call));
      }
      else if(call===undefined)warn(`${listing.url}: no se han identificado bases municipales`);
    }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Ficha no disponible'}`);}
  }
  if(!calls.length)throw new Error('No hay convocatorias de Barañáin verificadas');
  return calls;
}
