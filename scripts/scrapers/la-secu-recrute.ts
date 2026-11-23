import {load} from 'cheerio';
import {z} from 'zod';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {iparraldeProvince,iparraldeWorkplaceTown} from '../iparralde-geography';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,educationIds} from './shared';

export const SECU_SEARCH='https://www.lasecurecrute.fr/recherche?regions=75&nbre=tous';
type SecuListing={url:string;title:string;organization:string;town:string};
const origin=new URL(SECU_SEARCH).origin;
export function parseSecuSearch(html:string):SecuListing[]{
  const $=load(html),selected=$('#check-region-75:checked');
  if(selected.attr('value')!=='75'||normalize(clean($('label[for="check-region-75"]').text()))!=='nouvelle aquitaine')throw new Error('Sécu Nouvelle Aquitaine region is not selected');
  const heading=$('h2').map((_,node)=>clean($(node).text())).get().find(title=>/offres? d['’]emploi d['’]apr[eè]s vos crit[eè]res/i.test(title));
  const count=Number(heading?.match(/^(\d[\d\s]*) offres? /i)?.[1].replace(/\s/g,''));
  if(!Number.isInteger(count)||count<0||count>2000)throw new Error('Sécu result count is not recognized');
  const cards=$('article.carte-offre[id^="offre_"]');
  if(cards.length!==count)throw new Error('Sécu result list is incomplete');
  const seen=new Set<string>(),listings:SecuListing[]=[];
  cards.each((_,node)=>{
    const card=$(node),a=card.find('header a[href]').first(),href=a.attr('href');
    if(!href)throw new Error('Sécu vacancy URL is missing');
    const url=new URL(href,SECU_SEARCH);
    if(url.origin!==origin||url.username||url.password||!/^\/offre-emploi\/[^/]+\/nouvelle-aquitaine\/\d+$/.test(url.pathname))throw new Error('Unexpected Sécu vacancy URL');
    if(seen.has(url.href))throw new Error('Sécu search repeats a vacancy');seen.add(url.href);
    const location=card.find('.ico-localisation').clone();location.find('.sr-only').remove();
    const town=iparraldeWorkplaceTown(clean(location.text()));
    if(!town)return;
    const title=clean(card.find('h3').first().text()),organization=clean(card.find('h4').first().text());
    // Mobility restricted to existing employees is not an external vacancy.
    if(/uniquement par mutation|exclusivement.*(?:mutation|interne)|mobilite interne/.test(normalize(title)))return;
    if(!title||!organization)throw new Error('Sécu vacancy title or employer is missing');
    listings.push({url:url.href,title,organization,town});
  });
  return listings;
}
const jobSchema=z.object({
  '@type':z.literal('JobPosting'),title:z.string(),
  hiringOrganization:z.object({name:z.string()}),
  jobLocation:z.object({address:z.object({addressLocality:z.string(),addressCountry:z.literal('FR')})}),
  validThrough:z.string().optional(),datePosted:z.string().optional(),
});
function isoDay(value:string|undefined):string|null{
  const day=value?.match(/^\d{4}-\d{2}-\d{2}(?=T|$)/)?.[0];
  return day&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day?day:null;
}
export function parseSecuVacancy(html:string,listing:SecuListing,now:string):Call{
  const $=load(html),jobs=$('script[type="application/ld+json"]').toArray().flatMap(node=>{
    try{const parsed=jobSchema.safeParse(JSON.parse($(node).text()));return parsed.success?[parsed.data]:[];}catch{return [];}
  });
  if(jobs.length!==1)throw new Error('Sécu JobPosting is not recognized');
  const job=jobs[0],title=clean($('h1').first().text()),town=iparraldeWorkplaceTown(job.jobLocation.address.addressLocality);
  if(town!==listing.town||normalize(clean(job.title))!==normalize(title)||normalize(clean(job.hiringOrganization.name))!==normalize(listing.organization))throw new Error('Sécu offer does not match its listed employer or workplace');
  const call=baseCall('la-secu-recrute',listing.url,now,'País Vasco francés');call.title=title;call.organization=clean(job.hiringOrganization.name);call.location=town;call.province=iparraldeProvince(town);call.category=categoryFor(title);
  call.deadline=isoDay(job.validThrough);const start=isoDay(job.datePosted);
  call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':start&&start>now.slice(0,10)?'Próximamente':'Abierta':'Pendiente de confirmar';
  const formation=$('.details h3').filter((_,node)=>normalize(clean($(node).text()))==='votre formation').first();
  const requirement=clean(formation.nextUntil('h2,h3').text());
  if(requirement){
    call.educationText=requirement;call.acceptedQualifications=educationIds(requirement);
    const minimum=normalize(requirement);
    if(/\bdiplome d['’]etat de docteur en medecine\b/.test(minimum))call.acceptedQualifications.push('medicina');
    // Bac+2 remains distinct. Bac is accepted here only when the publisher
    // explicitly offers that alternative with professional experience.
    if(/\bou niveau bac avec (?:une )?experience professionnelle\b/.test(minimum))call.acceptedQualifications.push('bac');
    call.acceptedQualifications=[...new Set(call.acceptedQualifications)];call.requirements=[requirement,...call.requirements];
  }
  call.description='Offre publiée sur le portail officiel de recrutement de la Sécurité sociale, pour un lieu de travail confirmé en Iparralde. Les organismes peuvent relever du droit privé avec une mission de service public. Consulter l’annonce pour les conditions de recrutement; aucun concours ni programme d’examen n’est présumé.';
  call.sourceHash=hash(html);return callSchema.parse(call);
}
export async function scrapeLaSecuRecrute(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const listings=parseSecuSearch(await client.text(SECU_SEARCH)),calls:Call[]=[];
  for(const listing of listings){try{calls.push(parseSecuVacancy(await client.text(listing.url),listing,now));}catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Vacancy unavailable'}`);}}
  if(listings.length&&!calls.length)throw new Error('No Sécu Iparralde vacancies could be read');
  return calls;
}
