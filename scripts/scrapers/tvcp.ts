import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const TVCP_JOBS='https://hkee-tvcp.eus/portal-de-transparencia/informacion-sobre-procesos-selectivos/';
const codes={
 '0053':{title:'Bolsa de Técnico/a de Administración General',requirement:'Grado en Administración y Dirección de Empresas, Economía o Derecho, o titulación oficial equivalente.',check:/Grado en Administraci[oó]n y Direcci[oó]n de Empresas, Grado en Econom[ií]a o Grado en Derecho, o titulaci[oó]n oficial equivalente/i},
 '0054':{title:'Bolsa de Técnico/a Informático/a',requirement:'Licenciatura o grado en Ingeniería Informática, Ingeniería de Telecomunicaciones u otra titulación universitaria oficial equivalente que habilite para las funciones de sistemas y tecnologías de la información.',check:/Licenciatura o Grado en Ingenier[ií]a Inform[aá]tica, Ingenier[ií]a de Telecomunicaciones, o cualquier otra titulaci[oó]n universitaria oficial de Grado o equivalente/i},
 '0055':{title:'Bolsa de Administrativo/a',requirement:'Título de Bachiller, Técnico/a o titulación equivalente.',check:/t[ií]tulo de Bachiller, T[eé]cnico\/a o titulaci[oó]n equivalente/i},
} as const;
type Code=keyof typeof codes;
type Listing={code:Code;url:string};

export function parseTvcpList(html:string):Listing[]{
 const $=load(html);
 if(clean($('h1').first().text())!=='Información sobre procesos selectivos')throw new Error('No se reconoce el portal de procesos selectivos del TVCP');
 const listings:Listing[]=[];
 for(const code of Object.keys(codes) as Code[]){
  const rows=$('.linea_descarga').filter((_,node)=>new RegExp(`RESOLUCI[ÓO]N 2026-${code}\\b`,'i').test(clean($(node).find('.texto_descarga').text())));
  if(rows.length!==1)throw new Error(`Resolución 2026-${code} ausente o duplicada en el TVCP`);
  const raw=rows.find('a[href]').first().attr('href'),url=raw?canonical(raw,TVCP_JOBS):null;
  if(!url||url!==`https://hkee-tvcp.eus/wp-content/uploads/20260720_Ebazpena_EBAZPENA-RESOLUCION-2026-${code}.pdf`)throw new Error(`Bases PDF 2026-${code} no identificadas`);
  listings.push({code,url});
 }
 return listings;
}

export function parseTvcpBases(listing:Listing,text:string,sha256:string,now:string):Call{
 const profile=codes[listing.code],normalized=clean(text);
 if(!normalized.includes(`2026-${listing.code}`)||!normalized.includes('Tribunal Vasco de Cuentas Públicas'))throw new Error('Las bases del TVCP no corresponden a la resolución');
 if(!profile.check.test(normalized))throw new Error('La titulación exigida por el TVCP no se reconoce');
 if(!/El plazo para presentar solicitudes ser[aá] de 10 d[ií]as, desde el 28 de julio hasta el 11 de agosto de 2026 incluidos?\b/i.test(normalized))throw new Error('El cierre de inscripción del TVCP no se reconoce');
 if(!/El desempe[nñ]o temporal del puesto se desarrollar[aá] en la sede del Tribunal Vasco de Cuentas P[uú]blicas en Vitoria-Gasteiz/i.test(normalized))throw new Error('El destino del TVCP no se reconoce');
 if(!/BAREMO DE M[ÉE]RITOS CONCURSO/i.test(normalized))throw new Error('No se reconoce el sistema de concurso de méritos');
 const call=baseCall('tvcp',TVCP_JOBS,now,'Euskadi');
 call.id=stableId('tvcp',listing.url);call.title=profile.title;call.organization='Tribunal Vasco de Cuentas Públicas';
 call.location='Vitoria-Gasteiz';call.province='Araba / Álava';call.category=listing.code==='0054'?'Servicios':'Administración';
 call.deadline='2026-08-11';call.status='Cerrada';call.educationText=profile.requirement;
 call.requirements=[profile.requirement,'Se convocan bolsas con y sin perfil lingüístico preceptivo de euskera; comprueba las condiciones de cada una en las bases.'];
 call.description='Proceso de creación de bolsas de trabajo por concurso de méritos, con plazo cerrado. Las bases oficiales contienen el baremo; no se publica un temario de examen para estas bolsas.';
 call.sourceHash=sha256;call.documents=[{title:`Resolución 2026-${listing.code} y bases oficiales`,url:listing.url,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeTvcp(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseTvcpList(await client.text(TVCP_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{const pdf=await pdfText(client,listing.url);calls.push(parseTvcpBases(listing,pdf.text,pdf.sha256,now));}
  catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay bolsas verificadas del TVCP');
 return calls;
}
