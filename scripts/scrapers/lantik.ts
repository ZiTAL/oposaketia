import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, linkList } from './shared';

export const LANTIK_LIST='https://lantik.bizkaia.eus/es/empleo';
export function parseLantikList(html:string,now:string):Call[] {
  const $=load(html);
  return $('.empleo').toArray().flatMap(node=>{
    const card=$(node),link=card.find('.detalles h3 a[href]').first();
    const raw=link.attr('href'),title=clean(link.text());
    if (!raw || !title) return [];
    const url=canonical(raw,LANTIK_LIST);
    if (!url || new URL(url).hostname!=='lantik.bizkaia.eus') return [];
    const call=baseCall('lantik',url,now,'Euskadi');
    call.title=title;call.organization='Lantik';call.province='Bizkaia';call.location='Bizkaia';call.category=categoryFor(title);
    const activePool=/bolsa de trabajo activa/i.test(clean(card.text()));
    call.status=activePool?'En curso':card.find('.proceso.cerrado').length?'Cerrada':'Pendiente de confirmar';
    call.description=activePool?'Proceso de selección cerrado con bolsa de trabajo activa publicada por Lantik. La bolsa activa no implica que admita nuevas inscripciones. Consulta las condiciones en el portal oficial.':'Proceso publicado en el portal de empleo de Lantik. Comprueba la fase, los requisitos y los documentos de la convocatoria. La fecha de publicación no se utiliza como fecha de cierre.';
    call.sourceHash=hash($.html(node));
    return [callSchema.parse(call)];
  });
}
export async function scrapeLantik(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const calls=parseLantikList(await client.text(LANTIK_LIST),now);
  if (!calls.length) throw new Error('No se reconocen procesos de Lantik');
  for (const call of calls) {
    try {
      const html=await client.text(call.sourceUrl);
      const docs=linkList(load(html),'a[href]',call.sourceUrl).filter(doc=>/base|temario|bibliograf|programa de la oposici/i.test(doc.title)&&!/resultado|admitid|excluid|puntuaci|titulaciones/i.test(doc.title));
      call.documents=docs.filter((doc,index,array)=>array.findIndex(other=>other.url===doc.url)===index).map(doc=>({...doc,kind:/temario|programa/i.test(doc.title)?'temario' as const:/bibliograf/i.test(doc.title)?'guia' as const:'bases' as const,checkedAt:null,sha256:null}));
      call.syllabusUrl=call.documents.find(doc=>doc.kind==='temario')?.url??null;
      call.sourceHash=hash(html);
    } catch(error){warn(`${call.sourceUrl}: ${error instanceof Error?error.message:'Error'}`);}
  }
  return calls;
}
