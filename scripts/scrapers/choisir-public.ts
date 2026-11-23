import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,linkList,parseDate} from './shared';
import {iparraldeProvince,iparraldeWorkplaceTown} from '../iparralde-geography';

const origin='https://choisirleservicepublic.gouv.fr';
export const CHOISIR_LIST=origin+'/nos-offres/filtres/localisation/242/';
const words=(value:string)=>normalize(value).replace(/[^a-z0-9]+/g,' ').trim();

function parseList(html:string){
  const $=load(html);
  const selected=$('input.js-search-input[data-slug="locations"][value="242"][checked]');
  if(!selected.length||words(selected.parent().find('label').first().text())!=='pyrenees atlantiques')throw new Error('Department filter is not active on Choisir le service public');
  const count=clean($('p.focus-on-ajax').first().text()).match(/^(\d[\d\s]*)\s+offres? d['’]emploi trouv/);
  const total=count?Number(count[1].replace(/\s/g,'')):NaN;
  if(!Number.isInteger(total)||total<1||total>2000)throw new Error('Unexpected public search count');
  const urls=[...new Set(linkList($,'.fr-card--offer h3 a[href]',CHOISIR_LIST).map(item=>item.url).filter(value=>{
    const url=new URL(value);return url.origin===origin&&!url.username&&!url.password&&url.pathname.startsWith('/offre-emploi/');
  }))];
  const pages=linkList($,'a[href]',CHOISIR_LIST).map(item=>{
    const match=item.url.match(/^https:\/\/choisirleservicepublic\.gouv\.fr\/nos-offres\/filtres\/localisation\/242\/page\/(\d+)\/$/);
    return match?Number(match[1]):1;
  });
  const lastPage=Math.max(1,...pages);
  if(!urls.length||lastPage>100)throw new Error('Public search structure is not recognized');
  return {total,urls,lastPage};
}

export function parseChoisirDetail(html:string,url:string,now:string):Call|null{
  const $=load(html);
  const workplace=clean($('main li.ic--pin').first().text()).replace(/^Localisation\s*:\s*/i,'');
  if(!workplace)throw new Error('Actual workplace is missing from the offer');
  // Do not use the employer description or JobPosting addressLocality: the
  // latter frequently contains only the department, even for a Pau vacancy.
  const town=iparraldeWorkplaceTown(workplace);
  if(!town)return null;
  const title=clean($('main h1').first().text());
  const employer=$('main li.ic--user').first().contents().toArray().filter(node=>node.type==='text').map(node=>clean($(node).text())).find(Boolean);
  if(!title||!employer)throw new Error('Offer title or employer is missing');
  const call=baseCall('choisir-public',url,now,'País Vasco francés');
  call.title=title;call.organization=employer;call.location=workplace;call.category=categoryFor(title);
  // The portal sometimes gives only the employer's category in its employer
  // field and JSON-LD. Use the institution explicitly named in the title.
  const category=words(employer),namedEmployer=title.split(/\s[-–]\s/).at(-1)!;
  if(/^(?:communes|centres communaux d action sociale|etablissements publics de cooperation intercommunale|groupements d interet public|conseils departementaux)$/.test(category)&&/^(?:commune\b|mairie\b|centre communal\b|ccas\b|cias\b|ca\b|cc\b|communaute\b|conseil departemental\b|departement\b|gip\b)/.test(words(namedEmployer)))call.organization=namedEmployer;
  call.province=iparraldeProvince(town);
  const deadline=$('main p').map((_,node)=>clean($(node).text())).get().find(text=>/^Date limite de candidature\s*:/i.test(text))?.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
  call.deadline=deadline?parseDate(deadline):null;
  call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
  const education=$('main .block-table').filter((_,node)=>/Niveau d['’]études minimum requis/i.test($(node).find('h3').text())).first();
  if(education.length){
    const published=education.find('span').map((_,node)=>clean($(node).text())).get().join(' ');
    call.educationText=`Niveau d'études minimum requis : ${published||clean(education.text())}`;call.requirements=[call.educationText,...call.requirements];
    if(/\bNiveau 4 Baccalaur[eé]at\b/i.test(call.educationText))call.acceptedQualifications=['bac'];
  }
  call.description='Offre publiée sur Choisir le service public, avec un lieu de travail explicitement situé dans une commune du Pays Basque. Les voies de recrutement et les conditions sont à consulter sur la fiche officielle. La publication ne suppose pas nécessairement un concours avec programme.';
  call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export async function scrapeChoisirPublic(client:Pick<OfficialClient,'text'>,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const first=parseList(await client.text(CHOISIR_LIST));
  const urls=new Set(first.urls);
  if(first.lastPage!==Math.ceil(first.total/first.urls.length))throw new Error('Public search pagination does not match the declared total');
  for(let page=2;page<=first.lastPage;page++){
    const next=parseList(await client.text(CHOISIR_LIST+`page/${page}/`));
    if(next.total!==first.total)throw new Error('Public search count changed during pagination; incomplete import refused');
    const fresh=next.urls.filter(url=>!urls.has(url));
    if(!fresh.length)throw new Error('Public search repeats a result page; incomplete import refused');
    for(const url of fresh)urls.add(url);
  }
  if(urls.size!==first.total)throw new Error(`Public search is incomplete: ${urls.size}/${first.total}`);
  const calls:Call[]=[];let checked=0;
  for(const url of urls){
    try{const call=parseChoisirDetail(await client.text(url),url,now);if(call)calls.push(call);}
    catch(error){warn(`${url}: ${error instanceof Error?error.message:'Public offer unavailable'}`);}
    checked++;if(checked%20===0)console.log(`[choisir-public] ${checked}/${urls.size} offers checked`);
  }
  return calls;
}
