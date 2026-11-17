import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVitoriaGroup} from '../scripts/scrapers/vitoria';
test('Vitoria keeps each post documents separate and does not infer specific education from group or job title',()=>{
 const html=`<div id="wb021contenido"><h1>Grupo A2</h1><ul><li><strong>03A2 ENFERMERÍA:</strong><ul><li>Fecha fin inscripciones 19 de junio de 2025.</li><li>Bases específicas: <a href="/bases.pdf">Bases</a></li><li>Material de preparación de pruebas: <a href="/enfermeria.doc">03A2</a></li></ul></li><li><strong>04A2 OTRO PUESTO:</strong><ul><li><a href="/otro.pdf">Otro</a></li></ul></li></ul></div>`;
 const calls=parseVitoriaGroup(html,'https://www.vitoria-gasteiz.org/grupo','2026-11-17T00:00:00.000Z');
 assert.equal(calls.length,2);assert.equal(calls[0].deadline,'2025-06-19');assert.equal(calls[0].status,'En curso');assert.deepEqual(calls[0].acceptedQualifications,[]);
 assert.equal(calls[0].syllabusUrl,'https://www.vitoria-gasteiz.org/enfermeria.doc');assert.equal(calls[0].documents.length,2);assert.equal(calls[1].documents.length,1);assert.notEqual(calls[0].id,calls[1].id);
});
