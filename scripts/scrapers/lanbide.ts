import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {provinceFromEuskadiRow,provinceTerritory,type Province} from '../../src/lib/geography';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,educationIds,linkList,parseDate,stableId} from './shared';
export const LANBIDE_LIST='https://web.lanbide.eus/apps/OF_RES_BUSQUEDA_OFERTAS?CTRG=3&LG=C&ML=OFEMEN1&MS=Eaa&ORDN=11&RG=1&RP=10';
export const LANBIDE_HOME='https://www.lanbide.euskadi.eus/empleo-publico-lanbide/weblan00-content/es/';
type Listing={id:string;url:string;province:Province;title:string;description:string;published:string|null};
export function parseLanbideList(html:string):{listings:Listing[];next:number|null}{
 const $=load(html);if(!$('.results__filter--type a.current').attr('href')?.match(/cambiar_origen\(3\)/))throw Error('El listado no confirma el filtro de empleo público de Lanbide');
 const listings:Listing[]=[];
 $('.result--offer--job').each((_,el)=>{const row=$(el),anchor=row.find('h2 a');const id=anchor.attr('href')?.match(/^javascript:ver_detalle\('(\d+)'\)/)?.[1];if(!id)return;
  const region=clean(row.find('[itemprop="addressRegion"]').text());const province=provinceFromEuskadiRow({territory:region})??(/^(navarra|nafarroa)$/i.test(region)?'Navarra':null);if(!province)return;
  const url=new URL('OF_DETALLE_OFERTA_TRABAJO',LANBIDE_LIST);url.search=new URLSearchParams({LG:'C',IDRG:id,CTRG:'3'}).toString();
  listings.push({id,url:url.href,province,title:clean(anchor.text()),description:clean(row.find('[itemprop="description"]').text()),published:parseDate(clean(row.find('[itemprop="datePosted"]').text()))});
 });
 const next=$('a').filter((_,el)=>/^Siguiente$/i.test(clean($(el).text()))).attr('href')?.match(/^javascript:cambiar_pagina\((\d+)\)/)?.[1];
 return {listings,next:next?(Number(next)-1)*10+1:null};
}
export function parseLanbideDetail(html:string,listing:Listing,now:string):Call{
 const $=load(html),root=$('.offer--job');if(!root.find('h1[itemprop="title"]').length)throw Error('Ficha de Lanbide no reconocida');
 const fields:Record<string,string>={};root.find('li > b').each((_,el)=>{const label=normalize(clean($(el).text())).replace(/:$/,'');const value=clean($(el).parent().clone().children('b').remove().end().text());fields[label]=value;});
 const call=baseCall('lanbide',listing.url,now,provinceTerritory(listing.province));call.id=stableId('lanbide',listing.id);call.title=clean(root.find('h1[itemprop="title"]').text());call.province=listing.province;call.location=clean(root.find('[itemprop="addressLocality"]').text())||listing.province;
 call.organization=fields.organismo||'Organismo pendiente de comprobar en Lanbide';call.category=categoryFor(call.title);
 const count=fields['nº de puestos'];call.places=count&&/^\d+$/.test(count)&&Number(count)>0?Number(count):null;
 const desc=root.find('.offer__info__section--description').filter((_,el)=>/^Descripción$/i.test(clean($(el).find('h2').text()))).find('div').text();call.description=clean(desc)||listing.description||call.description;
 const requirement=root.find('.offer__info__section--requirement').filter((_,el)=>/requisito/i.test($(el).find('h2').text())).text();
 if(requirement){call.educationText=clean(requirement);call.acceptedQualifications=educationIds(requirement);call.requirements=[clean(requirement)];}
 const deadline=fields['fecha limite']||fields['fecha fin']||fields['plazo de inscripcion'];call.deadline=deadline?parseDate(deadline):null;call.status=call.deadline?(call.deadline>=now.slice(0,10)?'Abierta':'Cerrada'):'Pendiente de confirmar';
 call.documents=linkList($,'.offer__info a[href]',listing.url).filter((doc,index,all)=>all.findIndex(other=>other.url===doc.url)===index).filter(doc=>/^https:\/\/(?:www\.)?(?:lanbide\.euskadi\.eus|euskadi\.eus|donostia\.eus|bilbao\.eus|navarra\.es|araba\.eus|bizkaia\.eus|gipuzkoa\.eus|vitoria-gasteiz\.org)\//i.test(doc.url)).map(doc=>({...doc,kind:/temario|programa/i.test(doc.title)?'temario' as const:/bases/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null}));
 call.syllabusUrl=call.documents.find(doc=>doc.kind==='temario')?.url??null;call.sourceHash=hash(html);return callSchema.parse(call);
}
export function enrichLanbideBolsas(calls:Call[],html:string,now:string,published:Map<string,string|null>){
 const $=load(html);const text=clean($('body').text());
 const range=text.match(/plazo para in[s]?cribirse en las Bolsas es del (\d{1,2}) al (\d{1,2}) de (\w+) de (\d{4})/i);
 if(!range)return;
 const month=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'].indexOf(range[3].toLowerCase())+1;
 const start=parseDate(`${range[1]}/${month}/${range[4]}`),end=parseDate(`${range[2]}/${month}/${range[4]}`);if(!start||!end)return;
 const docs=linkList($,'a[href]',LANBIDE_HOME).filter(doc=>new URL(doc.url).hostname==='www.lanbide.euskadi.eus'&&new URL(doc.url).pathname.startsWith('/contenidos/informacion/empleo_publico_lanbide/')&&/\.pdf$/i.test(new URL(doc.url).pathname));
 for(const call of calls){const date=published.get(call.sourceUrl);if(!/lanbide/i.test(call.organization)||!date||date<start||date>end||!call.documents.some(doc=>doc.url===LANBIDE_HOME))continue;
  call.deadline=end;call.status=now.slice(0,10)<start?'Próximamente':now.slice(0,10)<=end?'Abierta':'Cerrada';
  call.documents.push(...docs.map(doc=>({...doc,kind:/bases generales/i.test(doc.title)?'bases' as const:'guia' as const,checkedAt:now,sha256:null})));
  callSchema.parse(call);
 }
}
export async function scrapeLanbide(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const listings=new Map<string,Listing>();let offset:number|null=1;const visited=new Set<number>();
 while(offset!==null&&!visited.has(offset)&&visited.size<50){visited.add(offset);const url=new URL(LANBIDE_LIST);url.searchParams.set('RG',String(offset));const page=parseLanbideList(await client.text(url.href));for(const item of page.listings)listings.set(item.id,item);offset=page.next;}
 if(offset!==null)warn('La paginación de Lanbide no terminó; revisa el listado oficial');if(!listings.size)throw Error('No se reconocen ofertas públicas de Lanbide en las provincias cubiertas');
 const calls:Call[]=[];for(const listing of listings.values())try{calls.push(parseLanbideDetail(await client.text(listing.url),listing,now));}catch(e){warn(`Oferta Lanbide ${listing.id}: ${e instanceof Error?e.message:'Error'}`);}
 if(!calls.length)throw Error('No se pudo extraer ninguna oferta de Lanbide');
 try{enrichLanbideBolsas(calls,await client.text(LANBIDE_HOME),now,new Map([...listings.values()].map(item=>[item.url,item.published])));}catch(e){warn(`Bolsas Lanbide: ${e instanceof Error?e.message:'Error'}`);}
 return calls;
}
