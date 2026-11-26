import {load} from 'cheerio';import {callSchema,normalize,type Call} from '../../src/lib/catalogue';import {OfficialClient,hash} from './http';import {baseCall,categoryFor,clean,parseDate,universityRequirementIds} from './shared';import {enrichMunicipalBases} from './municipal-requirements';
export const BON_LOCAL_INDEX='https://bon.navarra.es/es/indice-boletines';
type Bulletin={url:string;year:number;number:number;publishedAt:string};
type Month={url:string;year:number;month:number};
type Listing={title:string;issuer:string;url:string;bulletin:Bulletin};
const months:Record<string,number>={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
function publishedDate(text:string):string|null{const m=normalize(clean(text)).match(/(\d{1,2}) de ([a-z]+) de (\d{4})(?:\s*[-–]?\s*extraordinario)?$/);return m&&months[m[2]]?parseDate(`${m[1]}/${months[m[2]]}/${m[3]}`):null;}
function officialUrl(raw:string,base:string):URL{const url=new URL(raw,base);if(url.origin!=='https://bon.navarra.es'||url.username||url.password||url.search||url.hash)throw new Error('Unexpected BON canonical URL');return url;}
export function parseBonIndex(html:string,base:string):{bulletins:Bulletin[];months:Month[]}{
 const $=load(html);if(!/indice de boletines|boletines/i.test(normalize(clean($('h1').first().text()))))throw new Error('BON published index heading missing');
 const bulletins:Bulletin[]=[],monthRefs:Month[]=[];
 $('a[href]').each((_,node)=>{
  const raw=$(node).attr('href')!;if(raw.startsWith('#'))return;
  let candidate:URL;try{candidate=new URL(raw,base);}catch{return;}
  if(candidate.pathname.startsWith('/es/boletin/-/sumario/')){
   const url=officialUrl(raw,base),m=url.pathname.match(/^\/es\/boletin\/-\/sumario\/(\d{4})\/(\d+)$/),date=publishedDate($(node).text());
   if(!m||!date||Number(date.slice(0,4))!==Number(m[1]))throw new Error('BON bulletin date or identity mismatch');
   const number=clean($(node).text()).match(/N[º°o]\s*(\d+)/i)?.[1];if(Number(number)!==Number(m[2]))throw new Error('BON printed bulletin number mismatch');
   bulletins.push({url:url.href,year:Number(m[1]),number:Number(m[2]),publishedAt:date});
  }else if(candidate.pathname.startsWith('/es/boletines/-/boletinmes/')){
   const url=officialUrl(raw,base),m=url.pathname.match(/^\/es\/boletines\/-\/boletinmes\/(\d{4})\/(\d{1,2})$/);
   if(!m||Number(m[2])<1||Number(m[2])>12)throw new Error('BON month identity mismatch');monthRefs.push({url:url.href,year:Number(m[1]),month:Number(m[2])});
  }
 });
 const unique=[...new Map(bulletins.map(row=>[row.url,row])).values()];if(!unique.length||unique.length>400)throw new Error('BON index has no recognized bulletin references');
 return {bulletins:unique,months:[...new Map(monthRefs.map(row=>[row.url,row])).values()]};
}
function newRecruitment(title:string):boolean{
 const value=normalize(title);return /convocatoria|oposicion|concurso/.test(value)&&!/nombramiento|admitid|excluid|resultado|puntuaci|calificaci|correcci|rectificaci|modificaci|desiert|desist|traslado|restringid|personal fijo|aprobados|examen|plantilla organica|propuesta de contratacion|propuesta de designacion|adjudicacion|ampliaci|recurso de alzada|alegaciones|resolucion de contratacion|declaracion de excedencia|\.\s*contratacion\b/.test(value);
}
function verifyBulletin(text:string,bulletin:Bulletin):void{
 if(publishedDate(text)!==bulletin.publishedAt||Number(text.match(/N[º°o]\s*(\d+)/i)?.[1])!==bulletin.number)throw new Error('BON legal publication date or number differs from its index');
}
export function parseBonLocalSummary(html:string,bulletin:Bulletin):Listing[]{
 const $=load(html),heading=$('#numero_boletin');if(heading.length!==1)throw new Error('BON bulletin metadata missing');verifyBulletin(clean(heading.text()),bulletin);
 const body=heading.parent();if(!body.children('.b-ambito').length)throw new Error('BON summary chapter layout missing');
 const jobs:Listing[]=[];let local=false,section='',issuer='';
 body.children('p').each((_,node)=>{
  const p=$(node),text=clean(p.text());if(p.hasClass('b-ambito')){local=/^2\.\s*administracion local de navarra/i.test(normalize(text));section='';issuer='';}
  else if(p.hasClass('b-seccion')){section=text;issuer='';}
  else if(p.hasClass('b-denominacion'))issuer=text;
  else if(local&&/^2\.1\./.test(section)){
   const anchor=p.children('a[href]'),title=clean(anchor.text());if(!newRecruitment(title))return;if(!issuer||anchor.length!==1)throw new Error('BON local call issuer or unique announcement link missing');
   const url=officialUrl(anchor.attr('href')!,bulletin.url),match=url.pathname.match(/^\/es\/anuncio\/-\/texto\/(\d{4})\/(\d+)\/\d+$/);
   if(!match||Number(match[1])!==bulletin.year||Number(match[2])!==bulletin.number)throw new Error('BON local announcement differs from its bulletin');jobs.push({title,issuer,url:url.href,bulletin});
  }
 });return jobs;
}
export function parseBonLocalArticle(html:string,item:Listing,now:string):Call|null{
 const $=load(html),title=clean($('p.a-titulo').text()),issuer=clean($('p.a-denominacion').text());
 if(!/^2\.\s*administracion local de navarra/i.test(normalize(clean($('p.a-ambito').text())))||!/^2\.1\./.test(clean($('p.a-seccion').text()))||normalize(issuer)!==normalize(item.issuer)||normalize(title)!==normalize(item.title))throw new Error('BON local legal chapter, issuer or call title mismatch');
 const header=$('h2').map((_,node)=>clean($(node).text())).get().find(text=>/BOLET[ÍI]N N[º°o]/i.test(text));if(!header)throw new Error('BON article publication metadata missing');verifyBulletin(header,item.bulletin);
 const paragraphs=$('p[class^="foral-"]').map((_,node)=>clean($(node).text())).get();if(!paragraphs.length)throw new Error('BON article legal paragraphs missing');
 const text=paragraphs.join('\n'),flat=normalize(text);
 const minimum=text.match(/(?:^|\n)\d+\s*[.–-]+\s*(?:Requisitos|Condiciones de admisi[oó]n)[\s\S]*?(?=\n\d+\s*[.–-]+\s*[A-ZÁÉÍÓÚ]|$)/i)?.[0];
 const publicTurn=/turno libre/.test(flat)||/contratacion temporal/.test(normalize(title));
 if(minimum&&!publicTurn&&/(?:^|\n)\s*(?:[a-z]\)|\d+\.\d+\.)?\s*(?:ostentar la condicion de personal fijo|ser funcionario de carrera|ser personal fijo|tener la condicion de funcionario de carrera)/im.test(normalize(minimum)))return null;
 const call=baseCall('bon-local',item.url,now,'Navarra');call.title=title;call.organization=issuer;call.location='Navarra';call.province='Navarra';call.category=categoryFor(title);
 call.description=`Convocatoria publicada por ${issuer} en la sección 2.1 de Administración Local de Navarra del BON, el ${item.bulletin.publishedAt}. El encabezado identifica a la entidad anunciante; las entidades empleadoras, destinos, turnos y perfiles de cada plaza se detallan en las bases. No se calculan fechas de cierre a partir de plazos relativos ni se incorporan nombramientos o resultados como nuevas convocatorias.`;
 enrichMunicipalBases(call,text,item.url);
 const requiredStart=paragraphs.findIndex(p=>/^(?:\d+(?:\.\d+)?[.ªº]?\s*[.–-]*|segunda[.–-]*)\s*(?:requisitos|condiciones de admisi[oó]n)/i.test(p));
 if(requiredStart>=0){
  const tail=paragraphs.slice(requiredStart+1),end=tail.findIndex(p=>/^\d+\s*[.–-]+\s*(?:solicitudes|instancias|presentaci[oó]n|admisi[oó]n|tribunal|pruebas|procedimiento)/i.test(p));
  const academic=tail.slice(0,end<0?undefined:end).find(p=>{
   const value=normalize(p);return /estar en posesion|hallarse en posesion|encontrarse en posesion|poseer|titulo|titulacion/.test(value)&&/\b(?:bachiller(?:ato)?|diplomatura|licenciatura|grado|graduado escolar|formacion profesional|tecnico superior|maestro|magisterio|certificado de escolaridad|certificado de profesionalidad)\b/.test(value);
  });
  if(academic){call.educationText=academic;call.acceptedQualifications=universityRequirementIds(academic);}
 }
 // A single bulletin call may cover several municipalities and language
 // profiles. Never apply one post's C1 requirement to the whole process.
 call.language=null;call.languageStatus='unknown';
 if(item.url==='https://bon.navarra.es/es/anuncio/-/texto/2026/236/18'){
  if(item.bulletin.publishedAt!=='2026-11-26'||normalize(issuer)!=='caparroso'
   ||!text.includes('una plaza, en turno libre, de empleado de servicios múltiples, nivel E')
   ||!text.includes('certificado de escolaridad o equivalente')
   ||!text.includes('permiso de conducir vehículos de la clase B')
   ||!text.includes('El plazo de presentación de solicitudes será de 20 días naturales')
   ||call.topics.length!==11||!call.topics[10].startsWith('11. Prevención de Riesgos Laborales'))throw new Error('Caparrosoko deialdiaren oinarriak edo 11 gaiak aldatu dira');
  call.location='Caparroso';call.places=1;call.group='E';
  call.educationText='Certificado de escolaridad o equivalente.';call.acceptedQualifications=[];
  call.deadline='2026-12-16';call.status=now.slice(0,10)<=call.deadline?'Abierta':'Cerrada';
  call.languageStatus='known';call.requirements=[call.educationText,'Permiso de conducir B.'];
  call.description='Plaza laboral fija de servicios múltiples mediante oposición en turno libre y contrato de relevo. Plazo de 20 días naturales desde el BON del 26/11/2026: cierre calculado el 16/12/2026. Pruebas teórica y práctica; Anexo II con 11 temas. Quienes aprueben sin plaza integrarán una lista temporal.';
 }
 call.documents=[{title:'Publicación y bases en el Boletín Oficial de Navarra',url:item.url,kind:'bases',checkedAt:now,sha256:hash(html)}];call.sourceHash=hash(JSON.stringify({title,issuer,paragraphs}));return callSchema.parse(call);
}
export async function scrapeBonLocal(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const today=now.slice(0,10),cutoff=new Date(Date.parse(now)-90*86400000).toISOString().slice(0,10),index=parseBonIndex(await client.text(BON_LOCAL_INDEX),BON_LOCAL_INDEX);
 const monthNumber=(year:number,month:number)=>year*12+month;
 const floor=monthNumber(Number(cutoff.slice(0,4)),Number(cutoff.slice(5,7))),ceiling=monthNumber(Number(today.slice(0,4)),Number(today.slice(5,7)));
 const required=index.months.filter(row=>monthNumber(row.year,row.month)>=floor&&monthNumber(row.year,row.month)<=ceiling);
 if(required.length>6)throw new Error('Unexpected BON recent month count');
 const refs=new Map(index.bulletins.map(row=>[row.url,row]));
 for(const month of required){try{const parsed=parseBonIndex(await client.text(month.url),month.url);for(const ref of parsed.bulletins){if(ref.year!==month.year||Number(ref.publishedAt.slice(5,7))!==month.month)throw new Error('BON month publishes conflicting bulletin dates');refs.set(ref.url,ref);}}catch(error){warn(`${month.url}: ${error instanceof Error?error.message:'Month unavailable'}`);}}
 if(!required.length)warn('BON index does not publish recent month links; coverage is limited to its displayed bulletins');
 const recent=[...refs.values()].filter(ref=>ref.publishedAt>=cutoff&&ref.publishedAt<=today).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 if(!recent.length||recent.length>200)throw new Error('Unexpected BON recent bulletin count');
 const items=new Map<string,Listing>();let read=0;
 for(const ref of recent){try{for(const item of parseBonLocalSummary(await client.text(ref.url),ref))items.set(item.url,item);read++;if(read%20===0)console.log(`[bon-local] ${read}/${recent.length} boletines oficiales revisados`);}catch(error){warn(`${ref.url}: ${error instanceof Error?error.message:'Summary unavailable'}`);}}
 if(!read)throw new Error('No BON local summary could be read');if(items.size>500)throw new Error('Unexpected BON local recruitment count');
 const calls:Call[]=[];for(const item of items.values()){try{const call=parseBonLocalArticle(await client.text(item.url),item,now);if(!call)continue;
  if(!call.acceptedQualifications.length)warn(`${item.url}: Academic requirements need further extraction; consult the official notice`);
  calls.push(call);
 }catch(error){warn(`${item.url}: ${error instanceof Error?error.message:'Legal notice unavailable'}`);}}
 if(items.size&&!calls.length)throw new Error('No BON local legal call could be confirmed');return calls;
}
