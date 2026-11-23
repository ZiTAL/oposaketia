import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,stableId} from './shared';
export const NEIKER_JOBS='https://neiker.eus/es/empleo/';
export function parseNeikerJobs(html:string,now:string):Call[]{
 const $=load(html),panels=$('.vc_tta-panel').filter((_,node)=>normalize(clean($(node).children('.vc_tta-panel-heading').find('.vc_tta-title-text').text()))==='ofertas activas');
 if(panels.length!==1)throw new Error('NEIKER active employment panel is not recognized');
 const body=panels.first().find('.vc_tta-panel-body .wpb_wrapper').first(),year=Number(now.slice(0,4));
 const sections:{code:string;title:string;html:string}[]=[];let section:typeof sections[number]|undefined,coded=0;
 body.children().each((_,node)=>{
  const title=clean($(node).text()),match=title.match(/^\((?:Cod\.\s*)?(\d{4})-(\d{2,3})\)\s*(.+)$/i);
  if($(node).is('h3')||match){
   section=undefined;if(!match)return;coded++;
   if(Number(match[1])<year-1||Number(match[1])>year+1)return;
   section={code:`${match[1]}-${match[2]}`,title,html:''};sections.push(section);
  }else if(section)section.html+=$.html(node);
 });
 if(!coded)throw new Error('NEIKER coded process headings are missing');
 if(new Set(sections.map(section=>section.code)).size!==sections.length)throw new Error('NEIKER repeats a process reference');
 return sections.map(section=>{
  const call=baseCall('neiker',NEIKER_JOBS,now,'Euskadi');call.id=stableId('neiker',section.code);call.title=section.title;call.organization='NEIKER';call.category=categoryFor(call.title);
  const phase=normalize(clean(load(section.html).text()));
  call.status=/listado final de puntuaciones|listado definitivo despues de la entrevista/.test(phase)?'Cerrada':/candidatur|puntuacion|entrevista|admitid|excluid/.test(phase)?'En curso':'Pendiente de confirmar';
  call.description='Proceso con referencia propia publicado por NEIKER en el panel de ofertas activas. Esa ubicación no confirma admisión de nuevas candidaturas. Los plazos de alegaciones corresponden a reclamaciones; consulta la documentación y las condiciones completas en la fuente oficial.';
  // The linked ZIP files are labelled as candidate/result lists. Preserve
  // the official process page without downloading or relabelling those as bases.
  call.sourceHash=hash(section.code+section.html);return callSchema.parse(call);
 });
}
export async function scrapeNeiker(client:OfficialClient,now:string):Promise<Call[]>{return parseNeikerJobs(await client.text(NEIKER_JOBS),now);}
