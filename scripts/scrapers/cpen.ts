import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, linkList } from './shared';

export const CPEN_LIST = 'https://empleo.sociedadespublicasdenavarra.es/jobs/';
export const CPEN_REVIEWED_ARCHIVE = [
  'https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-gestion-de-personas',
  'https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-sistemas-de-gestion-procesos-e-inteligencia-de-negocio',
  'https://empleo.sociedadespublicasdenavarra.es/jobs/analista-b59fc039-fe62-4ee5-8abe-99958bfd05e6',
  'https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-atencion-ciudadana',
  'https://empleo.sociedadespublicasdenavarra.es/jobs/tecnico-a-superior-para-el-area-de-biodiversidad',
];

export function parseCpenList(html: string) {
  const $ = load(html);
  const links = linkList($, 'a.job-card[href]', CPEN_LIST)
    .filter(link => new URL(link.url).origin === new URL(CPEN_LIST).origin && /^\/jobs\/[^/?]+$/.test(new URL(link.url).pathname));
  const rawNext = $('a.next[rel="next"]').attr('href');
  const next = rawNext ? canonical(rawNext, CPEN_LIST) : null;
  if (next && (new URL(next).origin !== new URL(CPEN_LIST).origin || !/^\/jobs\/?$/.test(new URL(next).pathname))) throw new Error('Paginación CPEN inesperada');
  return { links, next };
}

export function parseCpenDetail(html: string, url: string, now: string): Call {
  const $ = load(html);
  const title = clean($('h1').first().text());
  const organization = $('meta[name="author"]').attr('content');
  const requirements = $('p').filter((_, node) => clean($(node).text()) === 'Requisitos mínimos').next('.general-content');
  if (!title || !organization || !requirements.length) throw new Error('Estructura CPEN no reconocida');
  const call = baseCall('cpen', url, now, 'Navarra');
  call.title = title;
  call.organization = clean(organization);
  call.location = clean($('[title="Ubicación"]').text()) || 'Navarra';
  call.province = 'Navarra';
  call.category = categoryFor(title);
  const requirementItems = requirements.find('p,li').toArray().map(node => clean($(node).text())).filter(Boolean);
  const offerStart = requirementItems.findIndex(item => /^se ofrece\b/i.test(item));
  call.requirements = offerStart < 0 ? requirementItems : requirementItems.slice(0, offerStart);
  call.educationText = call.requirements.join(' ') || clean(requirements.text());
  call.acceptedQualifications = educationIds(call.educationText);
  call.description = 'Oferta de empleo publicada en el portal de sociedades públicas de Navarra. Consultar las condiciones y el procedimiento de selección de la entidad convocante.';
  // Presence in the job board does not establish an application deadline.
  call.status = $('p').toArray().some(node => clean($(node).text()) === 'Oferta cerrada')
    ? 'Cerrada'
    : 'Pendiente de confirmar';
  call.documents = linkList($, '.general-content a[href]', url).filter(link => /\.pdf(?:\?|$)/i.test(link.url)).map(link => ({...link,kind:'guia' as const,checkedAt:null,sha256:null}));
  call.sourceHash = hash(html);
  return callSchema.parse(call);
}

export async function scrapeCpen(client: OfficialClient, now: string, warn: (message:string)=>void): Promise<Call[]> {
  let page: string | null = CPEN_LIST;
  const visited = new Set<string>();
  const urls = new Set<string>();
  while (page) {
    if (visited.has(page) || visited.size >= 50) throw new Error('Paginación CPEN repetida o excesiva');
    visited.add(page);
    const parsed = parseCpenList(await client.text(page));
    for (const link of parsed.links) urls.add(link.url);
    page = parsed.next;
  }
  if (!urls.size) throw new Error('No se reconocen ofertas CPEN; se conserva el catálogo anterior.');
  for (const url of CPEN_REVIEWED_ARCHIVE) urls.add(url);
  const calls: Call[] = [];
  for (const url of urls) {
    try { calls.push(parseCpenDetail(await client.text(url), url, now)); }
    catch (error) { warn(`${url}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  if (!calls.length) throw new Error('No se ha podido leer ninguna ficha CPEN');
  return calls;
}
