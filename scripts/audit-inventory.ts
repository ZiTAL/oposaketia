import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { catalogueSchema, normalize, type Call } from '../src/lib/catalogue';
import { callListSchema } from '../src/lib/api/contracts';
import municipalities from '../docs/inventory/municipalities.json';
import institutions from '../docs/inventory/institutions.json';

const entitySchema = z.object({id:z.string(),name:z.string(),territory:z.string(),province:z.string().nullable(),aliases:z.array(z.string()).optional()});
const aliases: Record<string,string[]> = {
  'Universidad del País Vasco':['EHU','UPV'],
  'Universidad Pública de Navarra':['UPNA','NUP'],
  'Euskal Irrati Telebista':['EITB','Grupo EITB'],
  'Orquesta de Euskadi':['Euskadiko Orkestra'],
  'Servicio Navarro de Salud Osasunbidea':['Servicio Navarro de Salud','Osasunbidea'],
  'Administración de la Comunidad Foral de Navarra':['Gobierno de Navarra','Navarrako Gobernua'],
  'Diputación Foral de Álava':['Diputación Foral de Araba'],
  'Diputación Foral de Gipuzkoa':['Gipuzkoako Foru Aldundia'],
  'Diputación Foral de Bizkaia':['Bizkaiko Foru Aldundia'],
};
function words(text:string) { return normalize(text).replace(/[^a-z0-9]+/g,' ').trim(); }
function matches(entity:z.infer<typeof entitySchema>,call:Call) {
  if (entity.territory !== call.territory) return false;
  // BON 2026/197/7 explicitly assigns this public call to Euskarabidea,
  // while the catalogue correctly names Función Pública as the publisher.
  if (entity.id === 'institution-euskarabidea'
    && call.sourceId === 'navarra'
    && call.sourceUrl === 'https://www.navarra.es/es/tramites/on/-/line/traductor-interprete-de-euskera-oposicion-2026'
    && normalize(call.title).includes('traductor/a-interprete de euskera')) return true;
  // Resolution 3773/2025 assigns all three sports posts to this institute.
  if (entity.id === 'institution-instituto-navarro-del-deporte'
    && call.sourceId === 'navarra'
    && call.sourceUrl === 'https://www.navarra.es/es/tramites/on/-/line/tecnico-superior-de-deporte-oposicion-2025'
    && normalize(call.title).includes('tecnico/a superior de deporte')) return true;
  // BON 2026/7/3 annex II assigns both youth posts to this institute.
  if (entity.id === 'institution-instituto-navarro-de-la-juventud'
    && call.sourceId === 'navarra'
    && call.sourceUrl === 'https://www.navarra.es/es/tramites/on/-/line/tecnico-superior-de-juventud-oposicion-2025'
    && normalize(call.title).includes('tecnico/a superior de juventud')) return true;
  const organization = ` ${words(call.organization)} `;
  const names = [entity.name,...(entity.aliases??[]),...(aliases[entity.name]??[])].flatMap(name => name.split('/')).map(words).filter(name => name.length>2);
  return names.some(name => organization.includes(` ${name} `));
}
async function readCatalogue() {
  if (process.argv[2]) return catalogueSchema.parse(JSON.parse(await readFile(resolve(process.argv[2]),'utf8')));
  const origin = process.env.INVENTORY_API_ORIGIN ?? 'http://127.0.0.1:8080';
  const calls: Call[] = [];
  for (let page=1; ;page++) {
    const response = await fetch(new URL(`/api/v1/calls?limit=200&page=${page}`,origin),{signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`Catalogue API: ${response.status}`);
    const result = callListSchema.parse(await response.json());
    calls.push(...result.calls);
    if (page >= result.pagination.pages) break;
    if (page >= 10000) throw new Error('Catalogue pagination exceeds inventory audit limit');
  }
  return calls;
}
async function main() {
  const calls = await readCatalogue();
  const entities = z.array(entitySchema).parse([...municipalities,...institutions]);
  if (new Set(entities.map(entity=>entity.id)).size!==entities.length) throw new Error('Duplicate inventory IDs');
  const results = entities.map(entity => {
    const records = calls.filter(call => matches(entity,call));
    return {...entity,status:records.length?'records-observed':'pending',calls:records.length,sourceIds:[...new Set(records.map(call=>call.sourceId).filter(Boolean))],callIds:records.map(call=>call.id)};
  });
  const report = {auditedAt:new Date().toISOString(),catalogueCalls:calls.length,total:results.length,withRecords:results.filter(entity=>entity.calls>0).length,pending:results.filter(entity=>entity.calls===0).length,note:'Observed records prove partial presence only, not complete source coverage. No matching records do not prove absence of vacancies.',entities:results};
  const dir=resolve(process.env.INVENTORY_OUTPUT_DIR??'data/imports/inventory-audit');
  await mkdir(dir,{recursive:true}); await writeFile(resolve(dir,'coverage.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({total:report.total,withRecords:report.withRecords,pending:report.pending,catalogueCalls:report.catalogueCalls,output:resolve(dir,'coverage.json')}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Inventory audit failed');process.exitCode=1;});
