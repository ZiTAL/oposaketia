import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {load} from 'cheerio';
import {z} from 'zod';
import {OfficialClient} from './scrapers/http';
import {communeKey} from './scrapers/capb-directory';
import type {Province} from '../src/lib/geography';

const source='https://www.eke.eus/fr/culture-basque/pays-basque/pays-basque-nord-ou-iparralde/communes-du-pays-basque-nord';
const regions:Record<string,Province>={Labourd:'Lapurdi','Basse-Navarre':'Baja Navarra',Soule:'Zuberoa'};
// Published variants reconciled against the official departmental names.
const variants:Record<string,string>={'Les Aldudes':'Aldudes',Ibarolle:'Ibarrolle'};
const schema=z.array(z.object({id:z.string(),name:z.string(),territory:z.string(),province:z.string().nullable()}).passthrough());

async function main(){
  const file=resolve('docs/inventory/municipalities.json');
  const inventory=schema.parse(JSON.parse(await readFile(file,'utf8')));
  const client=new OfficialClient(resolve('data/scrape-cache'),500,{approvedHosts:['www.eke.eus','eke.eus'],maxAttempts:1,timeoutMs:20000});
  try{
    const html=process.argv[2]?await readFile(resolve(process.argv[2]),'utf8'):await client.text(source);
    const $=load(html),entries=new Map<string,{province:Province;publishedName:string}>();
    const headings=$('h3').toArray().filter(node=>regions[$(node).text().trim()]);
    if(headings.length!==3)throw new Error('Historical province lists are not uniquely identified');
    for(const heading of headings){
      const province=regions[$(heading).text().trim()],list=$(heading).next();
      if(!list.is('ol,ul'))throw new Error('Historical province list structure changed');
      for(const node of list.find('li').toArray()){
        const publishedName=$(node).text().trim(),key=communeKey(variants[publishedName]??publishedName);
        if(entries.has(key))throw new Error('Duplicate commune in historical classification');
        entries.set(key,{province,publishedName});
      }
    }
    if(entries.size<150||entries.size>180)throw new Error('Unexpected historical commune count');
    let classified=0;const unmatched:string[]=[];
    for(const item of inventory.filter(row=>row.territory==='País Vasco francés')){
      const entry=entries.get(communeKey(item.name));
      if(entry){
        if(item.province&&item.province!==entry.province)throw new Error(`Historical province conflicts with inventory: ${item.name}`);
        item.province=entry.province;item.provinceNameInSource=entry.publishedName;classified++;
      }else unmatched.push(item.name);
      item.provinceSource=source;item.provinceCheckedAt=new Date().toISOString();item.provinceClassification='historical-cultural';
      item.provinceLookupStatus=entry?'classified':'not-listed-in-source';
    }
    if(classified<150)throw new Error('Too few official communes matched; inventory has not been changed');
    await writeFile(file+'.tmp',JSON.stringify(inventory,null,2)+'\n');await rename(file+'.tmp',file);
    console.log(JSON.stringify({classified,unmatched,note:'Historical cultural classification; not French administrative provinces. Source communes outside the inventory are not added automatically.'}));
  }finally{await client.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Province synchronization failed');process.exitCode=1;});
