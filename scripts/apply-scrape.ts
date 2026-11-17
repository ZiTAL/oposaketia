import { readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { z } from 'zod';
import { saveCalls } from './import';
import { recordReport } from './scrape';
const reportsSchema=z.object({sources:z.array(z.object({id:z.enum(['euskadi','navarra','cdg64']),attemptedAt:z.iso.datetime(),succeededAt:z.iso.datetime().nullable(),status:z.enum(['ok','partial','error']),count:z.number().int().nonnegative(),warnings:z.array(z.string()),warningCount:z.number().int().nonnegative(),error:z.string().optional()}))});
async function apply(){
 for(const folder of process.argv.slice(2).length?process.argv.slice(2):['data/imports']){
  const dir=resolve(folder);const reports=reportsSchema.parse(JSON.parse(await readFile(join(dir,'scrape-report.json'),'utf8')));
  await saveCalls(JSON.parse(await readFile(join(dir,'catalogue.json'),'utf8')));
  for(const report of reports.sources)await recordReport(report);
 }
}
apply().catch(error=>{console.error(error instanceof Error?error.message:'No se pudo aplicar la importación');process.exitCode=1;});
