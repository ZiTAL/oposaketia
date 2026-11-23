import {load} from 'cheerio';
import {z} from 'zod';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,educationIds,extractTopics,linkList,parseDate,pdfText} from './shared';
import {EUSKADI_DATA,readEuskadiFields} from './euskadi';
import reviews from '../reviews/arkaute.json';
export const ARKAUTE_HOME='https://arkauteakademia.eus/';
const issuer='Academia Vasca de Policía y Emergencias';
function confirmScope(fields:Record<string,string>,row:Record<string,string>){
 if(normalize(fields['¿quien oferta?']||fields.convoca||'')!==normalize(issuer))throw new Error('Arkaute published issuer does not match');
 const declared=normalize(`${row.rrhhTerritory??''} ${row.territory??''}`).trim();
 if(declared&&(!/euskadi|pais vasco|bizkaia|gipuzkoa|araba|alava/.test(declared)||/navarra|nafarroa/.test(declared)))throw new Error('Conflicting Arkaute territorial metadata');
 const title=normalize(fields.plaza||row.documentName||''),duties=normalize(fields['funciones y tareas']||'');
 if(normalize(fields.ambito||'')!=='euskadi'&&!/cuerpos de (?:la )?policia del pais vasco|ertzaintza/.test(title)&&!(/(?:agentes?|policia).*interin|interin.*policia/.test(title)&&/ley de policia del pais vasco/.test(duties)))throw new Error('Arkaute regional recruitment scope is not confirmed');
}
export function parseArkauteDetail(html:string,row:Record<string,string>,now:string):Call{
 const $=load(html),fields=readEuskadiFields($);confirmScope(fields,row);
 const call=baseCall('arkaute',row.physicalUrl,now,'Euskadi');call.title=fields.plaza||row.documentName;call.organization=issuer;call.location='Euskadi';call.category='Servicios';call.group=fields.grupo||'Sin clasificar';
 const places=(fields['nº plazas']||row.rrhhVacancies||'').match(/^(\d+)(?:[.\s(]|$)/)?.[1];call.places=places&&Number(places)>0?Number(places):null;
 call.educationText=fields.titulacion||fields.requisitos||call.educationText;call.acceptedQualifications=educationIds(call.educationText);
 call.requirements=[fields.requisitos,fields['perfil linguistico'],fields['otros requisitos'],fields.observaciones].filter(Boolean).concat(call.requirements);
 call.deadline=parseDate(fields.plazo||'')??parseDate(row.rrhhEndDate||'');const start=parseDate(row.rrhhStartDate||'');
 call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':start&&start>now.slice(0,10)?'Próximamente':'Abierta':'Pendiente de confirmar';
 call.documents=linkList($,'a[href]',row.physicalUrl).filter(link=>{
  const url=new URL(link.url);return !url.username&&!url.password&&url.hostname.endsWith('.euskadi.eus')&&/\.pdf$/i.test(url.pathname)&&/^(?:Bases(?: de la convocatoria| convocatoria)?|Temario|Ampliación del número de plazas convocadas)$/i.test(link.title);
 }).filter((link,index,links)=>links.findIndex(other=>other.url===link.url)===index).map(link=>({...link,kind:/temario/i.test(link.title)?'temario':'bases',checkedAt:null,sha256:null}));
 if(call.documents.some(doc=>/^Ampliación del número de plazas convocadas$/i.test(doc.title)))call.places=null;
 call.description='Proceso de la Academia Vasca de Policía y Emergencias difundido en una ficha oficial del Gobierno Vasco. Consulta las bases para las condiciones de cada plaza, los perfiles lingüísticos y el programa de pruebas.';
 call.sourceHash=hash(JSON.stringify({title:call.title,educationText:call.educationText,requirements:call.requirements,documents:call.documents.map(doc=>({title:doc.title,url:doc.url}))}));
 return callSchema.parse(call);
}
export function enrichArkauteBases(call:Call,text:string,url:string,sha256:string):Call{
 if(call.documents.some(doc=>doc.url===url&&/^Ampliación del número de plazas convocadas$/i.test(doc.title))){
  const plain=clean(text);
  const original=plain.match(/convocaron (\d+) plazas/i)?.[1];
  // Bilingual resolutions interleave the Basque column between Spanish lines.
  const increment=plain.match(/PRIMERO\.- Incrementar en (\d+) plazas el.{0,160}?número de las convocadas/i)?.[1];
  if(original&&increment){
   call.places=Number(original)+Number(increment);
   call.requirements=[`La resolución de ampliación incrementa las ${original} plazas iniciales en ${increment}: ${call.places} plazas en total.`,...call.requirements];
  }
 }
 const topics=extractTopics(text);if(topics.length){call.topics=topics;call.syllabusUrl=url;}
 const review=reviews.find(item=>item.url===url&&item.sha256===sha256&&item.fichaSha256===call.sourceHash);
 if(review&&/interin/i.test(call.title)){call.language=null;call.languageStatus='known';call.requirements=[review.note,...call.requirements];}
 return call;
}
export async function scrapeArkaute(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const cutoff=new Date(Date.parse(now)-365*86400000).toISOString().slice(0,10);
 const rows=z.array(z.record(z.string(),z.string())).parse(JSON.parse(await client.text(EUSKADI_DATA))).filter(row=>{
  if(normalize(row.rrhhSponsor||'')!==normalize(issuer)||/ascenso|promocion interna|turno restringido/.test(normalize(row.documentName||'')))return false;
  let url:URL;try{url=new URL(row.physicalUrl);}catch{return false;}
  return url.origin==='https://arkauteakademiamuseoa.euskadi.eus'&&url.pathname.includes('/contenidos/empleo_publico/')&&((parseDate(row.rrhhStartDate||'')||'')>=cutoff||(parseDate(row.rrhhEndDate||'')||'')>=cutoff);
 });
 if(!rows.length)throw new Error('No recent native Arkaute official employment fichas were found');
 const calls:Call[]=[];
 for(const row of rows){try{
  const call=parseArkauteDetail(await client.text(row.physicalUrl),row,now);
  for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;
   if(!/\b(?:bases|requisitos|convocatoria|temario|ley)\b/i.test(pdf.text))warn(`${doc.url}: PDF retrieved but its text encoding does not provide readable bases; consult the original document`);
   enrichArkauteBases(call,pdf.text,doc.url,pdf.sha256);
  }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
  calls.push(callSchema.parse(call));
 }catch(error){warn(`${row.physicalUrl}: ${error instanceof Error?error.message:'Ficha unavailable'}`);}}
 if(!calls.length)throw new Error('No Arkaute official ficha could be read');return calls;
}
