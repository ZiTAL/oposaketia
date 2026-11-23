import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';import {resolve,join} from 'node:path';
import {z} from 'zod';import {OfficialClient} from './scrapers/http';
import {NAVARRA_TRANSPARENCY,parseNavarraTransparency,matchNavarraTransparency,type NavarraDirectoryKind,type NavarraDirectoryEntry} from './navarra-transparency';
const schema=z.object({id:z.string(),name:z.string(),territory:z.string(),aliases:z.array(z.string()).optional()}).passthrough();
async function main(){
 const path=resolve('docs/inventory/institutions.json'),original=await readFile(path,'utf8'),entities=z.array(schema).parse(JSON.parse(original));
 if(entities.length!==213||new Set(entities.map(row=>row.id)).size!==213)throw new Error('Institution inventory count/identity changed');
 const client=new OfficialClient(resolve('data/scrape-cache/navarra-institution-directory'),500,{timeoutMs:15000,maxAttempts:1}),entries:NavarraDirectoryEntry[]=[],directories:{url:string;status:string;count:number;error?:string}[]=[];
 try{for(const [kind,url] of Object.entries(NAVARRA_TRANSPARENCY)){
  try{const found=parseNavarraTransparency(await client.text(url),kind as NavarraDirectoryKind);entries.push(...found);directories.push({url,status:'ok',count:found.length});}
  catch(error){directories.push({url,status:'unavailable',count:0,error:error instanceof Error?error.message:'Unavailable'});}
 }}finally{await client.close();}
 if(!entries.length)throw new Error('All Navarra transparency directories unavailable; inventory unchanged');
 const checkedAt=new Date().toISOString(),results=[];
 for(const entity of entities.filter(row=>row.territory==='Navarra')){
  try{const entry=matchNavarraTransparency(entity,entries);if(!entry){results.push({id:entity.id,name:entity.name,status:'no-directory-match'});continue;}
   if(!entry.url){results.push({id:entity.id,name:entity.name,status:'website-unpublished',evidence:entry});continue;}
   Object.assign(entity,{websiteFromDirectory:entry.url,websiteDirectoryUrl:entry.directoryUrl,websiteDirectoryName:entry.name,websiteDirectoryCheckedAt:checkedAt,websiteDirectoryStatus:'verified'});
   results.push({id:entity.id,name:entity.name,status:'website-verified',evidence:entry});
  }catch(error){results.push({id:entity.id,name:entity.name,status:'needs-review',error:error instanceof Error?error.message:'Identity review required'});}
 }
 const output=resolve(process.env.INVENTORY_NAVARRA_OUTPUT??'data/imports/navarra-institution-directory');await mkdir(output,{recursive:true});
 const report={checkedAt,note:'Official named website references only, not evidence of vacancies, complete employment coverage, or legal classification. Unmatched entries are outside these published lists or require other evidence; no website is deleted.',directories,total:results.length,verified:results.filter(row=>row.status==='website-verified').length,results};
 await writeFile(join(output,'websites.json.tmp'),JSON.stringify(report,null,2)+'\n');await rename(join(output,'websites.json.tmp'),join(output,'websites.json'));
 if(await readFile(path,'utf8')!==original)throw new Error('Inventory changed during sync; report saved, concurrent edits preserved');
 await writeFile(path+'.tmp',JSON.stringify(entities,null,2)+'\n');await rename(path+'.tmp',path);console.log(JSON.stringify({verified:report.verified,total:report.total,output}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Navarra directory sync failed');process.exitCode=1});
