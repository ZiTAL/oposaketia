import { load } from 'cheerio';
import { callSchema, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, canonical, categoryFor, clean, linkList } from './shared';

export const BIZKAIA_LIST = 'https://www.bizkaia.eus/Herri_Administrazioa/ope/bolsa-convocatorias.asp?Idioma=CA&Tem_Codigo=2089';
type ForalTableSource = {id:string;url:string;organization:string;province:'Bizkaia'|'Gipuzkoa'|'Araba / Álava'};
export function parseForalTable(html:string,now:string,source:ForalTableSource): Call[] {
  const $ = load(html);
  return $('table.ope_tabla90 tr').toArray().flatMap(row => {
    const element = $(row), link = element.find('td[headers="Nombre"] a[href*="convocatoria.asp"]').first();
    const title = clean(link.text()), rawUrl = link.attr('href');
    if (!title || !rawUrl) return [];
    const url = canonical(rawUrl,source.url);
    if (!url || new URL(url).origin!==new URL(source.url).origin) return [];
    const call = baseCall(source.id,url,now,'Euskadi');
    call.title = title; call.organization = source.organization;
    call.province = source.province; call.location = source.province; call.category = categoryFor(title);
    const places = clean(element.find('td[headers="Plazas"]').text());
    call.places = /^\d+$/.test(places) && Number(places)>0 ? Number(places) : null;
    call.description = `Convocatoria en vigor publicada por ${source.organization}. La presencia en esta lista no confirma que el plazo de inscripción esté abierto. Consulta las bases y la fase del proceso.`;
    call.status = 'Pendiente de confirmar'; call.sourceHash = hash($.html(row));
    return [callSchema.parse(call)];
  });
}
export function parseBizkaiaList(html:string,now:string):Call[] {
  return parseForalTable(html,now,{id:'bizkaia',url:BIZKAIA_LIST,organization:'Diputación Foral de Bizkaia',province:'Bizkaia'});
}
export async function scrapeBizkaia(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const calls = parseBizkaiaList(await client.text(BIZKAIA_LIST),now);
  if (!calls.length) throw new Error('No se reconocen convocatorias de Bizkaia');
  for (const call of calls) {
    try {
      const html = await client.text(call.sourceUrl); const $ = load(html);
      call.documents = linkList($,'a[href]',call.sourceUrl)
        .filter(link => /\.pdf(?:\?|$)/i.test(link.url) && /base|temario|bibliograf|programa/i.test(link.title))
        .map(link => ({...link,kind:/temario|programa/i.test(link.title)?'temario' as const:/bibliograf/i.test(link.title)?'guia' as const:'bases' as const,checkedAt:null,sha256:null}));
      // The first summary PDF is the official announcement, not a candidate list.
      const announcement = linkList($,'a[href]',call.sourceUrl).find(link => /\/Bao_bob\//i.test(link.url));
      if (announcement && !call.documents.some(doc => doc.url===announcement.url)) call.documents.push({...announcement,title:'Anuncio oficial de la convocatoria',kind:'bases',checkedAt:null,sha256:null});
      call.syllabusUrl = call.documents.find(doc => doc.kind==='temario')?.url ?? null;
      call.sourceHash = hash(html);
    } catch (error) { warn(`${call.sourceUrl}: ${error instanceof Error ? error.message : 'Error'}`); }
  }
  return calls;
}
