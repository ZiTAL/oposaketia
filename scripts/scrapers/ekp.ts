import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,pdfText,stableId} from './shared';

export const EKP_JOBS='https://www.qualisconsultores.es/oferta-publica-de-empleo-procesos-en-curso';
const profiles={
 '2026001ekp':{title:'Auxiliar administrativo/a de puertos',job:'Auxiliar Administrativo/a',deadline:'2026-04-09',location:'Mutriku',education:'Grado Medio en Administración y Finanzas, gestión administrativa, asistencia a la dirección o similar.',experience:'Experiencia mínima de seis meses en los últimos cuatro años en funciones administrativas.'},
 '2026002ekp':{title:'Responsable de explotación portuaria',job:'Responsable de Explotación Portuaria',deadline:'2026-07-19',location:'Donostia / Getaria / Orio',education:'Grado universitario o Grado Superior de Formación Profesional naval, de procesos, organización o titulación equivalente.',experience:'Titulación náutica, conocimientos ofimáticos avanzados, mecánica y electricidad básicas y permiso de conducir B.'},
} as const;
type Code=keyof typeof profiles;
type Listing={code:Code;basesUrl:string};

export function parseEkpIndex(html:string):Listing[]{
 const $=load(html);
 if(!/OFERTA PÚBLICA DE EMPLEO: PROCESOS EN CURSO/i.test(clean($('h2').text())))throw new Error('No se reconoce el tablón de procesos públicos de Qualis');
 return (Object.keys(profiles) as Code[]).map(code=>{
  const headings=$('h3').filter((_,node)=>new RegExp(`^EUSKADIKO KIROL PORTUAK(?: \\(EKP\\))?:.*REF\\. ${code}$`,'i').test(clean($(node).text())));
  if(headings.length!==1)throw new Error(`Proceso ${code} ausente o duplicado`);
  const block=headings.closest('.wpb_text_column').nextAll('.wpb_text_column').first();
  const bases=block.find('a[href]').filter((_,node)=>/^Bases Generales y Específicas/i.test(clean($(node).text())));
  if(bases.length!==1)throw new Error(`Bases de ${code} ausentes o duplicadas`);
  const basesUrl=canonical(bases.attr('href')!.trim(),EKP_JOBS);
  if(!basesUrl||!/^https:\/\/www\.qualisconsultores\.es\/wp-content\/uploads\/2026\/\d{2}\/.+\.pdf$/.test(basesUrl))throw new Error(`PDF de ${code} fuera del portal delegado`);
  return {code,basesUrl};
 });
}

export function parseEkpBases(listing:Listing,text:string,sha256:string,now:string):Call{
 const profile=profiles[listing.code],content=clean(text);
 if(!content.includes(`código de convocatoria: ${listing.code}`)||!/al servicio de Euskadiko Kirol Portuak/i.test(content))throw new Error('Bases de EKP no identificadas');
 if(!content.toLowerCase().includes(`cobertura de un puesto de ${profile.job}`.toLowerCase()))throw new Error('Puesto o plaza de EKP no identificado');
 const deadline=listing.code==='2026001ekp'?/plazo de presentación de solicitudes será hasta el 9 de abril de 2026/i:/plazo de presentación de solicitudes será hasta el 19 de julio de 2026/i;
 if(!deadline.test(content))throw new Error('Plazo de EKP no identificado');
 if(!/Euskera Nivel PL-2 o B2 o equivalente/i.test(content)||!/Permiso de conducir/i.test(content))throw new Error('Euskera o permiso B de EKP no identificados');
 if(listing.code==='2026001ekp'&&(!/puerto deportivo de Mutriku/i.test(content)||!/Formación: Grado Medio en Administración y Finanzas, gestión administrativa, asistencia a la dirección o similar/i.test(content)||!/Experiencia mínima de 6 meses/i.test(content)))throw new Error('Destino o requisitos de auxiliar EKP no identificados');
 if(listing.code==='2026002ekp'&&(!/puertos deportivos de Donostia\s*[–-]\s*Getaria\s*[–-]\s*Orio/i.test(content)||!/Formación: Grado universitario o Grado Superior Formación Profesional \(naval, de procesos, organización y\/o titulaciones equivalentes\)/i.test(content)||!/poseer algún tipo de titulación náutica/i.test(content)))throw new Error('Destino o requisitos portuarios de EKP no identificados');
 const call=baseCall('ekp',listing.basesUrl,now,'Euskadi');
 call.id=stableId('ekp',listing.code);call.title=profile.title;call.organization='Euskadiko Kirol Portuak';
 call.location=profile.location;call.province='Gipuzkoa';call.category=listing.code==='2026001ekp'?'Administración':'Servicios';call.places=1;
 call.educationText=profile.education;call.language={name:'euskera',level:'B2'};call.languageStatus='known';
 call.deadline=profile.deadline;call.status='Cerrada';
 call.requirements=[profile.education,'Euskera B2/PL2 acreditado.',profile.experience,'Permiso de conducir B.'];
 call.description='Proceso selectivo de personal laboral de EKP, con inscripción cerrada. Las bases describen evaluación de requisitos, méritos, prueba psicométrica y entrevista; no incluyen un temario de examen.';
 call.sourceHash=sha256;call.documents=[{title:`Bases generales y específicas ${listing.code}`,url:listing.basesUrl,kind:'bases',checkedAt:now,sha256}];
 return callSchema.parse(call);
}

export async function scrapeEkp(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseEkpIndex(await client.text(EKP_JOBS)),calls:Call[]=[];
 for(const listing of listings){
  try{const pdf=await pdfText(client,listing.basesUrl);calls.push(parseEkpBases(listing,pdf.text,pdf.sha256,now));}
  catch(error){warn(`${listing.basesUrl}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
 }
 if(!calls.length)throw new Error('No hay plazas verificadas de EKP');
 return calls;
}
