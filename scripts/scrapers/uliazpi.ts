import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, categoryFor, clean } from './shared';

export const ULIAZPI_LIST='https://egoitza.gipuzkoa.eus/WAS/CORP/LLEHautaketaProzesuakWEB/concursosC?locale=es';
export function parseUliazpiList(html:string,now:string):Call[] {
  const $=load(html);
  return $('table').toArray().flatMap(table=>{
    const heading=normalize(clean($(table).find('thead').text()));
    if (!/bolsas de trabajo|ofertas de empleo/.test(heading)) return [];
    return $(table).find('tbody tr').toArray().flatMap(row=>{
      const cells=$(row).find('td'),link=cells.first().find('a[href]').first();
      const title=clean(link.text()),href=link.attr('href');
      if (!href || !title || /concursillo|traslado|promocion interna/i.test(normalize(title))) return [];
      const url=new URL(href,ULIAZPI_LIST);
      if (url.origin!==new URL(ULIAZPI_LIST).origin || !/\/concursosC\/\d+\/[01]\/ver$/.test(url.pathname)) return [];
      // The anti-CSRF state varies between requests and is not a job identity.
      url.search='';url.searchParams.set('locale','es');
      const phase=clean(cells.eq(1).text());
      const call=baseCall('uliazpi',url.href,now,'Euskadi');
      call.title=title;call.organization='Uliazpi';call.province='Gipuzkoa';call.location='Gipuzkoa';call.category=categoryFor(title);
      call.status=/adjudicacion|resultado|examen|contrat/i.test(normalize(phase))?'En curso':'Pendiente de confirmar';
      call.description=`Proceso publicado en la sede oficial de Uliazpi. ${phase?`Fase publicada: ${phase}. `:''}Consulta la convocatoria para confirmar el plazo de inscripción, los requisitos y las bases.`;
      call.sourceHash=hash($.html(row));
      return [callSchema.parse(call)];
    });
  });
}
export async function scrapeUliazpi(client:OfficialClient,now:string):Promise<Call[]> {
  const html=await client.text(ULIAZPI_LIST),calls=parseUliazpiList(html,now);
  if (!calls.length) throw new Error('No se reconocen ofertas o bolsas de Uliazpi');
  return calls;
}
