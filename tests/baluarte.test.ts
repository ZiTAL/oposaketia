import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBaluarteSelection} from '../scripts/scrapers/baluarte';
const now='2026-11-18T00:00:00.000Z';
test('Baluarte recognizes its explicit empty selection section without importing other transparency documents',()=>{
  const html='<div class="subseccion-item"><button class="subseccion-toggle"><span>Procesos de selección</span></button><div class="subseccion-content"><p>Actualmente no hay procesos de selección abiertos.</p></div></div><div class="subseccion-item"><button class="subseccion-toggle">Contratos</button><div class="subseccion-content"><a href="/medios/contrato.pdf">Convocatoria de contrato de servicios</a></div></div>';
  assert.deepEqual(parseBaluarteSelection(html,now),[]);
  assert.throws(()=>parseBaluarteSelection('<h1>Website unavailable</h1>',now));
  const future=html.replace('<p>Actualmente no hay procesos de selección abiertos.</p>','<a href="/medios/job.pdf">Convocatoria para la provisión de una plaza de técnico</a><a href="/medios/admitidos.pdf">Lista de personas admitidas</a>');
  const calls=parseBaluarteSelection(future,now);assert.equal(calls.length,1);assert.equal(calls[0].documents.length,1);assert.equal(calls[0].status,'Pendiente de confirmar');
});
