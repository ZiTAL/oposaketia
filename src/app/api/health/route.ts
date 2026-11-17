import { getPool } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (process.env.DATABASE_URL) await getPool().query('SELECT 1 FROM calls LIMIT 1');
    else if (process.env.DEMO_MODE !== 'true') throw new Error('Sin configuración');
    return Response.json({ status: 'ok', mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'catalogue' });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); }
}
