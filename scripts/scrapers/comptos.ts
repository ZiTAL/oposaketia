import {load} from 'cheerio';import {callSchema,normalize,type Call} from '../../src/lib/catalogue';import {OfficialClient,hash} from './http';import {baseCall,categoryFor,clean,linkList} from './shared';import {enrichMunicipalBases} from './municipal-requirements';
export const COMPTOS_LIST='https://camaradecomptos.navarra.es/es/transparencia/empleo-publico';
export function parseComptos(html:string,now:string):Call[]{
 const $=load(html);if(normalize(clean($('h1').first().text()))!=='empleo publico')throw new Error('Comptos official employment heading missing');
 const calls:Call[]=[];const year=Number(now.slice(0,4));
 $('.column-content > p').each((_,node)=>{
  const paragraph=$(node),published=clean(paragraph.text());if(!/^Convocatoria para la provisión/.test(published)||/traslado|restringid|promocion interna/.test(normalize(published)))return;
  const links=linkList(load($.html(paragraph)),'a[href]',COMPTOS_LIST).filter(link=>{const url=new URL(link.url),m=url.pathname.match(/^\/es\/anuncio\/-\/texto\/(\d{4})\/\d+\/\d+$/);return url.origin==='https://bon.navarra.es'&&!url.search&&!url.hash&&m&&Number(m[1])>=year-1&&Number(m[1])<=year;});
  const unique=[...new Map(links.map(link=>[link.url,link])).values()];if(!unique.length)return;if(unique.length!==1)throw new Error('Comptos has ambiguous recent legal bases references');
  const titleNode=paragraph.clone();titleNode.find('a').remove();const title=clean(titleNode.text());if(!/camara de comptos/.test(normalize(title)))throw new Error('Comptos recruitment issuer not confirmed');
  const call=baseCall('comptos',unique[0].url,now,'Navarra');call.title=title;call.organization=/universidad publica de navarra/.test(normalize(title))?'Cámara de Comptos de Navarra / Universidad Pública de Navarra':'Cámara de Comptos de Navarra';call.location='Navarra';call.province='Navarra';call.category=categoryFor(title);
  const row=paragraph.closest('.row-wrapper');
  const scope=row.length&&row.find('p').filter((_,p)=>/^Convocatoria para la provisión/.test(clean($(p).text()))).length===1?row:paragraph.parent();
  if(scope.find('p').filter((_,p)=>/^Convocatoria para la provisión/.test(clean($(p).text()))).length!==1)throw new Error('Comptos process block no longer isolates one call');
  const captions=normalize(scope.find('a[href]').map((_,n)=>clean($(n).text())).get().join(' '));
  if(/nombramiento|relacion de aprobados/.test(captions))call.status='Cerrada';else if(/admitid|excluid|resultado|primer examen/.test(captions))call.status='En curso';
  call.documents=[{title:'Bases publicadas en el BON',url:unique[0].url,kind:'bases',checkedAt:null,sha256:null}];call.description='Convocatoria enlazada expresamente por la Cámara de Comptos, publicada en el BON en el ejercicio actual o anterior. Puede ser conjunta con la Universidad Pública de Navarra: consulta las plazas y requisitos de cada entidad. No se deducen plazos de inscripción de fechas de boletines ni se impone a todos los puestos el perfil de algunas plazas. El archivo anterior y los procedimientos restringidos quedan fuera.';
  call.sourceHash=hash($.html(scope));calls.push(callSchema.parse(call));
 });if(!calls.length)throw new Error('No recent Comptos public recruitment call recognized');return calls;
}
export async function scrapeComptos(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseComptos(await client.text(COMPTOS_LIST),now);
 for(const call of calls)for(const doc of call.documents){try{const html=await client.text(doc.url),$=load(html),paragraphs=$('p[class^="foral-"]').map((_,n)=>clean($(n).text())).get();if(paragraphs.length<10)throw new Error('BON article format requires review');enrichMunicipalBases(call,paragraphs.join('\n'),doc.url);doc.checkedAt=now;doc.sha256=hash(html);}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Bases unavailable'}`);}}
 return calls.map(call=>callSchema.parse(call));
}
