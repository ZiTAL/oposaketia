import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,educationIds,extractTopics,linkList,pdfText,stableId} from './shared';
import reviewedScans from '../reviews/osatek.json';

export const OSATEK_POSTS='https://www.osakidetza.euskadi.eus/convocatoria-de-puestos/webosk00-otkcon/es/';
// These fields were read visually on page 1 of the public authorizations.
// Both URL and SHA-256 must match; changed documents require a fresh review.
export function applyReviewedOsatekScan(call:Call,url:string,sha256:string,now:string):boolean{
  const review=reviewedScans.find(item=>item.url===url&&item.sha256===sha256);
  if(!review)return false;
  if(review.deadline){call.deadline=review.deadline;call.status=review.deadline<now.slice(0,10)?'Cerrada':'Abierta';}
  if(review.educationText){call.educationText=review.educationText;call.acceptedQualifications=educationIds(review.educationText);}
  if(review.requirements)call.requirements=[...review.requirements,...call.requirements];
  return true;
}
export function enrichOsatekBases(call:Call,text:string,kind:string,url:string):Call{
  let minimum:string|undefined;
  if(kind==='technical')minimum=text.match(/c\)\s*Titulaci[oó]n\s*:\s*([\s\S]*?)(?=\n\s*d\)|$)/i)?.[1];
  if(kind==='services')minimum=text.match(/REQUISITOS ESPECIFICOS\s*:\s*a\)\s*Titulaci[oó]n\s*:\s*([\s\S]*?)(?=En caso de titulaciones|\n\s*b\)|$)/i)?.[1];
  if(kind==='radiology')minimum=text.match(/2\.2\s+Requisitos espec[ií]ficos\s*:\s*([\s\S]*?)(?=En el caso de titulaciones|\n\s*3\.|$)/i)?.[1];
  if(minimum){call.educationText=clean(minimum);call.acceptedQualifications=educationIds(call.educationText);
    if(kind==='services'&&/INGENIER[IÍ]A[\s\S]*Industrial/i.test(minimum))call.acceptedQualifications.push('ingenieria-industrial');
    call.acceptedQualifications=[...new Set(call.acceptedQualifications)];
  }
  if(kind==='radiology')call.requirements=['También se exige la especialidad en Radiodiagnóstico. Consulta las restantes condiciones en las bases y su disposición de apertura.',...call.requirements];
  const topics=extractTopics(text);if(topics.length){call.topics=topics;call.syllabusUrl=url;}
  return call;
}
export function parseOsatekPosts(html:string,now:string):Call[]{
  const $=load(html),section=$('#tab_item2697');
  if(!section.length||!/convocatoria de puestos/i.test(clean($('h1').text())))throw new Error('Osatek post authorization section is not recognized');
  const links=linkList($,'#tab_item2697 a[href]',OSATEK_POSTS).filter(link=>{
    const url=new URL(link.url);
    return url.origin===new URL(OSATEK_POSTS).origin&&!url.username&&!url.password&&/\.pdf$/i.test(url.pathname)&&/^Disposici[oó]n\b/i.test(link.title)&&/autoriza(?:ci[oó]n)?(?:[\s\S]*convocatoria)|aprueban las bases de la convocatoria/i.test(link.title)&&!/admitid|excluid|puntuaci|relaci[oó]n definitiva|[oó]rgano de selecci[oó]n/i.test(link.title);
  });
  if(!links.length)throw new Error('Osatek authorizations are missing; manual review required');
  return [...new Map(links.map(link=>[link.url,link])).values()].map(link=>{
    const call=baseCall('osatek',OSATEK_POSTS,now,'Euskadi');call.id=stableId('osatek',link.url);call.title=link.title;call.organization='Osatek';call.category=categoryFor(link.title);
    call.description='Convocatoria publicada en el apartado de puestos de Osatek, incluidos anuncios históricos. La publicación de una autorización no confirma que admita nuevas solicitudes. Consulta el documento oficial para conocer las condiciones y la vigencia.';
    call.documents=[{...link,kind:'bases',checkedAt:null,sha256:null}];call.sourceHash=hash(link.title+link.url);return callSchema.parse(call);
  });
}
export async function scrapeOsatek(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const calls=parseOsatekPosts(await client.text(OSATEK_POSTS),now);
  for(const call of calls){
    const doc=call.documents[0];
    try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;
      const review=reviewedScans.find(item=>item.url===doc.url&&item.sha256===pdf.sha256);
      if(review){
        try{const bases=await pdfText(client,review.baseUrl);call.documents.push({title:'Bases del proceso enlazadas por Osatek',url:review.baseUrl,kind:'bases',checkedAt:now,sha256:bases.sha256});enrichOsatekBases(call,bases.text,review.baseKind,review.baseUrl);}
        catch(error){warn(`${review.baseUrl}: ${error instanceof Error?error.message:'Bases unavailable'}`);}
      }
      // The later signed disposition takes precedence over the older base's
      // qualification date and application period.
      if(!applyReviewedOsatekScan(call,doc.url,pdf.sha256,now)&&pdf.text.trim().length<100)warn(`${doc.url}: Scanned authorization; requirements and dates need manual review`);
    }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Authorization unavailable'}`);}
  }
  return calls;
}
