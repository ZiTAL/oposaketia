import {load} from 'cheerio';
import {OfficialClient} from './http';
import {clean} from './shared';

export const BEAZ_EMPLOYMENT='https://beaz.bizkaia.eus/empleo/';

export function parseBeazEmployment(html:string):[]{
 const $=load(html);
 const open=$('.empleos-abiertos-container'),closed=$('.empleos-cerrados-container');
 if(open.length!==1||closed.length!==1||!/^Procesos de selección activos$/i.test(clean(open.find('h2').first().text()))||!/^Procesos de selección finalizados$/i.test(clean(closed.find('h2').first().text())))throw new Error('Apartado de selección de Beaz no identificado');
 if(!/Actualmente no existe ningún proceso de selección activo\./i.test(clean(open.text())))throw new Error('Beaz ha cambiado su lista de procesos activos; requiere revisión');
 return [];
}

export async function scrapeBeaz(client:OfficialClient):Promise<[]>{
 return parseBeazEmployment(await client.text(BEAZ_EMPLOYMENT));
}
