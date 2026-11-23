import municipalities from '../../docs/inventory/municipalities.json';
import { provinceFromEuskadiRow } from '../../src/lib/geography';
import { load,type CheerioAPI } from 'cheerio';
import { z } from 'zod';
import { callSchema, type Call, normalize } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, htmlText, parseDate, educationIds, categoryFor, linkList, canonical, pdfText, extractTopics } from './shared';
export const EUSKADI_DATA = 'https://opendata.euskadi.eus/contenidos/ds_rrhh/empleo_publico_otras_ope/opendata/ofertas.json';
const rowSchema = z.record(z.string(), z.string());
function datasetTerritory(row:Record<string,string>):'Euskadi'|'Navarra'|null {
  const declared=normalize(`${row.rrhhTerritory??''} ${row.territory??''}`);
  const euskadi=/pais vasco|euskadi|bizkaia|gipuzkoa|araba|alava/.test(declared);
  const navarra=/\bnavarra\b|\bnafarroa\b/.test(declared);
  if(euskadi===navarra)return null;
  return navarra?'Navarra':'Euskadi';
}
const scopeWords=(value:string)=>normalize(clean(value)).replace(/[^a-z0-9]+/g,' ').trim();
const navarraCouncils=new Set(municipalities.filter(row=>row.territory==='Navarra').flatMap(row=>[row.name,...(row.aliases??[])]).flatMap(name=>[name,...name.split('/')]).flatMap(name=>['ayuntamiento de '+scopeWords(name),'ayuntamiento '+scopeWords(name)]));
function nativeTerritory(fields:Record<string,string>):'Euskadi'|'Navarra'|null{
 const scope=normalize(clean(fields.ambito||''));
 if(scope==='euskadi')return 'Euskadi';
 if(['navarra','nafarroa','comunidad foral de navarra'].includes(scope))return 'Navarra';
 // A local government identified in the official Navarra directory plus its
 // BON notice proves the jurisdiction; no headquarters address is used.
 if(scope==='resto de ccaa'&&/boletin oficial de navarra/i.test(normalize(fields.fuente||''))&&navarraCouncils.has(scopeWords(fields.convoca||'')))return 'Navarra';
 return null;
}
function ownedAcademyMirror(row:Record<string,string>):boolean{
 try{return ['www.gazteaukera.euskadi.eus','gazteaukera.euskadi.eus'].includes(new URL(row.physicalUrl).hostname)&&scopeWords(row.rrhhSponsor||'')==='academia vasca de policia y emergencias';}catch{return false;}
}
export function parseDataset(text: string, since: string, selectedTerritory?:'Euskadi'|'Navarra',options:{includeUndeclared?:boolean}={}) {
  return z.array(rowSchema).parse(JSON.parse(text)).filter(row => {
    const territory = datasetTerritory(row);
    // Municipal processes often remain active long after applications close.
    const municipal = /ayuntamiento|udala/i.test(row.rrhhSponsor ?? '');
    const cutoff = municipal ? new Date(Date.parse(since) - 275 * 86400000).toISOString().slice(0,10) : since;
    const undeclared=!clean(`${row.rrhhTerritory??''} ${row.territory??''}`);
    const review=options.includeUndeclared&&undeclared&&!ownedAcademyMirror(row);
    return ((territory!==null&&(!selectedTerritory||territory===selectedTerritory))||review) &&
      ((parseDate(row.rrhhEndDate ?? '') ?? '') >= cutoff || (parseDate(row.rrhhStartDate ?? '') ?? '') >= cutoff);
  });
}
export function readEuskadiFields($:CheerioAPI):Record<string,string>{
  const fields:Record<string,string>={};
  $('.r01gContentTabSeccion, .bloqueInfo').each((_, el) => {
    const label = normalize(clean($(el).find('.r01gContentSeccionTitulo, .cabecera').first().text())).replace(/:$/,'');
    const value = clean($(el).find('.r01gContentSeccionTexto, .info').first().text());
    if (label) fields[label] = value;
  });
  return fields;
}
export function parseEuskadiDetail(html: string, row: Record<string,string>, now: string): Call {
  const sourceUrl = canonical(row.physicalUrl)!;
  if (!sourceUrl) throw new Error('Ficha sin URL HTTPS');
  const $ = load(html),fields=readEuskadiFields($);
  if (!Object.keys(fields).length) throw new Error('Estructura de ficha de Euskadi no reconocida');
  const declared=datasetTerritory(row),native=nativeTerritory(fields);
  const missing=!clean(`${row.rrhhTerritory??''} ${row.territory??''}`);
  if(declared&&native&&declared!==native)throw new Error('Conflicting declared and native geographical scopes');
  const territory=declared||(missing?native:null);
  if(!territory)throw new Error('Territorio ausente o contradictorio en el catálogo oficial');
  if(!declared&&row.country&&!['espana','spain','espainia'].includes(normalize(clean(row.country))))throw new Error('Foreign country conflicts with the recovered target scope');
  const call = baseCall('euskadi', sourceUrl, now, territory);
  const gazteaukera = $('.bloqueInfo').length > 0;
  const heading=clean((gazteaukera ? $('h3').first().text() : $('h1').first().text()));
  call.title = fields['plaza'] || (normalize(heading)==='informacion general'?'':heading) || row.documentName;
  call.organization = fields['convoca'] || fields['¿quien oferta?'] || row.rrhhSponsor || 'Consultar fuente oficial';
  call.province = territory==='Navarra'?'Navarra':declared?provinceFromEuskadiRow(row):null;
  call.location = declared?(row.municipality || row.territory || row.rrhhTerritory || territory):territory;
  call.category = categoryFor(call.title);
  call.group = fields['grupo'] || 'Sin clasificar';
  const vacancies = (fields['nº plazas'] || row.rrhhVacancies || call.title.match(/^(\d+)\s+plaza/i)?.[1] || '').trim();
  call.places = /^\d+$/.test(vacancies) && Number(vacancies) > 0 ? Number(vacancies) : null;
  const education = fields['titulacion'] || fields['requisitos'] || '';
  call.educationText = education || call.educationText;
  call.acceptedQualifications = educationIds(education);
  const requirements = [fields['requisitos'], fields['perfil linguistico'], fields['otros requisitos'], fields['observaciones']].filter(Boolean);
  call.requirements = [...new Set(requirements)].concat(call.requirements);
  // Do not translate PL1/2/3/4 into CEFR automatically or infer exemptions.
  const profile=fields['perfil linguistico']||fields.requisitos||'';
  const levels=[...new Set((profile.match(/\b(?:B1|B2|C1|C2)\b/gi)??[]).map(level=>level.toUpperCase()))];
  const explicitBasque=/euskera|euskara/i.test(profile);
  const binding=explicitBasque?profile:profile+' '+(fields.requisitos||'');
  const optional=/merito|valora|voluntari|sin (?:fecha de )?preceptividad|no (?:se exige|preceptiv|obligatori|constituye requisito)/.test(normalize(binding));
  const otherLanguage=/ingles|frances|aleman|english|french/i.test(normalize(profile));
  if(levels.length===1&&!optional&&!otherLanguage&&/euskera|euskara/i.test(education+requirements.join(' '))){
   call.language={name:'euskera',level:levels[0] as 'B1'|'B2'|'C1'|'C2'};call.languageStatus='known';
  }
  call.deadline = parseDate(fields['plazo'] || '') ?? parseDate(row.rrhhEndDate || '');
  const start = parseDate(row.rrhhStartDate || ''); const today = now.slice(0,10);
  call.status = call.deadline ? call.deadline < today ? 'Cerrada' : start && start > today ? 'Próximamente' : 'Abierta' : 'Pendiente de confirmar';
  const relevant = linkList($, 'a[href]',sourceUrl).filter(a => /^(?:bases(?: de la convocatoria)?|convocatoria|temario|programa(?: de la oposici[oó]n)?|de(?:i)?aldia\s*\/\s*convocatoria)$/i.test(a.title));
  const rules = linkList(load(row.rrhhRules || ''), 'a[href]',sourceUrl);
  const documents = [...relevant, ...rules].filter((a,i,list)=>list.findIndex(b=>a.url===b.url)===i);
  call.documents = documents.map(a => ({...a, kind: /temario|programa/i.test(a.title) ? 'temario' : 'bases', checkedAt:null,sha256:null}));
  call.syllabusUrl = call.documents.find(doc=>doc.kind==='temario')?.url ?? null;
  call.description = 'Convocatoria publicada en el catálogo oficial de empleo público de Euskadi. Comprueba los turnos, el sistema de selección y los posibles requisitos específicos en las bases.';
  call.sourceHash = hash(html);
  return callSchema.parse(call);
}
export async function scrapeEuskadi(client: OfficialClient, now: string, since: string, onWarning: (message:string)=>void,selectedTerritory?:'Euskadi'|'Navarra') {
  const rows = parseDataset(await client.text(EUSKADI_DATA),since,selectedTerritory,{includeUndeclared:true});
  if (!rows.length) throw new Error('El catálogo no contiene fichas recientes de Euskadi; se conserva la importación anterior.');
  const calls: Call[] = [];
  for (const row of rows) {
    try {
      const html=await client.text(row.physicalUrl);
      if(!datasetTerritory(row)){
        const fields=readEuskadiFields(load(html));
        if(!nativeTerritory(fields)){
          if(!fields.ambito)onWarning(`Ficha ${row.physicalUrl}: Native geographical scope could not be confirmed`);
          continue;
        }
      }
      const call=parseEuskadiDetail(html,row,now);
      if(selectedTerritory&&call.territory!==selectedTerritory)continue;
      for (const doc of call.documents.slice(0,2)) {
        if (!/\.pdf(?:\?|$)/i.test(new URL(doc.url).pathname)) continue;
        try {
          const pdf = await pdfText(client,doc.url);
          doc.checkedAt=now;doc.sha256=pdf.sha256;
          // A bases PDF can contain several jobs and several programmes.
          // Only use a dedicated syllabus explicitly linked by the official ficha.
          if (doc.kind==='temario') call.topics=extractTopics(pdf.text);
        } catch (error) { onWarning(`Documento ${doc.url}: ${error instanceof Error ? error.message : 'Error'}`); }
      }
      calls.push(call);
      if(calls.length%20===0)console.log(`[euskadi] ${calls.length}/${rows.length} fichas procesadas`);
    } catch (error) { onWarning(`Ficha ${row.physicalUrl}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  if (!calls.length) throw new Error('No se ha podido extraer ninguna ficha de Euskadi.');
  return calls;
}
