import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,pdfText,stableId} from './shared';

export const ALLO_NOTICE='https://www.villadeallo.org/es/actualidad/noticias/980-oferta-de-empleo-ayuntamiento-de-allo.html';

export function parseAlloNotice(html:string):string{
  const $=load(html);
  if($('h1').filter((_,node)=>clean($(node).text())==='OFERTA DE EMPLEO AYUNTAMIENTO DE ALLO').length!==1
    ||!$.text().includes('12/03/2026')
    ||!$.text().includes('Hasta el 17 de marzo inclusive'))throw new Error('Alloko udal-iragarkia ez da identifikatu');
  const links=$('a[href]').filter((_,node)=>clean($(node).text())==='BASES DE LA CONVOCATORIA').map((_,node)=>new URL($(node).attr('href')!,ALLO_NOTICE).href).get();
  if(links.length!==1||new URL(links[0]).origin!==new URL(ALLO_NOTICE).origin
    ||!new URL(links[0]).pathname.startsWith('/docs/noticias/')
    ||!new URL(links[0]).pathname.toLowerCase().endsWith('.pdf'))throw new Error('Alloko jatorrizko oinarriak ez dira identifikatu');
  return links[0];
}

export function parseAlloBases(text:string,basesUrl:string,sha256:string,now:string):Call{
  const content=clean(text);
  if(!/CONTRATACI[ÓO]N TEMPORAL DE UNA PERSONA PARA LLEVAR A CABO UN PROYECTO DE CONOCIMIENTO OPERATIVO Y MEJORA DEL USO DE LAS INSTALACIONES MUNICIPALES DE ALLO/i.test(content)
    ||!/Estudios m[ií]nimos ESO/i.test(content)
    ||!/inscritas como PEON\/A demandante de empleo/i.test(content)
    ||!/Hasta el 17 de marzo inclusive/i.test(content)
    ||!/el 20 de marzo de 2026/i.test(content)
    ||!/una prueba de car[aá]cter escrito sobre las tareas habituales/i.test(content))throw new Error('Alloko oinarriak edo baldintzak ez datoz bat');
  const call=baseCall('allo',ALLO_NOTICE,now,'Navarra');
  call.id=stableId('allo','2026-03-12-peon-instalaciones');
  call.title='Peón/a · instalaciones municipales de Allo';
  call.organization='Ayuntamiento de Allo';
  call.province='Navarra';call.location='Allo';call.category='Servicios';call.group='D';call.places=1;
  call.educationText='Estudios mínimos ESO.';call.acceptedQualifications=['eso'];
  call.deadline='2026-03-17';call.status='Cerrada';call.languageStatus='known';
  call.requirements=[call.educationText,'Inscripción como demandante de empleo PEÓN/A en el Servicio Navarro de Empleo.','Estar en desempleo en la fecha de contratación.','No tener deudas con el Ayuntamiento de Allo en la fecha de contratación.'];
  call.description='Contrato laboral temporal de hasta un año para conocer y mejorar el uso de las instalaciones municipales. Prueba escrita sobre tareas del puesto y normativa municipal, seguida de entrevista. Las bases no publican un temario enumerado.';
  call.sourceHash=hash(content);call.documents=[{title:'Bases municipales · 11/03/2026',url:basesUrl,kind:'bases',checkedAt:now,sha256}];
  return callSchema.parse(call);
}

export async function scrapeAllo(client:OfficialClient,now:string):Promise<Call[]>{
  const basesUrl=parseAlloNotice(await client.text(ALLO_NOTICE));
  const pdf=await pdfText(client,basesUrl);
  return [parseAlloBases(pdf.text,basesUrl,pdf.sha256,now)];
}
