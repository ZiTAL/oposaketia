import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, educationIds, stableId } from './shared';
export const EUSKOTREN_HOME='https://euskotren.iformalia.es/';

// Decode only string data embedded by the public Vue site; never execute its JavaScript.
export function parseEuskotrenBundle(bundle:string,now:string):Call[]{
 const literals=[...bundle.matchAll(/JSON\.parse\('((?:\\.|[^'\\])*)'\)/g)];
 let offers:Record<string,{slug:string;title:string;description:string;bases:string}>|undefined;
 for(const match of literals){const value=JSON.parse(match[1].replace(/\\(['\\])/g,'$1'));if(value.offers){offers=value.offers;break;}}
 if(!offers)throw new Error('No se reconoce el catálogo público de Euskotren');
 return Object.values(offers).map(offer=>{
  const url=new URL('/oferta/'+encodeURIComponent(offer.slug),EUSKOTREN_HOME).href;
  const call=baseCall('euskotren',url,now,'Euskadi');const $=load(offer.description);
  call.id=stableId('euskotren',offer.slug);call.title=offer.title;call.organization='Euskotren';
  call.description=clean($.text());
  const heading=$('h2').filter((_,el)=>/CONDICIONES PARA EL ACCESO/i.test($(el).text())).first();
  const requirements=heading.nextUntil('h2').map((_,el)=>clean($(el).text())).get().filter(Boolean);
  call.requirements=requirements.length?requirements:call.requirements;
  call.educationText=requirements.find(text=>/titulaci[oó]n|grado|graduado|formaci[oó]n profesional/i.test(text))||call.educationText;
  call.acceptedQualifications=educationIds(call.educationText);
  const bases=new URL(offer.bases);
  if(bases.protocol!=='https:'||bases.hostname!=='adeccoagencia.iformalia.es'||bases.searchParams.get('app')!=='Euskotren')throw new Error('Enlace de bases ajeno a Euskotren');
  call.documents=[{title:'Oinarriak eta materialak / Bases y materiales',url:bases.href,kind:'bases',checkedAt:now,sha256:null}];
  call.sourceHash=hash(offer.description);return callSchema.parse(call);
 });
}
export async function scrapeEuskotren(client:OfficialClient,now:string):Promise<Call[]>{
 const $=load(await client.text(EUSKOTREN_HOME));
 const script=$('script[src]').map((_,el)=>$(el).attr('src')).get().find(src=>/^\/js\/app\.[\w]+\.js$/.test(src));
 if(!script)throw new Error('No se encuentra el catálogo público de Euskotren');
 const calls=parseEuskotrenBundle(await client.text(new URL(script,EUSKOTREN_HOME).href),now);
 if(!calls.length)throw new Error('El catálogo público de Euskotren no contiene puestos');return calls;
}
