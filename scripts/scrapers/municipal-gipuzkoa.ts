import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,categoryFor,clean,stableId} from './shared';
import {municipalPortals,type MunicipalPortal} from '../municipal-portals';

const seatHosts=['uzt.gipuzkoa.eus','udal.egoitza.gipuzkoa.eus','erakunde.egoitza.gipuzkoa.eus'];
export function isEmptyMunicipalSeat(html:string,id:MunicipalPortal):boolean{
  const $=load(html),name=normalize(municipalPortals[id].name.replace('Ayuntamiento de ',''));
  const section=$('.actualidad').filter((_,node)=>normalize(clean($(node).children('h2').text()))==='enplegu publikoaren eskaintza');
  const panel=section.children('.panel-body.noticiaHome');
  const identity=$('.textoAyuntamiento').clone();identity.children().remove();
  return panel.length===1&&!clean(panel.text())&&!panel.find('a,table,iframe,script').length&&normalize(clean(identity.text()))===name;
}
export function parseMunicipalGipuzkoa(html:string,id:MunicipalPortal,now:string,baseUrl:string=municipalPortals[id].url):Call[]{
  const portal=municipalPortals[id],$=load(html),calls=new Map<string,Call>();
  $('a[href]').each((_,element)=>{
    const title=clean($(element).text());
    if(!title||/zerbitzu eginkizun|barne sustapen|barne mugikortasun|promocion interna|traslado|comision de servicios/.test(normalize(title)))return;
    let url:URL;
    try{url=new URL($(element).attr('href')!,baseUrl);}catch{return;}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!seatHosts.includes(url.hostname))return;
    const match=url.pathname.match(/^\/WAS\/CORP\/LLEHautaketaProzesuakWEB\/concursosAytos\/(\d+)\/[01]\/(\d+)\/ver$/);
    if(!match||match[2]!==portal.code)return;
    url.search='';url.hash='';
    const call=baseCall(id,url.href,now,'Euskadi');
    // Both published municipal seat hostnames identify the same process.
    call.id=stableId(id,`${portal.code}/${match[1]}`);
    call.title=title;call.organization=portal.name;call.location=portal.name.replace('Ayuntamiento de ','');call.province='Gipuzkoa';call.category=categoryFor(title);
    call.description='Proceso enlazado expresamente desde la página de empleo del ayuntamiento. El listado no confirma que el plazo de inscripción esté abierto. Requisitos, fechas y temario deben consultarse en la ficha de la sede oficial.';
    call.sourceHash=hash($.html(element));
    calls.set(call.id,callSchema.parse(call));
  });
  return [...calls.values()];
}

export async function scrapeMunicipalGipuzkoa(client:OfficialClient,id:MunicipalPortal,now:string):Promise<Call[]>{
  const portal=municipalPortals[id],html=await client.text(portal.url);
  const calls=parseMunicipalGipuzkoa(html,id,now);
  const $=load(html);
  const seats=$('a[href]').map((_,node)=>{
    try{
      const url=new URL($(node).attr('href')!,portal.url);
      // Some municipal pages publish a legacy HTTP link; request only its
      // HTTPS equivalent, after validating the seat and municipality code.
      if(url.protocol==='http:')url.protocol='https:';
      const match=url.pathname.match(/^\/WAS\/CORP\/LLEHautaketaProzesuakWEB\/concursosAytos\/(\d{1,3})$/);
      if(url.protocol!=='https:'||url.username||url.password||url.port||!seatHosts.includes(url.hostname)||!match||String(Number(match[1]))!==portal.code)return null;
      return url.href;
    }catch{return null;}
  }).get();
  // All matching links identify this municipality's one selection index.
  if(seats.length){const seat=seats[0],seatHtml=await client.text(seat);calls.push(...parseMunicipalGipuzkoa(seatHtml,id,now,seat));if(!calls.length&&isEmptyMunicipalSeat(seatHtml,id))return [];}
  if(!calls.length)throw new Error(`No se reconocen procesos municipales de ${id}`);
  return [...new Map(calls.map(call=>[call.id,call])).values()];
}
