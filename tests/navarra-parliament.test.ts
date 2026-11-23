import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseParliamentYear,enrichParliamentRequirements} from '../scripts/scrapers/navarra-parliament';
const now='2026-11-18T00:00:00.000Z';
test('Parliament scopes documents, dates and phase to each public process',()=>{
  const html='<div class="field-name-body"><div class="field-item">'+
    '<p><strong>Convocatoria para la confección de una lista de biblioteca.</strong></p><p><a href="/sites/default/files/bases.pdf">Bases de la convocatoria</a></p><p>Plazo de presentación de solicitudes: del 13 de noviembre al 2 de diciembre de 2026.</p>'+
    '<p><strong>Convocatoria para la provisión de una plaza de mantenimiento de nivel C.</strong></p><p><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/143/4">- Bases de la convocatoria</a></p><p>Plazo de presentación de solicitudes: del 24 de julio al 12 de agosto de 2026.</p><p><a href="/admitidos.pdf">Lista definitiva de personas aspirantes admitidas y excluidas</a></p>'+
    '<p><strong>Convocatoria en turno restringido para biblioteca.</strong></p><p><a href="/restringida.pdf">Bases de la convocatoria</a></p>'+
    '<p><strong>Convocatoria de movilidad horizontal interna.</strong></p><p><a href="/interna.pdf">Bases de la convocatoria</a></p></div></div>';
  const calls=parseParliamentYear(html,'https://parlamentodenavarra.es/es/contenido/ejercicio-2026',now);
  assert.equal(calls.length,2);assert.equal(calls[0].status,'Abierta');assert.equal(calls[0].deadline,'2026-12-02');assert.equal(calls[0].places,null);
  assert.equal(calls[1].status,'En curso');assert.equal(calls[1].deadline,'2026-08-12');assert.equal(calls[1].places,1);assert.equal(calls[1].group,'C');assert.equal(calls[1].documents.length,1);
  assert.throws(()=>parseParliamentYear('<h1>Unavailable</h1>','https://parlamentodenavarra.es/es/2026',now));
});
test('Parliament requirements use mandatory education and link the published programme',()=>{
  const [call]=parseParliamentYear('<div class="field-name-body"><div class="field-item"><p><strong>Convocatoria de lista de Letrados</strong></p><p><a href="/bases.pdf">Bases de la convocatoria</a></p><p>Plazo: quince días hábiles.</p></div></div>','https://parlamentodenavarra.es/es/2026',now);
  enrichParliamentRequirements(call,'2. Requisitos\nc) Hallarse en posesión del título oficial universitario de Licenciado/a o Graduado/a en Derecho.\n\n3. Solicitudes\nANEXO II.–TEMARIO\nTema 1.–La Constitución Española y los derechos fundamentales.\nTema 2.–El Reglamento del Parlamento de Navarra.','https://parlamentodenavarra.es/bases.pdf');
  assert.deepEqual(call.acceptedQualifications,['derecho']);assert.equal(call.topics.length,2);assert.equal(call.syllabusUrl,'https://parlamentodenavarra.es/bases.pdf');assert.equal(call.deadline,null);assert.equal(call.language,null);
  enrichParliamentRequirements(call,'c) Hallarse en posesión del título oficial universitario de grado, licenciatura, ingeniería o arquitectura o título equivalente.\n\n3. Solicitudes','https://parlamentodenavarra.es/bases.pdf');
  assert.deepEqual(call.acceptedQualifications,['grado']);
  call.topics=[];
  enrichParliamentRequirements(call,'ANEXO II\n\nParte 1.–Parte general.\n\nTema 1.–La Constitución Española de 1978 y los derechos fundamentales.','https://parlamentodenavarra.es/bases.pdf');
  assert.equal(call.topics.length,1);
});
