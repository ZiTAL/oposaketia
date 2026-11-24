import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const MOBILITY_LAB_JOBS='https://www.qualisconsultores.es/oferta-publica-de-empleo-procesos-en-curso';
const profiles={
 '202601mobilitylab':{title:'Técnico/a de innovación',places:2,deadline:'2026-04-12',education:'Licenciatura o grado en Ingeniería, ADE, Marketing, Comunicación, Relaciones Internacionales, Economía o titulación similar.',basque:'B2' as const,english:'B2'},
 '202602mobilitylab':{title:'Técnico/a analista de datos',places:1,deadline:'2026-06-18',education:'Grado universitario o equivalente en ingeniería, matemáticas, informática, logística, ADE, arquitectura o área similar.',basque:'C1' as const,english:'B2'},
 '202603mobilitylab':{title:'Técnico/a de proyectos europeos',places:1,deadline:'2026-06-18',education:'Licenciatura o grado en Ingeniería, logística, arquitectura o titulación similar.',basque:null,english:'C1'},
} as const;
type Code=keyof typeof profiles;
type Listing={code:Code;generalUrl:string;specificUrl:string};

export function parseMobilityLabIndex(html:string):Listing[]{
 const $=load(html);
 if(!/OFERTA PÚBLICA DE EMPLEO: PROCESOS EN CURSO/i.test(clean($('h2').text())))throw new Error('No se reconoce el tablón delegado de Mobility Lab');
 return (Object.keys(profiles) as Code[]).map(code=>{
  const headings=$('h3').filter((_,node)=>new RegExp(`^FUNDACIÓN VITORIA [–-] GASTEIZ ARABA MOBILITY LAB:.*REF\\. ${code}$`,'i').test(clean($(node).text())));
  if(headings.length!==1||/PROMOCI[ÓO]N INTERNA/i.test(clean(headings.text())))throw new Error(`Proceso externo ${code} ausente o restringido`);
  const block=headings.closest('.wpb_text_column').nextAll('.wpb_text_column').first();
  const link=(label:RegExp)=>{
   const anchors=block.find('a[href]').filter((_,node)=>label.test(clean($(node).text())));
   if(anchors.length!==1)throw new Error(`Bases ${label} de ${code} ausentes o duplicadas`);
   const url=canonical(anchors.attr('href')!.trim(),MOBILITY_LAB_JOBS);
   if(!url||!/^https:\/\/www\.qualisconsultores\.es\/wp-content\/uploads\/2026\/\d{2}\/.+\.pdf$/.test(url))throw new Error(`PDF de ${code} fuera del portal delegado`);
   return url;
  };
  return {code,generalUrl:link(/^Bases Generales/),specificUrl:link(/^Bases Específicas/)};
 });
}

export function parseMobilityLabBases(listing:Listing,generalText:string,specificText:string,generalHash:string,specificHash:string,now:string):Call{
 const profile=profiles[listing.code],general=clean(generalText),specific=clean(specificText);
 for(const text of [general,specific])if(!text.includes(`código de convocatoria: ${listing.code}`)||!/FUNDACIÓN VITORIA-GASTEIZ ARABA MOBILITY LAB/i.test(text))throw new Error('Bases de Mobility Lab no identificadas');
 const date=listing.code==='202601mobilitylab'?/plazo de presentación de solicitudes será hasta el 12 de abril de 2026/i:/plazo de presentación de solicitudes será hasta el 18 de junio de 2026/i;
 if(!date.test(general)||!date.test(specific))throw new Error('Plazos de Mobility Lab no coinciden');
 if(!/Parque Tecnológico de (?:Álava|Vitoria-Gasteiz)/i.test(general))throw new Error('Destino de Mobility Lab no identificado');
 const mandatory=specific.slice(specific.indexOf('FASE 1:'),specific.indexOf('FASE 2'));
 if(listing.code==='202601mobilitylab'&&(!/cobertura de dos puestos de trabajo de Técnico\/a de Innovación/i.test(general)||!/DOS PUESTOS DE TÉCNICO\/A DE INNOVACIÓN/i.test(specific)||!['Ingeniería','ADE','Marketing','Comunicación','Relaciones Internacionales','Economía'].every(word=>mandatory.includes(word))||!/Euskera\s*[–-]\s*B2/i.test(mandatory)||!/Inglés\s*[–-]\s*B2/i.test(mandatory)))throw new Error('Plazas o requisitos de innovación no identificados');
 if(listing.code==='202602mobilitylab'&&(!/cobertura de un puesto de:\s*Técnica\/o Analista de Datos/i.test(general)||!/COBERTURA DE UN PUESTO DE TÉCNICO\/A ANALISTA DE DATOS/i.test(specific)||!['ingeniería','matemáticas','informática','logística','ADE','arquitectura'].every(word=>mandatory.includes(word))||!/Euskera\s*[–-]\s*C1/i.test(mandatory)||!/Inglés\s*[–-]\s*B2/i.test(mandatory)))throw new Error('Plaza o requisitos de datos no identificados');
 if(listing.code==='202603mobilitylab'&&(!/cobertura de un puesto de:\s*Técnica\/o Proyectos Europeos/i.test(general)||!/PUESTO DE TÉCNICO\/A DE PROYECTOS EUROPEOS/i.test(specific)||!/Ingeniería, logística, arquitectura o similares/i.test(specific)||!/Inglés\s*[–-]\s*C1/i.test(specific)||!/Idiomas:\s*Euskera\s*C1 \/C2 \(5 puntos\)/i.test(specific)))throw new Error('Plaza o requisitos europeos no identificados');
 const call=baseCall('mobility-lab',listing.specificUrl,now,'Euskadi');
 call.id=stableId('mobility-lab',listing.code);call.title=profile.title;call.organization='Vitoria-Gasteiz Araba Mobility Lab';
 call.location='Vitoria-Gasteiz';call.province='Araba / Álava';call.category='Servicios';call.places=profile.places;
 call.educationText=profile.education;call.language=profile.basque?{name:'euskera',level:profile.basque}:null;call.languageStatus='known';
 call.deadline=profile.deadline;call.status='Cerrada';
 call.requirements=[profile.education,`Inglés ${profile.english} preceptivo.`,profile.basque?`Euskera ${profile.basque} preceptivo.`:'Euskera C1/C2 valorable como mérito, no requisito obligatorio.'];
 call.description='Proceso de selección de personal de la Fundación, con inscripción cerrada. Las bases detallan requisitos, méritos, prueba de adecuación y entrevista; no publican un temario de examen.';
 call.sourceHash=hash(generalHash+specificHash);
 call.documents=[{title:`Bases generales ${listing.code}`,url:listing.generalUrl,kind:'bases',checkedAt:now,sha256:generalHash},{title:`Bases específicas ${listing.code}`,url:listing.specificUrl,kind:'bases',checkedAt:now,sha256:specificHash}];
 return callSchema.parse(call);
}

export async function scrapeMobilityLab(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseMobilityLabIndex(await client.text(MOBILITY_LAB_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{const general=await pdfText(client,listing.generalUrl),specific=await pdfText(client,listing.specificUrl);calls.push(parseMobilityLabBases(listing,general.text,specific.text,general.sha256,specific.sha256,now));}
  catch(error){warn(`${listing.code}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay plazas externas verificadas de Mobility Lab');
 return calls;
}
