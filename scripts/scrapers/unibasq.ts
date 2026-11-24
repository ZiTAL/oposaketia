import {load} from 'cheerio';
import {callSchema, type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const UNIBASQ_JOBS='https://www.unibasq.eus/es/portal-de-transparencia/portal-de-transparencia-ofertas/';
type Listing={title:string;url:string;closed:boolean;directPdf:boolean};
const pdfPath=/^https:\/\/www\.unibasq\.eus\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-z0-9_.-]+\.pdf$/i;
const months:Record<string,string>={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};

export function parseUnibasqList(html:string):Listing[]{
 const $=load(html);
 if(clean($('h1').first().text())!=='Portal de Transparencia'||!$('h2').toArray().some(node=>/Procesos de selecci[oó]n finalizados/i.test($(node).text())))throw new Error('No se reconoce el listado de empleo de Unibasq');
 const listings=$('.et_pb_text_inner ul li').map((_,node)=>{
  const item=$(node),anchor=item.find('a[href]').first(),url=canonical(anchor.attr('href')??'',UNIBASQ_JOBS);
  const title=clean(item.clone().find('strong').remove().end().text()).replace(/\s+Bases\s*$/i,'').replace(/\.$/,'').trim();
  if(!title||!url||new URL(url).hostname!=='www.unibasq.eus')throw new Error('Proceso de Unibasq sin enlace oficial');
  const directPdf=pdfPath.test(url);
  if(!directPdf&&!/^https:\/\/www\.unibasq\.eus\/es\/[a-z0-9/-]+\/$/.test(url))throw new Error('Ficha de Unibasq fuera del portal oficial');
  return {title,url,closed:/\(Cerrado\)/i.test(item.text()),directPdf};
 }).get();
 if(!listings.length||new Set(listings.map(item=>item.url)).size!==listings.length)throw new Error('Listado de Unibasq vacío o duplicado');
 return listings;
}

export function parseUnibasqDetail(html:string,listing:Listing):string{
 const $=load(html);
 if(!/Unibasq|T[eé]cnico\/a de Evaluaci[oó]n/i.test(clean($('h1,h2').text())))throw new Error('La ficha de Unibasq no corresponde al proceso');
 const links=$('a[href]').toArray().filter(node=>/^Bases(?:\s+que regulan|\s+y convocatoria)?/i.test(clean($(node).text()))).map(node=>canonical($(node).attr('href')??'',listing.url));
 const pdf=links.find(url=>url&&pdfPath.test(url));
 if(!pdf)throw new Error('No se encuentran las bases PDF de Unibasq');
 return pdf;
}

function dateFromBases(text:string):string|null{
 const normalized=clean(text);
 const dates=[...normalized.matchAll(/hasta\s+(?:las\s+\d{1,2}:\d{2}\s+horas\s+)?(?:el|del)\s+d[ií]a\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/gi)].map(match=>{
  const month=months[match[2].toLocaleLowerCase('es')];return month?`${match[3]}-${month}-${match[1].padStart(2,'0')}`:null;
 }).filter((date):date is string=>Boolean(date));
 return new Set(dates).size===1?dates[0]:null;
}

export function parseUnibasqBases(listing:Listing,pdfUrl:string,text:string,sha256:string,now:string):Call{
 if(!/UNIBASQ|Unibasq/.test(text.slice(0,7000))||text.length<1000)throw new Error('El PDF no contiene bases reconocibles de Unibasq');
 const call=baseCall('unibasq',listing.url,now,'Euskadi');
 call.id=stableId('unibasq',pdfUrl);call.title=listing.title;call.organization='Unibasq';
 call.location='Vitoria-Gasteiz';call.province='Araba / Álava';call.category=/auxiliar|t[eé]cnico/i.test(listing.title)?'Administración':'Servicios';
 call.deadline=dateFromBases(text);call.status=listing.closed?'Cerrada':call.deadline&&call.deadline>=now.slice(0,10)?'Abierta':'Pendiente de confirmar';
 call.description='Proceso de selección propio publicado en el portal de transparencia de Unibasq. Consulta las bases para los requisitos y la valoración; no se publica un temario de oposición para este proceso.';
 call.sourceHash=hash(pdfUrl+sha256);call.documents=[{title:'Bases oficiales',url:pdfUrl,kind:'bases',checkedAt:now,sha256}];
 const lower=pdfUrl.toLowerCase();
 if(lower.includes('bases-proceso-creacion-bolsa-de-trabajo-tecnico_a-de-evaluacion')){
  if(!/Administraci[oó]n y Direcci[oó]n de Empresas;[\s\S]{0,120}Econom[ií]a; Derecho o Sociolog[ií]a/i.test(text)||!/Conocimientos de Euskara nivel C1/i.test(text))throw new Error('Requisitos de la bolsa de evaluación no reconocidos');
  call.educationText='Licenciatura o grado en Administración y Dirección de Empresas, Economía, Derecho o Sociología.';
  call.requirements=[call.educationText,'Euskera C1 acreditado o equivalente.'];call.language={name:'euskera',level:'C1'};call.languageStatus='known';call.places=null;
 }else if(lower.includes('unibasq-cas-resolucion-bases-de-seleccion')){
  if(!/Se convocan 2 plazas de T[eé]cnico\/a de Evaluaci[oó]n/i.test(text)||!/T[ií]tulo\s+universitario oficial de Grado o Licenciatura/i.test(clean(text)))throw new Error('Bases de estabilización no reconocidas');
  call.title='2 plazas de Técnico/a de Evaluación (estabilización por concurso de méritos)';call.places=2;
  call.educationText='Título universitario oficial de Grado o Licenciatura.';
  call.requirements=[call.educationText,'Perfil lingüístico 3 de euskera exigido para los dos puestos; comprobar acreditación en las bases.'];
 }else if(lower.includes('bases_auxiliar_administrativo_unibasq')){
  if(!/Euskera\s*:\s*Nivel C1/i.test(text)||!/Ingl[eé]s\s*:\s*Nivel B2/i.test(text))throw new Error('Bases de auxiliar no reconocidas');
  call.educationText='Las bases no especifican un título académico obligatorio.';call.requirements=['Euskera C1, inglés B2 y ofimática como requisitos imprescindibles.'];call.language={name:'euskera',level:'C1'};call.languageStatus='known';call.places=1;
 }else if(lower.includes('bases_tecnico_internacional_unibasq')){
  if(!/T[ií]tulo universitario de licenciatura, grado o similar/i.test(text)||!/euskera e ingl[eé]s \(Nivel C1 o similar\)/i.test(text))throw new Error('Bases de técnico internacional no reconocidas');
  call.educationText='Título universitario de licenciatura, grado o similar.';call.requirements=[call.educationText,'Euskera e inglés C1 o similar.'];call.language={name:'euskera',level:'C1'};call.languageStatus='known';call.places=1;
 }else{
  call.requirements=['Consulta los requisitos y el plazo en las bases oficiales.'];
 }
 return callSchema.parse(call);
}

export async function scrapeUnibasq(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseUnibasqList(await client.text(UNIBASQ_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{
   const pdfUrl=listing.directPdf?listing.url:parseUnibasqDetail(await client.text(listing.url),listing);
   const pdf=await pdfText(client,pdfUrl);calls.push(parseUnibasqBases(listing,pdfUrl,pdf.text,pdf.sha256,now));
  }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Proceso no disponible'}`);}
 }
 if(!calls.length)throw new Error('No se han podido verificar procesos de Unibasq');
 return calls;
}
