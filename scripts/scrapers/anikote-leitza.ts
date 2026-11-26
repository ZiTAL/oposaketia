import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ANIKOTE_NOTICE='https://www.leitza.eus/eu/2026/06/10/anikoteko-gerente-lanpostua-betetzeko-deialdia/';
export const ANIKOTE_BASES='https://www.leitza.eus/wp-content/uploads/2026/06/Anikoteko-gerente-lanposturako-deialdia.-2026ko-ekaina.pdf';

export function parseAnikoteLeitza(noticeHtml:string,basesText:string,basesHash:string,now:string):Call{
  const $=load(noticeHtml);
  const notice=clean($('.post_content[itemprop="text"]').first().text());
  const linked=$('a[href]').toArray().some(node=>$(node).attr('href')===ANIKOTE_BASES);
  const bases=clean(basesText);
  if(clean($('h1.entry-title').first().text())!=='ANIKOTEKO GERENTE LANPOSTUA BETETZEKO DEIALDIA'
    ||$('time[itemprop="datePublished"]').first().attr('datetime')?.slice(0,10)!=='2026-06-10'
    ||!linked
    ||!notice.includes('Anikote Leitza S.L.-k gerente lanpostua betetzeko deialdia egin du')
    ||!notice.includes('izena emateko epea 10 egun naturalekoa izanen da')
    ||!bases.includes('ANIKOTE LEITZA S.L. UDALAREN SOZIETATE PUBLIKOKO')
    ||!bases.includes('Diplomatura, Lizentziatura edo Unibertsitate Gradua')
    ||!bases.includes('Euskararen ezagutza: hautagaiek C1 maila')
    ||!bases.includes('Izangaiek proba praktiko bat egin beharko dute Sozietatearen plangintzaz eta')
    ||!bases.includes('Eskabideak aurkezteko epea, argitaratzen denetik, 10 egun naturalekoa izanen da'))throw new Error('Anikoteko udal-iragarkia edo oinarriak aldatu dira');

  const call=baseCall('anikote-leitza',ANIKOTE_NOTICE,now,'Navarra');
  call.id=stableId('anikote-leitza','2026-06-10-gerente');
  call.title='Gerente · sustitución por excedencia';
  call.organization='Anikote Leitza S.L.';call.location='Leitza';call.province='Navarra';
  call.category='Administración';call.places=1;
  call.educationText='Diplomatura, Licenciatura, Grado universitario o equivalente, sin especialidad obligatoria.';
  call.acceptedQualifications=['grado'];
  call.language={name:'euskera',level:'C1'};call.languageStatus='known';
  call.deadline=null;call.status='Cerrada';
  call.requirements=[call.educationText,'Euskera C1 acreditado o superación de la prueba específica.'];
  call.description='Plaza de gerencia en la sociedad pública municipal para sustituir una excedencia voluntaria. La inscripción duraba diez días naturales desde la publicación municipal de 10/06/2026. Las bases describen una prueba práctica de planificación y gestión deportiva y su defensa oral, pero no publican un temario numerado.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(noticeHtml+basesHash);
  call.documents=[{title:'Deialdia eta oinarriak · 2026/06',url:ANIKOTE_BASES,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeAnikoteLeitza(client:OfficialClient,now:string):Promise<Call[]>{
  const notice=await client.text(ANIKOTE_NOTICE);
  const bases=await pdfText(client,ANIKOTE_BASES);
  return [parseAnikoteLeitza(notice,bases.text,bases.sha256,now)];
}
