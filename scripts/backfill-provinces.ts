import { Pool } from 'pg';
import { OfficialClient } from './scrapers/http';
import { EUSKADI_DATA } from './scrapers/euskadi';
import { canonical } from './scrapers/shared';
import { provinceFromEuskadiRow, type Province } from '../src/lib/geography';
import { z } from 'zod';
async function backfill() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  const http = new OfficialClient(process.env.SCRAPE_CACHE_DIR ?? 'data/scrape-cache');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    const rows = z.array(z.record(z.string(), z.string())).parse(JSON.parse(await http.text(EUSKADI_DATA)));
    const mapping = new Map(rows.filter(row=>row.physicalUrl).map(row=>[canonical(row.physicalUrl),provinceFromEuskadiRow(row)]));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT id, document FROM calls FOR UPDATE');
      const counts: Record<string,number> = {};
      for (const {id,document} of result.rows) {
        // Use source metadata, never the address of the organizer or a guessed municipality.
        const province: Province | null = document.territory === 'Navarra' ? 'Navarra'
          : document.territory === 'Euskadi' ? mapping.has(canonical(document.sourceUrl)) ? mapping.get(canonical(document.sourceUrl))! : document.province ?? null
          : document.province ?? null;
        await client.query("UPDATE calls SET document=jsonb_set(document,'{province}',$2::jsonb) WHERE id=$1",[id,JSON.stringify(province)]);
        if(!document.isDemo) counts[province ?? 'Sin concretar']=(counts[province ?? 'Sin concretar']??0)+1;
      }
      await client.query('COMMIT');console.log('Provincias actualizadas:',counts);
    } catch(error) {await client.query('ROLLBACK');throw error;}
    finally {client.release();}
  } finally {await http.close();await pool.end();}
}
backfill().catch(error=>{console.error(error instanceof Error?error.message:'Error al actualizar las provincias');process.exitCode=1;});
