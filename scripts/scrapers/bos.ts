import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const BOS_AUDITIONS='https://www.bilbaorkestra.eus/la-orquesta/audiciones/';
const profiles={
 ENT202604:{title:'Ayuda de solista de contrabajo',places:1,deadline:'2026-10-07',dateCheck:/Izena emateko epea 2026eko urriaren 7an amaituko/i},
 ENT202603:{title:'Solista de contrabajo',places:1,deadline:'2026-10-07',dateCheck:/Izena emateko epea 2026eko urriaren 7an amaituko/i},
 ENT202602:{title:'Violonchelo tutti',places:2,deadline:'2026-09-30',dateCheck:/Izena emateko epea 2026eko irailaren 30ean/i},
} as const;
type Code=keyof typeof profiles;
type Listing={code:Code;pdfUrl:string};

export function parseBosAuditions(html:string):Listing[]{
 const $=load(html);
 if(!clean($('h1').first().text()).includes('Personal Músico')||!clean($('h2').first().text()).includes('Procesos selectivos en curso'))throw new Error('No se reconoce el portal de audiciones de la BOS');
 return (Object.keys(profiles) as Code[]).map(code=>{
  const rows=$('.row.audiciones').filter((_,node)=>new RegExp(`\\(${code}\\)`).test(clean($(node).find('h3').text())));
  if(rows.length!==1)throw new Error(`Audición ${code} ausente o duplicada`);
  const href=rows.first().find('a.btn').filter((_,node)=>/Convocatoria en PDF/i.test(clean($(node).text()))).first().attr('href');
  const pdfUrl=href?canonical(href,BOS_AUDITIONS):null;
  if(!pdfUrl||!/^https:\/\/(?:www\.)?bilbaorkestra\.eus\/wp-content\/uploads\/20\d\d\/\d\d\/[^?#]+\.pdf$/i.test(pdfUrl)||!pdfUrl.includes(code))throw new Error(`Bases PDF de ${code} no reconocidas`);
  return {code,pdfUrl};
 });
}

export function parseBosBases(listing:Listing,text:string,sha256:string,now:string):Call{
 const profile=profiles[listing.code],normalized=clean(text);
 if(!normalized.includes(listing.code)||!normalized.includes(profile.title)||!/Fundación Juan Crisóstomo de Arriaga-Orquesta/i.test(normalized)||!/Sinfónica de Bilbao/i.test(normalized))throw new Error('Las bases de la BOS no corresponden al puesto');
 if(!new RegExp(`Número de vacantes\\s*:\\s*${profile.places}\\b`,'i').test(normalized)||!/Título exigido: Título de grado medio de música/i.test(normalized))throw new Error('Las plazas o la titulación de la BOS no se reconocen');
 if(!profile.dateCheck.test(normalized)||!/II\. Eranskina\s+Anexo II/i.test(normalized))throw new Error('El cierre o el repertorio de la BOS no se reconoce');
 const call=baseCall('bos',BOS_AUDITIONS,now,'Euskadi');
 call.id=stableId('bos',listing.code);call.title=profile.title;call.organization='Bilbao Orkestra Sinfonikoa';
 call.location='Bilbao';call.province='Bizkaia';call.category='Servicios';call.places=profile.places;
 call.educationText='Título de grado medio de música.';call.requirements=['Título de grado medio de música.','Consulta las condiciones de admisión y el repertorio de los anexos oficiales.'];
 call.deadline=profile.deadline;call.status='En curso';
 call.description='Audición de personal músico con plazo de inscripción cerrado. El portal oficial mantiene el proceso en curso; el anexo II de las bases contiene el repertorio.';
 call.syllabusUrl=listing.pdfUrl;call.sourceHash=sha256;
 call.documents=[{title:`Convocatoria ${listing.code}, bases y repertorio`,url:listing.pdfUrl,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeBos(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseBosAuditions(await client.text(BOS_AUDITIONS)),calls:Call[]=[];
 for(const listing of listings){
  try{const pdf=await pdfText(client,listing.pdfUrl);calls.push(parseBosBases(listing,pdf.text,pdf.sha256,now));}
  catch(error){warn(`${listing.pdfUrl}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay audiciones verificadas de la BOS');
 return calls;
}
