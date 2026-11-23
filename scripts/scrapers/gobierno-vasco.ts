import { load } from 'cheerio';
import type { Call } from '../../src/lib/catalogue';
import { OfficialClient } from './http';
import { parseIvapList, parseIvapDetail } from './ivap';
import { stableId } from './shared';

export const GOBIERNO_VASCO_HOME = 'https://www.euskadi.eus/ope-administracion-general-euskadi/';
export async function scrapeGobiernoVasco(client: OfficialClient, now: string, warn: (message:string)=>void): Promise<Call[]> {
  const $ = load(await client.text(GOBIERNO_VASCO_HOME));
  const href = $('a').filter((_, element) => $(element).text().trim() === 'Procesos selectivos convocados').attr('href');
  if (!href) throw new Error('No se reconoce el enlace oficial de procesos selectivos del Gobierno Vasco');
  const html = await client.text(new URL(href,GOBIERNO_VASCO_HOME).href);
  const listings = parseIvapList(html,GOBIERNO_VASCO_HOME);
  if (!listings.length) throw new Error('No se reconocen convocatorias del Gobierno Vasco');
  if (load(html)('a[href*="r01kTgtPg"],a[href*="r01kPgCmd"]').length) warn('El portal publica más páginas pero robots.txt excluye los comandos de paginación. Cobertura parcial de la primera página.');
  const calls: Call[] = [];
  for (const listing of listings) {
    try {
      // Shared official HTML structure; identity and source remain distinct.
      const call = parseIvapDetail(await client.text(listing.url), listing, now);
      call.title = listing.title;
      call.sourceId = 'gobierno-vasco'; call.id = stableId(call.sourceId,listing.url);
      calls.push(call);
    } catch (error) { warn(`${listing.url}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  if (!calls.length) throw new Error('No se ha podido leer ninguna convocatoria del Gobierno Vasco');
  return calls;
}
