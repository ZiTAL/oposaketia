import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, categoryFor, clean, linkList } from './shared';

export const GIPUZKOA_LIST = 'https://egoitza.gipuzkoa.eus/WAS/CORP/LLEHautaketaProzesuakWEB/concursos?locale=es';

export function parseGipuzkoaList(html: string, now: string): Call[] {
  const $ = load(html);
  return linkList($, 'a[href*="/convocatorias/"]', GIPUZKOA_LIST)
    .filter(link => /\/convocatorias\/(?:OP|BT)[\d-]+\/lista\/-?\d+$/.test(new URL(link.url).pathname))
    .filter((link, index, links) => links.findIndex(other => other.url === link.url) === index)
    .flatMap(link => {
      if (!link.title) return [];
      const url = new URL(link.url); url.searchParams.set('locale','es');
      const call = baseCall('gipuzkoa', url.href, now, 'Euskadi');
      call.title = link.title;
      call.organization = 'Diputación Foral de Gipuzkoa';
      call.province = 'Gipuzkoa'; call.location = 'Gipuzkoa';
      call.category = categoryFor(link.title);
      call.status = 'Pendiente de confirmar';
      call.description = 'Proceso de empleo público o bolsa de trabajo publicado por la Diputación Foral de Gipuzkoa. Consultar la fase, el plazo de inscripción y las bases en el portal oficial.';
      call.sourceHash = hash(html);
      return [callSchema.parse(call)];
    });
}

export async function scrapeGipuzkoa(client: OfficialClient, now: string, warn: (message:string)=>void): Promise<Call[]> {
  const calls = parseGipuzkoaList(await client.text(GIPUZKOA_LIST), now);
  if (!calls.length) throw new Error('No se reconocen procesos de Gipuzkoa');
  for (const call of calls) {
    try {
      const html = await client.text(call.sourceUrl);
      const $ = load(html);
      const processLinks = linkList($, 'a[href*="/convocatorias/"]', call.sourceUrl).filter(link => /\/convocatorias\/\d+\/ver\/-?\d+$/.test(new URL(link.url).pathname));
      // Read the actual process page; avoid candidate lists and results PDFs.
      if (processLinks.length) {
        const url = new URL(processLinks[0].url); url.searchParams.set('locale','es');
        const detail = await client.text(url.href);
        const docs = linkList(load(detail), 'a[href]', url.href).filter(link => /base|temario|programa|gai.zerrenda|oinarri/i.test(link.title));
        call.documents = docs.filter(link => !/admitid|excluid|resultado|calificaci|puntuaci/i.test(link.title)).map(link => ({...link,kind:/temario|programa|gai.zerrenda/i.test(link.title)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}));
        call.syllabusUrl = call.documents.find(doc => doc.kind === 'temario')?.url ?? null;
        call.sourceHash = hash(detail);
      }
    } catch (error) { warn(`${call.sourceUrl}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  return calls;
}
