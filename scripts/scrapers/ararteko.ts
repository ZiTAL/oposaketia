import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const ARARTEKO_JOBS='https://transparencia.ararteko.eus/es/procesos-selectivos';
const profiles={
 '2024':{slug:'dos-tecnicos-o-tecnicas-de-area-resolucion-de-12-de-julio-de-2024',title:'Dos técnicos/as de área',places:2,education:'Licenciatura o grado en Derecho.',experience:'Dos años de experiencia en funciones jurídicas comparables.',pdf:'2024-10/resolucion-de-12-de-julio-de-2024%2C-del-ararteko.pdf',code:'2024/4070'},
 '2023-education':{slug:'tecnicoa-responsable-del-area-de-educacion-resolucion-de-21-de-diciembre-de-2023',title:'Técnico/a responsable del área de Educación',places:1,education:'Licenciatura o grado en Derecho.',experience:'Cinco años de experiencia profesional en funciones jurídicas comparables.',pdf:'2024-01/resolucion-de-21-de-diciembre-de-2023-del-ararteko-por-la-que-se-convoca-procedimiento-para-la-seleccion-de-un-tecnico-o-tecnica-responsable-del-area-de-educacion.pdf',code:'2024/97'},
 '2023-contracts':{slug:'tecnicoa-responsable-en-las-materias-de-contratacion-publica-y-de-gestion-contable-y-presupuestaria-resolucion-de-21-de-diciembre-de-2023',title:'Técnico/a responsable de contratación pública y gestión contable y presupuestaria',places:1,education:'Licenciatura o grado en Derecho y/o Economía.',experience:'Cinco años de experiencia profesional en funciones análogas a la especialización del puesto.',pdf:'2024-01/resolucion-de-21-de-diciembre-de-2023-del-ararteko-por-la-que-se-convoca-un-procedimiento-para-la-seleccion-de-un-tecnico-o-tecnica-responsable-en-las-materias-de-contratacion-publica-y-de-gestion-contable-y-presupuestaria.pdf',code:'2024/98'},
} as const;
type Key=keyof typeof profiles;
type Listing={key:Key;pageUrl:string;pdfUrl:string};

export function parseArartekoList(html:string):{key:Key;pageUrl:string}[]{
 const $=load(html);
 if(clean($('h1.page-title').first().text())!=='Procesos selectivos')throw new Error('No se reconoce el portal de procesos selectivos del Ararteko');
 return (Object.keys(profiles) as Key[]).map(key=>{
  const slug=profiles[key].slug;
  const matches=$('.book-navigation ul.menu a[href]').filter((_,node)=>$(node).attr('href')===`/es/${slug}`);
  if(matches.length!==1)throw new Error(`Proceso ${slug} ausente o duplicado`);
  const pageUrl=canonical(matches.first().attr('href')!,ARARTEKO_JOBS);
  if(!pageUrl)throw new Error(`URL del proceso ${slug} no válida`);
  return {key,pageUrl};
 });
}

export function parseArartekoPage(key:Key,pageUrl:string,html:string):Listing{
 const $=load(html),profile=profiles[key];
 if(!clean($('h1.page-title').first().text()).includes('Resolución de'))throw new Error('No se reconoce la ficha del Ararteko');
 const links=$('.field--name-field-media-document a[href]').map((_,node)=>canonical($(node).attr('href')!,pageUrl)).get();
 const expected=`https://transparencia.ararteko.eus/sites/default/files/${profile.pdf}`;
 if(links.length!==1||links[0]!==expected)throw new Error('Bases PDF del Ararteko ausentes o cambiadas');
 return {key,pageUrl,pdfUrl:expected};
}

export function parseArartekoBases(listing:Listing,text:string,sha256:string,now:string):Call{
 const profile=profiles[listing.key],normalized=clean(text).replace(/licencia- tura/g,'licenciatura');
 if(!normalized.includes(profile.code)||!/del Ararteko/i.test(normalized))throw new Error('Bases del Ararteko no identificadas');
 if(!/t[ií]tulo universitario de licenciatura o de grado en Derecho/i.test(normalized))throw new Error('Titulación obligatoria no identificada');
 if(listing.key==='2023-contracts'&&!/Derecho y\/o Econom[ií]a/i.test(normalized))throw new Error('Alternativa de Economía no identificada');
 const experienceYears=listing.key==='2024'?'dos':'cinco';
 if(!new RegExp(`experiencia(?: profesional)? de, al menos, ${experienceYears} a[nñ]os`,'i').test(normalized))throw new Error('Experiencia obligatoria no identificada');
 if(!/conocimiento de euskera correspondiente al nivel C1/i.test(normalized))throw new Error('Euskera obligatorio no identificado');
 if(!/dentro del plazo de 15 d[ií]as h[aá]biles contados a partir del siguiente a la publicaci[oó]n de la presente Resoluci[oó]n en el Bolet[ií]n Oficial del Pa[ií]s Vasco/i.test(normalized))throw new Error('Plazo relativo no identificado');
 const call=baseCall('ararteko',listing.pageUrl,now,'Euskadi');
 call.id=stableId('ararteko',listing.pdfUrl);call.title=profile.title;call.organization='Ararteko';
 call.location='Euskadi';call.places=profile.places;call.category='Administración';
 call.status='Cerrada';call.educationText=profile.education;
 call.language={name:'euskera',level:'C1'};call.languageStatus='known';
 call.requirements=[profile.education,profile.experience,'Euskera C1 obligatorio.'];
 call.description='Selección de personal eventual mediante valoración de idoneidad y méritos. El plazo se expresa en días hábiles desde la publicación en el BOPV; no se calcula una fecha absoluta. No hay temario de examen.';
 call.sourceHash=sha256;call.documents=[{title:'Resolución y bases oficiales (BOPV)',url:listing.pdfUrl,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeArarteko(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseArartekoList(await client.text(ARARTEKO_JOBS)),calls:Call[]=[];
 for(const item of listings){
  try{const listing=parseArartekoPage(item.key,item.pageUrl,await client.text(item.pageUrl));const pdf=await pdfText(client,listing.pdfUrl);calls.push(parseArartekoBases(listing,pdf.text,pdf.sha256,now));}
  catch(error){warn(`${item.pageUrl}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay procesos verificados del Ararteko');
 return calls;
}
