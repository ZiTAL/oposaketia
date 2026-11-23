import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';
import {OfficialClient} from './scrapers/http';
import {normalize} from '../src/lib/catalogue';
const DATA='https://www.gazteaukera.euskadi.eus/contenidos/ds_registros/registro_entidades_locales/opendata/entidades.json';
const rowSchema=z.object({recName:z.string().min(1),entType:z.string(),municipalitycode:z.string(),territorycode:z.string(),webpage:z.string()});
const inventorySchema=z.array(z.object({id:z.string(),name:z.string(),territory:z.string(),province:z.string().nullable(),status:z.string(),aliases:z.array(z.string()).optional(),officialCode:z.string().optional()}).passthrough());
const provinces:Record<string,string>={'01':'Araba / Álava','20':'Gipuzkoa','48':'Bizkaia'};
const legacyNames:Record<string,string[]>={'Leaburu':['Leaburu-Txarama'],'Arrankudiaga-Zollo':['Arrankudiaga']};
const key=(value:string)=>normalize(value).replace(/[^a-z0-9]/g,'');
async function main(){
  const file=resolve('docs/inventory/municipalities.json');
  const inventory=inventorySchema.parse(JSON.parse(await readFile(file,'utf8')));
  const client=new OfficialClient(resolve(process.env.SCRAPE_CACHE_DIR??'data/scrape-cache'));
  try{
    const input=process.argv[2]?await readFile(resolve(process.argv[2]),'utf8'):await client.text(DATA);
    const rows=z.array(rowSchema).parse(JSON.parse(input)).filter(row=>row.entType==='Municipio');
    if(rows.length<200||rows.length>400)throw new Error('Unexpected municipality count; inventory has not been changed');
    const updated=rows.map(row=>{
      const territoryCode=row.territorycode.padStart(2,'0'),province=provinces[territoryCode];
      if(!province||!/^\d{1,3}$/.test(row.municipalitycode))throw new Error('Invalid municipality/province code');
      const code=territoryCode+row.municipalitycode.padStart(3,'0');
      const names=[row.recName,...row.recName.split('/'),...(legacyNames[row.recName]??[])].map(key);
      const matches=inventory.filter(item=>item.territory==='Euskadi'&&item.province===province&&(item.officialCode===code||[item.name,...item.name.split('/'),...(item.aliases??[])].some(name=>names.includes(key(name)))));
      if(matches.length>1)throw new Error(`Ambiguous municipality: ${row.recName}`);
      const old=matches[0];
      return {...old,id:old?.id??`municipality-euskadi-${code}`,name:row.recName,territory:'Euskadi',province,type:'municipality',status:old?.status??'pending',sourceIds:old?.sourceIds??[],officialCode:code,aliases:[...new Set([...(old?.aliases??[]),...(old&&old.name!==row.recName?[old.name]:[])])],directoryStatus:'verified',directoryUrl:DATA,directoryCheckedAt:new Date().toISOString(),websiteFromDirectory:row.webpage||null,note:'Izena eta web-erreferentzia erregistro ofizialean egiaztatuak. Enplegu-atariaren estaldura bereizita egiaztatu behar da.'};
    });
    const combined=[...inventory.filter(item=>item.territory!=='Euskadi'),...updated];
    if(new Set(combined.map(item=>item.id)).size!==combined.length||new Set(updated.map(item=>item.officialCode)).size!==updated.length)throw new Error('Duplicate municipality IDs or codes');
    const unmatched=inventory.filter(item=>item.territory==='Euskadi'&&!updated.some(other=>other.id===item.id));
    if(unmatched.length)throw new Error('Official dataset did not match every existing Euskadi municipality; manual reconciliation required');
    await writeFile(file+'.tmp',JSON.stringify(combined,null,2)+'\n');await rename(file+'.tmp',file);
    console.log(JSON.stringify({verifiedEuskadi:updated.length,added:updated.filter(item=>!inventory.some(old=>old.id===item.id)).length,total:combined.length}));
  }finally{await client.close();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Municipality synchronization failed');process.exitCode=1;});
