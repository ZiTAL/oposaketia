import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,linkList,stableId} from './shared';

export const BALUARTE_LIST='https://www.fundacionbaluarte.com/es/transparencia';
export function parseBaluarteSelection(html:string,now:string):Call[]{
  const $=load(html),section=$('.subseccion-item').filter((_,node)=>normalize(clean($(node).find('.subseccion-toggle').text()))==='procesos de seleccion').first().find('.subseccion-content');
  if(!section.length)throw new Error('Baluarte selection section is not recognized');
  const links=linkList(load($.html(section)),'a[href]',BALUARTE_LIST).filter(link=>{
    const url=new URL(link.url);
    return ['www.fundacionbaluarte.com','fundacionbaluarte.com'].includes(url.hostname)&&/\.pdf$/i.test(url.pathname)&&/^(?:convocatoria|bases|proceso de selecci[oó]n)\b/i.test(link.title)&&!/admitid|excluid|resultado|puntuaci|seleccionad/i.test(link.title+' '+url.pathname);
  });
  if(!links.length){
    if(/actualmente no hay procesos de seleccion abiertos/.test(normalize(clean(section.text()))))return [];
    throw new Error('Baluarte selection content changed; manual review required');
  }
  return links.map(link=>{
    const call=baseCall('baluarte',BALUARTE_LIST,now,'Navarra');call.id=stableId('baluarte',link.url);
    call.title=link.title;call.organization='Fundación Baluarte';call.location='Navarra';call.province='Navarra';call.category=categoryFor(call.title);
    call.description='Proceso publicado en el apartado de selección de la Fundación Baluarte. Consulta el documento oficial para conocer los puestos, los requisitos y las fechas de inscripción.';
    call.documents=[{...link,kind:'bases',checkedAt:null,sha256:null}];call.sourceHash=hash($.html(section));
    return callSchema.parse(call);
  });
}
export async function scrapeBaluarte(client:OfficialClient,now:string):Promise<Call[]>{
  return parseBaluarteSelection(await client.text(BALUARTE_LIST),now);
}
