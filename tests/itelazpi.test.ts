import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseItelazpiList} from '../scripts/scrapers/itelazpi';
const now='2026-11-18T00:00:00.000Z';
test('Itelazpi preserves closed processes and does not equate an ongoing process with open registration',()=>{
  const card='<div class="wpb_wrapper"><h5>Técnico/a de Sistemas</h5><p>Ofertante: Itelazpi (Zamudio, Bizkaia)<br>Nº Plazas: 1<br>Plazo de inscripción cerrado (12/09/2025 – 30/09/2025)</p><p><a href="https://www.michaelpage.es/job-detail/post/ref/2025-id">Enlace</a></p></div>';
  const call=parseItelazpiList('<h2>PROCESOS CONCLUIDOS</h2>'+card,now)[0];
  assert.equal(call.status,'Cerrada');assert.equal(call.deadline,'2025-09-30');assert.equal(call.places,1);assert.equal(call.province,'Bizkaia');assert.deepEqual(call.acceptedQualifications,[]);
  const ongoing=parseItelazpiList('<h2>PROCESOS EN VIGOR</h2>'+card.replace(/Plazo de inscripción cerrado \([^<]+\)/,''),now)[0];
  assert.equal(ongoing.status,'Pendiente de confirmar');
  assert.deepEqual(parseItelazpiList('<h2>PROCESOS EN VIGOR</h2><p>En este momento no hay ningún proceso abierto.</p>',now),[]);
  assert.throws(()=>parseItelazpiList('<h1>Website unavailable</h1>',now));
});
