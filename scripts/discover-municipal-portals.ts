import {load} from 'cheerio';
import {readFile,mkdir,writeFile,rename,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {z} from 'zod';
import {OfficialClient,hash,allowedUrl,decodeOfficialText} from './scrapers/http';
import {looksLikeEmploymentLink,hasCookieReloadChallenge} from './employment-links';
const entry=z.object({id:z.string(),name:z.string(),territory:z.string(),directoryStatus:z.string().optional(),websiteDirectoryStatus:z.string().optional(),websiteFromDirectory:z.string().nullable().optional()}).refine(row=>row.directoryStatus==='verified'||row.websiteDirectoryStatus==='verified');
type Result={id:string;name:string;homepage:string|null;status:'candidates-found'|'no-link-found'|'unavailable';candidates:{title:string;url:string}[];checkedAt:string;fromCache?:boolean;hash?:string;error?:string};
function safeUrl(raw:string,base?:string){
 const url=new URL(raw,base);
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw new Error('HTTPS public URL required');
 url.pathname=url.pathname.replace(/;jsessionid=[^/;]+/ig,'');
 for(const key of [...url.searchParams.keys()])if(/token|session|state/i.test(key))url.searchParams.delete(key);
 return url;
}
async function inspect(item:z.infer<typeof entry>,inventory:'municipalities'|'institutions'):Promise<Result>{
 const result:Result={id:item.id,name:item.name,homepage:null,status:'unavailable',candidates:[],checkedAt:new Date().toISOString()};
 const raw=item.websiteFromDirectory?.trim();
 if(!raw){result.error='No website published in directory';return result;}
 let client:OfficialClient|undefined;
 try{
  const published=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);
  // Older official directories publish HTTP links. Probe HTTPS directly;
  // no unencrypted request or downgrade is made if the site lacks TLS.
  if(published.protocol==='http:'&&!published.port)published.protocol='https:';
  const url=safeUrl(published.href);
  const baseHost=url.hostname.replace(/^www\./,'');
  const hosts=[baseHost,'www.'+baseHost];
  allowedUrl(url.href,hosts);result.homepage=url.href;
  const cacheDir=resolve(`data/scrape-cache/${inventory==='institutions'?'institution':'municipal'}-discovery`);
  let html:string|undefined;
  if(process.argv.includes('--resume'))try{
    const path=join(cacheDir,hash(url.href)+'.json'),info=await stat(path);
    if(Date.now()-info.mtimeMs<86400000&&info.size<30_000_000){
      const cached=z.object({body:z.string(),type:z.string()}).parse(JSON.parse(await readFile(path,'utf8')));
      if(/text|html/i.test(cached.type)){html=decodeOfficialText(Buffer.from(cached.body,'base64'),cached.type);result.fromCache=true;result.checkedAt=info.mtime.toISOString();}
    }
  }catch{}
  if(html===undefined){
    client=new OfficialClient(cacheDir,500,{approvedHosts:hosts,timeoutMs:8000,maxAttempts:1,signal:AbortSignal.timeout(20000)});
    html=await client.text(url.href);
  }
  if(hasCookieReloadChallenge(html))throw new Error('Published homepage returns a JavaScript cookie/reload challenge; institutional content could not be inspected');
  const $=load(html);
  $('a[href]').each((_,node)=>{
   const title=$(node).text().replace(/\s+/g,' ').trim();
   if(!looksLikeEmploymentLink(title))return;
   try{
    const link=safeUrl($(node).attr('href')!,url.href);
    if(/login|autentic|signin|identificaci/i.test(link.pathname))return;
    if(!result.candidates.some(item=>item.url===link.href)&&result.candidates.length<15)result.candidates.push({title,url:link.href});
   }catch{}
  });
  result.hash=hash(html);result.status=result.candidates.length?'candidates-found':'no-link-found';
 }catch(error){result.error=error instanceof Error?error.message:'Public page unavailable';}
 finally{await client?.close();}
 return result;
}
async function main(){
 const inventory=z.enum(['municipalities','institutions']).parse(process.argv.find(value=>value.startsWith('--inventory='))?.slice('--inventory='.length)??'municipalities');
 const input=z.array(z.unknown()).parse(JSON.parse(await readFile(`docs/inventory/${inventory}.json`,'utf8')));
 const selectedTerritory=process.argv.find(value=>value.startsWith('--territory='))?.slice('--territory='.length);
 if(selectedTerritory&&!['Euskadi','Navarra','País Vasco francés'].includes(selectedTerritory))throw new Error('Unknown inventory territory');
 const items=input.flatMap(row=>{const parsed=entry.safeParse(row);return parsed.success&&parsed.data.websiteFromDirectory&&(!selectedTerritory||parsed.data.territory===selectedTerritory)?[parsed.data]:[];});
 let cursor=0,completed=0;const results:Result[]=[];
 const output=resolve(process.env.INVENTORY_DISCOVERY_OUTPUT??`data/imports/${inventory==='institutions'?'institution':'municipal'}-discovery`);await mkdir(output,{recursive:true});
 const save=async()=>{await writeFile(join(output,'portals.json.tmp'),JSON.stringify({checkedAt:new Date().toISOString(),note:'Candidate links only. No link found does not establish absence of vacancies. Unavailable pages remain pending.',total:items.length,processed:results.length,results:results.toSorted((a,b)=>a.id.localeCompare(b.id))},null,2)+'\n');await rename(join(output,'portals.json.tmp'),join(output,'portals.json'));};
 let checkpoint:Promise<void>=Promise.resolve();
 const checkpointNow=()=>{checkpoint=checkpoint.then(save);return checkpoint;};
 await Promise.all(Array.from({length:4},async()=>{while(cursor<items.length){const index=cursor++;results.push(await inspect(items[index],inventory));completed++;if(completed%10===0){console.log(`${completed}/${items.length} ${inventory} websites inspected`);await checkpointNow();}}}));
 await checkpoint;await save();console.log(JSON.stringify({total:items.length,candidates:results.filter(item=>item.status==='candidates-found').length,noLink:results.filter(item=>item.status==='no-link-found').length,unavailable:results.filter(item=>item.status==='unavailable').length,output:join(output,'portals.json')}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Municipal discovery failed');process.exitCode=1;});
