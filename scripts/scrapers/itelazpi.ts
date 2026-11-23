import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,linkList,parseDate,stableId} from './shared';

export const ITELAZPI_LIST='https://www.itelazpi.eus/conocenos/ofertas-de-empleo/';

export function parseItelazpiList(html:string,now:string):Call[]{
  const $=load(html);let phase:'ongoing'|'closed'|null=null;
  const calls:Call[]=[];
  $('h2,h5').each((_,element)=>{
    const title=clean($(element).text());
    if($(element).is('h2')){
      if(/procesos en vigor/i.test(title))phase='ongoing';
      if(/procesos concluidos/i.test(title))phase='closed';
      return;
    }
    if(!phase||!title)return;
    const container=$(element).parent(),text=clean(container.text());
    if(!/Ofertante:\s*Itelazpi/i.test(text))return;
    const external=linkList(load($.html(container)),'a[href]',ITELAZPI_LIST).find(link=>/enlace/i.test(link.title));
    if(!external)return;
    const call=baseCall('itelazpi',ITELAZPI_LIST,now,'Euskadi');call.id=stableId('itelazpi',external.url);
    call.title=title;call.organization='Itelazpi';call.category=categoryFor(title);
    const place=text.match(/Ofertante:\s*Itelazpi\s*\(([^)]+)\)/i)?.[1];
    call.location=place??'Euskadi';call.province=place&&/\bbizkaia\b/.test(normalize(place))?'Bizkaia':null;
    const count=text.match(/N[ºo.]?\s*Plazas\s*:\s*(\d+)/i)?.[1];call.places=count&&Number(count)>0?Number(count):null;
    const range=text.match(/\((\d{1,2}\/\d{1,2}\/\d{4})\s*[–-]\s*(\d{1,2}\/\d{1,2}\/\d{4})\)/);
    const start=range?parseDate(range[1]):null;call.deadline=range?parseDate(range[2]):null;
    call.status=phase==='closed'?'Cerrada':call.deadline?call.deadline<now.slice(0,10)?'Cerrada':start&&start>now.slice(0,10)?'Próximamente':'Abierta':'Pendiente de confirmar';
    call.description='Proceso publicado en el apartado oficial de ofertas de empleo de Itelazpi. El enlace de la oferta permite consultar los requisitos y las condiciones publicadas por la entidad.';
    call.documents=[{...external,title:'Enlace de la oferta publicado por Itelazpi',kind:'guia',checkedAt:null,sha256:null}];call.sourceHash=hash($.html(container));
    calls.push(callSchema.parse(call));
  });
  if(!calls.length&&!/no h(?:ay|a) ningun proceso abierto/.test(normalize(clean($('body').text()))))throw new Error('Itelazpi employment section is not recognized');
  return calls;
}

export async function scrapeItelazpi(client:OfficialClient,now:string):Promise<Call[]>{
  return parseItelazpiList(await client.text(ITELAZPI_LIST),now);
}
