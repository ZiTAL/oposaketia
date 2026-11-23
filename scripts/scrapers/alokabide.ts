import { z } from 'zod';
import { callSchema, normalize, type Call } from '../../src/lib/catalogue';
import { OfficialClient, hash } from './http';
import { baseCall, clean, categoryFor } from './shared';
export const ALOKABIDE_PORTAL='https://alokabide.convoca.online';
const API='https://apigw.convoca.online/';
const ORIGIN=`origin=${encodeURIComponent(ALOKABIDE_PORTAL)}`;
const identifier=z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i);
const languages=z.record(z.string(),z.string());
const rowSchema=z.object({id:identifier,entityOepId:identifier,title:languages,description:languages,startDate:z.string().nullable(),endDate:z.string().nullable(),vacancies:z.object({total:z.number().int().nonnegative()})});
const documentSchema=z.object({name:languages,processTitle:languages,url:z.string()});
function date(value:string|null):string|null {
  if(!value)return null;
  const day=value.slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day?day:null;
}
export function parseAlokabideCalls(input:unknown,documents:unknown,now:string,entityId:string):Call[] {
  const rows=z.array(rowSchema).parse(input),docs=z.array(documentSchema).parse(documents);
  return rows.map(row=>{
    if(row.entityOepId!==entityId)throw new Error('La API ha devuelto una convocatoria de otra entidad');
    const title=clean(row.title['es-ES']||row.title['eu-ES']||'');
    if(!title)throw new Error('Convocatoria Alokabide sin título');
    const url=`${ALOKABIDE_PORTAL}/processDetail.html?id=${row.id}&type=0`;
    const call=baseCall('alokabide',url,now,'Euskadi');
    call.title=title;call.category=categoryFor(title);call.organization='Alokabide S.A.U.';
    const words=normalize(title).replace(/[^a-z0-9]+/g,' ').split(' ');
    const provinces=([['araba','Araba / Álava'],['alava','Araba / Álava'],['bizkaia','Bizkaia'],['gipuzkoa','Gipuzkoa']] as const).filter(([word])=>words.includes(word)).map(([,province])=>province);
    call.province=[...new Set(provinces)].length===1?provinces[0]:null;
    call.location=call.province||'Euskadi';call.places=row.vacancies.total||null;
    call.deadline=date(row.endDate);const start=date(row.startDate),today=now.slice(0,10);
    call.status=call.deadline?call.deadline<today?'Cerrada':start&&start>today?'Próximamente':'Abierta':'Pendiente de confirmar';
    call.description='Convocatoria publicada en el portal de empleo oficial de Alokabide. Los plazos corresponden a la inscripción, no a reclamaciones. Consulta los turnos, las titulaciones y las condiciones en las bases.';
    call.documents=docs.filter(doc=>clean(doc.processTitle['es-ES']||doc.processTitle['eu-ES']||'')===title&&/^(bases|oinarriak|temario|gai.zerrenda|programa)(?:\b|_)/i.test(doc.name['es-ES']||doc.name['eu-ES']||''))
      .flatMap(doc=>{
        const file=new URL(doc.url,API);
        if(file.origin!==new URL(API).origin||!file.pathname.startsWith('/api/files/public/'))return [];
        file.searchParams.set('origin',ALOKABIDE_PORTAL);
        const name=doc.name['es-ES']||doc.name['eu-ES'];
        return [{title:name,url:file.href,kind:/temario|gai.zerrenda|programa/i.test(name)?'temario' as const:'bases' as const,checkedAt:null,sha256:null}];
      });
    call.syllabusUrl=call.documents.find(doc=>doc.kind==='temario')?.url??null;
    call.sourceHash=hash(JSON.stringify(row));return callSchema.parse(call);
  });
}
export async function scrapeAlokabide(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]> {
  const input=JSON.parse(await client.text(`${API}api/calls?${ORIGIN}`));
  const rows=z.array(rowSchema).parse(input);
  if(!rows.length)throw new Error('La API no contiene convocatorias Alokabide');
  const entityId=rows[0].entityOepId;
  const entity=z.object({id:identifier,name:z.string()}).parse(JSON.parse(await client.text(`${API}api/EntityOep/${entityId}?${ORIGIN}`)));
  if(entity.id!==entityId||!/^alokabide\b/i.test(entity.name))throw new Error('La API no confirma que el convocante sea Alokabide');
  const documents=JSON.parse(await client.text(`${API}api/publications/1000?${ORIGIN}`));
  if(Array.isArray(documents)&&documents.length>=1000)warn('Los documentos se limitan a las 1000 últimas publicaciones; algunas bases históricas pueden no estar incluidas.');
  return parseAlokabideCalls(rows,documents,now,entityId);
}
