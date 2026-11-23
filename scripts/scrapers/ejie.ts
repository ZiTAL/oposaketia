import { load } from 'cheerio';
import type { Call } from '../../src/lib/catalogue';
import { OfficialClient } from './http';
import { parseIvapList, parseIvapDetail } from './ivap';
import { stableId } from './shared';

export const EJIE_HOME = 'https://www.ejie.euskadi.eus/inicio/';
export async function scrapeEjie(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const $ = load(await client.text(EJIE_HOME));
  const href = $('a').filter((_,node) => $(node).text().trim()==='Ofertas de empleo').first().attr('href');
  if (!href) throw new Error('No se encuentra el buscador de empleo de EJIE');
  const html = await client.text(new URL(href,EJIE_HOME).href);
  const listings = parseIvapList(html,EJIE_HOME);
  if (!listings.length) throw new Error('No se reconocen ofertas de EJIE');
  if (load(html)('a[href*="r01kTgtPg"],a[href*="r01kPgCmd"]').length) warn('El buscador publica más páginas; robots.txt excluye la paginación. Cobertura parcial.');
  const calls: Call[] = [];
  for (const listing of listings) {
    try {
      const call = parseIvapDetail(await client.text(listing.url),listing,now);
      call.title=listing.title; call.organization='EJIE · Eusko Jaurlaritzaren Informatika Elkartea';
      call.sourceId='ejie'; call.id=stableId(call.sourceId,listing.url);
      calls.push(call);
    } catch (error) { warn(`${listing.url}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  if (!calls.length) throw new Error('No se ha podido leer ninguna oferta de EJIE');
  return calls;
}
