import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, categoryFor, clean, educationIds, stableId } from './shared';

export const OSAKIDETZA_LIST='https://hh-sp.osakidetza.eus/B96/home_usuario_publico.xhtml';
export const OSAKIDETZA_OPE='https://www.osakidetza.euskadi.eus/ope-2023-2024-2025/webosk00-procon/es/';
const COMMON_BASES='https://www.osakidetza.euskadi.eus/contenidos/informacion/osk_pro_ope_2023_2024_2025/es_def/adjuntos/bases-generales.pdf';
const COMMON_SYLLABUS='https://www.osakidetza.euskadi.eus/contenidos/informacion/osk_pro_ope_2023_2024_2025/es_def/adjuntos/BIBLIOGRAFIA-DEL-TEMARIO-COMUN.pdf';
export type OsakidetzaListing={title:string;edition:string;started:string|null};
function dateIso(value:string){const match=value.match(/(20\d{2})\/(\d{2})\/(\d{2})/);return match?`${match[1]}-${match[2]}-${match[3]}`:null;}
function category(title:string){const text=normalize(title);if(/mediku|erizain|osasun|fisioterapeut|farmaz|odontolog|zeladore|laborategi|kirurg|optika|anatomia|hematologia/.test(text))return 'Sanidad' as const;if(/administrari|administrazio|kudeaketa|kontabil|informatika/.test(text))return 'Administración' as const;return categoryFor(title);}
export function parseOsakidetzaList(html:string):OsakidetzaListing[]{
 const $=load(html);const results:OsakidetzaListing[]=[];
 $('.featured-container__link').each((_,element)=>{
  const anchor=$(element);const title=clean(anchor.text());const card=anchor.closest('.table-cell');const summary=clean(card.text());
  if(!title||!/(?:2023\s*[-+]\s*2024\s*[-+]\s*2025|2023-2024-2025)/i.test(summary))return;
  const date=dateIso(summary);results.push({title,edition:'OPE 2023-2024-2025',started:date});
 });
 return [...new Map(results.map(item=>[normalize(item.title)+'|'+item.edition,item])).values()];
}
export function parseOsakidetza(html:string,listing:OsakidetzaListing,now:string):Call{
 const call=baseCall('osakidetza',OSAKIDETZA_LIST,now,'Euskadi');call.id=stableId('osakidetza',`${listing.edition}:${normalize(listing.title)}`);
 call.title=listing.title;call.organization='Osakidetza · Servicio Vasco de Salud';call.location='Euskadi';call.category=category(listing.title);
 call.group='Sin clasificar';call.places=null;call.deadline=null;call.status=listing.started&&listing.started>now.slice(0,10)?'Próximamente':'En curso';
 call.educationText='Consulta las bases específicas de la categoría en el portal oficial de la OPE.';call.acceptedQualifications=[];
 call.languageStatus='unknown';call.requirements=['Consulta las bases específicas para confirmar titulación, perfil lingüístico y requisitos del puesto.'];
 call.description=`Categoría publicada en ${listing.edition}. El portal oficial de Osakidetza contiene las convocatorias, publicaciones y documentación del proceso.`;
 call.documents=[{title:'Bases generales de la OPE Osakidetza 2023-2024-2025',url:COMMON_BASES,kind:'bases',checkedAt:null,sha256:null},{title:'Bibliografía del temario común de Osakidetza',url:COMMON_SYLLABUS,kind:'guia',checkedAt:null,sha256:null}];
 call.sourceHash=hash(`${listing.title}|${listing.edition}|${listing.started??''}|${html}`);return callSchema.parse(call);
}
export async function scrapeOsakidetza(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]>{
 const html=await client.text(OSAKIDETZA_LIST);const listings=parseOsakidetzaList(html);
 if(!listings.length)throw new Error('No se encontraron categorías OPE 2023-2024-2025 en el portal público de Osakidetza');
 const calls=listings.map(listing=>parseOsakidetza(html,listing,now));
 // Keep one explicit report warning: this public portal requires interaction to open each category.
 onWarning('El portal público solo expone el listado de categorías en esta página; consulta sus bases y publicaciones en el portal oficial para el detalle individual.');
 return calls;
}
