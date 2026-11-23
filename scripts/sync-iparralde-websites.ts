import {load} from 'cheerio';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';
import {OfficialClient} from './scrapers/http';
import {communeKey,parseCapbMunicipalWebsite} from './scrapers/capb-directory';

const origin='https://www.communaute-paysbasque.fr';
const schema=z.array(z.object({id:z.string(),name:z.string(),territory:z.string()}).passthrough());

async function main(){
  const file=resolve('docs/inventory/municipalities.json');
  const inventory=schema.parse(JSON.parse(await readFile(file,'utf8')));
  const municipalities=inventory.filter(item=>item.territory==='País Vasco francés');
  if(municipalities.length!==158)throw new Error('Expected 158 communes; reconcile the inventory first');
  const client=new OfficialClient(resolve('data/scrape-cache'),500,{timeoutMs:20000,maxAttempts:1});
  try{
    const index=load(await client.text(origin+'/sitemap.xml'),{xml:true});
    const maps=index('loc').map((_,element)=>index(element).text()).get().filter(value=>{
      const url=new URL(value);return url.origin===origin&&url.searchParams.get('sitemap')==='communes';
    });
    if(maps.length!==1)throw new Error('Municipality sitemap not uniquely identified');
    const sitemap=load(await client.text(maps[0]),{xml:true});
    const urls=sitemap('loc').map((_,element)=>sitemap(element).text()).get().filter(value=>{
      const url=new URL(value);return url.origin===origin&&url.pathname.startsWith('/linstitution/les-infos-sur-ma-commune/ma-commune/');
    });
    const references=new Map(municipalities.map(item=>{
      const matches=urls.filter(value=>communeKey(new URL(value).pathname.split('/').at(-1)!)===communeKey(item.name));
      if(matches.length!==1)throw new Error(`Municipality sitemap mismatch: ${item.name}`);
      return [item.id,matches[0]];
    }));
    let processed=0,withWebsite=0,withoutWebsite=0,unavailable=0;
    for(const item of municipalities){
      const url=references.get(item.id)!;
      try{
        const website=parseCapbMunicipalWebsite(await client.text(url),item.name);
        item.websiteFromDirectory=website;item.websiteDirectoryUrl=url;item.websiteDirectoryCheckedAt=new Date().toISOString();
        if(website)withWebsite++;else withoutWebsite++;
      }catch(error){
        unavailable++;console.warn(`${item.name}: ${error instanceof Error?error.message:'Public directory page unavailable'}`);
      }
      processed++;if(processed%10===0)console.log(`${processed}/158 commune pages checked`);
    }
    await writeFile(file+'.tmp',JSON.stringify(inventory,null,2)+'\n');await rename(file+'.tmp',file);
    console.log(JSON.stringify({processed,withWebsite,withoutWebsite,unavailable}));
  }finally{await client.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'CAPB website synchronization failed');process.exitCode=1;});
