import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,educationIds,stableId} from './shared';

export const ETS_CALL='https://www.ets-rfv.euskadi.eus/noticia/2022/ets-lanza-una-convocatoria-externa-para-personal-de-circulacion-puesto-de-mando-y-gestion-de-red/webets00-general/es/';

export function parseEtsCall(html:string,now:string):Call{
 const $=load(html),article=$('article.r01-news');
 if(article.length!==1||clean(article.find('h1.r01-h1').text())!=='ETS lanza una convocatoria externa para personal de circulación, puesto de mando y gestión de red')throw new Error('Convocatoria externa de ETS no identificada');
 const text=clean(article.text());
 if(!/Fecha de publicación:\s*05\/12\/2022/.test(text)||!/Euskal Trenbide Sarea, ente público/.test(text))throw new Error('Fecha o entidad de ETS no identificadas');
 if(!/Bolsa de Personas Candidatas/.test(text)||!/bolsa de un máximo de 125 personas/i.test(text))throw new Error('Naturaleza de la bolsa de ETS no identificada');
 if(!/FPII o su equivalente actual \(FP Ciclo Formativo de Grado Superior\) en cualquier especialidad, o de Bachiller/.test(text))throw new Error('Titulación de ETS no identificada');
 if(!/Euskera nivel B2 \(PL2\) o equivalente/.test(text)||!/superar una prueba oral con nivel de referencia B2/.test(text))throw new Error('Requisito de euskera de ETS no identificado');
 if(!/candidaturas se podrán presentar hasta el próximo 26 de diciembre/.test(text)||!/Prueba técnica basada en el reglamento de circulación y señales/.test(text))throw new Error('Plazo o prueba de ETS no identificados');
 const call=baseCall('ets',ETS_CALL,now,'Euskadi');
 call.id=stableId('ets',ETS_CALL);call.title='Bolsa de personal de circulación, puesto de mando y gestión de red';
 call.organization='Euskal Trenbide Sarea';call.category='Servicios';call.places=null;
 call.educationText='FPII o FP de Grado Superior en cualquier especialidad, o Bachiller.';
 call.acceptedQualifications=educationIds(call.educationText);
 call.language={name:'euskera',level:'B2'};call.languageStatus='known';
 call.deadline='2022-12-26';call.status='Cerrada';
 call.requirements=[call.educationText,'Euskera B2/PL2 acreditado o superación de prueba oral de nivel B2.'];
 call.description='Convocatoria externa para una bolsa de hasta 125 candidatos, sin número fijo de plazas. Incluye prueba técnica sobre el reglamento de circulación y señales, prueba psicotécnica y entrevista. El material de estudio citado no tiene enlace directo en la noticia.';
 call.sourceHash=hash(html);
 return callSchema.parse(call);
}

export async function scrapeEts(client:OfficialClient,now:string):Promise<Call[]>{
 return [parseEtsCall(await client.text(ETS_CALL),now)];
}
