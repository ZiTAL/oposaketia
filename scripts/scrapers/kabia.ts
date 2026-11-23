import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, categoryFor } from './shared';
export const KABIA_LIST='https://egoitza.gipuzkoa.eus/WAS/CORP/LLEHautaketaProzesuakWEB/kabia?locale=es';
export function parseKabiaList(html:string,now:string):Call[] {
  const $=load(html);
  return $('tr.filaconvo').toArray().flatMap(row=>{
    const cells=$(row).find('td'),link=cells.first().find('a[href]').first(),href=link.attr('href'),title=clean(link.text());
    if (!href || !title || /traslado|promocion interna|concursillo/.test(normalize(title))) return [];
    const url=new URL(href,KABIA_LIST);
    if(url.origin!==new URL(KABIA_LIST).origin || !/\/kabia\/\d+\/[01]\/ver$/.test(url.pathname))return [];
    url.search='';url.searchParams.set('locale','es');
    const phase=clean(cells.eq(1).text()),normalized=normalize(phase);
    const call=baseCall('kabia',url.href,now,'Euskadi');
    call.title=title;call.organization='Kabia';call.province='Gipuzkoa';call.location='Gipuzkoa';call.category=categoryFor(title);
    call.status=/nombramiento|contratacion personal laboral fijo|definitiva seleccionados/.test(normalized)?'Cerrada':/examen|resultado|admitid|adjudicacion/.test(normalized)?'En curso':'Pendiente de confirmar';
    call.description=`Proceso publicado en la sede oficial de Kabia. ${phase?`Fase publicada: ${phase}. `:''}Consulta las bases para conocer los requisitos y las fechas. No se presupone que admita nuevas inscripciones.`;
    call.sourceHash=hash($.html(row));return [callSchema.parse(call)];
  });
}
export async function scrapeKabia(client:OfficialClient,now:string):Promise<Call[]> {
  const calls=parseKabiaList(await client.text(KABIA_LIST),now);
  if(!calls.length)throw new Error('No se reconocen procesos de Kabia');
  return calls;
}
