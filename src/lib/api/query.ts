import { effectiveStatus,normalize,assess,defaultProfile,type Call } from '../catalogue';
import {sortChoices} from './contracts';
import {categoryChoices,provinceChoices,qualifications,statusChoices,territories} from '../catalogue';
import {sources} from '../../../scripts/sources';
export const filterDefinitions = {
 province:provinceChoices, category:categoryChoices, status:statusChoices, territory:territories,
 source:sources.map(source=>source.id), qualification:qualifications.map(qualification=>qualification.id),
} as const;

export class InvalidQuery extends Error {}
export function parseListQuery(params:URLSearchParams){
 const allowed=new Set(['q','page','limit','sort',...Object.keys(filterDefinitions)]);
 for(const key of params.keys())if(!allowed.has(key))throw new InvalidQuery(`Unknown parameter: ${key}`);
 function scalar(key:string,fallback:string){const all=params.getAll(key);if(all.length>1)throw new InvalidQuery(`Parameter ${key} cannot be repeated`);return all[0]??fallback;}
 function integer(key:string,fallback:string,max:number){const value=scalar(key,fallback);if(!/^[1-9]\d*$/.test(value)||Number(value)>max)throw new InvalidQuery(`${key} must be an integer between 1 and ${max}`);return Number(value);}
 const page=integer('page','1',100000),limit=integer('limit','20',200),q=scalar('q','').trim(),sort=scalar('sort','title');
 if(q.length>200)throw new InvalidQuery('q must not exceed 200 characters');
 if(!sortChoices.some(value=>value===sort))throw new InvalidQuery('Invalid sort order');
 const filters=Object.fromEntries(Object.entries(filterDefinitions).map(([key,choices])=>{const values=[...new Set(params.getAll(key))];if(values.length>choices.length||values.some(value=>!(choices as readonly string[]).includes(value)))throw new InvalidQuery(`Invalid value for ${key}`);return[key,values];})) as Record<keyof typeof filterDefinitions,string[]>;
 return {page,limit,q,sort:sort as typeof sortChoices[number],...filters};
}
export function selectCalls(calls:Call[],query:ReturnType<typeof parseListQuery>){
 const matches=(values:string[],value:string)=>!values.length||values.includes(value);
 const filtered=calls.filter(call=>matches(query.province,call.province??'Sin concretar')&&matches(query.category,call.category)&&matches(query.status,effectiveStatus(call))&&matches(query.territory,call.territory)&&matches(query.source,call.sourceId??'')&&(!query.qualification.length||assess(call,{...defaultProfile,qualifications:query.qualification as typeof defaultProfile.qualifications}).education)&&(!query.q||normalize(`${call.title} ${call.organization} ${call.location} ${call.province??''}`).includes(normalize(query.q))));
 const ranked=['Abierta','Próximamente','En curso','Calendario','Pendiente de confirmar','Cerrada','Ejemplo'];
 const ordered=filtered.toSorted((a,b)=>{
  const order=query.sort==='deadline'?(a.deadline??'9999').localeCompare(b.deadline??'9999'):query.sort==='province'?(a.province??'zzz').localeCompare(b.province??'zzz'):query.sort==='status'?ranked.indexOf(effectiveStatus(a))-ranked.indexOf(effectiveStatus(b)):a.title.localeCompare(b.title,'es');
  return order||a.title.localeCompare(b.title,'es')||a.id.localeCompare(b.id);
 });
 const start=(query.page-1)*query.limit;
 return {calls:ordered.slice(start,start+query.limit).map(call=>({...call,status:effectiveStatus(call)})),pagination:{page:query.page,limit:query.limit,total:ordered.length,pages:Math.ceil(ordered.length/query.limit)}};
}
