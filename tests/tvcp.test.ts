import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTvcpBases,parseTvcpList} from '../scripts/scrapers/tvcp';

const now='2026-11-24T09:00:00.000Z';
const pdf=(code:string)=>`https://hkee-tvcp.eus/wp-content/uploads/20260720_Ebazpena_EBAZPENA-RESOLUCION-2026-${code}.pdf`;
const html=`<h1>Información sobre procesos selectivos</h1>${['0053','0054','0055'].map(code=>`<div class="linea_descarga"><span class="texto_descarga">RESOLUCIÓN 2026-${code}</span><div class="link_descarga"><a href="${pdf(code)}">Descargar</a></div></div>`).join('')}`;

test('TVCP selects only the three original resolutions',()=>{
 const listings=parseTvcpList(html);
 assert.deepEqual(listings.map(item=>item.code),['0053','0054','0055']);
 assert.throws(()=>parseTvcpList(html.replace(pdf('0054'),pdf('0053'))));
 assert.throws(()=>parseTvcpList(html.replace('RESOLUCIÓN 2026-0055','RESULTADOS 2026-0055')));
});

test('TVCP uses the absolute deadline and leaves merit-only pools without a syllabus',()=>{
 const listing={code:'0055' as const,url:pdf('0055')};
 const text=`Tribunal Vasco de Cuentas Públicas 2026-0055. El desempeño temporal del puesto se desarrollará en la sede del Tribunal Vasco de Cuentas Públicas en Vitoria-Gasteiz. Titulación: estar en posesión del título de Bachiller, Técnico/a o titulación equivalente. El plazo para presentar solicitudes será de 10 días, desde el 28 de julio hasta el 11 de agosto de 2026 incluido. BAREMO DE MÉRITOS CONCURSO.`;
 const call=parseTvcpBases(listing,text,'a'.repeat(64),now);
 assert.equal(call.deadline,'2026-08-11');
 assert.equal(call.status,'Cerrada');
 assert.equal(call.province,'Araba / Álava');
 assert.equal(call.language,null);
 assert.equal(call.syllabusUrl,null);
 assert.deepEqual(call.topics,[]);
 assert.equal(call.documents[0].url,pdf('0055'));
 assert.throws(()=>parseTvcpBases(listing,text.replace('11 de agosto','12 de agosto'),'a'.repeat(64),now));
 assert.throws(()=>parseTvcpBases(listing,text.replace('BAREMO DE MÉRITOS CONCURSO','TEMARIO'),'a'.repeat(64),now));
});
