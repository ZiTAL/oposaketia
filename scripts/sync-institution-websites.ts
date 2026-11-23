import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {load} from 'cheerio';
import {z} from 'zod';
import {OfficialClient} from './scrapers/http';
import {clean,linkList} from './scrapers/shared';
import {SECTOR_DIRECTORY,CPEN_DIRECTORY,directoryWords,sectorDirectoryMatches,parseSectorWebsite,parseCpenWebsite} from './institution-directories';

const entitySchema=z.object({id:z.string(),name:z.string(),territory:z.string(),aliases:z.array(z.string()).optional()}).passthrough();
type Entity=z.infer<typeof entitySchema>;
type Evidence={url:string;directoryUrl:string;directoryName:string};
type Report={id:string;name:string;status:'website-verified'|'no-directory-match'|'website-unpublished'|'needs-review'|'unavailable';evidence:Evidence[];error?:string};
const cpenBrands:Record<string,string>={
 'institution-ciudad-agroalimentaria-de-tudela':'CAT',
 'institution-instituto-navarro-de-inversiones':'INI',
};
function cpenMatch(entity:Entity,cards:{title:string;url:string}[]){
 const names=[entity.name,...(entity.aliases??[]),cpenBrands[entity.id]??''].map(directoryWords).filter(Boolean);
 const hits=cards.filter(card=>names.some(name=>` ${name} `.includes(` ${directoryWords(card.title)} `)));
 if(!hits.length)return [];
 const longest=Math.max(...hits.map(card=>directoryWords(card.title).length));
 const selected=hits.filter(card=>directoryWords(card.title).length===longest);
 if(selected.length!==1)throw new Error('Ambiguous CPEN company match');return selected;
}
async function main(){
 const territory=z.enum(['all','Euskadi','Navarra']).parse(process.env.INVENTORY_TERRITORY??'all');
 const path=resolve('docs/inventory/institutions.json'),original=await readFile(path,'utf8'),entities=z.array(entitySchema).parse(JSON.parse(original));
 if(entities.length!==213)throw new Error('Institution inventory count changed; review before writing');
 if(new Set(entities.map(entity=>entity.id)).size!==entities.length)throw new Error('Duplicate institutional inventory IDs');
 const client=new OfficialClient(resolve('data/scrape-cache/institution-directory'),500,{timeoutMs:15000,maxAttempts:2,signal:AbortSignal.timeout(600000)});
 const selected=entities.filter(entity=>territory==='all'||entity.territory===territory);
 const reports:Report[]=[],checkedAt=new Date().toISOString();
 try{
  let sector:{documentName:string;friendlyUrl:string}[]=[],cards:{title:string;url:string}[]=[],sectorError:string|undefined,cpenError:string|undefined;
  if(territory!=='Navarra'){
  console.log('Reading the official Euskadi sector directory');
  try{sector=z.array(z.object({documentName:z.string().min(1),friendlyUrl:z.string()})).min(200).max(2000).parse(JSON.parse(await client.text(SECTOR_DIRECTORY)));}
  catch(error){sectorError=error instanceof Error?error.message:'Directory unavailable';}
  }
  if(territory!=='Euskadi'){
  console.log('Reading the official CPEN company directory');
  try{const $=load(await client.text(CPEN_DIRECTORY));
  cards=[...new Map(linkList($,'a[href]',CPEN_DIRECTORY).flatMap(card=>{
   const url=new URL(card.url);url.pathname=url.pathname.replace(/^\/index\.php\//,'/');
   return url.origin===new URL(CPEN_DIRECTORY).origin&&/^\/es\/sociedades-publicas\/[^/]+$/.test(url.pathname)&&card.title?[{title:card.title,url:url.href}]:[];
  }).map(card=>[card.url,card])).values()];
  if(cards.length<10||cards.length>40)throw new Error('CPEN company directory structure changed');
  }catch(error){cpenError=error instanceof Error?error.message:'Directory unavailable';}
  }
  if((territory==='Euskadi'&&sectorError)||(territory==='Navarra'&&cpenError)||(sectorError&&cpenError))throw new Error('Selected institution directory sources are unavailable');
  // One client, sequential reads: preserve each directory host's crawl delay.
  for(const entity of selected){
   const report:Report={id:entity.id,name:entity.name,status:'no-directory-match',evidence:[]};reports.push(report);
   try{
    if(entity.territory==='Euskadi'){
     if(sectorError)throw new Error('Euskadi directory unavailable: '+sectorError);
     const entries=sectorDirectoryMatches(entity,sector);
     for(const entry of entries){const website=parseSectorWebsite(await client.text(entry.friendlyUrl),entry.documentName);if(website)report.evidence.push({url:website,directoryUrl:entry.friendlyUrl,directoryName:entry.documentName});}
     if(entries.length&&!report.evidence.length)report.status='website-unpublished';
    }
    if(entity.territory==='Navarra'&&cpenError)throw new Error('CPEN directory unavailable: '+cpenError);
    if(entity.territory==='Navarra')for(const entry of cpenMatch(entity,cards)){
     const website=parseCpenWebsite(await client.text(entry.url),entry.title);
     if(website)report.evidence.push({url:website,directoryUrl:entry.url,directoryName:entry.title});else report.status='website-unpublished';
    }
    const websites=[...new Set(report.evidence.map(evidence=>evidence.url))];
    if(websites.length>1){report.status='needs-review';report.error='Official directory entries publish different websites';}
    else if(websites.length===1){
     report.status='website-verified';const evidence=report.evidence[0];
     entity.websiteFromDirectory=evidence.url;entity.websiteDirectoryUrl=evidence.directoryUrl;entity.websiteDirectoryName=evidence.directoryName;
     entity.websiteDirectoryCheckedAt=new Date().toISOString();entity.websiteDirectoryStatus='verified';
    }
   }catch(error){report.error=error instanceof Error?error.message:'Directory page unavailable';report.status=/ambiguous|does not match|multiple|outside|fuera|changed/i.test(report.error)?'needs-review':'unavailable';}
   if(reports.length%20===0)console.log(`${reports.length}/${selected.length} institutional directory entries reviewed`);
  }
 }finally{await client.close();}
 const output=resolve(process.env.INVENTORY_INSTITUTION_OUTPUT??'data/imports/institution-directory');await mkdir(output,{recursive:true});
 const report={territory,checkedAt,finishedAt:new Date().toISOString(),note:'Official directory website links only; not evidence of complete employment coverage, current vacancies or legal classification.',total:reports.length,verified:reports.filter(row=>row.status==='website-verified').length,results:reports};
 await writeFile(join(output,'websites.json.tmp'),JSON.stringify(report,null,2)+'\n');await rename(join(output,'websites.json.tmp'),join(output,'websites.json'));
 if(await readFile(path,'utf8')!==original)throw new Error('Institution inventory changed during sync; the report was saved but existing edits were preserved');
 await writeFile(path+'.tmp',JSON.stringify(entities,null,2)+'\n');await rename(path+'.tmp',path);
 console.log(JSON.stringify({total:report.total,verified:report.verified,review:reports.filter(row=>row.status==='needs-review').length,unavailable:reports.filter(row=>row.status==='unavailable').length,output:join(output,'websites.json')}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Institution directory sync failed');process.exitCode=1;});
