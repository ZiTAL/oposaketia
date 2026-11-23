import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGizainDetail,enrichGizainRequirements} from '../scripts/scrapers/gizain';
const now='2026-11-18T00:00:00.000Z';
const url='https://fundaciongizain.es/es/actualidad/9-bolsa-de-empleo/178-test.html';
test('Gizain keeps linked posts separate and never treats contract duration as the application deadline',()=>{
  const html='<div class="page-title"><h2>Proyecto Navarra</h2></div><div class="blog-entry-content"><p>Cobertura temporal hasta el 30 de noviembre de 2026.</p><p>ABOGACIA:</p><p><a href="https://administracionelectronica.navarra.es/EmpleoIntermediacion/empleo/17511">Portal de Intermediación Laboral</a></p><p>EDUCACION SOCIAL:</p><p><a href="https://administracionelectronica.navarra.es/EmpleoIntermediacion/empleo/17510">Portal de Intermediación Laboral</a></p></div>';
  const calls=parseGizainDetail(html,url,now);
  assert.equal(calls.length,2);assert.notEqual(calls[0].id,calls[1].id);assert.ok(calls[0].title.includes('ABOGACIA'));assert.ok(calls[1].title.includes('EDUCACION SOCIAL'));
  for(const call of calls){assert.equal(call.deadline,null);assert.equal(call.status,'Pendiente de confirmar');assert.deepEqual(call.acceptedQualifications,[]);}
});
test('Gizain keeps public bases apart from candidate lists and reads only explicit eligibility and inscription periods',()=>{
  const html='<div class="page-title"><h2>Dirección Técnica</h2></div><div class="blog-entry-content"><a href="/attachment/724-bases.pdf">Convocatoria Dirección Técnica</a><a href="/attachment/732-admitidos.pdf">Lista provisional personas admitidas</a><a href="/attachment/738-resultados.pdf">RESULTADOS DEFINITIVOS</a></div>';
  const call=parseGizainDetail(html,url,now)[0];
  assert.equal(call.documents.length,1);
  enrichGizainRequirements(call,'La formación académica que permite acceder a la convocatoria es la Titulación Universitaria de Trabajo Social o Psicología. SOLICITUDES: en el plazo comprendido entre el 19 y el 31 de mayo de 2026.',now);
  assert.deepEqual(call.acceptedQualifications,['trabajo-social','psicologia']);assert.equal(call.deadline,'2026-05-31');assert.equal(call.status,'Cerrada');
  const admin=parseGizainDetail(html,url,now)[0];
  enrichGizainRequirements(admin,'2.1. Requisitos: D. Estar en posesión de alguna de estas titulaciones: formación profesional Grado superior en administración y finanzas. E. Permiso de conducir. 2.2. Documentación. Méritos: Grado en Derecho.',now);
  assert.deepEqual(admin.acceptedQualifications,['fp-superior']);
});
