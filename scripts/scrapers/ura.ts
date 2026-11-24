import {load} from 'cheerio';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,clean,stableId} from './shared';

export const URA_JOBS='https://www.uragentzia.euskadi.eus/empleo-procesos-vigentes-ura/webura00-contents/es/';
type Listing={title:string;documentUrl:string};
const execFileAsync=promisify(execFile);

export function parseUraJobs(html:string):Listing[]{
 const $=load(html);
 if(!/^Empleo\. Procesos vigentes URA$/i.test(clean($('h1').first().text())))throw new Error('No se reconoce la página de empleo vigente de URA');
 const listings:Listing[]=[];
 $('.r01-editor h2').each((_,node)=>{
  const title=clean($(node).text());
  if(/turno restringido|promoci[oó]n interna|traslado/i.test(title))return;
  const section=$(node).nextUntil('h2');
  const documents=section.find('a[href]').toArray().filter(link=>/^Anuncio\b/i.test(clean($(link).text())));
  const raw=documents[0]?$(documents[0]).attr('href'):undefined;
  const documentUrl=raw?canonical(raw,URA_JOBS):null;
  if(!documentUrl||!/^https:\/\/www\.uragentzia\.euskadi\.eus\/contenidos\/informacion\/empleo_vigentes\/es_doc\/adjuntos\/[a-z0-9_-]+\.docx$/i.test(documentUrl))throw new Error(`Anuncio DOCX no identificado para ${title}`);
  listings.push({title,documentUrl});
 });
 if(new Set(listings.map(item=>item.documentUrl)).size!==listings.length)throw new Error('Anuncios duplicados en URA');
 return listings;
}

async function readDocx(client:OfficialClient,url:string):Promise<{text:string;sha256:string}>{
 const response=await client.get(url);
 if(!response.body.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])))throw new Error('El anuncio de URA no es un DOCX');
 const dir=await mkdtemp(join(tmpdir(),'oposaketia-ura-'));
 try{
  const file=join(dir,'source.docx');await writeFile(file,response.body);
  const {stdout}=await execFileAsync('unzip',['-p',file,'word/document.xml'],{timeout:20000,maxBuffer:2_000_000});
  const $=load(stdout,{xmlMode:true});
  const text=$('w\\:p').map((_,p)=>$(p).find('w\\:t').map((_,t)=>$(t).text()).get().join('')).get().join('\n');
  if(text.length<500)throw new Error('El anuncio DOCX de URA está vacío');
  return {text,sha256:hash(response.body)};
 }finally{await rm(dir,{recursive:true,force:true});}
}

export function parseUraDirector(listing:Listing,text:string,sha256:string,now:string):Call{
 if(listing.title!=='Director de Obras y Planificación'||!/URAREN EUSKAL AGENTZIA-\s*AGENCIA VASCA DEL AGUA/i.test(text.slice(0,500)))throw new Error('Anuncio de URA pendiente de revisión');
 if(!/Ámbito: Agencia Vasca del Agua — URA instalaciones de Vitoria-Gasteiz/i.test(text)||!/TITULACI[ÓO]N universitaria en Ingenier[ií]a de Caminos, Canales y Puertos, Geolog[ií]a, Ciencias Ambientales, Ingenier[ií]a Industrial/i.test(text))throw new Error('Destino o titulación de URA no reconocidos');
 if(!/experiencia profesional de al menos 5 a[nñ]os/i.test(text)||!/Euskera: Perfil Ling[üu][ií]stico 3/i.test(text))throw new Error('Requisitos de URA no reconocidos');
 const call=baseCall('ura',URA_JOBS,now,'Euskadi');
 call.id=stableId('ura',listing.documentUrl);call.title='Director/a del Área de Planificación y Obras';
 call.organization='Agencia Vasca del Agua · URA';call.location='Vitoria-Gasteiz';call.province='Araba / Álava';
 call.category='Administración';call.places=1;call.deadline=null;call.status='Pendiente de confirmar';
 call.educationText='Titulación universitaria en Ingeniería de Caminos, Canales y Puertos, Geología, Ciencias Ambientales, Ingeniería Industrial u otra equivalente o relacionada con las funciones del puesto.';
 call.requirements=[call.educationText,'Experiencia profesional mínima de cinco años en ámbitos relacionados con el agua.','Euskera: perfil lingüístico 3; inglés: conversación fluida.'];
 call.description='Oferta propia publicada en los procesos vigentes de URA. El anuncio oficial describe el perfil, pero no proporciona una fecha absoluta de cierre ni un temario de oposición; consulta la oferta enlazada desde la página oficial para confirmar la inscripción.';
 call.sourceHash=sha256;call.documents=[{title:'Anuncio oficial y perfil del puesto (DOCX)',url:listing.documentUrl,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeUra(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseUraJobs(await client.text(URA_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{const document=await readDocx(client,listing.documentUrl);calls.push(parseUraDirector(listing,document.text,document.sha256,now));}
  catch(error){warn(`${listing.documentUrl}: ${error instanceof Error?error.message:'Anuncio no disponible'}`);}
 }
 return calls;
}
