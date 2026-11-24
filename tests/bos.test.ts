import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBosAuditions,parseBosBases} from '../scripts/scrapers/bos';

const now='2026-11-24T12:00:00.000Z';
const urls={
 ENT202604:'https://www.bilbaorkestra.eus/wp-content/uploads/2026/09/1ENT202604-Ayuda-de-solista-de-contrabajo-deftvas-AZKENA-1.pdf',
 ENT202603:'https://www.bilbaorkestra.eus/wp-content/uploads/2026/09/1ENT202603-Solista-de-contrabajo-deftvas-AZKENA.pdf',
 ENT202602:'https://www.bilbaorkestra.eus/wp-content/uploads/2026/08/1ENT202602-Violonchelo-tutti-deftvas.pdf',
};

test('BOS keeps original calls and ignores applicant results',()=>{
 const html=`<h1>Personal Músico</h1><h2>Procesos selectivos en curso</h2>${Object.entries(urls).map(([code,url])=>`<div class="row audiciones"><h3>Audición (${code})</h3><ul><li><a href="/resultados-${code}.pdf">Resultados de aspirantes</a></li></ul><p><a class="btn" href="${url}">Convocatoria en PDF</a></p></div>`).join('')}`;
 const listings=parseBosAuditions(html);
 assert.deepEqual(listings.map(item=>item.code),['ENT202604','ENT202603','ENT202602']);
 assert.equal(listings[0].pdfUrl,urls.ENT202604);
 assert.throws(()=>parseBosAuditions(html.replace(urls.ENT202603,'https://example.org/foreign.pdf')));
});

test('BOS reads vacancies and application close from its own PDF and links repertoire',()=>{
 const listing={code:'ENT202602' as const,pdfUrl:urls.ENT202602};
 const text='Fundación Juan Crisóstomo de Arriaga-Orquesta Sinfónica de Bilbao. Violonchelo tutti. Código: ENT202602. Número de vacantes : 2. Título exigido: Título de grado medio de música. Izena emateko epea 2026eko irailaren 30ean amaituko da. II. Eranskina Anexo II. Repertorio orquestal.';
 const call=parseBosBases(listing,text,'a'.repeat(64),now);
 assert.equal(call.places,2);assert.equal(call.deadline,'2026-09-30');assert.equal(call.status,'En curso');
 assert.equal(call.province,'Bizkaia');assert.equal(call.syllabusUrl,urls.ENT202602);
 assert.deepEqual(call.topics,[]);assert.deepEqual(call.acceptedQualifications,[]);
 assert.throws(()=>parseBosBases(listing,text.replace('Número de vacantes : 2','Número de vacantes : 1'),'a'.repeat(64),now));
});
