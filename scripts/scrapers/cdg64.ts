import { load } from 'cheerio';
import { callSchema, type Call, normalize } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, educationIds, linkList, parseDate, pdfText, stableId } from './shared';
export const CDG_CALENDAR='https://www.cdg-64.fr/concours-et-examens/calendriers-et-brochures-dinformations/calendriers-et-informations-generales/';
export const CDG_BROCHURES='https://www.cdg-64.fr/concours-et-examens/calendriers-et-brochures-dinformations/brochures-dinformations-concours-et-examens/';
export function discoverCalendar(html:string) {
  const $=load(html);
  const links=linkList($,'a[href]',CDG_CALENDAR).filter(a=>/calendrier.*concours.*20\d{2}/i.test(a.title)&&a.url.includes('eID=dumpFile'));
  links.sort((a,b)=>Number(b.title.match(/20\d{2}/)?.[0]??0)-Number(a.title.match(/20\d{2}/)?.[0]??0));
  if(!links.length)throw new Error('No se encuentra el calendario oficial de CDG 64');
  return links[0];
}
export function parseFrenchCalendar(text:string,url:string,now:string):Call[] {
  const calls:Call[]=[];const year=text.match(/Calendrier pr[ée]visionnel (?:r[ée]gional )?(20\d{2})/i)?.[1]??text.match(/\b(20\d{2})\b/)?.[1];
  if(!year)throw new Error('Calendario sin año reconocible');
  for(const [index,page]of text.split('\f').entries()){
    if(!/Calendrier pr[ée]visionnel.*Concours/i.test(page)||!/Intitulé/.test(page))continue;
    if(/Non organisé en Nouvelle-Aquitaine/i.test(page))continue;
    const lines=page.split('\n');const headerIndex=lines.findIndex(line=>/Intitulé.*Conditions.*Dates.*Organisateur/.test(line));
    if(headerIndex<0)continue;
    const table=lines.slice(headerIndex+1);
    const conditionsStart=Math.min(...table.map(line=>line.search(/\S/)).filter(i=>i>=20&&i<60));
    if(!Number.isFinite(conditionsStart))continue;
    const datePositions=table.flatMap(line=>[...line.matchAll(/\d{2}\/\d{2}\/20\d{2}/g)].map(m=>m.index!));
    if(!datePositions.length)continue;
    const dateStart=Math.min(...datePositions)-4;
    let titleLines=table.map(line=>clean(line.slice(0,conditionsStart))).filter(Boolean);
    const concoursIndex=titleLines.findIndex(line=>/^Concours\b/i.test(line));
    if(concoursIndex>=0)titleLines=titleLines.slice(0,concoursIndex);
    titleLines=titleLines.filter(line=>!/^\d+$/.test(line)&&!/^Cat\./.test(line));
    const title=clean(titleLines.join(' '));
    if(title.length<8)continue;
    const conditions=table.map(line=>line.slice(conditionsStart,dateStart)).join('\n');
    const externalStart=conditions.search(/Concours (?:externe|sur titres?(?: avec [ée]preuves?)?)\s*:/i);
    if(externalStart<0)continue;
    const external=conditions.slice(externalStart).split(/Concours interne\s*:/i)[0];
    const dates=[...table.map(line=>line.slice(dateStart)).join('\n').matchAll(/\d{2}\/\d{2}\/20\d{2}/g)].map(m=>parseDate(m[0])).filter(Boolean);
    const call=baseCall('cdg64',url,now,'País Vasco francés');
    call.id=stableId('cdg64',`${year}:${normalize(title)}`);
    call.title=`${title} · ${year}`;call.category=categoryFor(title);
    call.organization='Calendario regional difundido por CDG 64';call.location='Nouvelle-Aquitaine · ámbito regional';
    call.group=page.match(/Cat\.\s*([ABC])/i)?.[1]??'Sin clasificar';
    call.educationText=clean(external) || call.educationText;call.acceptedQualifications=educationIds(external);
    call.deadline=dates[1]??null;call.status='Calendario';
    call.description='Calendario provisional regional publicado por el CDG 64. Puede interesar a residentes de Iparralde, pero no confirma plazas ni destinos en el País Vasco francés. La inscripción depende del centro organizador y de su resolución de apertura.';
    call.requirements=['Consulta la vía externa, interna o tercer concurso que corresponda a tu situación.','El calendario regional es provisional: confirma los plazos y las condiciones en la resolución de apertura.','No presupone equivalencias entre titulaciones españolas y francesas.'];
    call.documents=[{title:`Calendario oficial regional ${year} · página ${index+1}`,url:url+`#page=${index+1}`,kind:'calendario',checkedAt:now,sha256:hash(text)}];
    call.sourceHash=hash(page);
    calls.push(callSchema.parse(call));
  }
  if(!calls.length)throw new Error('El formato del calendario francés ha cambiado; no se extraen fichas sin reconocer la tabla');
  return calls;
}
export async function scrapeCdg64(client:OfficialClient,now:string,onWarning:(message:string)=>void) {
  const calendar=discoverCalendar(await client.text(CDG_CALENDAR));
  const pdf=await pdfText(client,calendar.url);
  const calls=parseFrenchCalendar(pdf.text,calendar.url,now);
  // Brochures are general guides, never presented as session-specific syllabuses.
  try {
    const $=load(await client.text(CDG_BROCHURES));const guides=linkList($,'a[href*="dumpFile"]',CDG_BROCHURES);
    for(const call of calls){
      const title=normalize(call.title.replace(/ · 20\d{2}$/,'')).replace(/\s+/g,' ');
      const guide=guides.find(g=>normalize(g.title).replace(/\s+/g,' ')===title);
      if(guide)call.documents.push({title:'Guía oficial general: '+guide.title,url:guide.url,kind:'guia',checkedAt:null,sha256:null});
      call.documents[0].sha256=pdf.sha256;
    }
  }catch(error){onWarning(`Guías CDG64: ${error instanceof Error?error.message:'Error'}`);}
  return calls;
}
