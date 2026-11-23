import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,linkList,parseDate,pdfText,stableId,universityRequirementIds} from './shared';

export const GIZAIN_LIST='https://fundaciongizain.es/es/actualidad/9-bolsa-de-empleo';
const origin=new URL(GIZAIN_LIST).origin;
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function registrationDeadline(text:string):string|null{
  const match=clean(text).match(/(?:solicitudes|solicitarlo|remitir documentaci[oó]n)[\s\S]{0,1400}?en el plazo comprendido entre[^.]{0,180}?\by\s+(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(20\d{2})/i);
  if(!match)return null;
  const month=months.indexOf(match[2].toLowerCase())+1;
  return month?parseDate(`${match[1]}/${month}/${match[3]}`):null;
}

export function parseGizainDetail(html:string,url:string,now:string):Call[]{
  const $=load(html),body=$('.blog-entry-content').first(),title=clean($('.page-title h2').first().text());
  if(!title||!body.length)throw new Error('Gizain article structure is not recognized');
  const sourceLinks=linkList($,'.blog-entry-content a[href]',url);
  const bases=sourceLinks.filter(link=>new URL(link.url).origin===origin&&/\.pdf$/i.test(new URL(link.url).pathname)&&/^(?:convocatoria|bases)\b/i.test(link.title)&&!/admitid|excluid|resultado|puntuaci|prueba|seleccionad/i.test(link.title+' '+new URL(link.url).pathname));
  const offers:{url:string;label:string}[]=[];
  body.find('a[href]').each((_,element)=>{
    const anchor=$(element);let link:URL;
    try{link=new URL(anchor.attr('href')!,url);}catch{return;}
    if(link.origin!=='https://administracionelectronica.navarra.es'||link.username||link.password||!/^\/EmpleoIntermediacion\/(?:empleo|ofertacandidatos)\/\d+$/.test(link.pathname))return;
    const paragraph=anchor.closest('p');
    const label=clean(paragraph.clone().find('a').remove().end().text())||clean(paragraph.prev('p').text());
    const role=label.replace(/[:\s]+$/g,'');
    if(!offers.some(offer=>offer.url===link.href))offers.push({url:link.href,label:role&&role!==title&&!/^oferta sne|portal de intermediaci[oó]n/i.test(role)&&role.length<100?role:''});
  });
  if(!offers.length&&!bases.length)return [];
  return (offers.length?offers:[{url,label:''}]).map(offer=>{
    const call=baseCall('gizain',url,now,'Navarra');call.id=stableId('gizain',offer.url);
    call.title=offers.length>1&&offer.label?`${offer.label} · ${title}`:title;
    call.organization='Fundación Gizain';call.location=/\belizondo\b/i.test(title+' '+body.text())?'Elizondo, Navarra':'Navarra';call.province='Navarra';call.category=categoryFor(call.title);
    call.deadline=registrationDeadline(body.text());
    call.status=call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
    call.description='Anuncio de contratación publicado por la Fundación Navarra para la Gestión de los Servicios Sociales Públicos · Gizain. Consulta las condiciones, las titulaciones y la vigencia del plazo en la convocatoria y la oferta oficial enlazada.';
    call.documents=[...(offers.length?[{title:offer.label?`Oferta SNE-NL · ${offer.label}`:'Oferta SNE-NL',url:offer.url,kind:'guia' as const,checkedAt:null,sha256:null}]:[]),...(offers.length<=1?bases.map(doc=>({...doc,kind:'bases' as const,checkedAt:null,sha256:null})):[])];
    call.sourceHash=hash(html);
    return callSchema.parse(call);
  });
}

export function enrichGizainRequirements(call:Call,text:string,now:string):Call{
  const flat=clean(text);
  const explicit=flat.match(/(?:formaci[oó]n|titulaci[oó]n) acad[eé]mica que permite (?:acceder|participar)[^.]{0,180}?es\s+(?:la\s+|el\s+)?([^.]{5,600})\./i)?.[1];
  const minimum=flat.match(/\b2\.1\.\s*([\s\S]*?)(?=\b2\.2\.|$)/)?.[1]??'';
  const degree=minimum.match(/Estar en posesi[oó]n de (?:alguna de estas titulaciones|[\s\S]{0,40}?t[ií]tulo)[\s\S]{0,500}?(?=\s+[A-Z]\.(?:-|\s)|$)/i)?.[0];
  const education=clean(explicit??degree??'');
  if(education){call.educationText=education;call.acceptedQualifications=universityRequirementIds(education);call.requirements=[education,...call.requirements];call.category=categoryFor(call.title+' '+education);}
  call.deadline??=registrationDeadline(text);
  if(call.deadline)call.status=call.deadline<now.slice(0,10)?'Cerrada':'Abierta';
  return call;
}

export async function scrapeGizain(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const pages=new Set([GIZAIN_LIST]),articles=new Set<string>();
  for(const page of pages){
    if(pages.size>50)throw new Error('Gizain pagination exceeds its limit');
    const $=load(await client.text(page));
    for(const link of linkList($,'a[href]',page)){
      const url=new URL(link.url);
      if(url.origin===origin&&/^\/es\/actualidad\/9-bolsa-de-empleo\/\d+-.+\.html$/.test(url.pathname))articles.add(link.url);
    }
    for(const link of linkList($,'.pagination a[href]',page)){
      const url=new URL(link.url);
      if(url.origin!==origin||url.pathname!==new URL(GIZAIN_LIST).pathname||!/^\d{1,4}$/.test(url.searchParams.get('start')??url.searchParams.get('limitstart')??''))throw new Error('Unexpected Gizain pagination URL');
      pages.add(link.url);
    }
  }
  if(!articles.size)throw new Error('No Gizain employment articles recognized');
  const calls:Call[]=[];
  for(const url of articles){
    try{
      const extracted=parseGizainDetail(await client.text(url),url,now);
      for(const call of extracted){
        const valid:Call['documents']=[];
        for(const doc of call.documents){
          if(doc.kind!=='bases'){valid.push(doc);continue;}
          try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;enrichGizainRequirements(call,pdf.text,now);valid.push(doc);}
          catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Public bases unavailable'}`);}
        }
        call.documents=valid;calls.push(callSchema.parse(call));
      }
    }catch(error){warn(`${url}: ${error instanceof Error?error.message:'Public employment article unavailable'}`);}
  }
  if(!calls.length)throw new Error('No Gizain hiring announcements could be read');
  return calls;
}
