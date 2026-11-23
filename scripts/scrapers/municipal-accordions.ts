import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,extractTopics,linkList,parseDate,pdfText,stableId,universityRequirementIds} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';
import {accordionMunicipalities,type AccordionMunicipality} from '../accordion-municipalities';
export function parseMunicipalAccordions(html:string,id:AccordionMunicipality,now:string):Call[]{
 const portal=accordionMunicipalities[id],$=load(html),body=$('.contenido.content').filter((_,node)=>$(node).children('.bloque').length>0).first();
 if(!body.length)throw new Error(`${id}: official employment accordion is missing`);
 const calls:Call[]=[];let closed=false;
 body.children().each((_,node)=>{
  const block=$(node);if(!block.hasClass('bloque')){if(/procesos cerrados|bukatuak/.test(normalize(clean(block.text()))))closed=true;return;}
  const title=clean(block.children('.bloque-tab').text()),content=block.children('.contenido-bloque');
  if(!title||content.length!==1)throw new Error(`${id}: incomplete employment block`);
  if(/traslado|promocion interna|turno restringido|barne.sustapen/.test(normalize(title)))return;
  const anchor=content.attr('id');if(!anchor||!/^[a-z0-9_-]+$/i.test(anchor))throw new Error(`${id}: invalid process anchor`);
  const section=load($.html(content)),text=clean(section.text()),links=linkList(section,'a[href]',portal.url);
  const call=baseCall(id,portal.url+'#'+anchor,now,'Navarra');call.id=stableId(id,anchor);call.title=title;call.organization=portal.name;call.location=portal.location;call.province='Navarra';call.category=categoryFor(title);
  const printed=text.match(/Fin plazo (?:de )?presentaci[oó]n (?:de )?solicitudes\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];call.deadline=printed?parseDate(printed):null;
  const phase=normalize(links.map(link=>link.title).join(' '));
  if(closed||call.deadline&&call.deadline<now.slice(0,10))call.status='Cerrada';
  else if(call.deadline)call.status='Abierta';
  else if(/admitid|excluid|resultado|onartuen|baztertuen|emaitzak/.test(phase))call.status='En curso';
  call.documents=links.filter(link=>{
   const u=new URL(link.url),label=normalize(link.title);if(u.username||u.password||u.port||u.protocol!=='https:')return false;
   const destination=u.origin===new URL(portal.url).origin&&/\.pdf$/i.test(u.pathname)||u.hostname==='bon.navarra.es'&&/^\/(?:es\/anuncio|eu\/iragarkia)\/-\/texto\/\d{4}\/\d+\/\d+$/.test(u.pathname);
   return destination&&/^(?:convocatoria|bases|deialdiaren oinarriak)\b/.test(label)&&!/instancia|solicitud|acta|admitid|excluid|tribunal|resultado|nombramiento|baremacion/.test(label);
  }).filter((link,index,all)=>all.findIndex(other=>other.url===link.url)===index).map(link=>({...link,kind:'bases',checkedAt:null,sha256:null}));
  call.description='Proceso publicado en el catálogo municipal, con su propio bloque documental. Los procesos en curso no implican inscripción abierta. No se calculan plazos relativos ni se deducen titulaciones del nombre del puesto. Los archivos enlazados desde otras páginas no están cubiertos.';
  call.sourceHash=hash($.html(block));calls.push(callSchema.parse(call));
 });
 if(!calls.length)throw new Error(`${id}: no public recruitment process recognized`);return calls;
}
export async function scrapeMunicipalAccordions(client:OfficialClient,id:AccordionMunicipality,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseMunicipalAccordions(await client.text(accordionMunicipalities[id].url),id,now);
 for(const call of calls){
  if(!call.documents.length)warn(`${call.sourceUrl}: No positively identified bases link; requirements and programme remain unconfirmed`);
  for(const doc of call.documents){try{
   if(new URL(doc.url).hostname==='bon.navarra.es'){
    const html=await client.text(doc.url);enrichAccordionBon(call,html,doc.url);doc.checkedAt=now;doc.sha256=hash(html);
   }else{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(pdf.text.trim().length<100)warn(`${doc.url}: Scanned bases need manual review`);enrichMunicipalBases(call,pdf.text,doc.url);}
  }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
 }
 return calls.map(call=>callSchema.parse(call));
}
export function enrichAccordionBon(call:Call,html:string,url:string):Call{
 const $=load(html),paragraphs=$('p[class^="foral-"]').map((_,node)=>clean($(node).text())).get();
 if(paragraphs.length<10)throw new Error('BON article body requires format review');
 const text=paragraphs.join('\n');enrichMunicipalBases(call,text,url);
 const minimum=text.match(/(?:^|\n)2[.–-]+(?:Izangaiek bete beharreko baldintzak|Baldintzak)\.[\s\S]*?(?=\n3[.–-]|$)/)?.[0];
 if(minimum){
  const degree=minimum.split('\n').find(p=>/^[a-z]\)/.test(p)&&/gradua|lizentzia|titulua/i.test(p)&&!/Euskara|euskaraz|C1|EGA/i.test(p));
  if(degree){call.educationText=degree;call.acceptedQualifications=universityRequirementIds(degree);}
  if(/Euskara jakitea\.[^\n]*C1 mailaren titulua/.test(minimum)){call.language={name:'euskera',level:'C1'};call.languageStatus='known';}
 }
 const start=paragraphs.findIndex(p=>/^(?:[IVX]+\. )?ERANSKINA[.–-]+GAI-ZERRENDA$/.test(p));
 if(start>=0){const programme=paragraphs.slice(start+1),end=programme.findIndex(p=>/^[IVX]+\. ERANSKINA/.test(p));const topics=extractTopics('TEMARIO\n'+programme.slice(0,end<0?undefined:end).join('\n'));if(topics.length){call.topics=topics;call.syllabusUrl=url;}}
 return call;
}
