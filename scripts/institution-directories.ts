import {load} from 'cheerio';
import {normalize} from '../src/lib/catalogue';
import {allowedUrl} from './scrapers/http';
import {clean} from './scrapers/shared';
export const SECTOR_DIRECTORY='https://opendata.euskadi.eus/contenidos/ds_localizaciones/sector_publico_cae_y_entidades/opendata/sector-publico.json';
export const CPEN_DIRECTORY='https://www.sociedadespublicasdenavarra.es/es/sociedades-publicas';
export const directoryWords=(value:string)=>normalize(value).replace(/[^a-z0-9]+/g,' ').trim();
type Entity={name:string;aliases?:string[]};
export type SectorEntry={documentName:string;friendlyUrl:string};
export function sectorDirectoryMatches(entity:Entity,rows:SectorEntry[]):SectorEntry[]{
 const names=[entity.name,...(entity.aliases??[])].map(directoryWords).filter(name=>name.length>2);
 const matches=rows.filter(row=>{
  let url:URL;try{url=new URL(row.friendlyUrl);}catch{return false;}
  return url.origin==='https://www.euskadi.eus'&&url.pathname.startsWith('/entidad/')&&!url.username&&!url.password&&names.some(name=>` ${directoryWords(row.documentName)} `.includes(` ${name} `));
 });
 if(new Set(matches.map(row=>directoryWords(row.documentName))).size>1||matches.length>6)throw new Error('Ambiguous institution directory match');
 return [...new Map(matches.map(row=>[row.friendlyUrl,row])).values()];
}
function websiteUrl(value:string):string{
 const url=new URL(value.trim());
 if(url.protocol==='http:'&&!url.port)url.protocol='https:';
 // Directory links grant only this exact public hostname, never credentials,
 // local addresses, arbitrary ports or non-HTTPS protocols.
 return allowedUrl(url.href,[url.hostname]).href;
}
function singleWebsite(values:string[]):string|null{
 const urls=[...new Set(values.map(websiteUrl))];
 if(urls.length>1)throw new Error('Multiple company websites require review');return urls[0]??null;
}
export function parseSectorWebsite(html:string,expectedName:string):string|null{
 const $=load(html),title=directoryWords(clean($('title').text())),expected=directoryWords(expectedName);
 if(!title.startsWith(expected+' informacion financiera'))throw new Error('Sector directory page does not match its entity');
 const fields=$('.r01gLocDataSociedad').filter((_,node)=>directoryWords(clean($(node).find('.r01gCommonDataSociedadTittle').text()))==='sitio web');
 const values=fields.find('.r01gCommonDataSociedadContent a[href]').map((_,node)=>$(node).attr('href')!).get();
 // The official directory sometimes publishes this literal as an href.
 // It means no published website, not a malformed or inaccessible website.
 return singleWebsite(values.filter(value=>directoryWords(value)!=='no disponible'));
}
export function parseCpenWebsite(html:string,expectedBrand:string):string|null{
 const $=load(html);
 if(directoryWords(clean($('h1').first().text()))!==directoryWords(expectedBrand))throw new Error('CPEN directory page does not match its company');
 // The same class is used for email and telephone fields on some cards.
 return singleWebsite($('a.link-soc[href^="https://"], a.link-soc[href^="http://"]').map((_,node)=>$(node).attr('href')!).get());
}
