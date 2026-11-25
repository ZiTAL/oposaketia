import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBeazEmployment} from '../scripts/scrapers/beaz';

const page='<div class="empleos-abiertos-container"><h2>Procesos de selección activos</h2><p>Actualmente no existe ningún proceso de selección activo.</p></div><div class="empleos-cerrados-container"><h2>Procesos de selección finalizados</h2></div>';

test('Beaz recognizes its explicit current absence without creating a vacancy',()=>{
 assert.deepEqual(parseBeazEmployment(page),[]);
 assert.throws(()=>parseBeazEmployment(page.replace('Actualmente no existe ningún proceso de selección activo.','Nueva oferta: técnico/a')));
 assert.throws(()=>parseBeazEmployment(page.replace('empleos-abiertos-container','otro-contenedor')));
});
