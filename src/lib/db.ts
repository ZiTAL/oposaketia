import { Pool } from 'pg';
import { cache } from 'react';
import { callSchema, catalogueSchema,normalizeCallQualifications } from './catalogue';
import demo from '../../data/demo.json';

const globalDb = globalThis as unknown as { oposaketiaPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  return globalDb.oposaketiaPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
}
export async function getCatalogue() {
  if (!process.env.DATABASE_URL) {
    if (process.env.DEMO_MODE !== 'true') throw new Error('Configura DATABASE_URL o activa DEMO_MODE=true');
    return catalogueSchema.parse(demo).map(normalizeCallQualifications);
  }
  // Lists do not need the full syllabus; individual pages retrieve the full document.
  const result = await getPool().query(`SELECT document - 'topics' - 'requirements' - 'documents' || '{"topics":[],"requirements":[],"documents":[]}'::jsonb AS document FROM calls ORDER BY document->>'title'`);
  const calls = catalogueSchema.parse(result.rows.map(row => row.document)).map(normalizeCallQualifications);
  return process.env.DEMO_MODE === 'true' ? calls : calls.filter(call => !call.isDemo);
}
export const getCall = cache(async (id: string) => {
  if (!process.env.DATABASE_URL) return (await getCatalogue()).find(call=>call.id===id);
  const result=await getPool().query('SELECT document FROM calls WHERE id=$1',[id]);
  if(!result.rows.length)return undefined;
  const call=normalizeCallQualifications(callSchema.parse(result.rows[0].document));
  return call.isDemo && process.env.DEMO_MODE!=='true'?undefined:call;
});
export async function getSourceReports():Promise<Array<{id:string;last_success:string|null;status:string;count:number;attemptedAt:string;warningCount:number}>>{
  if(!process.env.DATABASE_URL)return [];
  const exists=await getPool().query("SELECT to_regclass('public.scrape_sources') AS table_name");
  if(!exists.rows[0]?.table_name)return [];
  const result=await getPool().query('SELECT id,last_success,report FROM scrape_sources ORDER BY id');
  return result.rows.map(row=>({id:row.id,last_success:row.last_success?new Date(row.last_success).toISOString():null,status:row.report.status,count:row.report.count,attemptedAt:row.report.attemptedAt,warningCount:row.report.warningCount}));
}
