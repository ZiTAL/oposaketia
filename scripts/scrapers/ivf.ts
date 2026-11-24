import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,clean,parseDate,pdfText,stableId} from './shared';

export const IVF_JOBS='https://www.ivf-fei.euskadi.eus/informacion/ivf/transparencia/webivf00-cnt/es/';
const profiles=[
 {url:'https://www.euskadi.eus/web01-sedeopec/es/contenidos/empleo_publico/ivf_participadas_jun26/es_def/index.shtml',title:'Técnico/a analista de participadas',deadline:'2026-07-01',places:1},
 {url:'https://www.euskadi.eus/empleo_publico/tecnicoa-analista-de-fondos-y-participadas/web01-sedeopec/es/',title:'Técnico/a analista de fondos y participadas',deadline:'2025-10-13',places:1},
 {url:'https://www.euskadi.eus/empleo_publico/tecnicoa-analista-de-participadas/ivf/web01-sedeopec/es/',title:'Técnico/a analista de participadas',deadline:'2025-02-19',places:2},
] as const;
type Profile=typeof profiles[number];

export function parseIvfCall(profile:Profile,html:string,now:string):{call:Call;basesUrl:string|null}{
 const $=load(html);
 const title=clean($('.r01gCabeceraTitle h2').text());
 const dateText=clean($('.r01gContetnSateDate').text());
 const dates=dateText.match(/\b\d{2}\/\d{2}\/\d{4}\b/g)??[];
 const location=clean($('.r01gEventPlace').text());
 const sections=$('#body_resumen .r01gContentTabSeccion');
 const content=(label:RegExp)=>{
  const found=sections.filter((_,node)=>label.test(normalize(clean($(node).find('.r01gContentSeccionTitulo').first().text()))));
  if(found.length!==1)throw new Error(`Campo ${label} ausente o duplicado en el IVF`);
  return found.find('.r01gContentSeccionTexto').first();
 };
 const field=(label:RegExp)=>clean(content(label).text());
 const issuer=field(/^[¿?]?quien oferta/),post=field(/^plaza:/),places=Number(field(/^(?:n|nº) plazas:/));
 const educationContent=content(/^titulacion:/);
 educationContent.find('br').replaceWith('; ');
 const education=(educationContent.find('p,li').length?educationContent.find('p,li').map((_,node)=>clean($(node).text())).get().filter(Boolean).join('; '):clean(educationContent.text())).split(';').map(part=>part.trim().replace(/^[•o]\s+/,'')).filter(Boolean).join('; ').replace(/:; /g,': ');
 const languages=field(/^perfil linguistico:/),other=field(/^otros requisitos:/);
 if(title!==profile.title||post!==profile.title||normalize(issuer)!=='instituto vasco de finanzas')throw new Error('La ficha no corresponde al Instituto Vasco de Finanzas');
 if(dates.length!==2||parseDate(dates[1])!==profile.deadline||places!==profile.places||!/Bilbao.*Bizkaia/.test(location))throw new Error('Plazas, destino o plazo del IVF no identificados');
 if(!/grado o licenciatura/i.test(education)||!/econom[ií]a/i.test(education)||!/finanzas|financiera/i.test(education))throw new Error('Titulaciones del IVF no identificadas');
 if(!/No preceptivos:\s*-?\s*Euskera \(se valorar[aá] hasta PL3\)/i.test(languages)||!/Preceptivo:\s*-?\s*Ingl[eé]s \(PL2\)/i.test(languages))throw new Error('Perfiles lingüísticos del IVF no identificados');
 if(!/Experiencia laboral en puesto similar de un m[ií]nimo de 2 a[nñ]os/i.test(other))throw new Error('Experiencia mínima del IVF no identificada');
 const pdfLinks=$('#body_convocatoria a[href]').filter((_,node)=>/^BASES\s*\(PDF/i.test(clean($(node).text()))).map((_,node)=>canonical($(node).attr('href')!,profile.url)).get();
 if(pdfLinks.length>1)throw new Error('Bases PDF duplicadas en el IVF');
 const basesUrl=pdfLinks[0]??null;
 if(basesUrl&&!basesUrl.startsWith('https://www.euskadi.eus/contenidos/empleo_publico/'))throw new Error('Bases del IVF fuera del portal oficial');
 const call=baseCall('ivf',profile.url,now,'Euskadi');
 call.id=stableId('ivf',profile.url);call.title=title;call.organization='Instituto Vasco de Finanzas';
 call.location='Bilbao';call.province='Bizkaia';call.category='Administración';call.places=places;
 call.educationText=education;call.deadline=profile.deadline;call.status='Cerrada';
 call.requirements=[education,'Inglés PL2 preceptivo; euskera hasta PL3 valorable como mérito.','Experiencia laboral mínima de dos años en puesto similar.'];
 call.description='Oferta de contratación indefinida del Instituto Vasco de Finanzas. El plazo de inscripción está cerrado. No se publica un temario de examen en esta ficha.';
 call.sourceHash=hash(html);
 return {call:callSchema.parse(call),basesUrl};
}

export async function scrapeIvf(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls:Call[]=[];
 for(const profile of profiles){
  try{
   const {call,basesUrl}=parseIvfCall(profile,await client.text(profile.url),now);
   if(basesUrl){const pdf=await pdfText(client,basesUrl);call.documents=[{title:'Bases de la convocatoria',url:basesUrl,kind:'bases',checkedAt:now,sha256:pdf.sha256}];}
   calls.push(callSchema.parse(call));
  }catch(error){warn(`${profile.url}: ${error instanceof Error?error.message:'Ficha no disponible'}`);}
 }
 if(!calls.length)throw new Error('No hay ofertas verificadas del Instituto Vasco de Finanzas');
 return calls;
}
