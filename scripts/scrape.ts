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
import { scrapeCapb } from './scrapers/capb';
import { scrapeCpen } from './scrapers/cpen';
import { scrapeGipuzkoa } from './scrapers/gipuzkoa';
import { scrapeGobiernoVasco } from './scrapers/gobierno-vasco';
import { scrapeEmploiTerritorial } from './scrapers/emploi-territorial';
import { scrapeBizkaia } from './scrapers/bizkaia';
import { scrapeEjie } from './scrapers/ejie';
import { scrapeTracasa } from './scrapers/tracasa';
import { scrapeChcb } from './scrapers/chcb';
import { scrapeUppa } from './scrapers/uppa';
import { scrapeUliazpi } from './scrapers/uliazpi';
import { scrapeLantik } from './scrapers/lantik';
import { scrapeIfas } from './scrapers/ifas';
import { scrapeKabia } from './scrapers/kabia';
import { scrapeAlokabide } from './scrapers/alokabide';
import { scrapeMusikene } from './scrapers/musikene';
import { scrapeBiogipuzkoa } from './scrapers/biogipuzkoa';
import { sources } from './sources';
import { scrapeMunicipalGipuzkoa } from './scrapers/municipal-gipuzkoa';
import {municipalPortals,type MunicipalPortal} from './municipal-portals';
import {scrapeChoisirPublic} from './scrapers/choisir-public';
import {scrapeNavarrabiomed} from './scrapers/navarrabiomed';
import {scrapeGizain} from './scrapers/gizain';
import {scrapeItelazpi} from './scrapers/itelazpi';
import {scrapeBaluarte} from './scrapers/baluarte';
import {scrapeMiguelIndurain} from './scrapers/miguel-indurain';
import {scrapeNavarraParliament} from './scrapers/navarra-parliament';
import {scrapeOsatek} from './scrapers/osatek';
import {scrapeLaSecuRecrute} from './scrapers/la-secu-recrute';
import {scrapeLeioa} from './scrapers/leioa';
import {scrapeBerrioplano} from './scrapers/berrioplano';
import {scrapeOrkoien} from './scrapers/orkoien';
import {scrapeManeru} from './scrapers/maneru';
import {scrapeEuskalmet} from './scrapers/euskalmet';
import {scrapeNeiker} from './scrapers/neiker';
import {scrapeMunicipalAccordions} from './scrapers/municipal-accordions';
import {accordionMunicipalities,type AccordionMunicipality} from './accordion-municipalities';
import {scrapeRibera} from './scrapers/ribera';
import {scrapeMairaga} from './scrapers/mairaga';
import {scrapeDefensorNavarra} from './scrapers/defensor-navarra';
import {scrapeHazi} from './scrapers/hazi';
import {scrapeAngletTourisme} from './scrapers/anglet-tourisme';
import {scrapeBonLocal} from './scrapers/bon-local';
import {scrapeValdizarbe} from './scrapers/valdizarbe';
import {scrapeComptos} from './scrapers/comptos';
import {scrapeMcp} from './scrapers/mcp';
import {scrapeEgues} from './scrapers/egues';
import {scrapeArkaute} from './scrapers/arkaute';
import {scrapeTafalla} from './scrapers/tafalla';
import {scrapeBaranain} from './scrapers/baranain';
import {scrapeVillava} from './scrapers/villava';
import {scrapeOrkestra} from './scrapers/orkestra';
import {scrapeUnibasq} from './scrapers/unibasq';
import {scrapeUra} from './scrapers/ura';
import {scrapeTvcp} from './scrapers/tvcp';
import {scrapeArarteko} from './scrapers/ararteko';
import {scrapeEtxepare} from './scrapers/etxepare';
import {scrapeCrlLhk} from './scrapers/crl-lhk';
import {scrapeBos} from './scrapers/bos';
import {scrapeElankidetza} from './scrapers/elankidetza';
import {scrapeIvf} from './scrapers/ivf';
import {scrapeEts} from './scrapers/ets';
import {scrapeEkp} from './scrapers/ekp';
import {scrapeMobilityLab} from './scrapers/mobility-lab';
import {scrapeAad} from './scrapers/aad';
import {scrapeIndesa} from './scrapers/indesa';
import {scrapeNaturgolf} from './scrapers/naturgolf';
import {scrapeBeaz} from './scrapers/beaz';
import {scrapeFundapa} from './scrapers/fundapa';
import {scrapeMoncayo} from './scrapers/moncayo';
import {scrapeAllo} from './scrapers/allo';
import {scrapeAibar} from './scrapers/aibar';
import {scrapeAduna} from './scrapers/aduna';
import {scrapeAntzuola} from './scrapers/antzuola';
import {scrapeAretxabaleta} from './scrapers/aretxabaleta';
import {scrapeAblitas} from './scrapers/ablitas';
import {scrapeAgoitz} from './scrapers/agoitz';
import {scrapeArtajonaFamiliar} from './scrapers/artajona-familiar';
import {scrapeCaseda} from './scrapers/caseda';
import {scrapeAyegui} from './scrapers/ayegui';
import {scrapeEtxarriAux} from './scrapers/etxarri-aux';
import {scrapeEzcabarte2025} from './scrapers/ezcabarte-2025';
import {scrapeIturmendi2025} from './scrapers/iturmendi-2025';
import {scrapeIsaba} from './scrapers/isaba';
import {scrapeLarragaAdmin} from './scrapers/larraga-admin';
import {scrapeLarraona} from './scrapers/larraona';
import {scrapeLarraun} from './scrapers/larraun';
import {scrapeAnikoteLeitza} from './scrapers/anikote-leitza';
import {scrapeLeitzaAux2026} from './scrapers/leitza-aux-2026';
import {scrapeLerinServices2025} from './scrapers/lerin-services-2025';
import {scrapeLesakaPeoi2026} from './scrapers/lesaka-peoi-2026';
import {scrapeAmescoaBaja} from './scrapers/amescoa-baja';
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
export async function runScrape(selected=process.env.SCRAPE_SOURCES?.trim() || sources.map(source=>source.id).join(',')) {
  const selectedIds=selected==='all'?sources.map(source=>source.id):selected.split(',').map(x=>x.trim());
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
          ...Object.fromEntries(Object.keys(accordionMunicipalities).map(id=>[id,()=>scrapeMunicipalAccordions(client,id as AccordionMunicipality,now,warn)])),
          ribera:()=>scrapeRibera(client,now,warn),
          mairaga:()=>scrapeMairaga(client,now,warn),
          'defensor-navarra':()=>scrapeDefensorNavarra(client,now,warn),
          hazi:()=>scrapeHazi(client,now,warn),
          'anglet-tourisme':()=>scrapeAngletTourisme(client,now,warn),
          'bon-local':()=>scrapeBonLocal(client,now,warn),
          valdizarbe:()=>scrapeValdizarbe(client,now,warn),
          comptos:()=>scrapeComptos(client,now,warn),
          mcp:()=>scrapeMcp(client,now,warn),
          egues:()=>scrapeEgues(client,now,warn),
          arkaute:()=>scrapeArkaute(client,now,warn),
          tafalla:()=>scrapeTafalla(client,now,warn),
          baranain:()=>scrapeBaranain(client,now,warn),
          villava:()=>scrapeVillava(client,now,warn),
          orkestra:()=>scrapeOrkestra(client,now,warn),
          unibasq:()=>scrapeUnibasq(client,now,warn),
          ura:()=>scrapeUra(client,now,warn),
          tvcp:()=>scrapeTvcp(client,now,warn),
          ararteko:()=>scrapeArarteko(client,now,warn),
          etxepare:()=>scrapeEtxepare(client,now,warn),
          'crl-lhk':()=>scrapeCrlLhk(client,now),
          bos:()=>scrapeBos(client,now,warn),
          elankidetza:()=>scrapeElankidetza(client,now,warn),
          ivf:()=>scrapeIvf(client,now,warn),
          ets:()=>scrapeEts(client,now),
          ekp:()=>scrapeEkp(client,now,warn),
          'mobility-lab':()=>scrapeMobilityLab(client,now,warn),
          aad:()=>scrapeAad(client,now),
          indesa:()=>scrapeIndesa(client,now),
          naturgolf:()=>scrapeNaturgolf(client,now),
          beaz:()=>scrapeBeaz(client),
          fundapa:()=>scrapeFundapa(client,now),
          moncayo:()=>scrapeMoncayo(client,now),
          allo:()=>scrapeAllo(client,now),
          'amescoa-baja':()=>scrapeAmescoaBaja(client,now),
          aibar:()=>scrapeAibar(client,now),
          aduna:()=>scrapeAduna(client,now),
          antzuola:()=>scrapeAntzuola(client,now),
          aretxabaleta:()=>scrapeAretxabaleta(client,now),
          ablitas:()=>scrapeAblitas(client,now),
          agoitz:()=>scrapeAgoitz(client,now),
          'artajona-familiar':()=>scrapeArtajonaFamiliar(client,now),
          caseda:()=>scrapeCaseda(client,now),
          ayegui:()=>scrapeAyegui(client,now),
          'etxarri-aux':()=>scrapeEtxarriAux(client,now),
          'ezcabarte-2025':()=>scrapeEzcabarte2025(client,now),
          'iturmendi-2025':()=>scrapeIturmendi2025(client,now),
          isaba:()=>scrapeIsaba(client,now),
          'larraga-admin':()=>scrapeLarragaAdmin(client,now),
          larraona:()=>scrapeLarraona(client,now),
          larraun:()=>scrapeLarraun(client,now),
          'anikote-leitza':()=>scrapeAnikoteLeitza(client,now),
          'leitza-aux-2026':()=>scrapeLeitzaAux2026(client,now),
          'lerin-services-2025':()=>scrapeLerinServices2025(client,now),
          'lesaka-peoi-2026':()=>scrapeLesakaPeoi2026(client,now),
          euskalmet:()=>scrapeEuskalmet(client,now,warn),
          neiker:()=>scrapeNeiker(client,now),
          maneru:()=>scrapeManeru(client,now,warn),
          leioa:()=>scrapeLeioa(client,now,warn),
          berrioplano:()=>scrapeBerrioplano(client,now,warn),
          orkoien:()=>scrapeOrkoien(client,now,warn),
          osatek:()=>scrapeOsatek(client,now,warn),
          'la-secu-recrute':()=>scrapeLaSecuRecrute(client,now,warn),
          baluarte:()=>scrapeBaluarte(client,now),
          'miguel-indurain':()=>scrapeMiguelIndurain(client,now),
          'navarra-parliament':()=>scrapeNavarraParliament(client,now,warn),
          itelazpi:()=>scrapeItelazpi(client,now),
          gizain:()=>scrapeGizain(client,now,warn),
          navarrabiomed:()=>scrapeNavarrabiomed(client,now,warn),
          'choisir-public':()=>scrapeChoisirPublic(client,now,warn),
          biogipuzkoa:()=>scrapeBiogipuzkoa(client,now,warn),
          musikene:()=>scrapeMusikene(client,now),
          kabia:()=>scrapeKabia(client,now),alokabide:()=>scrapeAlokabide(client,now,warn),
          ...Object.fromEntries(Object.keys(municipalPortals).map(id=>[id,()=>scrapeMunicipalGipuzkoa(client,id as MunicipalPortal,now)])),
          ifas:()=>scrapeIfas(client,now),
          uliazpi:()=>scrapeUliazpi(client,now),lantik:()=>scrapeLantik(client,now,warn),
          uppa:()=>scrapeUppa(client,now),
          tracasa:()=>scrapeTracasa(client,now,warn),chcb:()=>scrapeChcb(client,now),
          ejie:()=>scrapeEjie(client,now,warn),
          bizkaia:()=>scrapeBizkaia(client,now,warn),
          'gobierno-vasco':()=>scrapeGobiernoVasco(client,now,warn),'emploi-territorial':()=>scrapeEmploiTerritorial(client,now,warn),
          cpen:()=>scrapeCpen(client,now,warn),gipuzkoa:()=>scrapeGipuzkoa(client,now,warn),
          capb:()=>scrapeCapb(client,now,warn),
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
