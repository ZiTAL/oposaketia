import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ANTZUOLA_PAGE='https://antzuola.eus/tramiteak-eta-agiriak/lan-eskaintzak';
const notices=[
  {article:'830-',pdf:'BANDOA Hiru gazte kontratatzea.pdf',heading:'HIRU GAZTE KONTRATATZEA'},
  {article:'832-',pdf:'UDAL ERAIKINETARAKO GARBITZAILE BAT BEHAR DA.pdf',heading:'UDAL ERAIKINETARAKO GARBITZAILE BAT BEHAR DA'},
] as const;

export function parseAntzuolaIndex(html:string){
  const $=load(html);
  return notices.map(notice=>{
    const links=$('a[href]').toArray().map(node=>({title:clean($(node).text()),url:new URL($(node).attr('href')!,ANTZUOLA_PAGE).href}));
    const matches=links.filter(link=>link.url.startsWith(`${ANTZUOLA_PAGE}/${notice.article}`)&&link.title.toUpperCase().includes(notice.heading));
    if(matches.length!==1)throw new Error(`Antzuolako ${notice.article} iragarkia ez da aurkitu`);
    return {...notice,url:matches[0].url};
  });
}

export function parseAntzuolaArticle(html:string,entry:ReturnType<typeof parseAntzuolaIndex>[number]){
  const $=load(html);
  if(!clean($('main').text()).toUpperCase().includes(entry.heading))throw new Error('Antzuolako iragarkiaren izenburua ez dator bat');
  const links=$('main a[href]').toArray().map(node=>new URL($(node).attr('href')!,entry.url).href);
  const matches=[...new Set(links.filter(url=>decodeURIComponent(new URL(url).pathname).endsWith(`/attachments/article/${entry.article.slice(0,3)}/${entry.pdf}`)&&new URL(url).hostname==='antzuola.eus'))];
  if(matches.length!==1)throw new Error('Antzuolako udal-PDFa ez da aurkitu');
  return matches[0];
}

export function parseAntzuolaNotice(entry:ReturnType<typeof parseAntzuolaIndex>[number],pdfUrl:string,text:string,sha256:string,now:string):Call[]{
  const body=clean(text);
  const youth=entry.article==='830-';
  if(youth){
    for(const phrase of ['Antzuolako Udalak hiru gazte kontratatuko ditu','Administraria (2)','Kale-garbiketarako peoia (1)','2026ko azaroaren 13a baino lehen','Gazte Bermearen Sisteman'])
      if(!body.includes(phrase))throw new Error(`Antzuolako gazte-programaren iragarkia ez dator bat: ${phrase}`);
  }else{
    for(const phrase of ['Antzuolako Udalak garbitzaile bat kontratatu behar du','aldi baterako','azaroaren 6ra arte','Antzuolan, 2026ko azaroaren 4an'])
      if(!body.includes(phrase))throw new Error(`Antzuolako garbitzailearen iragarkia ez dator bat: ${phrase}`);
  }
  const variants=youth?[
    {key:'administrari',title:'Gazte programa · administraria',places:2,category:'Administración' as const,education:'Administrazio eta kudeaketako edo antzeko erdi- edo goi-mailako heziketa-zikloa, edo Batxilergoa.',qualifications:['fp-medio','fp-superior','bachiller'] as Call['acceptedQualifications'],language:'C1' as const,extra:[] as string[]},
    {key:'peoi',title:'Gazte programa · kale-garbiketako peoia',places:1,category:'Servicios' as const,education:'Oinarrizko Lanbide Heziketa, profesionaltasun-ziurtagiria edo DBH.',qualifications:['eso'] as Call['acceptedQualifications'],language:'B1' as const,extra:['B gidabaimena.']},
  ]:[{key:'garbitzaile',title:'Udal eraikinetako garbitzailea',places:1,category:'Servicios' as const,education:'Iragarkiak ez du gutxieneko titulaziorik zehazten.',qualifications:[] as Call['acceptedQualifications'],language:null,extra:[] as string[]}];
  if(youth&&(!body.includes('3. hizkuntza-eskakizuna (C1)')||!body.includes('1. hizkuntza-eskakizuna (B1)')||!body.includes('B gidabaimena')||!body.includes('erdi- edo goi-mailako heziketa-zikloa')||!body.includes('Oinarrizko Lanbide Heziketa')))throw new Error('Gazte-programaren sarbide-baldintzak ez datoz bat');
  if(!youth&&!body.includes('Baldintza: euskaraz jakitea.'))throw new Error('Garbitzailearen hizkuntza-baldintza ez dator bat');
  return variants.map(variant=>{
    const call=baseCall('antzuola',entry.url,now,'Euskadi');
    call.id=stableId('antzuola',`2026-${variant.key}`);call.title=variant.title;call.organization='Ayuntamiento de Antzuola';call.location='Antzuola';call.province='Gipuzkoa';call.category=variant.category;call.places=variant.places;
    call.educationText=variant.education;call.acceptedQualifications=variant.qualifications;
    call.language=variant.language?{name:'euskera',level:variant.language}:null;call.languageStatus=youth?'known':'unknown';
    call.requirements=youth?[variant.education,`Euskara ${variant.language}.`,'16 urtetik gora eta 30 urtetik behera; langabezian eta Lanbiden eta Gazte Bermearen Sisteman izena emanda; 2025eko programan udal honek kontratatu gabe.',...variant.extra]:['Euskaraz jakitea; maila ez da zehaztu.'];
    call.status='Cerrada';call.deadline=youth?'2026-11-13':'2026-11-06';call.topics=[];call.syllabusUrl=null;
    call.description=youth?'2026ko 12 hilabeteko lanaldi osoko gazte-kontratazioa. Lanbiden izena emateko epea amaitu da. Udal-bandoak oinarri osoak beste leku batean aipatzen ditu; hemen bandoan egiaztatutako baldintzak soilik jasotzen dira.':'2026ko hilabete inguruko aldi baterako kontratazioa. Esperientzia meritua da, ez sarbide-baldintza. CVa aurkezteko epea amaitu da.';
    call.sourceUrl=entry.url;call.sourceHash=hash(sha256+entry.url);
    call.documents=[{title:'Udal-bando ofiziala · 2026',url:pdfUrl,kind:'guia',checkedAt:now,sha256}];
    return callSchema.parse(call);
  });
}

export async function scrapeAntzuola(client:OfficialClient,now:string):Promise<Call[]>{
  const entries=parseAntzuolaIndex(await client.text(ANTZUOLA_PAGE));
  const calls:Call[]=[];
  for(const entry of entries){
    const pdfUrl=parseAntzuolaArticle(await client.text(entry.url),entry);
    const notice=await pdfText(client,pdfUrl);
    calls.push(...parseAntzuolaNotice(entry,pdfUrl,notice.text,notice.sha256,now));
  }
  return calls;
}
