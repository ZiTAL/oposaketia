import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, categoryFor, linkList } from './shared';
import { frenchDate } from './capb';

export const UPPA_LIST='https://recrutement-administratif.univ-pau.fr/';
export function parseUppaList(html:string,now:string):Call[] {
  const $=load(html);
  return $('#liste_offres .well[id^="offre_"]').toArray().flatMap(node=>{
    const block=$(node),fields:Record<string,string>={};
    block.find('dt').each((_,label)=>{fields[clean($(label).text())]=clean($(label).next('dd').text());});
    const campus=fields['Structure de rattachement']||'';
    const town=['Bayonne','Anglet'].find(name=>new RegExp(`\\b${normalize(name)}\\b`).test(normalize(campus)));
    if (!town) return [];
    const title=clean(block.find('h3').first().text());
    const document=linkList(load($.html(node)),'a[href]',UPPA_LIST).find(link=>/\/\d+\/fichier_offre\/$/.test(new URL(link.url).pathname));
    if (!title || !document) return [];
    const call=baseCall('uppa',document.url,now,'País Vasco francés');
    call.title=title;call.organization='Université de Pau et des Pays de l’Adour';
    call.province='Lapurdi';call.location=town;call.category=categoryFor(title);
    const window=fields['Candidatures ouvertes']||'';
    const end=window.split(/\sau\s/i).at(-1)||'';
    call.deadline=frenchDate(end);
    call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
    call.description=`Offre publiée sur le portail de recrutement administratif de l’UPPA. Structure de rattachement : ${campus}. Consulter la fiche de poste pour les qualifications et conditions.`;
    call.documents=[{...document,title:'Fiche de poste officielle',kind:'guia',checkedAt:null,sha256:null}];
    call.sourceHash=hash($.html(node));
    return [callSchema.parse(call)];
  });
}
export async function scrapeUppa(client:OfficialClient,now:string):Promise<Call[]> {
  const html=await client.text(UPPA_LIST);
  if (!load(html)('#liste_offres').length) throw new Error('Liste UPPA non reconnue');
  return parseUppaList(html,now);
}
