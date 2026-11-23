import type { Call } from '../../src/lib/catalogue';
import { OfficialClient } from './http';
import { parseForalTable } from './bizkaia';
export const IFAS_LIST='https://ifas.bizkaia.eus/listado-convocatoriasVigor.asp?idioma=ca&idpagina=KOFRJVUIHCJFMJXCLWGSJDUPOKKGNQYDLWNZ';
export function parseIfasList(html:string,now:string):Call[] {
  return parseForalTable(html,now,{id:'ifas',url:IFAS_LIST,organization:'IFAS · Instituto Foral de Asistencia Social',province:'Bizkaia'});
}
export async function scrapeIfas(client:OfficialClient,now:string):Promise<Call[]> {
  const calls=parseIfasList(await client.text(IFAS_LIST),now);
  if (!calls.length) throw new Error('No se reconocen convocatorias en vigor del IFAS');
  return calls;
}
