import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, linkList } from './shared';
import {iparraldeProvince} from '../iparralde-geography';

export const CAPB_LIST = 'https://www.communaute-paysbasque.fr/linstitution/nos-offres-demploi';
const months: Record<string, string> = {janv:'01',janvier:'01',févr:'02',février:'02',mars:'03',avr:'04',avril:'04',mai:'05',juin:'06',juil:'07',juillet:'07',août:'08',sept:'09',septembre:'09',oct:'10',octobre:'10',nov:'11',novembre:'11',déc:'12',décembre:'12'};

export function frenchDate(value: string): string | null {
  const match = value.match(/(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4})/i);
  if (!match || !months[match[2].toLowerCase()]) return null;
  const date = `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2,'0')}`;
  return !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date ? date : null;
}

export function parseCapbList(html: string, now: string): Call[] {
  const $ = load(html);
  return $('article.offres').toArray().flatMap(element => {
    const card = $(element);
    const href = card.find('h2 a').attr('href');
    if (!href || /candidature-spontanee/.test(href)) return [];
    const url = canonical(href, CAPB_LIST);
    const title = clean(card.find('h2').text());
    if (!url || !title) return [];
    const call = baseCall('capb', url, now, 'País Vasco francés');
    call.title = title;
    call.organization = 'Communauté d’Agglomération Pays Basque';
    call.location = clean(card.find('.adresse').clone().find('.bold').remove().end().text()) || 'Pays Basque';
    // Only locations explicitly printed on the official card establish a province.
    call.province = iparraldeProvince(call.location);
    call.group = clean(card.find('.grade').clone().find('.bold').remove().end().text()) || call.group;
    call.category = categoryFor(title);
    call.deadline = frenchDate(clean(card.find('.picto_date').text()));
    call.status = call.deadline ? call.deadline < now.slice(0,10) ? 'Cerrada' : 'Abierta' : 'Pendiente de confirmar';
    call.description = 'Offre d’emploi publiée par la Communauté d’Agglomération Pays Basque. Consulter la fiche officielle pour les conditions et la voie de recrutement.';
    call.sourceHash = hash($.html(element));
    return [callSchema.parse(call)];
  });
}

export async function scrapeCapb(client: OfficialClient, now: string, warn: (message:string)=>void): Promise<Call[]> {
  const calls = parseCapbList(await client.text(CAPB_LIST), now);
  if (!calls.length) throw new Error('No se han reconocido ofertas CAPB; se conserva la importación anterior.');
  for (const call of calls) {
    try {
      const html = await client.text(call.sourceUrl);
      const $ = load(html);
      if (!clean($('h1').text())) throw new Error('Ficha CAPB sin título');
      call.documents = linkList($, 'main a[href]', call.sourceUrl)
        .filter(link => /\.pdf(?:\?|$)/i.test(link.url))
        .map(link => ({...link, title:link.title || 'Fiche de poste officielle', kind:'guia' as const, checkedAt:null, sha256:null}));
      call.sourceHash = hash(html);
    } catch (error) { warn(`Ficha CAPB: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  return calls;
}
