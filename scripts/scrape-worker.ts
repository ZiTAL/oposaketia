import { runScrape } from './scrape';
const interval=Number(process.env.SCRAPE_INTERVAL_SECONDS??21600);
if(!Number.isFinite(interval)||interval<3600)throw new Error('SCRAPE_INTERVAL_SECONDS debe ser al menos 3600');
let stopping=false;let timer:ReturnType<typeof setTimeout>|undefined;
const stop=()=>{stopping=true;if(timer)clearTimeout(timer);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
async function run(){try{await runScrape();}catch(error){console.error('Actualización fallida:',error instanceof Error?error.message:'Error');}if(!stopping)timer=setTimeout(run,interval*1000);}
void run();
