import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const ELANKIDETZA_JOBS='https://www.elankidetza.euskadi.eus/proceso-especial-de-consolidacion-de-empleo/webela01-edukiconsolidacion/es/';
const profiles={
 admin:{label:'Administrativo/a general',path:'/administrativo/avcd/webela01-edukiconsolidacion/es/',pdfPath:'consolidacion_adm',title:'Administrativo/a general',places:2,group:'C',category:'Administración',education:'Título de Bachiller, Técnico o equivalente.'},
 cooperation:{label:'Técnico/a de cooperación',path:'/tecnico-cooperacion/webela01-edukiconsolidacion/es/',pdfPath:'consolidacion_tek_coop',title:'Técnico/a de cooperación',places:1,group:'A',category:'Servicios',education:'Grado, licenciatura, ingeniería o arquitectura de cualquier campo de estudio.'},
 it:{label:'Técnico/a informático/a',path:'/tecnico-en-informatica/avcd/webela01-edukiconsolidacion/es/',pdfPath:'consolidacion_tek_inf',title:'Técnico/a informático/a',places:1,group:'A',category:'Servicios',education:'Grado, licenciatura o ingeniería en bases de datos, software, inteligencia artificial, informática, ingeniería de computadores, telecomunicación, sonido e imagen, electrónica o matemáticas.'},
} as const;
type Key=keyof typeof profiles;
type Listing={key:Key;pageUrl:string};

export function parseElankidetzaIndex(html:string):Listing[]{
 const $=load(html),text=clean($.root().text());
 if(!text.includes('Proceso especial de consolidación de empleo')||!/concurso de méritos de 4 puestos/i.test(text))throw new Error('No se reconoce la OPE de eLankidetza');
 return (Object.keys(profiles) as Key[]).map(key=>{
  const profile=profiles[key],links=$(`a[href="${profile.path}"]`).filter((_,node)=>clean($(node).text())===profile.label);
  if(links.length!==1)throw new Error(`Ficha ${profile.label} ausente o duplicada`);
  const pageUrl=canonical(profile.path,ELANKIDETZA_JOBS);
  if(!pageUrl)throw new Error('URL de eLankidetza inválida');
  return {key,pageUrl};
 });
}

export function parseElankidetzaDetail(listing:Listing,html:string):string{
 const $=load(html),text=clean($.root().text());
 if(!text.includes(profiles[listing.key].title)||!/29\/12\/2022\s*-\s*26\/01\/2023/.test(text))throw new Error('Ficha o plazo de eLankidetza no identificados');
 const links=$('a[href]').filter((_,node)=>/^\(Anexo [IVX]+\) \(PDF/i.test(clean($(node).text()))).map((_,node)=>canonical($(node).attr('href')!,listing.pageUrl)).get();
 const basesUrl=`https://www.elankidetza.euskadi.eus/contenidos/informacion/${profiles[listing.key].pdfPath}/es_def/adjuntos/boletin_cast.pdf`;
 if(links.length!==2||links.some(url=>url!==basesUrl))throw new Error('Las bases generales o específicas de eLankidetza han cambiado');
 return basesUrl;
}

export function parseElankidetzaBases(listing:Listing,basesUrl:string,text:string,sha256:string,now:string):Call{
 const profile=profiles[listing.key],normalized=clean(text);
 if(!normalized.includes('2022/5691')||!/Agencia Vasca de Cooperación para el Desarrollo/i.test(normalized)||!/ANEXO II/.test(normalized)||!/ANEXO III/.test(normalized))throw new Error('Boletín de eLankidetza no identificado');
 if(!/concurso de méritos/i.test(normalized)||!/dos puestos de Administrativo\/a General, un puesto de Técnico\/a Informático\/a y un puesto de Técnico\/a de Cooperación/i.test(normalized))throw new Error('Sistema o plazas de eLankidetza no identificados');
 const admin=normalized.slice(normalized.indexOf('ANEXO II'),normalized.indexOf('ANEXO III'));
 const technical=normalized.slice(normalized.indexOf('ANEXO III'));
 if(listing.key==='admin'&&(!/título de Bachiller, de Técnico o equivalente/i.test(admin)||!/Administrativo\/a General\s+2\s+05-2019\s+1/i.test(admin)))throw new Error('Requisitos administrativos no identificados');
 if(listing.key==='cooperation'&&(!/Técnico\/a de Cooperación\s+4\s+12-2010\s+1/i.test(technical)||!/Técnico\/a de Cooperación es requisito disponer de una titulación de grado, licenciatura, ingeniería y arquitectura de cualquier campo de estudio/i.test(technical)))throw new Error('Requisitos de cooperación no identificados');
 if(listing.key==='it'&&(!/Técnico\/a Informático\/a\s+3\s+1/i.test(technical)||!/Técnico\/a Informático\/a es requisito disponer de una titulación de grado, licenciatura o ingeniería/i.test(technical)||!/Ingeniería de telecomunicación/i.test(technical)))throw new Error('Requisitos informáticos no identificados');
 const call=baseCall('elankidetza',listing.pageUrl,now,'Euskadi');
 call.id=stableId('elankidetza',listing.pageUrl);call.title=profile.title;call.organization='eLankidetza';
 call.category=profile.category;call.group=profile.group;call.places=profile.places;call.educationText=profile.education;
 call.deadline='2023-01-26';call.status='Cerrada';
 const language=listing.key==='admin'?{name:'euskera' as const,level:'B2' as const}:listing.key==='cooperation'?{name:'euskera' as const,level:'C2' as const}:null;
 call.language=language;call.languageStatus=language?'known':'unknown';
 call.requirements=[profile.education,listing.key==='it'?'Perfil lingüístico 3 de euskera sin fecha de preceptividad en esta plaza.':`Perfil lingüístico ${listing.key==='admin'?'2':'4'} de euskera preceptivo.`];
 call.description='Proceso extraordinario de estabilización por concurso de méritos, con inscripción cerrada. Las bases incluyen el baremo, sin temario de examen.';
 call.sourceHash=sha256;call.documents=[{title:'Resolución 2022/5691 y bases generales y específicas',url:basesUrl,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeElankidetza(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseElankidetzaIndex(await client.text(ELANKIDETZA_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{const basesUrl=parseElankidetzaDetail(listing,await client.text(listing.pageUrl));const bases=await pdfText(client,basesUrl);calls.push(parseElankidetzaBases(listing,basesUrl,bases.text,bases.sha256,now));}
  catch(error){warn(`${listing.pageUrl}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay plazas verificadas de eLankidetza');
 return calls;
}
