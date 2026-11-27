import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ADUNA_PAGE='https://www.aduna.eus/eu/lan-eskaintzak1';
const cases=[
  {key:'kultura',heading:'KULTURA DINAMIZATZAILE LANPOSTUA',folder:'/41889904/',noticeName:'Bandoa_KULTURA',title:'Kultura dinamizatzailea',group:'C1' as const,education:'Batxilergoa edo goi-mailako teknikaria.',qualifications:['bachiller','fp-superior'] as Call['acceptedQualifications'],profile:'3 / EGA',closing:'2025-02-16',published:'2025·02·10'},
  {key:'peoi',heading:'PEOI BALIOANITZA LANPOSTU',folder:'/41866218/',noticeName:'Lan_Eskaintza_PEOI',title:'Peoi balioanitza',group:'AP' as const,education:'Bigarren Hezkuntzako titulua edo baliokidea.',qualifications:['eso'] as Call['acceptedQualifications'],profile:'2.',closing:'2025-02-14',published:'2025·02·05'},
];

export function parseAdunaPage(html:string){
  const $=load(html);
  const links=$('a[href]').map((_,node)=>({title:clean($(node).text()),url:new URL($(node).attr('href')!,ADUNA_PAGE).href})).get();
  return cases.map(item=>{
    if(!$('h2').toArray().some(node=>clean($(node).text())===item.heading)||!clean($.root().text()).includes(item.published))throw new Error(`Adunako ${item.key} deialdia ez da identifikatu`);
    const notice=links.filter(link=>link.title==='Lanpostu eskaintza'&&link.url.includes(item.folder)&&link.url.includes(item.noticeName));
    const bases=links.filter(link=>link.title==='Oinarriak'&&link.url.includes(item.folder)&&link.url.includes('/04_Oinarriak_bi.pdf/'));
    if(notice.length!==1||bases.length!==1||[notice[0].url,bases[0].url].some(url=>new URL(url).hostname!=='www.aduna.eus'))throw new Error(`Adunako ${item.key} agiriak ez dira identifikatu`);
    return {item,notice:notice[0].url,bases:bases[0].url};
  });
}

export function parseAdunaCase(entry:ReturnType<typeof parseAdunaPage>[number],noticeText:string,basesText:string,noticeHash:string,basesHash:string,now:string):Call{
  const {item,notice,bases}=entry;
  const n=clean(noticeText),b=clean(basesText);
  if(!n.includes('Adunako Udala')&&!n.includes('Adunako Udaleko'))throw new Error('Adunako udal-iragarkia ez da egiaztatu');
  if(!b.includes('Ayuntamiento de Aduna')||!b.includes('Adunan, 2025eko otsailaren 3an')||!b.includes('Permiso de conducir B.')||!b.includes(`Perfil Lingüistico ${item.profile}`))throw new Error('Adunako oinarriak ez datoz bat');
  if(item.key==='kultura'){
    if(!n.includes('KULTURA DINAMIZATZAILE POSTURAKO ESKAINTZA')||!n.includes('Batxilergoko edo goi-milako teknikariaren titulua')||!b.includes('Título de Técnico de Bachillerato o')||!b.includes('Superior.')||!b.includes('antes del 16 de febrero del 2025'))throw new Error('Kultura dinamizatzailearen agiriak ez datoz bat');
  }else if(!n.includes('PEOI BALIOANITZA LANPOSTU ESKAINTZA')||!n.includes('Derrigorrezko Bigarren Hezkuntza titulua edo baliokidea')||!b.includes('Título de Educación Secundaria o')||!b.includes('antes del 14 de febrero del año'))throw new Error('Peoiaren agiriak ez datoz bat');
  const call=baseCall('aduna',ADUNA_PAGE,now,'Euskadi');
  call.id=stableId('aduna',`2025-${item.key}`);call.title=item.title;call.organization='Ayuntamiento de Aduna';call.location='Aduna';call.province='Gipuzkoa';call.group=item.group;call.places=1;
  call.educationText=item.education;call.acceptedQualifications=item.qualifications;
  call.language={name:'euskera',level:item.key==='kultura'?'C1':'B2'};call.languageStatus='known';
  call.requirements=[item.education,`Euskara ${item.key==='kultura'?'3. HE / EGA':'2. HE'}.`,`B gidabaimena.`];
  call.status='Cerrada';call.deadline=null;call.topics=[];call.syllabusUrl=null;
  call.description=`2025eko aldi baterako lehiaketa eta elkarrizketa. Izen-ematea Lanbideren bidez, ${item.closing} baino lehen. Oinarriek ez dute azterketako gai-zerrendarik. Epea historikoa da; ez da irekitzat aurkezten.`;
  call.sourceUrl=notice;call.sourceHash=hash(noticeHash+basesHash);
  call.documents=[{title:'Udalaren hautaketa-oinarriak · 2025',url:bases,kind:'bases',checkedAt:now,sha256:basesHash}];
  return callSchema.parse(call);
}

export async function scrapeAduna(client:OfficialClient,now:string):Promise<Call[]>{
  const entries=parseAdunaPage(await client.text(ADUNA_PAGE));
  const calls:Call[]=[];
  for(const entry of entries){
    const notice=await pdfText(client,entry.notice),bases=await pdfText(client,entry.bases);
    calls.push(parseAdunaCase(entry,notice.text,bases.text,notice.sha256,bases.sha256,now));
  }
  return calls;
}
