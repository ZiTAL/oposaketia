import {load} from 'cheerio';
import {callSchema, type Call} from '../../src/lib/catalogue';
import {OfficialClient, hash} from './http';
import {baseCall, canonical, clean, parseDate, pdfText, stableId} from './shared';

export const ORKESTRA_JOBS='https://es.euskadikoorkestra.eus/orquesta/trabajar-en-la-orquesta';
type Listing={title:string;url:string};
const detailPrefix=`${ORKESTRA_JOBS}/`;

export function parseOrkestraList(html:string):Listing[]{
  const $=load(html);
  if(clean($('h1').first().text())!=='Trabajar en la orquesta')throw new Error('No se reconoce el portal de empleo de Euskadiko Orkestra');
  const listings=$('.view-content .puesto').map((_,node)=>{
    const item=$(node),title=clean(item.find('h2').first().text());
    const url=canonical(item.find('.enlaces a[href]').first().attr('href')??'',ORKESTRA_JOBS);
    if(!title||!url?.startsWith(detailPrefix)||!/^https:\/\/es\.euskadikoorkestra\.eus\/orquesta\/trabajar-en-la-orquesta\/[a-z0-9-]+$/.test(url))throw new Error('Oferta de Euskadiko Orkestra sin ficha oficial');
    return {title,url};
  }).get();
  if(!listings.length||new Set(listings.map(item=>item.url)).size!==listings.length)throw new Error('Listado vacío o duplicado de Euskadiko Orkestra');
  return listings;
}

export function parseOrkestraDetail(html:string,listing:Listing,now:string):{call:Call;pdfUrl:string}{
  const $=load(html),title=clean($('h1').first().text());
  if(title!==listing.title)throw new Error('El título de la oferta no coincide con el listado');
  const base=$('a[href$=".pdf"]').filter((_,node)=>/^Bases$/i.test(clean($(node).text()))).first();
  const pdfUrl=canonical(base.attr('href')??'',listing.url);
  if(!pdfUrl||!/^https:\/\/es\.euskadikoorkestra\.eus\/sites\/default\/files\/[a-z0-9_-]+\.pdf$/i.test(pdfUrl))throw new Error('No se identifican las bases oficiales de la oferta');
  const call=baseCall('orkestra',listing.url,now,'Euskadi');
  call.id=stableId('orkestra',listing.url);call.title=title;call.organization='Euskadiko Orkestra';
  call.location='Euskadi';call.category='Servicios';call.sourceHash=hash(html);
  call.description='Audición de Euskadiko Orkestra. Las bases oficiales incluyen los ejercicios y el repertorio; la fecha de audición que figura en el portal no es el plazo de inscripción.';
  call.documents=[{title:'Bases y ejercicios de la audición',url:pdfUrl,kind:'bases',checkedAt:null,sha256:null}];
  call.syllabusUrl=pdfUrl;
  return {call:callSchema.parse(call),pdfUrl};
}

export function applyOrkestraBases(call:Call,text:string,sha256:string,now:string):Call{
  const heading=clean(text.slice(0,450));
  if(!/CONCURSO PARA SELECCI[ÓO]N DE INSTRUMENTISTAS/i.test(heading)||!/\bBASES\b/i.test(heading))throw new Error('El PDF no contiene las bases de instrumentistas');
  const position=call.title.replace(/^\d+\s+/,'').split(/\s+/).map(word=>word.replace(/[^a-záéíóúüñ]/gi,'')).filter(Boolean);
  if(!position.every(word=>heading.toLocaleLowerCase('es').includes(word.toLocaleLowerCase('es'))))throw new Error('Las bases no corresponden al puesto anunciado');
  const admission=text.match(/3\.-\s*ADMISION DE CANDIDATOS\.([\s\S]*?)(?:4\.-\s*TRIBUNAL\.)/i)?.[1];
  const date=admission?.match(/\bantes del\s+(\d{2}\/\d{2}\/\d{4})\b/i)?.[1];
  const exclusiveDate=date?parseDate(date):null;
  if(!exclusiveDate)throw new Error('No se reconoce el plazo absoluto de inscripción en las bases');
  const finalDay=new Date(`${exclusiveDate}T00:00:00Z`);finalDay.setUTCDate(finalDay.getUTCDate()-1);
  const deadline=finalDay.toISOString().slice(0,10);
  const titleRequirement=/Estar en posesi[oó]n del T[ií]tulo Superior o equivalente/i.test(text);
  if(!titleRequirement)throw new Error('No se reconoce la titulación exigida en las bases');
  const count=text.match(/\bSe ofrecen?\s+(\d+)\s+puestos?\b/i)?.[1];
  if(!count)throw new Error('No se reconoce el número de puestos en las bases');
  call.places=Number(count);
  call.deadline=deadline;
  call.status=deadline>=now.slice(0,10)?'Abierta':'Cerrada';
  call.educationText='Título Superior o equivalente. Las bases permiten excepcionalmente admitir candidaturas sin esa titulación por decisión del tribunal.';
  call.requirements=[call.educationText,`Inscripción antes del ${date}; último día natural anterior: ${deadline}.`];
  call.description='Audición de Euskadiko Orkestra para instrumentistas. El PDF oficial contiene las bases, ejercicios y repertorio; la fecha de audición publicada en el portal no es el plazo de inscripción.';
  call.documents[0].checkedAt=now;call.documents[0].sha256=sha256;
  return callSchema.parse(call);
}

export async function scrapeOrkestra(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const listings=parseOrkestraList(await client.text(ORKESTRA_JOBS)),calls:Call[]=[];
  for(const listing of listings){
    try{
      const {call,pdfUrl}=parseOrkestraDetail(await client.text(listing.url),listing,now);
      const pdf=await pdfText(client,pdfUrl);
      calls.push(applyOrkestraBases(call,pdf.text,pdf.sha256,now));
    }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Oferta no disponible'}`);}
  }
  if(!calls.length)throw new Error('No hay audiciones verificadas de Euskadiko Orkestra');
  return calls;
}
