import { load } from 'cheerio';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, categoryFor, educationIds, stableId, linkList } from './shared';
export const MUSIKENE_LIST='https://musikene.eus/empleo/';
export function parseMusikeneList(html:string,now:string):Call[] {
  const $=load(html);
  return $('.edgtf-accordion-title').toArray().flatMap(node=>{
    const heading=$(node),title=clean(heading.find('.edgtf-tab-title').text()),content=heading.next('.edgtf-accordion-content');
    if(!title||!content.length)return [];
    const required=content.find('p').filter((_,p)=>/^Requisitos mínimos$/i.test(clean($(p).text()))).first();
    if(!required.length)return [];
    const call=baseCall('musikene',MUSIKENE_LIST,now,'Euskadi');
    call.id=stableId('musikene',`${MUSIKENE_LIST}|${title}`);call.title=title;call.organization='Musikene · Centro Superior de Música del País Vasco';call.category=categoryFor(title);
    const text=clean(content.text());
    if(/donostia|san sebastian/.test(normalize(title+' '+(text.match(/Lugar de trabajo:[^.]+\./i)?.[0]||'')))){call.province='Gipuzkoa';call.location='Donostia / San Sebastián';}
    const places=text.match(/Número de puestos ofertados:\s*(\d+)/i);call.places=places?Number(places[1])||null:null;
    call.requirements=required.nextUntil('p:has(strong)').toArray().map(p=>clean($(p).text())).filter(Boolean);
    if(call.requirements.length){call.educationText=call.requirements.join(' ');call.acceptedQualifications=educationIds(call.educationText);}
    const language=call.educationText.match(/Euskera\s*\((B1|B2|C1|C2)\)/i);
    if(language){call.language={name:'euskera',level:language[1].toUpperCase() as 'B1'|'B2'|'C1'|'C2'};call.languageStatus='known';}
    const links=linkList(load($.html(content)),'a[href]',MUSIKENE_LIST);
    call.status=links.some(link=>/resultados|valoraci[oó]n de m[eé]ritos/i.test(link.title))?'En curso':'Pendiente de confirmar';
    call.description='Oferta publicada en la página de empleo de Musikene. Los plazos sin año no se convierten en fechas completas; confirma las fechas y la fase en la publicación oficial.';
    call.documents=links.filter(link=>/^(bases|temario|programa)\b/i.test(link.title)).map(link=>({...link,kind:/temario|programa/i.test(link.title)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}));
    call.syllabusUrl=call.documents.find(doc=>doc.kind==='temario')?.url??null;call.sourceHash=hash($.html(content));return [callSchema.parse(call)];
  });
}
export async function scrapeMusikene(client:OfficialClient,now:string):Promise<Call[]> {
  const calls=parseMusikeneList(await client.text(MUSIKENE_LIST),now);
  if(!calls.length)throw new Error('No se reconocen ofertas de Musikene con requisitos publicados');
  return calls;
}
