import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isAadNotice,parseAadBases,parseAadDetail} from '../scripts/scrapers/aad';

const detail='<div class="journal-content-article"><h3 class="titulo-aviso">Álava Agencia de Desarrollo, S.A. Selección de personal laboral. Ingeniero/a</h3><p>18/06/2026</p><p>Organismo: Álava Agencia de Desarrollo, S.A</p><a href="/documents/d/enplegupublikoa/bases-ingeniero-202601aad">Proceso de selección</a><a href="/resultados-aspirantes.pdf">Resultados</a></div>';
const now='2026-11-24T12:00:00.000Z';

test('AAD uses the provincial employment sheet and its original bases only',()=>{
 assert.equal(parseAadDetail(detail),'https://enplegupublikoa.araba.eus/documents/d/enplegupublikoa/bases-ingeniero-202601aad');
 assert.equal(isAadNotice('https://enplegupublikoa.araba.eus/es/-/alava-agencia-de-desarrollo-sa-seleccion-de-personal-laboral-ingeniera?p_l_back_url=%2Fes%2Fsector-publico-foral'),true);
 assert.equal(isAadNotice('https://example.org/es/-/alava-agencia-de-desarrollo-sa-seleccion-de-personal-laboral-ingeniera'),false);
 assert.throws(()=>parseAadDetail(detail.replace('bases-ingeniero-202601aad','otra-convocatoria')));
});

test('AAD verifies the single engineering vacancy and common deadline in both sections',()=>{
 const text='BASES GENERALES QUE REGULAN SELECCIÓN DE PERSONAL LABORAL, PARA CUBRIR UN PUESTO DE INGENIERO/A AL SERVICIO DE LA SOCIEDAD ÁLAVA AGENCIA DE DESARROLLO S.A. El puesto de trabajo se desempeñará en las oficinas de la Sociedad sitas en C/Joaquín José de Landázuri, 13-15 Bajo, 01008, Vitoria-Gasteiz (Álava). El plazo de presentación de solicitudes será hasta el 5 de julio de 2026 inclusive. BASES ESPECÍFICAS código de convocatoria: 202601aad. El plazo de presentación de solicitudes será hasta el 5 de julio de 2026 inclusive. Grado en Ingeniería Civil o Industrial O título de Ingeniero/a técnico de obras públicas / industrial. carnet de conducir clase B. Puntuación: requisito obligatorio. Nivel B1 Euskera. Puntuación: requisito obligatorio. experiencia superior a 2 años en labores propias de la titulación requerida.';
 const call=parseAadBases(text,'a'.repeat(64),now);
 assert.equal(call.places,1);assert.equal(call.deadline,'2026-07-05');assert.equal(call.province,'Araba / Álava');
 assert.equal(call.language?.level,'B1');assert.equal(call.syllabusUrl,null);
 assert.throws(()=>parseAadBases(text.replace('5 de julio de 2026','6 de julio de 2026'),'a'.repeat(64),now));
});
