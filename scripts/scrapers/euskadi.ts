import { provinceFromEuskadiRow } from '../../src/lib/geography';
import { load } from 'cheerio';
import { z } from 'zod';
import { callSchema, type Call, normalize } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, htmlText, parseDate, educationIds, categoryFor, linkList, canonical, pdfText, extractTopics } from './shared';
export const EUSKADI_DATA = 'https://opendata.euskadi.eus/contenidos/ds_rrhh/empleo_publico_otras_ope/opendata/ofertas.json';
const rowSchema = z.record(z.string(), z.string());
export function parseDataset(text: string, since: string) {
  return z.array(rowSchema).parse(JSON.parse(text)).filter(row => {
    const territory = normalize(`${row.rrhhTerritory ?? ''} ${row.territory ?? ''}`);
    // Municipal processes often remain active long after applications close.
    const municipal = /ayuntamiento|udala/i.test(row.rrhhSponsor ?? '');
    const cutoff = municipal ? new Date(Date.parse(since) - 275 * 86400000).toISOString().slice(0,10) : since;
    return /pais vasco|euskadi|bizkaia|gipuzkoa|araba|alava/.test(territory) &&
      ((parseDate(row.rrhhEndDate ?? '') ?? '') >= cutoff || (parseDate(row.rrhhStartDate ?? '') ?? '') >= cutoff);
  });
}
export function parseEuskadiDetail(html: string, row: Record<string,string>, now: string): Call {
  const sourceUrl = canonical(row.physicalUrl)!;
  if (!sourceUrl) throw new Error('Ficha sin URL HTTPS');
  const $ = load(html); const fields: Record<string,string> = {};
  $('.r01gContentTabSeccion, .bloqueInfo').each((_, el) => {
    const label = normalize(clean($(el).find('.r01gContentSeccionTitulo, .cabecera').first().text())).replace(/:$/,'');
    const value = clean($(el).find('.r01gContentSeccionTexto, .info').first().text());
    if (label) fields[label] = value;
  });
  if (!Object.keys(fields).length) throw new Error('Estructura de ficha de Euskadi no reconocida');
  const call = baseCall('euskadi', sourceUrl, now, 'Euskadi');
  const gazteaukera = $('.bloqueInfo').length > 0;
  call.title = clean((gazteaukera ? $('h3').first().text() : $('h1').first().text())) || row.documentName;
  call.organization = fields['convoca'] || fields['¿quien oferta?'] || row.rrhhSponsor || 'Consultar fuente oficial';
  call.province = provinceFromEuskadiRow(row);
  call.location = row.municipality || row.territory || row.rrhhTerritory || 'Euskadi';
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
  const lang = (fields['perfil linguistico'] || fields['requisitos'] || '').match(/\b(B1|B2|C1|C2)\b/);
  if (lang && /euskera/i.test(education + requirements.join(' '))) { call.language = { name: 'euskera', level: lang[1] as 'B1'|'B2'|'C1'|'C2' }; call.languageStatus = 'known'; }
  call.deadline = parseDate(fields['plazo'] || '') ?? parseDate(row.rrhhEndDate || '');
  const start = parseDate(row.rrhhStartDate || ''); const today = now.slice(0,10);
  call.status = call.deadline ? call.deadline < today ? 'Cerrada' : start && start > today ? 'Próximamente' : 'Abierta' : 'Pendiente de confirmar';
  const relevant = linkList($, 'a[href]',sourceUrl).filter(a => /^(?:bases(?: de la convocatoria)?|temario|programa(?: de la oposici[oó]n)?|dealdia\s*\/\s*convocatoria)$/i.test(a.title));
  const rules = linkList(load(row.rrhhRules || ''), 'a[href]',sourceUrl);
  const documents = [...relevant, ...rules].filter((a,i,list)=>list.findIndex(b=>a.url===b.url)===i);
  call.documents = documents.map(a => ({...a, kind: /temario|programa/i.test(a.title) ? 'temario' : 'bases', checkedAt:null,sha256:null}));
  call.syllabusUrl = call.documents.find(doc=>doc.kind==='temario')?.url ?? null;
  call.description = 'Convocatoria publicada en el catálogo oficial de empleo público de Euskadi. Comprueba los turnos, el sistema de selección y los posibles requisitos específicos en las bases.';
  call.sourceHash = hash(html);
  return callSchema.parse(call);
}
export async function scrapeEuskadi(client: OfficialClient, now: string, since: string, onWarning: (message:string)=>void) {
  const rows = parseDataset(await client.text(EUSKADI_DATA),since);
  if (!rows.length) throw new Error('El catálogo no contiene fichas recientes de Euskadi; se conserva la importación anterior.');
  const calls: Call[] = [];
  for (const row of rows) {
    try {
      const call = parseEuskadiDetail(await client.text(row.physicalUrl),row,now);
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
