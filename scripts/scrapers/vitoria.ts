import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,categoryFor,linkList,stableId,parseDate} from './shared';
export const VITORIA_LIST='https://www.vitoria-gasteiz.org/wb021/was/contenidoAction.do?idioma=es&uid=a5de718_1855726948b__7e6a';
export function parseVitoriaGroup(html:string,url:string,now:string):Call[]{
 const $=load(html),content=$('#wb021contenido');const calls:Call[]=[];
 content.find('li > strong').each((_,element)=>{
  const title=clean($(element).text()).replace(/:$/,'');const code=title.match(/^(\d{2}(?:A[12]|C[12]|E)[A-Z]*)\s/);
  if(!code)return;
  const row=$(element).parent();const text=clean(row.text());const call=baseCall('vitoria',url,now,'Euskadi');
  call.id=stableId('vitoria',url+'|'+code[1]);call.title=title;call.organization='Ayuntamiento de Vitoria-Gasteiz';call.province='Araba / Álava';call.location='Vitoria-Gasteiz';call.group=code[1].match(/A[12]|C[12]/)?.[0]||'OAP';call.category=categoryFor(title);
  const match=text.match(/Fecha fin inscripciones\s+(\d{1,2}) de (\w+) de (\d{4})/i);const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  if(match){const month=months.indexOf(match[2].toLowerCase())+1;if(month)call.deadline=parseDate(`${match[1]}/${month}/${match[3]}`);}
  call.status=call.deadline?(call.deadline>=now.slice(0,10)?'Abierta':'En curso'):'Pendiente de confirmar';
  call.description=`Convocatoria municipal OPE 22-24. ${title}. Consulta las bases específicas y sus correcciones para confirmar todos los requisitos.`;
  call.documents=linkList($,'#wb021contenido a[href]',url).filter(doc=>row.find('a[href]').toArray().some(a=>new URL($(a).attr('href')!,url).href===doc.url)).map(doc=>{
   const a=row.find('a[href]').filter((_,el)=>new URL($(el).attr('href')!,url).href===doc.url).first();const context=clean(a.closest('li').clone().children('ul').remove().end().text());
   const kind=/material de preparaci[oó]n|temario|programa/i.test(context)?'temario' as const:/base|texto refundido/i.test(context)?'bases' as const:'guia' as const;
   return {...doc,title:clean(context)||doc.title,kind,checkedAt:now,sha256:null};
  });
  call.syllabusUrl=call.documents.find(d=>d.kind==='temario')?.url??null;call.sourceHash=hash(row.html()||'');calls.push(callSchema.parse(call));
 });return calls;
}
export async function scrapeVitoria(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const $=load(await client.text(VITORIA_LIST));const publicSection=$('#wb021contenido h2').filter((_,e)=>/^Convocatorias públicas$/i.test(clean($(e).text()))).first().nextUntil('h2');
 const ope=publicSection.find('a[href]').filter((_,e)=>/OPE.*Convocatoria/i.test($(e).text())).first().attr('href');if(!ope)throw Error('No se reconoce el enlace a la OPE municipal');
 const opeUrl=new URL(ope,VITORIA_LIST).href;const groupPage=load(await client.text(opeUrl));
 const groups=linkList(groupPage,'#wb021contenido a[href]',opeUrl).filter(a=>/Acceso a informaci[oó]n y Bases de este grupo/i.test(a.title));if(!groups.length)throw Error('No se reconocen los grupos de la OPE municipal');
 const calls:Call[]=[];for(const group of groups)try{const parsed=parseVitoriaGroup(await client.text(group.url),group.url,now);if(!parsed.length)warn(`No se reconocen puestos en ${group.url}`);calls.push(...parsed);}catch(e){warn(`Grupo Vitoria: ${e instanceof Error?e.message:'Error'}`);}
 if(!calls.length)throw Error('No se pudo extraer ninguna convocatoria municipal');return calls;
}
