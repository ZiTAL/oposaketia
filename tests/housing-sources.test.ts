import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMusikeneList} from '../scripts/scrapers/musikene';
import {parseKabiaList} from '../scripts/scrapers/kabia';
import {parseAlokabideCalls} from '../scripts/scrapers/alokabide';
const now='2026-11-18T00:00:00.000Z';
const entity='7639e283-8384-45e3-8654-08d8ff3dd652';
const row={id:'5eeb70bc-9417-4f7a-5f29-08d92016d3f3',entityOepId:entity,title:{'es-ES':'Arquitecto/a_ARABA'},description:{'es-ES':'Proceso de Alokabide'},vacancies:{total:1},startDate:'2026-11-19T00:00:00',endDate:'2026-11-29T00:00:00'};
test('Alokabide distinguishes upcoming, open and closed application periods from appeal dates',()=>{
  const call=parseAlokabideCalls([row],[],now,entity)[0];
  assert.equal(call.status,'Próximamente');assert.equal(call.deadline,'2026-11-29');assert.equal(call.province,'Araba / Álava');assert.deepEqual(call.acceptedQualifications,[]);
  assert.equal(parseAlokabideCalls([{...row,startDate:'2026-11-01T00:00:00'}],[],now,entity)[0].status,'Abierta');
  assert.equal(parseAlokabideCalls([{...row,endDate:'2026-11-01T00:00:00',claimsEndDate:'2027-01-01T00:00:00'}],[],now,entity)[0].status,'Cerrada');
  assert.throws(()=>parseAlokabideCalls([row],[],now,'12345678-1234-1234-1234-123456789abc'));
});
test('Alokabide keeps only official bases/programmes matched to the same process and excludes result lists',()=>{
  const document=(name:string,title=row.title['es-ES'],url='api/files/public/public-file')=>({name:{'es-ES':name},processTitle:{'es-ES':title},url});
  const docs=[document('BASES'),document('TEMARIO'),document('Listado de personas admitidas'),document('BASES','Otra convocatoria'),document('BASES',undefined,'https://example.com/file')];
  const call=parseAlokabideCalls([row],docs,now,entity)[0];
  assert.equal(call.documents.length,2);assert.ok(call.syllabusUrl?.startsWith('https://apigw.convoca.online/api/files/public/'));
  assert.equal(new URL(call.documents[0].url).searchParams.get('origin'),'https://alokabide.convoca.online');
});
test('Kabia preserves final appointments as closed and does not import internal transfers',()=>{
  const tr=(title:string,phase:string)=>`<tr class="filaconvo"><td><a href="/WAS/CORP/LLEHautaketaProzesuakWEB/kabia/5707/0/ver">${title}</a></td><td>${phase}</td></tr>`;
  const calls=parseKabiaList(`<table>${tr('Administrativo/a','Nombramiento funcionario de carrera')}${tr('Concurso de traslados','Examen')}</table>`,now);
  assert.equal(calls.length,1);assert.equal(calls[0].status,'Cerrada');assert.equal(calls[0].deadline,null);assert.equal(calls[0].sourceId,'kabia');
});

test('Musikene preserves explicit education and language while leaving a date without a year unknown',()=>{
  const html='<h6 class="edgtf-accordion-title"><span class="edgtf-tab-title">Auxiliares Administrativos/as en Donostia</span></h6><div class="edgtf-accordion-content"><p>Número de puestos ofertados: 2</p><p><strong>Requisitos mínimos</strong></p><ul><li>Estudios</li></ul><p>Formación de Grado Superior en Administración.</p><ul><li>Idiomas</li></ul><p>Euskera (C1) y castellano.</p><p><strong>Criterios de valoración</strong></p><p>Plazo: 20 de septiembre.</p><a href="/results.pdf">Resultados de la prueba</a></div>';
  const call=parseMusikeneList(html,now)[0];
  assert.equal(call.places,2);assert.equal(call.province,'Gipuzkoa');assert.deepEqual(call.acceptedQualifications,['fp-superior']);assert.deepEqual(call.language,{name:'euskera',level:'C1'});assert.equal(call.deadline,null);assert.equal(call.status,'En curso');assert.deepEqual(call.documents,[]);
});
