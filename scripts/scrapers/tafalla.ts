import {load} from 'cheerio';
import {callSchema, type Call} from '../../src/lib/catalogue';
import {OfficialClient, hash} from './http';
import {baseCall, canonical, categoryFor, clean, linkList, pdfText} from './shared';

export const TAFALLA_LIST = 'https://www.tafalla.es/convocatorias/';
type Listing = {title:string; url:string; status:string};
const excluded = /promoci[oó]n\s+(?:interna|restringida)|concurso\s+de\s+traslado|concurso\s+de\s+ascenso|servicios\s+especiales/i;
const recruitment = /convocatoria|oposici[oó]n|pruebas selectivas|personal|docente/i;
const teacherHashes:Record<string,string> = {
  'percusión':'01c8547228aaffbef923ee2805d03f29a825f32db2fc69895099cf34f56966bc',
  'saxofón':'c214be212b060628545881b02f05ba77dc74ea47f6117e10b00bb0d150c7dfa8',
};

export function parseTafallaList(html:string):{listings:Listing[];pages:number}{
  const $=load(html);
  if(!$('.call-item').length)throw new Error('No se reconoce el listado de Tafalla');
  const pageNumbers=$('a[href*="/convocatorias/page/"]').map((_,element)=>{
    const url=canonical($(element).attr('href')??'',TAFALLA_LIST);
    const match=url?.match(/^https:\/\/www\.tafalla\.es\/convocatorias\/page\/(\d+)\/$/);
    return match?Number(match[1]):null;
  }).get();
  const pages=Math.max(1,...pageNumbers);
  if(pages>20)throw new Error('Demasiadas páginas en Tafalla; revisar paginación');
  const listings=$('.call-item').map((_,element)=>{
    const card=$(element),title=clean(card.find('.call-item-title').first().text());
    const url=canonical(card.find('a[href]').first().attr('href')??'',TAFALLA_LIST);
    const status=clean(card.find('.call-status-container').text());
    if(!title||!url?.startsWith(TAFALLA_LIST)||!status)throw new Error('Ficha incompleta en el listado de Tafalla');
    return {title,url,status};
  }).get().filter(item=>recruitment.test(item.title)&&!excluded.test(item.title));
  return {listings,pages};
}

export function parseTafallaDetail(html:string,listing:Listing,now:string):Call|null{
  const $=load(html),title=clean($('.titulo-single').first().text());
  if(title!==listing.title)throw new Error('El título de Tafalla no coincide con el listado');
  const documents=linkList($,'main a[href]',listing.url)
    .filter(link=>/^https:\/\/www\.tafalla\.es\/wp-content\/uploads\/\d{4}\/\d{2}\/[^?#]+\.pdf$/i.test(link.url))
    .filter(link=>/bases|convocatoria|temario|programa|anexo/i.test(link.title)&&!/aspirantes|admitid|resultado|calificaci[oó]n|puntuaci[oó]n|solicitud|instancia|aprobados|relaci[oó]n|plantilla|cuestionario/i.test(link.title))
    .map(link=>({...link,kind:/temario|programa/i.test(link.title)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}));
  if(!documents.some(doc=>doc.kind==='bases'))return null;
  const call=baseCall('tafalla',listing.url,now,'Navarra');
  call.title=title;call.organization='Ayuntamiento de Tafalla';call.location='Tafalla';call.province='Navarra';
  call.category=categoryFor(title);call.places=Number(title.match(/\b(?:una|un|\d+)\s+plazas?\b/i)?.[0].match(/\d+/)?.[0]??0)||(/\buna?\s+plaza\b/i.test(title)?1:null);
  const detailStatus=clean($('.call-status-container').first().text());
  if(detailStatus!==listing.status)throw new Error('El estado de Tafalla no coincide con el listado');
  call.status=/^Cerrada$/i.test(detailStatus)?'Cerrada':/^En resoluci[oó]n$/i.test(detailStatus)?'En curso':'Pendiente de confirmar';
  call.description='Proceso de selección publicado por el Ayuntamiento de Tafalla. Las bases oficiales determinan la titulación, las pruebas y el plazo de solicitud; una etiqueta «Abierta» sin fecha absoluta contrastada no confirma inscripción vigente.';
  call.documents=documents;call.sourceHash=hash(html);
  return callSchema.parse(call);
}

export async function scrapeTafalla(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
  const first=parseTafallaList(await client.text(TAFALLA_LIST));
  const listings=[...first.listings];
  for(let page=2;page<=first.pages;page++){
    const next=parseTafallaList(await client.text(`${TAFALLA_LIST}page/${page}/`));
    if(!next.listings.length)throw new Error(`Página ${page} vacía en Tafalla`);
    listings.push(...next.listings);
  }
  if(new Set(listings.map(item=>item.url)).size!==listings.length)throw new Error('Páginas repetidas en Tafalla');
  const calls:Call[]=[];
  for(const listing of listings){
    try{
      const call=parseTafallaDetail(await client.text(listing.url),listing,now);
      if(!call){warn(`${listing.url}: no se han identificado bases oficiales`);continue;}
      const specialty=call.title.match(/Profesor\/a de (Percusi[oó]n|Saxof[oó]n)/i)?.[1].toLowerCase();
      const base=call.documents.find(doc=>doc.kind==='bases');
      if(specialty&&base&&new URL(base.url).pathname===`/wp-content/uploads/2026/10/BASES-CONVOCATORIA-PLAZA-PROFESOR_A-DE-${specialty==='percusión'?'PERCUSION':'SAXOFON'}.pdf`){
        const pdf=await pdfText(client,base.url);
        if(pdf.sha256===teacherHashes[specialty]){
          const block=pdf.text.match(/c\) Hallarse en posesi[oó]n de las titulaciones([\s\S]*?)\n\s*d\) Poseer la capacidad/i)?.[1];
          if(block){call.educationText=`Titulaciones exigidas: ${clean(block)}`;call.requirements=[call.educationText,...call.requirements];base.sha256=pdf.sha256;base.checkedAt=now;}
        }else warn(`${base.url}: las bases de profesorado cambiaron; requisitos pendientes de revisión`);
      }
      calls.push(callSchema.parse(call));
    }catch(error){warn(`${listing.url}: ${error instanceof Error?error.message:'Ficha no disponible'}`);}
  }
  if(!calls.length)throw new Error('No hay convocatorias de Tafalla verificadas');
  return calls;
}
