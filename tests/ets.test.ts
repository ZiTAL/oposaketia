import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEtsCall} from '../scripts/scrapers/ets';

const html=`<article class="r01-news"><h1 class="r01-h1">ETS lanza una convocatoria externa para personal de circulación, puesto de mando y gestión de red</h1><p>Fecha de publicación: 05/12/2022</p><p>Euskal Trenbide Sarea, ente público, hace pública una convocatoria externa de personal para crear una Bolsa de Personas Candidatas.</p><p>Se generará una bolsa de un máximo de 125 personas.</p><p>Se exige FPII o su equivalente actual (FP Ciclo Formativo de Grado Superior) en cualquier especialidad, o de Bachiller, y Euskera nivel B2 (PL2) o equivalente. Alternativamente se puede superar una prueba oral con nivel de referencia B2.</p><p>Las candidaturas se podrán presentar hasta el próximo 26 de diciembre.</p><p>Prueba técnica basada en el reglamento de circulación y señales.</p></article>`;

test('ETS keeps its candidate-pool cap distinct from vacancies and checks dates and education',()=>{
 const call=parseEtsCall(html,'2026-11-24T12:00:00.000Z');
 assert.equal(call.places,null);assert.equal(call.deadline,'2022-12-26');
 assert.deepEqual(call.acceptedQualifications,['bachiller','fp-superior']);
 assert.equal(call.language?.level,'B2');assert.equal(call.syllabusUrl,null);
 assert.throws(()=>parseEtsCall(html.replace('05/12/2022','05/12/2023'),'2026-11-24T12:00:00.000Z'));
 assert.throws(()=>parseEtsCall(html.replace('FP Ciclo Formativo de Grado Superior','FP Ciclo Formativo de Grado Medio'),'2026-11-24T12:00:00.000Z'));
});
