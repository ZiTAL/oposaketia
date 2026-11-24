import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseUraDirector,parseUraJobs} from '../scripts/scrapers/ura';

const now='2026-11-24T09:00:00.000Z';
const documentUrl='https://www.uragentzia.euskadi.eus/contenidos/informacion/empleo_vigentes/es_doc/adjuntos/ANUNCIO_DPO.docx';
const listing={title:'Director de Obras y Planificación',documentUrl};

test('URA reads the public current listing and excludes the restricted turn',()=>{
 const html=`<h1>Empleo. Procesos vigentes URA</h1><div class="r01-editor"><h2>Director de Obras y Planificación</h2><ul><li><a href="/contenidos/informacion/empleo_vigentes/es_doc/adjuntos/ANUNCIO_DPO.docx">Anuncio (DOCX)</a></li></ul><h2>Administrativo/a General (turno restringido)</h2><ul><li><a href="/contenidos/informacion/empleo_vigentes/es_doc/adjuntos/BASES.docx">Anuncio</a></li></ul></div>`;
 assert.deepEqual(parseUraJobs(html),[listing]);
 assert.throws(()=>parseUraJobs(html.replace('ANUNCIO_DPO.docx','ANUNCIO_DPO.pdf')));
});

test('URA retains the documented requirements but does not invent a deadline or syllabus',()=>{
 const text=`URAREN EUSKAL AGENTZIA-AGENCIA VASCA DEL AGUA precisa incorporar a un/a DIRECTOR/A DEL ÁREA DE PLANIFICACIÓN Y OBRAS. Ámbito: Agencia Vasca del Agua — URA instalaciones de Vitoria-Gasteiz. TITULACIÓN universitaria en Ingeniería de Caminos, Canales y Puertos, Geología, Ciencias Ambientales, Ingeniería Industrial, otras titulaciones equivalentes. Experiencia profesional de al menos 5 años. Euskera: Perfil Lingüístico 3. Inglés: Conversación fluida.`;
 const call=parseUraDirector(listing,text,'a'.repeat(64),now);
 assert.equal(call.province,'Araba / Álava');assert.equal(call.deadline,null);assert.equal(call.status,'Pendiente de confirmar');
 assert.equal(call.syllabusUrl,null);assert.deepEqual(call.topics,[]);assert.equal(call.language,null);
 assert.equal(call.documents[0].url,documentUrl);
 assert.throws(()=>parseUraDirector(listing,text.replace('Vitoria-Gasteiz','Bilbao'),'a'.repeat(64),now));
});
