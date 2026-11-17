import { importCatalogue } from './import';
const file = process.env.CATALOGUE_FILE;
const interval = Number(process.env.IMPORT_INTERVAL_SECONDS ?? 21600);
if (!file || !Number.isFinite(interval) || interval < 60) throw new Error('Configura CATALOGUE_FILE e IMPORT_INTERVAL_SECONDS (mínimo 60).');
let stopping = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function stop() { stopping = true; if (timer) clearTimeout(timer); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
async function run() {
  try { await importCatalogue(file!); }
  catch (error) { console.error('Importación fallida:', error instanceof Error ? error.message : 'Error desconocido'); }
  if (!stopping) timer = setTimeout(run, interval * 1000);
}
void run();
