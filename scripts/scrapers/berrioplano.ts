import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,linkList,pdfText,stableId} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';
export const BERRIOPLANO_LIST='https://www.berrioplano.es/ayuntamiento/empleo-publico/';
export function parseBerrioplano(html:string,now:string):Call[]{
 const $=load(html),body=$('.contenido.content').filter((_,node)=>$(node).children('h3').length>0).first();
 if(!body.length)throw new Error('Berrioplano employment headings are missing');
 const calls:Call[]=[];
 body.children('h3').each((_,node)=>{
  const h=$(node),title=clean(h.text()),content=h.nextUntil('h3');if(/promocion interna|traslado|turno restringido/.test(normalize(title)))return;
  const section=load(content.toArray().map(node=>$.html(node)).join(''));
  const links=linkList(section,'a[href]',BERRIOPLANO_LIST);
  const ownPdf=(url:string)=>new URL(url).origin===new URL(BERRIOPLANO_LIST).origin&&/\.pdf$/i.test(new URL(url).pathname);
  const bases=links.find(link=>/^(?:convocatoria|bases)\b/i.test(link.title)&&ownPdf(link.url)&&!/admitid|excluid|resultado|prueba|examen|instancia/i.test(link.title));
  if(!bases)throw new Error('Berrioplano process has no recognized convocatoria document');
  const call=baseCall('berrioplano',BERRIOPLANO_LIST,now,'Navarra');call.id=stableId('berrioplano',bases.url);call.title=title;call.organization='Ayuntamiento de Berrioplano / Berriobeiti';call.location='Berrioplano / Berriobeiti';call.province='Navarra';call.category=categoryFor(title);
  const phase=normalize(links.map(link=>link.title).join(' '));
  if(/nombramiento|contratacion.*personas aprobadas/.test(phase))call.status='Cerrada';else if(/admitid|excluid|resultado|prueba|examen/.test(phase))call.status='En curso';
  call.description='Proceso publicado por el Ayuntamiento de Berrioplano / Berriobeiti, con sus propias bases y fase documental. No se calculan plazos relativos a partir de la fecha de publicación.';
  const amendments=links.filter(link=>link.url!==bases.url&&ownPdf(link.url)&&/(?:modificaci[oó]n|correcci[oó]n).*bases/i.test(link.title));
  call.documents=[bases,...amendments].map(link=>({...link,kind:'bases',checkedAt:null,sha256:null}));call.sourceHash=hash(title+section.html());calls.push(callSchema.parse(call));
 });return calls;
}
export async function scrapeBerrioplano(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseBerrioplano(await client.text(BERRIOPLANO_LIST),now);
 for(const call of calls)for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;if(pdf.text.trim().length<100)warn(`${doc.url}: Scanned bases; requirements and programme need manual review`);enrichMunicipalBases(call,pdf.text,doc.url);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
 return calls.map(call=>callSchema.parse(call));
}
