import {load} from 'cheerio';
import {allowedUrl} from './scrapers/http';
import {directoryWords} from './institution-directories';
import {clean} from './scrapers/shared';
export const NAVARRA_TRANSPARENCY={companies:'https://gobiernoabierto.navarra.es/es/transparencia/sociedades-publicas',foundations:'https://gobiernoabierto.navarra.es/es/transparencia/fundaciones-consorcios',institutions:'https://gobiernoabierto.navarra.es/es/transparencia/sector-publico-foral',agencies:'https://gobiernoabierto.navarra.es/es/transparencia/organismos-autonomos'} as const;
export type NavarraDirectoryKind=keyof typeof NAVARRA_TRANSPARENCY;
export type NavarraDirectoryEntry={name:string;brand:string;url:string|null;directoryUrl:string};
function publicWebsite(value:string,base?:string):string{
 const url=new URL(value,base);if(url.protocol==='http:'&&!url.port)url.protocol='https:';return allowedUrl(url.href,[url.hostname]).href;
}
export function parseNavarraTransparency(html:string,kind:NavarraDirectoryKind):NavarraDirectoryEntry[]{
 const $=load(html),expected={companies:'sociedades publicas',foundations:'fundaciones y consorcios',institutions:'sector publico foral',agencies:'organismos autonomos'}[kind];
 if(directoryWords(clean($('h1').first().text()))!==expected)throw new Error('Navarra transparency directory heading changed');
 const entries:NavarraDirectoryEntry[]=[];
 if(kind==='companies')$('tr').each((_,node)=>{
  const row=$(node),name=clean(row.children('td.views-field-field-nombre-entidad').text()),brand=clean(row.children('td.views-field-title').text());if(!name||!brand)return;
  const urls=[...new Set(row.find('td.views-field-field-web-transparencia a[href]').map((_,a)=>publicWebsite($(a).attr('href')!)).get())];if(urls.length>1)throw new Error('Company row has conflicting website references');
  entries.push({name,brand,url:urls[0]??null,directoryUrl:NAVARRA_TRANSPARENCY[kind]});
 });
 else $('.field a[href]').each((_,node)=>{
  const name=clean($(node).text()),words=directoryWords(name);
  const named=kind==='foundations'?/^fundacion\b/.test(words):kind==='agencies'?/^(?:instituto navarro|oficina de analisis|euskarabidea|hacienda foral|agencia navarra|servicio navarro|instituto de salud publica)\b/.test(words):/^(?:administracion de la comunidad foral de navarra|el parlamento de navarra|defensor del pueblo|camara de comptos|consejo de navarra|oficina de buenas practicas y anticorrupcion|universidad publica de navarra)\b/.test(words);
  if(!named)return;entries.push({name,brand:name,url:publicWebsite($(node).attr('href')!,NAVARRA_TRANSPARENCY[kind]),directoryUrl:NAVARRA_TRANSPARENCY[kind]});
 });
 if(!entries.length||entries.length>100)throw new Error('Unexpected Navarra directory row count');
 return [...new Map(entries.map(entry=>[directoryWords(entry.name),entry])).values()];
}
const brands:Record<string,string>={'institution-ciudad-agroalimentaria-de-tudela':'CAT','institution-instituto-navarro-de-inversiones':'INI'};
export function matchNavarraTransparency(entity:{id:string;name:string;aliases?:string[]},entries:NavarraDirectoryEntry[]):NavarraDirectoryEntry|null{
 const names=[entity.name,...(entity.aliases??[]),brands[entity.id]??''].map(directoryWords).filter(Boolean);
 const hits=entries.map(entry=>({entry,score:Math.max(0,...names.flatMap(name=>[entry.name,entry.brand].map(value=>{const text=directoryWords(value);return name===text?10000+name.length:` ${name} `.includes(` ${text} `)||` ${text} `.includes(` ${name} `)?Math.min(name.length,text.length):0;})))})).filter(hit=>hit.score>0);
 if(!hits.length)return null;const maximum=Math.max(...hits.map(hit=>hit.score)),best=hits.filter(hit=>hit.score===maximum);
 if(best.length!==1)throw new Error('Ambiguous Navarra transparency identity');return best[0].entry;
}
