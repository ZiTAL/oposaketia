import {load} from 'cheerio';
import {normalize} from '../../src/lib/catalogue';
import {clean} from './shared';

export const communeKey=(value:string)=>normalize(value).replace(/[^a-z0-9]/g,'');

export function parseCapbMunicipalWebsite(html:string,expectedName:string):string|null{
  const $=load(html);
  if(communeKey(clean($('h1').first().text()))!==communeKey(expectedName))throw new Error('Municipality heading does not match the inventory');
  const references=$('p.picto_site_internet a[href]').toArray().map(element=>$(element).attr('href')!).filter(Boolean);
  if(!references.length)return null;
  if(new Set(references).size!==1)throw new Error('Ambiguous municipal website references');
  const url=new URL(references[0]);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid published municipal website');
  return url.href;
}
