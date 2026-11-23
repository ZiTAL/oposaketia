import { load } from 'cheerio';
import { normalize, callSchema, type Call } from '../../src/lib/catalogue';
import municipalities from '../../docs/inventory/municipalities.json';
import { OfficialClient, hash } from './http';
import { baseCall, categoryFor, clean, educationIds, linkList, parseDate } from './shared';
import {iparraldeProvince} from '../iparralde-geography';

export const TERRITORIAL_LIST = 'https://www.emploi-territorial.fr/emploi-mobilite/?search-dept=064';
const communes = municipalities.filter(item => item.territory === 'País Vasco francés').map(item => item.name);

export function parseTerritorialDetail(html:string,url:string,now:string): Call | null {
  const $ = load(html); const fields: Record<string,string> = {};
  $('.offre-item').each((_,element) => {
    const label = clean($(element).find('.offre-item-label').first().text());
    const value = clean($(element).find('.offre-item-value').first().text());
    if (label && value) fields[label] = value;
  });
  const workplace = fields['Lieu de travail'] || '';
  const town = clean(workplace.replace(/\s*\(Pyrénées-Atlantiques.*$/,'').split(',').at(-1) || '');
  if (!communes.some(name => normalize(name).replace(/[’']/g,'') === normalize(town).replace(/[’']/g,''))) return null;
  const title = clean($('h2.set-font-weight-bold').first().text());
  if (!title || !fields.Employeur) throw new Error('Structure de fiche Emploi territorial non reconnue');
  const call = baseCall('emploi-territorial', url, now, 'País Vasco francés');
  call.title = title; call.organization = fields.Employeur;
  call.location = town; call.category = categoryFor(title);
  call.province = iparraldeProvince(town);
  call.deadline = parseDate(fields['Date limite de candidature'] || '');
  call.status = call.deadline ? call.deadline < now.slice(0,10) ? 'Cerrada' : 'Abierta' : 'Pendiente de confirmar';
  const profile = $('.offre-item').filter((_,element) => clean($(element).text()) === 'Profils recherchés').next('.offre-item-text');
  if (profile.length) {
    call.educationText = clean(profile.text());
    call.acceptedQualifications = educationIds(call.educationText);
    call.requirements = [call.educationText];
  }
  call.description = 'Offre publiée sur le portail officiel Emploi territorial, dont le lieu de travail est explicitement situé dans une commune du Pays Basque. Consulter les conditions et la voie de recrutement sur la fiche officielle.';
  call.sourceHash = hash(html);
  return callSchema.parse(call);
}

export async function scrapeEmploiTerritorial(client:Pick<OfficialClient,'territorialSearchPage'|'text'>,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const html = await client.territorialSearchPage();
  const $ = load(html);
  const urls = new Set(linkList($,'a[href^="/offre/"]',TERRITORIAL_LIST).map(link => link.url));
  if (!urls.size) throw new Error('Aucune offre reconnue sur Emploi territorial');
  const total=Number($('#nb-offres').attr('value')||$('#btn_pagination').attr('value')?.match(/\d+\/(\d+)/)?.[1]);
  if(!Number.isInteger(total)||total<urls.size||total>2000)throw new Error('Nombre d’offres inattendu sur Emploi territorial');
  const pageSize=urls.size;
  for(let page=2;page<=Math.ceil(total/pageSize);page++){
    const next=load(await client.territorialSearchPage(page));
    const links=linkList(next,'a[href^="/offre/"]',TERRITORIAL_LIST);
    const fresh=links.filter(link=>!urls.has(link.url));
    if(!fresh.length)throw new Error(`La recherche répète la page ${page}; import incomplet refusé`);
    for(const link of fresh)urls.add(link.url);
  }
  if(urls.size!==total)throw new Error(`Recherche incomplète : ${urls.size}/${total} offres`);
  const calls: Call[] = [];
  for (const url of urls) {
    try { const call = parseTerritorialDetail(await client.text(url),url,now); if (call) calls.push(call); }
    catch (error) { warn(`${url}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  // An empty local subset does not imply a failed departmental listing.
  return calls;
}
