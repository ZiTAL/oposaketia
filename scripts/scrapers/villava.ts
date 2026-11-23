import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,categoryFor,clean,linkList,pdfText} from './shared';
import {enrichMunicipalBases} from './municipal-requirements';

export const VILLAVA_LIST='https://www.villava.es/empleo-publico/';
type Listing={title:string;url:string;status:string};
const excluded=/promoci[oó]n interna|promoci[oó]n restringida|concurso de traslado|concurso de ascenso/i;
const baseLink=/^https:\/\/(?:bon\.navarra\.es\/es\/anuncio\/-\/texto\/\d{4}\/\d+\/\d+|www\.villava\.es\/wp-content\/uploads\/\d{4}\/\d{2}\/[^?#]+\.pdf)$/i;

export function parseVillavaList(html:string):{listings:Listing[];pages:number}{
  const $=load(html),cards=$('main .call-item');
  if(!cards.length)throw new Error('No se reconoce el listado de Villava');
  const pages=Math.max(1,...$('main a[href*="/convocatorias/page/"]').map((_,node)=>{
    const url=canonical($(node).attr('href')??'',VILLAVA_LIST);
    return Number(url?.match(/^https:\/\/www\.villava\.es\/convocatorias\/page\/(\d+)\/$/)?.[1]??0);
  }).get());
  if(pages>20)throw new Error('Paginación inesperada en Villava');
  const listings=cards.map((_,node)=>{
    const card=$(node),title=clean(card.find('.call-item-title').first().text());
    const url=canonical(card.find('a[href]').first().attr('href')??'',VILLAVA_LIST);
    const status=clean(card.find('.call-status-container').first().text());
    if(!title||!url?.startsWith('https://www.villava.es/convocatorias/')||!status)throw new Error('Ficha incompleta en Villava');
    return {title,url,status};
  }).get().filter(item=>!excluded.test(item.title));
  return {listings,pages};
}

export function parseVillavaDetail(html:string,listing:Listing,now:string):Call|null{
  const $=load(html),title=clean($('main .titulo-single').first().text());
  if(title!==listing.title)throw new Error('El título de Villava no coincide con el listado');
  const status=clean($('main .call-status-container').first().text());
  if(status!==listing.status)throw new Error('El estado de Villava no coincide con el listado');
  const documents=linkList($,'main a[href]',listing.url)
    .filter(link=>baseLink.test(link.url)&&/bases(?:\s+completas)?\s+(?:de\s+)?(?:la\s+)?convocatoria/i.test(link.title))
    .filter(link=>!/correcci[oó]n|modificaci[oó]n|recurso|solicitud|admitid|resultado|plantilla/i.test(link.title))
    .map(link=>({...link,kind:'bases' as const,checkedAt:null,sha256:null}));
  if(!documents.length)return null;
  const call=baseCall('villava',listing.url,now,'Navarra');
  call.title=title;
  call.organization=/Kirol Martiket/i.test(title)?'Kirol Martiket 2015 SL':'Ayuntamiento de Villava';
  call.location='Villava';call.province='Navarra';call.category=categoryFor(title);
  call.places=/\buna?\s+plaza\b/i.test(title)?1:Number(title.match(/\b(\d+)\s+plazas?\b/i)?.[1]??0)||null;
  const resultLinks=linkList($,'main a[href]',listing.url).some(link=>/resultados definitivos|calificaci[oó]n final|nombramiento/i.test(link.title));
  call.status=/^Cerrada$/i.test(status)?'Cerrada':/^En resoluci[oó]n$/i.test(status)||resultLinks?'En curso':'Pendiente de confirmar';
  call.description='Convocatoria publicada por el Ayuntamiento de Villava/Atarrabia con enlace directo a bases oficiales. Una etiqueta «Abierta» sin fecha absoluta comprobada no confirma que el plazo de solicitud siga vigente.';
  call.documents=documents;call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export function enrichVillavaBon(call:Call,html:string,url:string):Call{
  const $=load(html),paragraphs=$('p[class^="foral-"]').map((_,node)=>clean($(node).text())).get();
  if(!paragraphs.length||!clean($('p.a-titulo').first().text())||clean($('p.a-denominacion').first().text())!=='VILLAVA'||!/^2\.1\./.test(clean($('p.a-seccion').first().text())))throw new Error('El anuncio BON no corresponde a las bases de Villava');
  enrichMunicipalBases(call,paragraphs.join('\n'),url);
  return call;
}

export function enrichVillavaPdf(call:Call,text:string,url:string):Call{
  enrichMunicipalBases(call,text,url);
  if(/Formaci[oó]n Profesional de primer grado/i.test(call.educationText)&&!call.acceptedQualifications.includes('fp-medio'))call.acceptedQualifications.push('fp-medio');
  if(/Administraci[oó]n y Direcci[oó]n de Empresas/i.test(call.educationText)&&!call.acceptedQualifications.includes('ade'))call.acceptedQualifications.push('ade');
  if(/(?:^|[,;])\s*Econom[ií]a(?:\s*[,;]|$)/i.test(call.educationText)&&!call.acceptedQualifications.includes('economia'))call.acceptedQualifications.push('economia');
  if(!call.topics.length){
    const block=text.replace(/\f/g,'\n').match(/siguiente temario:\s*([\s\S]*?)(?=\nLa puntuaci[oó]n m[aá]xima|\nEn la fase de concurso|$)/i)?.[1];
    if(block){
      const topics=block.split(/[•]\s*/).slice(1).map(clean).filter(Boolean);
      if(topics.length>=2&&topics.length<=100){call.topics=topics;call.syllabusUrl=url;}
    }
  }
  return call;
}

export async function scrapeVillava(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const first=parseVillavaList(await client.text(VILLAVA_LIST)),listings=[...first.listings];
  for(let page=2;page<=first.pages;page++)listings.push(...parseVillavaList(await client.text(`https://www.villava.es/convocatorias/page/${page}/`)).listings);
  if(new Set(listings.map(item=>item.url)).size!==listings.length)throw new Error('Páginas repetidas en Villava');
  const calls:Call[]=[];
  for(const listing of listings){
    try{
      const call=parseVillavaDetail(await client.text(listing.url),listing,now);
      if(!call){warn(`${listing.url}: no se han identificado bases enlazadas`);continue;}
      const base=call.documents[0];
      try{
        if(base.url.startsWith('https://bon.navarra.es/')){
          const html=await client.text(base.url);enrichVillavaBon(call,html,base.url);base.sha256=hash(html);
        }else{
          const pdf=await pdfText(client,base.url);enrichVillavaPdf(call,pdf.text,base.url);base.sha256=pdf.sha256;
        }
        base.checkedAt=now;
      }catch(error){warn(`${base.url}: ${error instanceof Error?error.message:'Bases no disponibles'}`);}
      calls.push(callSchema.parse(call));
    }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Ficha no disponible'}`);}
  }
  if(!calls.length)throw new Error('No hay convocatorias de Villava verificadas');
  return calls;
}
