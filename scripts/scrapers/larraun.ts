import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const LARRAUN_NOTICE='https://www.larraun.eus/peoi-eta-ofizial-lanetarako-kontratazio-aukera-langabeentzako/';

export function parseLarraun(html:string,now:string):Call{
  const $=load(html);
  const heading=clean($('h2.elementor-heading-title').filter((_,node)=>$(node).text().includes('Peoi eta ofizial lanetarako kontratazio aukera langabeentzako')).first().text());
  const date=clean($('[itemprop="datePublished"] .raven-post-meta-item-type-date').first().text());
  const content=clean($('.elementor-widget-raven-post-content .elementor-widget-container').first().text());
  if(heading!=='Peoi eta ofizial lanetarako kontratazio aukera langabeentzako'
    ||date!=='25/04/2025'
    ||!content.includes('Larraungo Udalak, urtero egin moduan, bi langabe kontratatu nahi ditu peoi eta ofizial lanetarako')
    ||!content.includes('Gida baimena izatea')
    ||!content.includes('Nafar Lansaren izena emana egotea (apirilaren 30a baino lehen)'))throw new Error('Larraungo udal-iragarkia aldatu da');

  const call=baseCall('larraun',LARRAUN_NOTICE,now,'Navarra');
  call.id=stableId('larraun','2025-04-25-peoi-ofizial');
  call.title='Peoi eta ofizial lanetarako aldi baterako kontratazioa';
  call.organization='Ayuntamiento de Larraun';call.location='Larraun';call.province='Navarra';
  call.category='Servicios';call.places=2;
  call.educationText='Udal-iragarkiak ez du titulaziorik zehazten.';
  call.acceptedQualifications=[];call.language=null;call.languageStatus='unknown';
  call.deadline=null;call.status='Cerrada';
  call.requirements=['Gidabaimena.','Nafar Lansaren enplegu-eskatzaile gisa izena emanda egotea 2025-04-30 baino lehen.'];
  call.description='Udalak bi langabe kontratatu nahi zituen peoi eta ofizial lanetarako. Iragarkiak Nafar Lansareko izen-ematearen data ematen du, baina ez eskaera-epearen azken eguna, titulazioa edo oposaketako gai-zerrenda.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export async function scrapeLarraun(client:OfficialClient,now:string):Promise<Call[]>{
  return [parseLarraun(await client.text(LARRAUN_NOTICE),now)];
}
