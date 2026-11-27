import test from 'node:test';
import assert from 'node:assert/strict';
import {AIBAR_BASES,parseAibarBases,parseAibarNotice} from '../scripts/scrapers/aibar';

const notice=`<article><h1>CONVOCADA UNA OPOSICIÓN PARA LA CREACIÓN DE UNA LISTA DE ASPIRANTES A OFICIALES ADMINISTRATIVOS</h1><time datetime="2024-08-21T20:09:36+02:00">21 agosto 2024</time><p>Ayuntamiento de Aibar / Oibar</p><a href="${AIBAR_BASES}">BASES CONVOCATORIA OFICIAL ADMINISTRATIVO</a></article>`;
const bases=`LISTA DE ASPIRANTES PARA LA CONTRATACIÓN, CON CARÁCTER TEMPORAL Y EN RÉGIMEN ADMINISTRATIVO, DE OFICIALES ADMINISTRATIVOS, NIVEL C AL SERVICIO DEL AYUNTAMIENTO DE AIBAR/OIBAR
Hallarse en posesión del título de Bachillerato, Formación Profesional de segundo grado o equivalente
Estar inscrito de las oficinas de empleo como demandante o mejora de empleo.
El plazo de presentación de solicitudes será de 7 días hábiles, contados a partir del siguiente al de la publicación en el Tablón de Anuncios.
Ley Foral 6/1990, de 2 de julio, de la Administración Local de Navarra.
Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas.
Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público.`;

test('Aibar binds its own original notice to the matching bases without inferring an absolute deadline',()=>{
  assert.equal(parseAibarNotice(notice),AIBAR_BASES);
  const call=parseAibarBases(bases,'a'.repeat(64),'2026-11-27T21:00:00Z');
  assert.equal(call.deadline,null);
  assert.equal(call.topics.length,3);
  assert.deepEqual(call.acceptedQualifications,['bachiller','fp-superior']);
  assert.throws(()=>parseAibarNotice(notice.replace('2024-08-21','2026-08-21')));
  assert.throws(()=>parseAibarNotice(notice.replace(AIBAR_BASES,'https://example.org/bases.pdf')));
  assert.throws(()=>parseAibarBases(bases.replace('AYUNTAMIENTO DE AIBAR/OIBAR','AYUNTAMIENTO DE OTRO MUNICIPIO'),'a'.repeat(64),'2026-11-27T21:00:00Z'));
});
