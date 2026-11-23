import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,categoryFor,clean,educationIds,linkList} from './shared';

export const INDURAIN_NEWS='https://www.fundacionmiguelindurain.com/es/noticias?categoria=institucional';
const ownHiring=(title:string)=>/^la fundacion miguel indurain\b/.test(normalize(title))&&/proceso de seleccion.*(?:incorporar|puesto|contratar)|oferta de empleo/.test(normalize(title));

export function parseIndurainNews(html:string):{urls:string[];pages:number}{
  const $=load(html),cards=$('.news-body');
  if(!cards.length)throw new Error('Indurain institutional news list is not recognized');
  const urls:string[]=[];
  cards.each((_,node)=>{
    const card=$(node);if(!ownHiring(clean(card.find('.news-title').text())))return;
    const href=card.find('a.news-link[href]').attr('href'),url=href?canonical(href,INDURAIN_NEWS):null;
    if(url&&new URL(url).origin===new URL(INDURAIN_NEWS).origin&&new URL(url).pathname.startsWith('/es/noticias/'))urls.push(url);
  });
  const pages=Math.max(1,...linkList($,'.pagination a[href]',INDURAIN_NEWS).map(link=>{
    const url=new URL(link.url);
    if(url.origin!==new URL(INDURAIN_NEWS).origin||url.pathname!=='/es/noticias'||url.searchParams.get('categoria')!=='institucional')throw new Error('Unexpected Indurain news pagination');
    const value=url.searchParams.get('pagina')??'1';if(!/^[1-9]\d?$/.test(value))throw new Error('Invalid Indurain news page');return Number(value);
  }));
  if(pages>25)throw new Error('Indurain news pagination exceeds its reviewed limit');
  return {urls:[...new Set(urls)],pages};
}

export function parseIndurainVacancy(html:string,url:string,now:string):Call{
  const $=load(html),title=clean($('h1.noticia-titulo').text()),body=$('.noticia-texto').first();
  if(!ownHiring(title)||!body.length)throw new Error('Indurain own hiring announcement is not recognized');
  const call=baseCall('miguel-indurain',url,now,'Navarra');call.title=title;call.organization='Fundación Miguel Induráin';call.location='Navarra';call.province='Navarra';call.category=categoryFor(title);
  const paragraphs=body.find('p').map((_,node)=>clean($(node).text())).get();
  const minimum=paragraphs.find(text=>/^Entre los requisitos m[ií]nimos\b/i.test(text));
  if(minimum){call.educationText=minimum;call.acceptedQualifications=educationIds(minimum);call.requirements=[minimum,...call.requirements];}
  // Contract length and publication date do not establish the application
  // period. Languages described as merits are not mandatory requirements.
  call.description='Proceso de contratación publicado por la Fundación Miguel Induráin. El anuncio remite al Servicio Navarro de Empleo para la inscripción; consulta allí la vigencia y las condiciones completas.';
  call.documents=linkList($,'.noticia-texto a[href]',url).filter(link=>{
    const target=new URL(link.url);return !target.username&&!target.password&&target.hostname==='administracionelectronica.navarra.es'&&target.pathname==='/EmpleoIntermediacion/listadodeofertas';
  }).slice(0,1).map(link=>({...link,title:'Servicio Navarro de Empleo: buscador enlazado por la Fundación',kind:'guia',checkedAt:null,sha256:null}));
  call.sourceHash=hash($.html(body));return callSchema.parse(call);
}

export async function scrapeMiguelIndurain(client:OfficialClient,now:string):Promise<Call[]>{
  const firstHtml=await client.text(INDURAIN_NEWS),first=parseIndurainNews(firstHtml),urls=new Set(first.urls),seen=new Set([hash(firstHtml)]);
  for(let page=2;page<=first.pages;page++){
    const url=new URL(INDURAIN_NEWS);url.searchParams.set('pagina',String(page));
    const html=await client.text(url.href),digest=hash(html);
    if(seen.has(digest))throw new Error('Indurain news pagination repeats a page');seen.add(digest);
    for(const url of parseIndurainNews(html).urls)urls.add(url);
  }
  const calls:Call[]=[];
  for(const url of urls)calls.push(parseIndurainVacancy(await client.text(url),url,now));
  return calls;
}
