import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';
import {OfficialClient} from './scrapers/http';
import {normalize} from '../src/lib/catalogue';
const ENDPOINT='https://data.le64.fr/api/explore/v2.1/catalog/datasets/communes-64/records';
const rowSchema=z.object({nom:z.string().min(1),code_insee:z.string().regex(/^64\d{3}$/),siren_epci:z.literal('200067106')});
const pageSchema=z.object({total_count:z.number().int().min(150).max(200),results:z.array(rowSchema)});
const inventorySchema=z.array(z.object({id:z.string(),name:z.string(),territory:z.string(),province:z.string().nullable(),status:z.string(),officialCode:z.string().optional(),aliases:z.array(z.string()).optional()}).passthrough());
const key=(value:string)=>normalize(value).replace(/[^a-z0-9]/g,'');
async function main(){
  const file=resolve('docs/inventory/municipalities.json'),inventory=inventorySchema.parse(JSON.parse(await readFile(file,'utf8')));
  const client=new OfficialClient(resolve(process.env.SCRAPE_CACHE_DIR??'data/scrape-cache'));
  try{
    let rows:z.infer<typeof rowSchema>[]=[];
    if(process.argv[2]){
      const input:unknown=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
      if(Array.isArray(input)){
        rows=z.array(rowSchema).min(150).max(200).parse(input.filter(row=>row&&typeof row==='object'&&row.siren_epci==='200067106'));
      }else{
        const data=pageSchema.parse(input);
        if(data.results.length!==data.total_count)throw new Error('Incomplete input dataset');
        rows=data.results;
      }
    }else{
      let total:number|undefined;
      do{
        const url=new URL(ENDPOINT);url.searchParams.set('where',"siren_epci='200067106'");url.searchParams.set('limit','100');url.searchParams.set('offset',String(rows.length));url.searchParams.set('order_by','code_insee');
        const page=pageSchema.parse(JSON.parse(await client.text(url.href)));
        if(total!==undefined&&total!==page.total_count)throw new Error('Directory changed during pagination');
        total=page.total_count;
        if(!page.results.length)throw new Error('Incomplete directory pagination');
        rows.push(...page.results);
      }while(rows.length<total);
      if(rows.length!==total)throw new Error('Unexpected directory page size');
    }
    const updated=rows.map(row=>{
      const names=[row.nom,...(row.nom==='Arraute-Charritte'?['Arruate-Charritte']:[])].map(key);
      const matches=inventory.filter(item=>item.territory==='País Vasco francés'&&(item.officialCode===row.code_insee||[item.name,...(item.aliases??[])].some(name=>names.includes(key(name)))));
      if(matches.length>1)throw new Error(`Ambiguous commune: ${row.nom}`);
      const old=matches[0];
      return {...old,id:old?.id??`municipality-iparralde-${row.code_insee}`,name:row.nom,territory:'País Vasco francés',province:old?.province??null,type:'municipality',status:old?.status??'pending',sourceIds:old?.sourceIds??[],officialCode:row.code_insee,aliases:[...new Set([...(old?.aliases??[]),...(old&&old.name!==row.nom?[old.name]:[])])],directoryStatus:'verified',directoryUrl:ENDPOINT,directoryCheckedAt:new Date().toISOString(),note:'64 departamenduko datu ofizialetan CAPBko kide gisa egiaztatua (SIREN 200067106). Enplegu-atariaren estaldura bereizita egiaztatu behar da.'};
    });
    if(new Set(updated.map(item=>item.officialCode)).size!==updated.length)throw new Error('Duplicate INSEE codes');
    if(inventory.some(item=>item.territory==='País Vasco francés'&&!updated.some(other=>other.id===item.id)))throw new Error('Some existing communes require manual reconciliation');
    const combined=[...inventory.filter(item=>item.territory!=='País Vasco francés'),...updated];
    if(new Set(combined.map(item=>item.id)).size!==combined.length)throw new Error('Duplicate inventory IDs');
    await writeFile(file+'.tmp',JSON.stringify(combined,null,2)+'\n');await rename(file+'.tmp',file);console.log(JSON.stringify({verifiedIparralde:updated.length,total:combined.length}));
  }finally{await client.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Commune synchronization failed');process.exitCode=1;});
