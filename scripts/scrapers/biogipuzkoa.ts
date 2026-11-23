import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,canonical,categoryFor,clean,parseDate,linkList} from './shared';
export const BIOGIPUZKOA_LIST='https://gestiononline.bioef.eus/ConvocatoriasPropiasBioef/es/Convocatorias/DetalleTipoConvocatoria/OFEBD?Estado=T';
export function parseBiogipuzkoaList(html:string,now:string):Call[] {
  const $=load(html);
  if(!/OFERTAS BIOGIPUZKOA/.test(clean($('#TipoConvocatoria').text()))||!$('#GvConvocatorias').length)throw new Error('No se reconoce el listado específico de Biogipuzkoa');
  const since=new Date(Date.parse(now)-365*86400000).toISOString().slice(0,10);
  return $('#GvConvocatorias tbody tr').toArray().flatMap(row=>{
    const cells=$(row).find('td'),anchor=cells.eq(0).find('a[href]').first(),title=clean(anchor.text()),href=anchor.attr('href');
    if(!title||!href||/practicas|anulada|anulado/.test(normalize(title)))return [];
    const start=parseDate(clean(cells.eq(1).text()).split(' ')[0]),deadline=parseDate(clean(cells.eq(2).text()).split(' ')[0]);
    if(!deadline||deadline<since)return [];
    const url=canonical(href,BIOGIPUZKOA_LIST);
    if(!url||new URL(url).origin!==new URL(BIOGIPUZKOA_LIST).origin||!/\/VerConvocatoria\/\d+$/.test(new URL(url).pathname))return [];
    const call=baseCall('biogipuzkoa',url,now,'Euskadi');
    call.title=title;call.organization='Biogipuzkoa';call.category=categoryFor(title);call.location='Euskadi';
    if(/donostia|san sebastian|gipuzkoa/.test(normalize(title))){call.province='Gipuzkoa';call.location='Gipuzkoa';}
    call.deadline=deadline;const state=clean(cells.eq(3).text()),today=now.slice(0,10);
    call.status=deadline<today||/^CERRADA$/i.test(state)?'Cerrada':/^ABIERTA$/i.test(state)?start&&start>today?'Próximamente':'Abierta':'Pendiente de confirmar';
    call.description='Oferta de Biogipuzkoa publicada en el portal BIOEF. Se incluyen plazos de inscripción del último año o futuros y se excluyen prácticas y ofertas anuladas. Consulta las bases para conocer la titulación, las funciones y las condiciones.';
    call.sourceHash=hash($.html(row));return [callSchema.parse(call)];
  });
}
export async function scrapeBiogipuzkoa(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const calls=parseBiogipuzkoaList(await client.text(BIOGIPUZKOA_LIST),now);
  for(const call of calls){try{
    const html=await client.text(call.sourceUrl),$=load(html);
    if(!/OFERTAS BIOGIPUZKOA/.test(clean($('#TipoConvocatoria').text())))throw new Error('La ficha no pertenece a Biogipuzkoa');
    const places=clean($('p.Bold').text()).match(/Vacantes:\s*(\d+)/i);call.places=places?Number(places[1])||null:null;
    call.documents=linkList($,'a.EnlaceDescarga[href]',call.sourceUrl).filter(doc=>/bases|temario|programa/i.test(doc.title)&&!/resultado|admitid|excluid/i.test(doc.title)).map(doc=>({...doc,kind:/temario|programa/i.test(doc.title)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}));
    call.syllabusUrl=call.documents.find(doc=>doc.kind==='temario')?.url??null;call.sourceHash=hash(html);
  }catch(error){warn(`${call.sourceUrl}: ${error instanceof Error?error.message:'Error'}`);}}
  return calls;
}
