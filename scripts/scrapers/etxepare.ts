import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient} from './http';
import {baseCall,canonical,clean,stableId} from './shared';
import {hash} from './http';

export const ETXEPARE_NEWS='https://www.etxepare.eus/eu/hiru-lanpostu-hautatzeko-prozedura-2024';
const profiles={
 digital:{slug:'komunikazio-digitaleko-teknikaria',title:'Komunikazio digitaleko teknikaria',code:'EL08',number:'4',group:'C',pl:'4',english:'C1',category:'Servicios',education:'Ikus-entzunezkoak, irudia eta multimedia; komunikazioa, kazetaritza, publizitatea eta harreman publikoak arloetako gradua edo lizentzia.'},
 systems:{slug:'sistemen-teknikaria',title:'Sistemen teknikaria',code:'EL09',number:'5',group:'B',pl:'3',english:'B2',category:'Servicios',education:'Telekomunikazioak eta Informatika Sistemak edo Plataforma Anitzeko Aplikazioen Garapena arloetako goi-mailako lanbide-heziketa; edo antzeko goi-mailako titulazioa, diplomatura edo ingeniaritzako gradua.'},
 admin:{slug:'administrari-laguntzailea',title:'Administrari laguntzailea',code:'EL07',number:'6',group:'C2',pl:'3',english:'B2',category:'Administración',education:'Eskola-graduatua, DBH edo araudiaren araberako titulu baliokidea.'},
} as const;
type Key=keyof typeof profiles;
type Listing={key:Key;pageUrl:string;bopvUrl:string;pdfUrl:string};

export function parseEtxepareNews(html:string):{key:Key;pageUrl:string}[]{
 const $=load(html),content=clean($.root().text());
 if(!/hiru lanpostu hautatzeko prozedura/i.test(content)||!/2024ko urtarrilaren 18ra arte/i.test(content))throw new Error('Etxepareren 2024ko deialdia eta epea ez dira ezagutzen');
 if(!content.includes('Ikus-entzunezkoak, irudia eta multimedia')||!content.includes('Telekomunikazioak eta Informatika Sistemak')||!content.includes('Eskola-graduatua, DBH'))throw new Error('Hiru lanpostuen titulazioak ez dira ezagutzen');
 return (Object.keys(profiles) as Key[]).map(key=>{
  const slug=profiles[key].slug;
  const anchors=$(`a[href="/eu/${slug}"]`);
  if(anchors.length!==1)throw new Error(`${slug} fitxaren esteka ez da bakarra`);
  const pageUrl=canonical(anchors.first().attr('href')!,ETXEPARE_NEWS);
  if(!pageUrl)throw new Error('Etxepareren fitxaren URLa ez da baliozkoa');
  return {key,pageUrl};
 });
}

export function parseEtxeparePage(key:Key,pageUrl:string,html:string):Listing{
 const $=load(html),profile=profiles[key],content=clean($.root().text());
 if(!content.includes('2024-01-18')||!content.includes(profile.title))throw new Error('Etxepareren fitxaren izenburua edo epea ez da ezagutzen');
 const expected=`https://www.euskadi.eus/web01-bopv/eu/bopv2/datos/2023/12/230577${profile.number}e.shtml`;
 const urls=$('a[href]').filter((_,node)=>clean($(node).text())==='Oinarri espezifikoak').map((_,node)=>canonical($(node).attr('href')!,pageUrl)).get();
 if(urls.length!==1||urls[0]!==expected)throw new Error('Etxepareren oinarri espezifikoak ez dira ezagutzen');
 return {key,pageUrl,bopvUrl:expected,pdfUrl:expected.replace('.shtml','.pdf')};
}

export function parseEtxepareBases(listing:Listing,html:string,now:string):Call{
 const profile=profiles[listing.key],normalized=clean(load(html).text());
 if(!normalized.includes(profile.code)||!/Lantokia: Donostian/i.test(normalized)||!/Hautaketa-sistema: txanda irekia\. Oposizio-lehiaketaren sistema/i.test(normalized))throw new Error('Etxepareren lanpostuaren oinarriak ez dira ezagutzen');
 if(!normalized.includes(`Euskararen ${profile.pl}. hizkuntza-eskakizuna`)||!normalized.includes(`(${profile.english})`))throw new Error('Hizkuntza-baldintzak ez dira ezagutzen');
 const call=baseCall('etxepare',listing.pageUrl,now,'Euskadi');
 call.id=stableId('etxepare',listing.bopvUrl);call.title=profile.title;call.organization='Etxepare Euskal Institutua';
 call.location='Donostia';call.province='Gipuzkoa';call.category=profile.category;call.group=profile.group;call.places=1;
 call.educationText=profile.education;call.deadline='2024-01-18';call.status='Cerrada';
 call.language={name:'euskera',level:profile.pl==='4'?'C2':'C1'};call.languageStatus='known';
 call.requirements=[profile.education,`Euskararen ${profile.pl}. hizkuntza-eskakizuna, nahitaezkoa.`,`Ingelesa ${profile.english}, nahitaezkoa.`];
 call.syllabusUrl=listing.pdfUrl;
 call.description='Txanda irekiko oposizio-lehiaketa, elkarrizketa eta merezimenduen balorazioarekin. Izen-emateko epea amaituta.';
 call.sourceHash=hash(html);call.documents=[{title:'Oinarri espezifikoak (EHAA HTML)',url:listing.bopvUrl,kind:'bases',checkedAt:now,sha256:hash(html)},{title:'III. eranskineko gai-zerrenda (EHAA PDF)',url:listing.pdfUrl,kind:'temario',checkedAt:null,sha256:null}];
 return callSchema.parse(call);
}

export async function scrapeEtxepare(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=parseEtxepareNews(await client.text(ETXEPARE_NEWS)),calls:Call[]=[];
 for(const item of listings){
  try{const page=parseEtxeparePage(item.key,item.pageUrl,await client.text(item.pageUrl));calls.push(parseEtxepareBases(page,await client.text(page.bopvUrl),now));}
  catch(error){warn(`${item.pageUrl}: ${error instanceof Error?error.message:'Oinarriak ez daude eskuragarri'}`);}
 }
 if(!calls.length)throw new Error('Ez dago egiaztatutako Etxepareko lanposturik');
 return calls;
}
