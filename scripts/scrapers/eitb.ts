import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, extractTopics, linkList, parseDate, pdfText, stableId } from './shared';

export const EITB_LIST = 'https://www.eitbtaldea.eus/es/convocatoria-publica.php';
export type EitbListing = { title:string; url:string; organization:string; description:string; summary:string; deadline:string|null; places:number|null };

export function parseEitbList(html:string):EitbListing[] {
  const $=load(html);const listings:EitbListing[]=[];
  $('.convocatoria').each((_,element)=>{
    const card=$(element);const link=card.find('.header a[href*="convocatoria-publica-detalle.php"]').first();
    const url=canonical(link.attr('href')??'',EITB_LIST);if(!url)return;
    const title=clean(link.find('h2').clone().find('svg').remove().end().text());
    const description=clean(card.find('.description').first().text());
    const organization=clean(card.find('.header p').first().clone().find('svg').remove().end().text());
    const info=clean(card.find('.info-convocatoria').text());
    const dateMatch=info.match(/Plazo\s+inscripci[oó]n\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const placesMatch=info.match(/N[uú]mero\s+de\s+plazas\s*:\s*(\d+)/i);
    const summary=clean(card.find('.row').text());
    if(!title||!description) return;
    listings.push({title:description,url,organization:organization.replace(/^EITB\s*[-–]\s*/i,'').trim()||'Grupo EITB',description:title,summary,deadline:dateMatch?parseDate(dateMatch[2]):null,places:placesMatch&&Number(placesMatch[1])>0?Number(placesMatch[1]):null});
  });
  return listings;
}

export function parseEitbDetail(html:string,listing:EitbListing,now:string):Call {
  const $=load(html);const call=baseCall('eitb',listing.url,now,'Euskadi');
  call.id=stableId('eitb',listing.url);call.title=listing.title;call.organization=listing.organization;
  call.location='Euskadi';call.category=categoryFor(listing.title);call.places=listing.places;
  call.deadline=listing.deadline;call.status=listing.deadline&&listing.deadline>=now.slice(0,10)?'Abierta':'En curso';
  call.description=listing.summary?`${listing.summary}. ${listing.organization}.`:`Convocatoria pública de empleo de ${listing.organization}.`;
  call.educationText='Consulta en las bases oficiales la titulación, los requisitos y las funciones del puesto.';
  call.acceptedQualifications=[];
  call.requirements=['Comprueba en las bases oficiales la titulación, los requisitos lingüísticos y las condiciones de participación.'];
  call.documents=linkList($,'#pdf-list a[href*="descargaFichero.php"]',listing.url)
    .filter(doc=>/descargaFichero\.php/i.test(doc.url))
    .map(doc=>({title:doc.title||'Documento oficial de la convocatoria',url:doc.url,kind:/temario|programa/i.test(doc.title)?'temario' as const:/base|convocatoria/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null}));
  call.sourceHash=hash(html);return callSchema.parse(call);
}

export async function scrapeEitb(client:OfficialClient,now:string,onWarning:(message:string)=>void):Promise<Call[]> {
  const listings=parseEitbList(await client.text(EITB_LIST));if(!listings.length)throw new Error('No se han reconocido convocatorias en la página oficial de EITB');
  const calls:Call[]=[];
  for(const listing of listings){try{
    const call=parseEitbDetail(await client.text(listing.url),listing,now);
    for(const doc of call.documents.filter(item=>item.kind==='temario').slice(0,1))try{const pdf=await pdfText(client,doc.url);call.topics=extractTopics(pdf.text);doc.sha256=pdf.sha256;}catch(error){onWarning(`Temario EITB ${doc.url}: ${error instanceof Error?error.message:'Error'}`);}
    calls.push(call);
  }catch(error){onWarning(`Ficha EITB ${listing.url}: ${error instanceof Error?error.message:'Error'}`);}}
  if(!calls.length)throw new Error('No se ha podido extraer ninguna convocatoria de EITB');return calls;
}
