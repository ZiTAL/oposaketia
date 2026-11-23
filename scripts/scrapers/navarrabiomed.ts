import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,canonical,categoryFor,universityRequirementIds,linkList,parseDate,pdfText} from './shared';

export const NAVARRABIOMED_LIST='https://www.navarrabiomed.es/es/empleo';
const origin=new URL(NAVARRABIOMED_LIST).origin;

function fieldDate($:ReturnType<typeof load>,selector:string){
  const field=$(selector),iso=field.find('time').attr('datetime');
  if(iso&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(iso)&&!Number.isNaN(Date.parse(iso)))return iso.slice(0,10);
  const printed=clean(field.text()).match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0];
  return printed?parseDate(printed):null;
}

export function parseNavarrabiomedDetail(html:string,url:string,now:string):Call{
  const $=load(html),reference=clean($('.field--name-field-ref-empleo .field--item').first().text()),title=clean($('h1').first().text());
  if(!title||!/^\d{2}-\d{2,3}$/.test(reference))throw new Error('Navarrabiomed vacancy structure is not recognized');
  const call=baseCall('navarrabiomed',url,now,'Navarra');
  call.title=title;call.organization='Fundación Miguel Servet · Navarrabiomed';call.location='Navarra';call.province='Navarra';call.category=categoryFor(title);
  call.deadline=fieldDate($,'.field--name-field-fecha-cierre');
  const start=fieldDate($,'.field--name-field-fecha-publicacion');
  call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':start&&start>now.slice(0,10)?'Próximamente':'Abierta':'Pendiente de confirmar';
  const intro=clean($('.field--name-body').first().text()).split(/La persona seleccionada/i)[0].trim();
  call.description=intro?`${intro} Consulta las bases oficiales del proceso para conocer las condiciones y el sistema de selección.`:call.description;
  call.documents=linkList($,'.field--name-field-attach-empleo a[href]',url).filter(link=>new URL(link.url).origin===origin&&/\.pdf$/i.test(new URL(link.url).pathname)&&/bases/i.test(link.title)).map(link=>({...link,kind:'bases',checkedAt:null,sha256:null}));
  call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export function enrichNavarrabiomedRequirements(call:Call,text:string):Call{
  const minimum=text.match(/Requisitos m[ií]nimos del puesto\s*:\s*([\s\S]*?)(?=Conocimientos y m[eé]ritos valorables|\n\s*Aptitudes\s*:|$)/i)?.[1];
  if(!minimum)return call;
  const education=clean(minimum.match(/Titulaci[oó]n\s*:\s*([\s\S]*?)(?=\n\s*(?:Conocimientos|Experiencia|Idiomas)\b|$)/i)?.[1]??'').replace(/^[•\s]+/,'');
  if(education){
    call.educationText=education;
    call.acceptedQualifications=universityRequirementIds(education);
    call.category=categoryFor(call.title+' '+education);
  }
  call.requirements=[clean(minimum),...call.requirements];
  return call;
}

export async function scrapeNavarrabiomed(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const urls=new Set<string>(),pages=new Set<string>();let page:string|null=NAVARRABIOMED_LIST;
  while(page){
    if(pages.has(page)||pages.size>=50)throw new Error('Navarrabiomed pagination repeats or exceeds its limit');
    pages.add(page);
    const $=load(await client.text(page)),view=$('.view-empleo');
    if(!view.length)throw new Error('Navarrabiomed employment view is missing');
    const links=linkList($,'.view-empleo h3.title a[href]',page).filter(link=>new URL(link.url).origin===origin&&new URL(link.url).pathname.startsWith('/es/empleo/'));
    if(!links.length&&!/no hay (?:ofertas|vacantes)|no se han encontrado|sin ofertas/i.test(view.find('.view-empty').text()))throw new Error('Navarrabiomed vacancy list is not recognized');
    for(const link of links)urls.add(link.url);
    const next=view.find('.pager__item--next a[href]').attr('href');
    page=next?canonical(next,page):null;
    if(page){const url=new URL(page);if(url.origin!==origin||url.pathname!=='/es/empleo'||!/^\d{1,2}$/.test(url.searchParams.get('page')??''))throw new Error('Unexpected Navarrabiomed pagination URL');}
  }
  const calls:Call[]=[];
  for(const url of urls){
    try{
      const call=parseNavarrabiomedDetail(await client.text(url),url,now);
      for(const doc of call.documents){
        try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;enrichNavarrabiomedRequirements(call,pdf.text);}
        catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Public bases unavailable'}`);}
      }
      calls.push(callSchema.parse(call));
    }catch(error){warn(`${url}: ${error instanceof Error?error.message:'Public vacancy unavailable'}`);}
  }
  if(urls.size&&!calls.length)throw new Error('No Navarrabiomed vacancy could be read');
  return calls;
}
