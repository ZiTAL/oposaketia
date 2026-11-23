import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,extractTopics,linkList,parseDate,pdfText,stableId,universityRequirementIds} from './shared';

export const PARLIAMENT_LIST='https://parlamentodenavarra.es/es/contenido/convocatorias-p%C3%BAblicas-de-personal';
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export function parseParliamentYear(html:string,url:string,now:string):Call[]{
  const $=load(html),body=$('.field-name-body .field-item').first();
  if(!body.length||!body.find('strong').length)throw new Error('Parliament annual selection page is not recognized');
  const sections:{title:string;html:string;text:string}[]=[];let section:typeof sections[number]|undefined;
  body.children('p').each((_,node)=>{
    const p=$(node),text=clean(p.text());
    if(/^Convocatoria\b/i.test(text)&&p.find('strong').length){section={title:text,html:'',text:''};sections.push(section);}
    else if(section){section.html+=$.html(node);section.text+='\n'+text;}
  });
  if(!sections.length)throw new Error('Parliament process headings are missing');
  const calls:Call[]=[];
  for(const section of sections){
    if(/turno restringido|movilidad horizontal interna|promoci[oó]n interna|personal funcionario.*formaci[oó]n/i.test(section.title))continue;
    const bases=linkList(load(section.html),'a[href]',url).find(link=>{
      const target=new URL(link.url);
      return !target.username&&!target.password&&['parlamentodenavarra.es','www.parlamentodenavarra.es','bon.navarra.es'].includes(target.hostname)&&/^[-\s]*Bases de la convocatoria/i.test(link.title);
    });
    if(!bases)throw new Error('Public Parliament process has no recognized bases link');
    const call=baseCall('navarra-parliament',url,now,'Navarra');call.id=stableId('navarra-parliament',bases.url);
    call.title=section.title;call.organization='Parlamento de Navarra';call.location='Navarra';call.province='Navarra';call.category=categoryFor(call.title);
    const count=section.title.match(/\b(una|dos|tres|cuatro|cinco|\d+) plazas?\b/i)?.[1].toLowerCase();
    const places=count?({una:1,dos:2,tres:3,cuatro:4,cinco:5} as Record<string,number>)[count]??Number(count):null;
    call.places=places&&places>0?places:null;call.group=section.title.match(/\bnivel\s+([A-E])\b/i)?.[1].toUpperCase()??'Sin clasificar';
    const deadlineLine=section.text.split('\n').find(line=>/plazo de presentaci[oó]n de solicitudes/i.test(line));
    const date=deadlineLine?.match(/\bal\s+(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
    if(date){const month=months.indexOf(normalize(date[2]))+1;if(month)call.deadline=parseDate(`${date[1]}/${month}/${date[3]}`);}
    const phase=normalize(linkList(load(section.html),'a[href]',url).map(link=>link.title).join('\n'));
    call.status=/(?:^|\n)[-\s]*(?:nombramiento|proceso finalizado|lista definitiva de personas aprobadas)/.test(phase)?'Cerrada':/lista (?:provisional|definitiva).*admitidas/.test(phase)?'En curso':call.deadline?call.deadline<now.slice(0,10)?'Cerrada':'Abierta':'Pendiente de confirmar';
    call.description='Proceso de acceso público publicado por el Parlamento de Navarra. Consulta las bases para conocer los requisitos, las pruebas y el programa íntegro.';
    call.documents=[{...bases,kind:'bases',checkedAt:null,sha256:null}];call.sourceHash=hash(section.title+section.html);
    calls.push(callSchema.parse(call));
  }
  return calls;
}

export function enrichParliamentRequirements(call:Call,text:string,url:string):Call{
  // Isolate the mandatory education paragraph, before nationality/health and
  // later application forms. Do not derive degrees from the job or syllabus.
  const education=text.match(/(?:^|\n)\s*c\)\s*((?:Hallarse|Estar) en posesi[oó]n[\s\S]*?)(?=\n\s*\n|\n\s*d\)|$)/i)?.[1];
  if(education){call.educationText=clean(education);call.acceptedQualifications=universityRequirementIds(call.educationText);}
  const programme=/^Parte 1\.–Parte general\./m.test(text)?text.replace(/^ANEXO II[ \t]*$/m,'TEMARIO'):text;
  const topics=extractTopics(programme);
  if(topics.length){call.topics=topics;call.syllabusUrl=url;}
  return call;
}

export async function scrapeNavarraParliament(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const index=load(await client.text(PARLIAMENT_LIST)),year=Number(now.slice(0,4));
  const pages=linkList(index,'.field-name-body a[href]',PARLIAMENT_LIST).filter(link=>{
    const target=new URL(link.url),n=Number(link.title.match(/^Ejercicio\s+(\d{4})$/i)?.[1]);
    return target.origin===new URL(PARLIAMENT_LIST).origin&&n>=year-1&&n<=year;
  });
  if(!pages.length)throw new Error('Parliament recent annual pages are missing');
  const calls:Call[]=[];
  for(const page of new Map(pages.map(page=>[page.title,page])).values()){
    const entries=parseParliamentYear(await client.text(page.url),page.url,now);
    for(const call of entries){
      const doc=call.documents[0];
      try{
        let text:string;
        if(/\.pdf$/i.test(new URL(doc.url).pathname)){const pdf=await pdfText(client,doc.url);text=pdf.text;doc.sha256=pdf.sha256;}
        else{const html=await client.text(doc.url),$=load(html);const paragraphs=$('p[class^="foral-"]').map((_,node)=>clean($(node).text())).get();if(!paragraphs.length)throw new Error('Parliament BON paragraphs are missing');text=paragraphs.join('\n\n');doc.sha256=hash(html);}
        doc.checkedAt=now;enrichParliamentRequirements(call,text,doc.url);
      }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}
      calls.push(callSchema.parse(call));
    }
  }
  return calls;
}
