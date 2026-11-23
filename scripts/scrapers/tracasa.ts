import { load } from 'cheerio';
import { z } from 'zod';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, categoryFor, clean, educationIds } from './shared';

export const TRACASA_MAP = 'https://tracasa.viterbit.site/sitemap.xml';
const jobSchema = z.object({ '@type':z.literal('JobPosting'),title:z.string().min(1),hiringOrganization:z.object({name:z.string().min(1)}),jobLocation:z.object({address:z.object({addressLocality:z.string(),addressRegion:z.string()})}) });
export function parseTracasaDetail(html:string,url:string,now:string):Call {
  const $ = load(html);
  const jobs = $('script[type="application/ld+json"]').toArray().flatMap(node=>{
    try { const result=jobSchema.safeParse(JSON.parse($(node).text()));return result.success?[result.data]:[]; } catch { return []; }
  });
  if (jobs.length!==1 || !/navarra/i.test(jobs[0].jobLocation.address.addressRegion)) throw new Error('Ficha Tracasa no reconocida o fuera de Navarra');
  const job=jobs[0],call=baseCall('tracasa',url,now,'Navarra');
  call.title=job.title;call.organization=job.hiringOrganization.name;
  call.province='Navarra';call.location=job.jobLocation.address.addressLocality;call.category=categoryFor(job.title);
  const requirements=$('h3.kt-infobox__subtitle').filter((_,node)=>clean($(node).text())==='Requisitos').next();
  if (requirements.length) {
    call.requirements=requirements.find('p,li').toArray().map(node=>clean($(node).text())).filter(Boolean);
    call.educationText=call.requirements.join(' ') || clean(requirements.text());
    call.acceptedQualifications=educationIds(call.educationText);
  }
  call.description='Oferta publicada en el portal de empleo enlazado por Tracasa. Consultar los requisitos, las condiciones y el procedimiento de selección en la ficha oficial.';
  call.sourceHash=hash(html);
  return callSchema.parse(call);
}
export async function scrapeTracasa(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const $=load(await client.text(TRACASA_MAP),{xml:true});
  const urls=$('url > loc').toArray().map(node=>$(node).text()).filter(url=>{const parsed=new URL(url);return parsed.origin==='https://tracasa.viterbit.site' && parsed.pathname!=='/';});
  if (!urls.length || urls.length>300) throw new Error('Sitemap Tracasa vacío o inesperado');
  const calls:Call[]=[];
  for (const url of urls) {
    try { calls.push(parseTracasaDetail(await client.text(url),url,now)); }
    catch(error){warn(`${url}: ${error instanceof Error?error.message:'Error'}`);}
  }
  if (!calls.length) throw new Error('No se ha podido leer ninguna oferta de Tracasa');
  return calls;
}
