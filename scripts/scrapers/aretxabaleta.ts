import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ARETXABALETA_PAGE='https://www.aretxabaleta.eus/eu/tramiteak/lan-eskaintza-publikoa';
const selected={
  '2026ILAE0019':{slug:'liburutegiko-laguntzailea-egun-1-2-kontratatzeko-deialdia-1',title:'Liburutegiko laguntzailea egun ½ kontratatzeko deialdia',pdf:'oinarriak_liburutegiko-laguntzailea.pdf',places:1,education:'Batxilergoa edo teknikoa.',qualifications:['bachiller'] as Call['acceptedQualifications']},
  '2026ILAE0018':{slug:'2-peoi-kontratatzeko-deialdia-6',title:'2 peoi kontratatzeko deialdia',pdf:'oinarriak_peoiak.pdf',places:2,education:'Oinarriek ez dute gutxieneko titulaziorik zehazten.',qualifications:[] as Call['acceptedQualifications']},
} as const;
type SelectedId=keyof typeof selected;
type Entry={id:SelectedId;url:string;deadline:string;tab:number};

export function parseAretxabaletaIndex(html:string):Entry[]{
  const $=load(html);
  return (Object.keys(selected) as SelectedId[]).map(id=>{
    const spec=selected[id];
    const rows=$('#content-core div[id^="tab-"] tr').toArray().flatMap(row=>{
      const cells=$(row).find('td');
      if(clean(cells.eq(0).text())!==id)return [];
      const tab=Number($(row).closest('div[id^="tab-"]').attr('id')?.slice(4));
      const link=cells.eq(1).find('a[href]');
      const url=new URL(link.attr('href')??'',ARETXABALETA_PAGE).href;
      const deadline=clean(cells.eq(3).text());
      if(clean(link.text())!==spec.title||url!==`${ARETXABALETA_PAGE}/${spec.slug}`||!Number.isInteger(tab)||!/^2026\/11\/30$/.test(deadline))throw new Error(`Aretxabaletako ${id} fitxa aldatu da`);
      return [{id,url,deadline:'2026-11-30',tab}];
    });
    if(rows.length!==1)throw new Error(`Aretxabaletako ${id} fitxa ez da bakarra`);
    return rows[0];
  });
}

export function parseAretxabaletaDetail(html:string,entry:Entry){
  const $=load(html),body=$('#content-core');
  const spec=selected[entry.id];
  if(clean(body.find('#file-number').text())!==`Expediente zenbakia: ${entry.id}`||
    !clean(body.find('.contract-dates').text()).includes('2026/11/30')||
    (entry.id==='2026ILAE0019'&&!clean(body.find('.info').text()).includes('Liburutegiko laguntzailea egun ½ kontratatzeko deialdia')))
    throw new Error(`Aretxabaletako ${entry.id} xehetasuna aldatu da`);
  const files=body.find('.contract-files a[href]').toArray().map(a=>new URL($(a).attr('href')!,entry.url).href);
  const matches=files.filter(url=>{
    const parsed=new URL(url);
    return parsed.hostname==='www.aretxabaleta.eus'&&parsed.pathname.startsWith(new URL(entry.url).pathname+`/${spec.pdf}/@@download/file/`);
  });
  if(matches.length!==1)throw new Error(`Aretxabaletako ${entry.id} oinarriak ez dira bakarrak`);
  return matches[0];
}

export function parseAretxabaletaBases(entry:Entry,pdfUrl:string,text:string,sha256:string,now:string):Call{
  const spec=selected[entry.id],body=clean(text);
  for(const phrase of ['ARETXABALETAKO UDALA','Lehiaketa bidez','Lanbiden izena eman beharko da 2026ko azaroaren 30erako','Bailaran erroldatuta egotea'])
    if(!body.includes(phrase))throw new Error(`Aretxabaletako ${entry.id} oinarriak ez datoz bat: ${phrase}`);
  if(entry.id==='2026ILAE0019'){
    for(const phrase of ['liburutegiko laguntzaile bat','Titulazioa: Batxilergoa edo teknikoa.','Euskarako 3.Hizkuntza eskakizuna','C1 hizkuntza eskakizunaren'])
      if(!body.includes(phrase))throw new Error(`Aretxabaletako ${entry.id} oinarriak ez datoz bat: ${phrase}`);
  }else if(!body.includes('bi peoi kontratatuko ditu')||!body.includes('Euskarako lehen hizkuntza eskakizuna edo handiagoa izateagatik 5 puntu'))throw new Error('Aretxabaletako peoien oinarriak aldatu dira');
  const call=baseCall('aretxabaleta',entry.url,now,'Euskadi');
  call.id=stableId('aretxabaleta',entry.id);call.title=spec.title;call.organization='Ayuntamiento de Aretxabaleta';call.location='Aretxabaleta';call.province='Gipuzkoa';call.category='Servicios';call.places=spec.places;
  call.educationText=spec.education;call.acceptedQualifications=[...spec.qualifications];
  call.language=entry.id==='2026ILAE0019'?{name:'euskera',level:'C1'}:null;call.languageStatus=entry.id==='2026ILAE0019'?'known':'unknown';
  call.requirements=['Langabezian eta Lanbiden langabetu gisa izena emanda egotea.','Bailaran erroldatuta egotea.',...(entry.id==='2026ILAE0019'?['Batxilergoa edo teknikoa.','Euskarako 3. hizkuntza eskakizuna (C1).']:[])];
  call.deadline=entry.deadline;call.status=entry.tab===0&&now.slice(0,10)<=entry.deadline?'Abierta':entry.tab===2||now.slice(0,10)>entry.deadline?'Cerrada':'En curso';
  call.description='Lanbideren enplegua sustatzeko programaren barruko sei hilabeteko kontratazioa. Lanbiden izena eman behar da; merezimenduak udalean edo egoitza elektronikoan aurkezten dira. Oinarri ofizialak kontsultatu.';
  call.topics=[];call.syllabusUrl=null;call.sourceHash=hash(entry.url+sha256);
  call.documents=[{title:'Deialdiaren udal-oinarriak · 2026',url:pdfUrl,kind:'bases',checkedAt:now,sha256}];
  return callSchema.parse(call);
}

export async function scrapeAretxabaleta(client:OfficialClient,now:string):Promise<Call[]>{
  const entries=parseAretxabaletaIndex(await client.text(ARETXABALETA_PAGE));
  const calls:Call[]=[];
  for(const entry of entries){
    const pdfUrl=parseAretxabaletaDetail(await client.text(entry.url),entry);
    const pdf=await pdfText(client,pdfUrl);
    calls.push(parseAretxabaletaBases(entry,pdfUrl,pdf.text,pdf.sha256,now));
  }
  return calls;
}
