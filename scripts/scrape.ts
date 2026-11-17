import { mkdir, writeFile, rename } from 'node:fs/promises';
import { basename, resolve, join } from 'node:path';
import { Pool } from 'pg';
import { catalogueSchema, type Call } from '../src/lib/catalogue';
import { saveCalls } from './import';
import { OfficialClient } from './scrapers/http';
import { scrapeEuskadi } from './scrapers/euskadi';
import { scrapeNavarra } from './scrapers/navarra';
import { scrapeCdg64 } from './scrapers/cdg64';
import { scrapeEitb } from './scrapers/eitb';
import { scrapeAraba } from './scrapers/araba';
import { scrapeDonostia } from './scrapers/donostia';
import { scrapeEhu } from './scrapers/ehu';
import { scrapeIvap } from './scrapers/ivap';
import { scrapeOsakidetza } from './scrapers/osakidetza';

import { scrapeEuskotren } from './scrapers/euskotren';
import { scrapeVitoria } from './scrapers/vitoria';
import { scrapeLanbide } from './scrapers/lanbide';
import { sources } from './sources';
export type SourceReport = { id:string; attemptedAt:string; succeededAt:string|null; status:'ok'|'partial'|'error'; count:number; warnings:string[]; warningCount:number; error?:string };
export async function recordReport(report:SourceReport) {
  if(!process.env.DATABASE_URL)return;
  const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
  try{
    await pool.query('CREATE TABLE IF NOT EXISTS scrape_sources (id text PRIMARY KEY, last_success timestamptz, report jsonb NOT NULL)');
    await pool.query(`INSERT INTO scrape_sources (id,last_success,report) VALUES ($1,$2,$3::jsonb)
      ON CONFLICT(id) DO UPDATE SET last_success=COALESCE(EXCLUDED.last_success,scrape_sources.last_success), report=EXCLUDED.report`,[report.id,report.succeededAt,JSON.stringify(report)]);
  }finally{await pool.end();}
}
export async function runScrape(selected=process.env.SCRAPE_SOURCES??'euskadi,eitb,araba,donostia,ehu,ivap,osakidetza,euskotren,vitoria,lanbide,navarra,cdg64') {
  const selectedIds=selected.split(',').map(x=>x.trim());
  if(selectedIds.some(id=>!sources.some(s=>s.id===id)))throw new Error('SCRAPE_SOURCES contiene un identificador desconocido');
  const now=new Date().toISOString();const since=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  const dir=resolve(process.env.SCRAPE_OUTPUT_DIR??'data/imports');await mkdir(dir,{recursive:true});
  const client=new OfficialClient(resolve(process.env.SCRAPE_CACHE_DIR??'data/scrape-cache'));
  const reports:SourceReport[]=[];const calls:Call[]=[];
  try {
    for(const source of sources.filter(s=>selectedIds.includes(s.id))){
      const report:SourceReport={id:source.id,attemptedAt:new Date().toISOString(),succeededAt:null,status:'error',count:0,warnings:[],warningCount:0};
      const warn=(message:string)=>{report.warningCount++;if(report.warnings.length<30)report.warnings.push(message);console.warn(`[${source.id}] ${message}`);};
      console.log(`[${source.id}] Consultando fuente oficial…`);
      try{
        const extractors:Record<string,()=>Promise<Call[]>>={
          lanbide:()=>scrapeLanbide(client,now,warn),vitoria:()=>scrapeVitoria(client,now,warn),euskotren:()=>scrapeEuskotren(client,now),euskadi:()=>scrapeEuskadi(client,now,since,warn),navarra:()=>scrapeNavarra(client,now,warn),cdg64:()=>scrapeCdg64(client,now,warn),
          eitb:()=>scrapeEitb(client,now,warn),araba:()=>scrapeAraba(client,now,warn),donostia:()=>scrapeDonostia(client,now,warn),
          ehu:()=>scrapeEhu(client,now,warn),ivap:()=>scrapeIvap(client,now,warn),osakidetza:()=>scrapeOsakidetza(client,now,warn),
        };
        const extracted=await extractors[source.id]();
        const unique=catalogueSchema.parse([...new Map(extracted.map(call=>[call.id,call])).values()]);
        if(process.env.DATABASE_URL)await saveCalls(unique);
        calls.push(...unique);report.count=unique.length;report.succeededAt=new Date().toISOString();report.status=report.warningCount?'partial':'ok';
        console.log(`[${source.id}] ${unique.length} fichas incorporadas; ${report.warningCount} incidencias.`);
      }catch(error){report.error=error instanceof Error?error.message:'Error desconocido';console.error(`[${source.id}] ${report.error}`);}
      reports.push(report);await recordReport(report);
    }
  } finally {await client.close();}
  // A per-run export, never used to delete records from failed sources.
  await writeFile(join(dir,'catalogue.json.tmp'),JSON.stringify(calls,null,2));await rename(join(dir,'catalogue.json.tmp'),join(dir,'catalogue.json'));
  await writeFile(join(dir,'scrape-report.json.tmp'),JSON.stringify({startedAt:now,finishedAt:new Date().toISOString(),requests:client.requests,sources:reports},null,2));await rename(join(dir,'scrape-report.json.tmp'),join(dir,'scrape-report.json'));
  return reports;
}
if(['scrape.ts','scrape.js'].includes(basename(process.argv[1]??''))){
  runScrape().then(reports=>{if(reports.some(r=>r.status==='error'))process.exitCode=1;}).catch(error=>{console.error(error instanceof Error?error.message:'Error de scraping');process.exitCode=1;});
}
