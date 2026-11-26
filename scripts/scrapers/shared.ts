import { load, type CheerioAPI } from 'cheerio';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { callSchema, normalize, specificUniversityQualifications, isGeneralUniversityRequirement, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
export const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
export const htmlText = (html: string) => clean(load(html).text());
export function canonical(value: string, base?: string) {
  const url = new URL(value, base); url.hash = '';
  ['back','pageBackId','utm_source','utm_campaign','utm_medium'].forEach(key => url.searchParams.delete(key));
  if (url.protocol !== 'https:') return null;
  return url.href;
}
export const stableId = (source: string, identity: string) => `${source}-${createHash('sha256').update(identity).digest('hex').slice(0, 20)}`;
export function parseDate(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const result = `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return !Number.isNaN(Date.parse(result)) && new Date(result).toISOString().slice(0,10) === result ? result : null;
}
export function linkList($: CheerioAPI, selector: string, base: string) {
  return $(selector).map((_, e) => { const a = $(e); const raw = a.attr('href'); if (!raw) return null; try { const url = canonical(raw, base); return url ? { title: clean(a.text()) || clean(a.attr('title') ?? ''), url } : null; } catch { return null; } }).get();
}
export function educationIds(text: string): Call['acceptedQualifications'] {
  const t = normalize(clean(text)); const result: Call['acceptedQualifications'] = [];
  const musicDegree=/(?:titulo|profesor|estudios|ensenanzas)[^.]*\b(?:musica|guitarra|piano|violin|danza|conservatorio|arte dramatico)\b/.test(t);
  const vocational=!musicDegree||/formacion profesional|\bfp\b|ciclo formativo|tecnico (?:medio|superior)/.test(t);
  // Only explicit education phrases. Never derive a qualification from a job title or its group.
  // LOE additional provision 31.1: Graduado Escolar has the same professional
  // effects as ESO. This does not equate a bare school-attendance certificate.
  if (/\b(?:eso|e\.s\.o|educacion secundaria obligatoria|graduado en educacion secundaria|graduado escolar)\b/.test(t)) result.push('eso');
  if (/bachiller(?:ato)?\b/.test(t)) result.push('bachiller');
  if (vocational&&/tecnico superior|grado superior|grado medio o superior|formacion profesional de segundo grado|fp\s*(?:ii|2)\b/.test(t)) result.push('fp-superior');
  if (vocational&&/grado medio|grado superior o medio|fp\s*(?:i|1)\b/.test(t)) result.push('fp-medio');
  result.push(...specificUniversityQualifications(text));
  if(isGeneralUniversityRequirement(text))result.push('grado');
  if (!specificUniversityQualifications(text).length && !/\b(?:master|especialidad|especialidades|psicologia|trabajo social|derecho|medicina|ingenieria informatica|geologia)\b/.test(t) && /(?:cualquier (?:titulo (?:de )?)?grado|titulo universitario de grado, de licenciatura|grado universitario o licenciatura|titulacion universitaria de grado sin especificar)/.test(t)) result.push('grado');
  if (/baccalaureat (?:de l['’]enseignement secondaire|ou d['’]un diplome)/.test(t)) result.push('bac');
  if (/diplome (?:national )?de licence\b/.test(t)) result.push('licence');
  return [...new Set(result)];
}
export function categoryFor(title: string): Call['category'] {
  const text = normalize(title);
  if (/enfermer|medic|pediatr|sanitari|salud|infirmier|pu[ée]ric|sage.femme|pharmac/.test(text)) return 'Sanidad';
  if (/profesor|maestr|docente|ensenanza|enseignement|ecoles maternelles/.test(text)) return 'Educación';
  if (/administr|gestion|redacteur|attach[ée]/.test(text)) return 'Administración';
  return 'Servicios';
}
// Call only with an explicitly published university requirement, separated
// from merits and duties. The stored text is never rewritten as a grado.
export function universityRequirementIds(text:string):Call['acceptedQualifications']{
  const result=educationIds(text);
  if(/titulaci[oó]n universitaria/i.test(text))for(const alternative of text.split(/[,;]|\s+o\s+/i)){
    const subject=alternative.replace(/^.*?titulaci[oó]n universitaria\s+(?:en|de)\s+/i,'').trim();
    result.push(...educationIds('Grado en '+subject));
  }
  return [...new Set(result)];
}
export function baseCall(source: string, url: string, now: string, territory: Call['territory']): Call {
  return callSchema.parse({ id: stableId(source,url), title: 'Pendiente', organization: 'Consultar organismo convocante', territory, location: territory, category: 'Servicios', group: 'Sin clasificar', places: null, acceptedQualifications: [], educationText: 'Titulación pendiente de extracción. Consulta las bases oficiales.', language: null, languageStatus: 'unknown', deadline: null, status: 'Pendiente de confirmar', description: 'Proceso publicado en una fuente oficial. Consulta las bases y los requisitos de cada turno.', requirements: ['Revisa en las bases los requisitos de acceso, los turnos y las acreditaciones.'], topics: [], sourceUrl: url, syllabusUrl: null, isDemo: false, verifiedAt: null, scrapedAt: now, sourceId: source, sourceHash: hash(url), documents: [], reviewStatus: 'automatic' });
}
export function extractTopics(text: string) {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  let start = lines.findIndex(line => /^(?:ANEXO\s+[IVX\d]+\s*[.\-–:]*\s*)?(?:TEMARIO|PROGRAMA)(?:\s+DE\s+(?:LA|LAS)\s+(?:OPOSICI[ÓO]N|PRUEBAS))?\s*$/i.test(line));
  if (start < 0) start = lines.findIndex(line => /^ANEXO\b.{0,20}(?:TEMARIO|PROGRAMA)\s*$/i.test(line));
  if (start < 0) return [];
  const topics: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^ANEXO\s+[IVX\d]+\b/i.test(line)) break;
    if (/^(?:Tema\s+)?\d{1,3}\s*[.\-–—]/i.test(line) && line.length > 15 && line.length < 2500) topics.push(line);
    if (topics.length >= 150) break;
  }
  return topics;
}
export async function pdfText(client: OfficialClient, url: string) {
  const result = await client.get(url);
  if (!result.body.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('El enlace no contiene un PDF');
  const dir = await mkdtemp(join(tmpdir(), 'oposaketia-pdf-'));
  try {
    await writeFile(join(dir,'source.pdf'),result.body);
    await promisify(execFile)('pdftotext', ['-layout','-enc','UTF-8',join(dir,'source.pdf'),join(dir,'source.txt')], { timeout: 20000, maxBuffer: 2_000_000 });
    return { text: await readFile(join(dir,'source.txt'),'utf8'), sha256: hash(result.body) };
  } finally { await rm(dir,{recursive:true,force:true}); }
}
