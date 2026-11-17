import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, linkList, stableId } from './shared';

export const EHU_LIST='https://www.ehu.eus/es/web/azp/epe-bilatzailea?pestanya=0&tipo-convocatoria=1&anyo=&fecha-convocatoria=&regimen=&grupo=&estado=';
export type EhuListing={url:string;process:string;summary:string};
const month:Record<string,string>={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
function dateFromSpanish(text:string){
 const m=text.match(/Plazo de presentaci[oó]n de solicitudes:\s*(?:Del\s*)?(\d{1,2})(?:\s*al\s*\d{1,2})?\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})/i);
 if(!m)return null;const last=text.match(/Plazo de presentaci[oó]n de solicitudes:\s*Del\s*\d{1,2}\s*al\s*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})/i);
 const day=last?last[1]:m[1],monthName=(last?last[2]:m[2]).toLowerCase(),year=last?last[3]:m[3];return `${year}-${month[monthName]}-${day.padStart(2,'0')}`;
}
export function parseEhuList(html:string):EhuListing[]{
 const $=load(html);const results:EhuListing[]=[];
 $('a[href*="proceso="][href*="pestanya=1"]').each((_,element)=>{
  const raw=$(element).attr('href')??'';const absolute=canonical(raw,EHU_LIST);if(!absolute)return;
  const target=new URL(absolute);const process=target.searchParams.get('proceso');if(!process)return;
  const summary=clean($(element).parent().parent().text());results.push({url:absolute,process,summary});
 });
 return [...new Map(results.map(item=>[item.process,item])).values()];
}
export function parseEhuDetail(html:string,listing:EhuListing,now:string):Call{
 const $=load(html);const body=clean($('body').text());
 const title=$('h2,h3,h4').map((_,node)=>clean($(node).text())).get().find(text=>/^(Escala|Cuerpo|Agrupaci[oó]n)/i.test(text))||listing.summary.match(/(?:Escala|Cuerpo|Agrupaci[oó]n)[^0-9]{2,100}/i)?.[0]?.trim()||`Proceso selectivo EHU ${listing.process}`;
 const reqIndex=body.indexOf('Requisitos');const basesIndex=body.indexOf('Bases de la convocatoria',reqIndex);
 const requirements=reqIndex>=0?body.slice(reqIndex+'Requisitos'.length,basesIndex>reqIndex?basesIndex:undefined).trim():'';
 const placesSection=body.slice(Math.max(0,body.indexOf('Plazas convocadas')),Math.max(0,reqIndex));
 const places=placesSection.match(/(\d+)\s+plazas?/i);
 const deadline=dateFromSpanish(body);const call=baseCall('ehu',listing.url,now,'Euskadi');
 call.id=stableId('ehu',listing.process);call.title=title;call.organization='Universidad del País Vasco / Euskal Herriko Unibertsitatea';
 call.location='Euskadi · varios campus';call.category=categoryFor(title);call.group='Sin clasificar';call.places=places?Number(places[1]):null;call.deadline=deadline;
 call.status=deadline&&deadline>=now.slice(0,10)?'Abierta':'En curso';
 call.educationText=requirements||'Consulta los requisitos de acceso en las bases oficiales de la convocatoria.';
 call.acceptedQualifications=educationIds(requirements);
 call.languageStatus=/perfil ling[uü][ií]stico|euskera|euskara/i.test(requirements)?'unknown':'known';
 call.description=listing.summary||'Oferta Pública de Empleo de personal técnico, de gestión y de administración y servicios de la EHU.';
 call.requirements=requirements?[requirements,'Consulta las bases específicas para comprobar los turnos y acreditaciones admitidos.']:['Consulta las bases específicas para comprobar titulación, turnos y acreditaciones.'];
 call.documents=linkList($,'a[href]',listing.url).filter(doc=>/bases|convocatoria|temario|programa|bibliograf|bater[ií]a de preguntas/i.test(doc.title)).map(doc=>({title:doc.title,url:doc.url,kind:/temario|programa/i.test(doc.title)?'temario' as const:/base|convocatoria/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null}));
 call.sourceHash=hash(html);return callSchema.parse(call);
}
export async function scrapeEhu(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const listings=parseEhuList(await client.text(EHU_LIST));if(!listings.length)throw new Error('No se encontraron procesos OPE en el buscador oficial de la EHU');
 const calls:Call[]=[];for(const listing of listings){try{calls.push(parseEhuDetail(await client.text(listing.url),listing,now));}catch(error){onWarning(`Ficha EHU ${listing.process}: ${error instanceof Error?error.message:'Error'}`);}}
 if(!calls.length)throw new Error('No se pudo extraer ninguna ficha del buscador oficial de la EHU');return calls;
}
