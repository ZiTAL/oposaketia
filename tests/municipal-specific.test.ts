import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLeioaList,parseLeioaDetail} from '../scripts/scrapers/leioa';
import {parseBerrioplano} from '../scripts/scrapers/berrioplano';
import {parseOrkoienList,parseOrkoienDetail,parseOrkoienPages} from '../scripts/scrapers/orkoien';
import {enrichMunicipalBases} from '../scripts/scrapers/municipal-requirements';
import {educationIds} from '../scripts/scrapers/shared';
import {normalizeCallQualifications} from '../src/lib/catalogue';
const now='2026-11-19T00:00:00Z';
test('conservatory grado medio requirements are not treated as vocational FP',()=>{
 assert.deepEqual(educationIds('Título de profesor/a de Grado Medio en la especialidad de guitarra, o Título Profesional de Grado Medio en la especialidad de guitarra.'),[]);
 assert.deepEqual(educationIds('Título de Técnico de Formación Profesional de grado medio.'),['fp-medio']);
});
test('Leioa rejects internal calls and keeps only bases and syllabus documents for the selected process',()=>{
 const html='<table><tr><td>2026-07-17</td><td><a href="/eu/bolsa_trabajo/118/kultura.html">Kultura saileko buruzagitza plaza bat</a></td></tr><tr><td><a href="/eu/bolsa_trabajo/112/admin.html">Administrari barne-sustapen deialdia</a></td></tr></table>';
 const list=parseLeioaList(html);assert.equal(list.length,1);
 const call=parseLeioaDetail('<div id="leer"><h3>Kultura saileko buruzagitza plaza bat</h3><a href="/uploads/bases.pdf">BAO deialdiaren oinarriak</a><a href="/uploads/admitidos.pdf">onartutako eta baztertutako izangaien behin-behineko zerrenda</a></div>',list[0],now);
 assert.equal(call.documents.length,1);assert.equal(call.status,'En curso');assert.equal(call.deadline,null);assert.equal(call.province,'Bizkaia');
});
test('Berrioplano scopes each heading to its own bases, without candidate or examination documents',()=>{
 const html='<div class="contenido content"><h3>Lista de encargado de biblioteca</h3><p><a href="/bases.pdf">Convocatoria</a></p><h3>Plaza de aparejador</h3><p><a href="/architect.pdf">Convocatoria</a></p><p><a href="/candidates.pdf">Lista definitiva de admitidos y excluidos</a></p></div>';
 const calls=parseBerrioplano(html,now);assert.equal(calls.length,2);assert.equal(calls[0].documents.length,1);assert.equal(calls[0].status,'Pendiente de confirmar');assert.equal(calls[1].status,'En curso');
 enrichMunicipalBases(calls[0],'2.- Condiciones de admisión de las personas aspirantes.\n\n Hallarse en posesión del título de Bachillerato, Formación Profesional de segundo\n grado o equivalente.\n\n Poseer la titulación de C1 de Euskera.\n\n3.- Solicitudes. El plazo será de siete días naturales.','https://www.berrioplano.es/bases.pdf');
 assert.deepEqual(calls[0].acceptedQualifications,['bachiller','fp-superior']);assert.equal(calls[0].deadline,null);assert.equal(calls[0].language?.level,'C1');
 enrichMunicipalBases(calls[1],'2.- Requisitos\nSer mayor de edad.\n3.- Méritos\nPoseer la titulación de C1 de Euskera.','https://www.berrioplano.es/architect.pdf');assert.equal(calls[1].language,null);
});
test('Orkoien uses the application deadline and BON bases, ignores application forms and internal transfers',()=>{
 const list=parseOrkoienList('<div class="job-info"><h4><a href="/empleo/igualdad/">Convocatoria de una plaza de Igualdad</a></h4></div><div class="job-info"><h4><a href="/empleo/traslados/">Convocatoria de concurso de traslado</a></h4></div>');assert.equal(list.length,1);
 const html='<div class="sjb-detail"><span class="job-title">Convocatoria de una plaza de Igualdad</span><div class="job-description"><p>Fecha de publicación</p><p>20/10/2026</p><p>Fecha fin presentación instancias</p><p>09/11/2026</p><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/209/18">Bases de la convocatoria.</a><a href="/instancia.pdf">Anexo I. Instancia</a></div></div>';
 const call=parseOrkoienDetail(html,list[0],now);assert.equal(call.deadline,'2026-11-09');assert.equal(call.status,'Cerrada');assert.equal(call.documents.length,1);assert.equal(call.places,1);
 enrichMunicipalBases(call,'c) Hallarse en posesión, como mínimo, del título universitario de Grado, Diplomatura Universitaria, Ingeniería Técnica, Arquitectura Técnica, o título declarado equivalente.\n\nANEXO II.–TEMARIO\n\n1.–La Constitución Española y derechos fundamentales.\n\nANEXO III.–BAREMO\n\nD.2) Se valora euskera C1.','https://bon.navarra.es/es/anuncio/-/texto/2026/209/18');
 assert.deepEqual(call.acceptedQualifications,['grado']);assert.equal(call.topics.length,1);assert.equal(call.language,null);
 assert.deepEqual(parseOrkoienPages('<a class="page-numbers" href="https://www.orkoien.com/empleo-publico/?paged=2">2</a>'),['https://www.orkoien.com/empleo-publico/?paged=2']);
 assert.throws(()=>parseOrkoienPages('<a class="page-numbers" href="https://other.example/empleo-publico/?paged=2">2</a>'));
 assert.throws(()=>parseOrkoienPages('<a class="page-numbers" href="/empleo-publico/?paged=99">99</a>'));
});
test('general university diploma, technical engineering, architecture and grado alternatives remain a general degree requirement',()=>{
 const call=parseBerrioplano('<div class="contenido content"><h3>Técnico de sistemas</h3><a href="https://www.berrioplano.es/bases.pdf">Bases</a></div>',now)[0];
 enrichMunicipalBases(call,'Estar en posesión del título de diplomado universitario, ingeniero técnico, arquitecto técnico, grado o titulación declarada oficialmente equivalente, o haber superado los tres primeros cursos de una licenciatura, ingeniería o arquitectura.\n\n','https://bon.navarra.es/es/anuncio/-/texto/2025/72/10');
 assert.deepEqual(call.acceptedQualifications,['grado']);
 assert.deepEqual(normalizeCallQualifications({...call,acceptedQualifications:['arquitectura']}).acceptedQualifications,['grado']);
});

test('BON grado-first legal umbrella does not turn its three-course equivalence into an Architecture specialty',()=>{
 const call=parseBerrioplano('<div class="contenido content"><h3>Técnico de organización</h3><a href="https://www.berrioplano.es/bases.pdf">Bases</a></div>',now)[0];
 enrichMunicipalBases(call,'Estar en posesión del título de grado, de diplomado universitario, de ingeniero técnico, de arquitecto técnico, o de título equivalente, o en condiciones de obtenerlo en la fecha en que termine el plazo de presentación de solicitudes, o haber superado los tres primeros cursos de una licenciatura, ingeniería o arquitectura.','https://bon.navarra.es/es/anuncio/-/texto/2026/215/7');
 assert.deepEqual(call.acceptedQualifications,['grado']);
 assert.deepEqual(normalizeCallQualifications({...call,acceptedQualifications:['arquitectura']}).acceptedQualifications,['grado']);
});
