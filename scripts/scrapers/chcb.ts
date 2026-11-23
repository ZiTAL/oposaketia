import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, categoryFor, linkList } from './shared';

export const CHCB_LIST='https://www.ch-cote-basque.fr/l-hopital-recrute/';
export function parseChcbList(html:string,now:string):Call[] {
  const $=load(html);
  return $('.mise_en_avant').toArray().flatMap(node=>{
    const block=$(node),title=clean(block.find('h2').first().text());
    if (!/concours/i.test(title)) return [];
    const documents=linkList(load($.html(node)),'a[href]',CHCB_LIST).filter(link=>/\.pdf(?:\?|$)/i.test(link.url));
    const notice=documents.find(link=>/avis de concours/i.test(link.title));
    if (!notice) return [];
    const call=baseCall('chcb',notice.url,now,'País Vasco francés');
    call.title=title;call.organization='Centre Hospitalier de la Côte Basque';call.location='Territoire Navarre Côte Basque';
    call.category=categoryFor(title);call.sourceHash=hash($.html(node));
    call.description='Avis de concours publié par le Centre Hospitalier de la Côte Basque. Consulter le document pour les établissements concernés, les conditions, les dates et les épreuves.';
    call.documents=documents.filter(link=>/avis de concours|dossier de candidature/i.test(link.title)).map(link=>({...link,kind:'bases' as const,checkedAt:null,sha256:null}));
    // A notice may concern several hospitals; do not invent a single province,
    // deadline, number of places or degree from the competition title.
    return [callSchema.parse(call)];
  });
}
export async function scrapeChcb(client:OfficialClient,now:string):Promise<Call[]> {
  const calls=parseChcbList(await client.text(CHCB_LIST),now);
  if (!calls.length) throw new Error('Aucun avis de concours reconnu sur le portail hospitalier');
  return calls;
}
