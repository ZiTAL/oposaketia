import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { catalogueSchema } from '../src/lib/catalogue';

export async function saveCalls(input: unknown) {
  // Validate the complete input before touching the database.
  const calls = catalogueSchema.parse(input);
  if (process.env.DEMO_MODE !== 'true' && calls.some(call => call.isDemo)) throw new Error('La importación de ejemplos requiere DEMO_MODE=true');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS calls (
      id text PRIMARY KEY,
      document jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const call of calls) {
      await client.query(`INSERT INTO calls (id, document) VALUES ($1, $2::jsonb)
        ON CONFLICT (id) DO UPDATE SET document = EXCLUDED.document, updated_at = now()`, [call.id, JSON.stringify(call)]);
    }
    await client.query('COMMIT');
    console.log(`Catálogo importado: ${calls.length} fichas. No se han eliminado otras fichas.`);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
export async function importCatalogue(file: string) {
  return saveCalls(JSON.parse(await readFile(resolve(file), 'utf8')));
}
if (process.argv[1] && /import\.(ts|js)$/.test(process.argv[1])) {
  importCatalogue(process.argv[2] ?? 'data/demo.json').catch(error => { console.error(error instanceof Error ? error.message : 'Error de importación'); process.exitCode = 1; });
}
