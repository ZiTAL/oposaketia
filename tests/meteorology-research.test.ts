import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEuskalmetJobs,enrichEuskalmetBases} from '../scripts/scrapers/euskalmet';
import {parseNeikerJobs} from '../scripts/scrapers/neiker';
const now='2026-11-19T00:00:00Z';
test('Euskalmet applies the printed signup deadline even under active offers, separating repeated role titles',()=>{
 const html='<div><h2>Ofertas activas:</h2><h3>- Expertos nivel 1</h3><ul><li><a href="/expertos.pdf">Bases (286 Kb)</a></li><li><a href="/anexo.pdf">Anexo</a></li></ul><p>Plazo de inscripción abierto hasta el 12 de noviembre de 2026.</p><h2>Ofertas cerradas:</h2><h3>- Responsable Económico</h3><p><a href="/economic-new.pdf">Bases</a><a href="/candidates.pdf">Listados definitivos de personas admitidas y excluidas</a></p><h3>- Responsable Económico</h3><p><a href="/economic-old.pdf">Bases</a></p></div>';
 const calls=parseEuskalmetJobs(html,now);assert.equal(calls.length,3);assert.equal(calls[0].deadline,'2026-11-12');assert.equal(calls[0].status,'Cerrada');assert.equal(calls[0].documents.length,1);assert.notEqual(calls[1].id,calls[2].id);assert.equal(calls[1].status,'Cerrada');assert.equal(calls[0].province,null);
 enrichEuskalmetBases(calls[0],'Titulación Requerida: Licenciatura Universitaria, Grado o Máster equivalente en Ciencias (Física, Matemáticas) o Ingenierías afines.\n\nFunciones: Meteorología.\n\n4.2.11 Requisitos Lingüísticos:\nEuskera: Acreditar un nivel mínimo B2 mediante certificación oficial, o superar la prueba específica.\nInglés: Acreditar un nivel mínimo B2.\n4.2.12 Experiencia Técnica Requerida.','https://euskalmet.euskadi.eus/expertos.pdf');
 assert.deepEqual(calls[0].acceptedQualifications,[]);assert.deepEqual(calls[0].language,{name:'euskera',level:'B2'});assert.match(calls[0].requirements.join(' '),/Inglés/);assert.deepEqual(calls[0].topics,[]);
 assert.throws(()=>parseEuskalmetJobs('<h1>Unavailable</h1>',now));
});
test('NEIKER indexes coded active-panel processes without treating appeal deadlines as signup dates',()=>{
 const html='<div class="vc_tta-panel"><div class="vc_tta-panel-heading"><span class="vc_tta-title-text">Ofertas activas</span></div><div class="vc_tta-panel-body"><div class="wpb_wrapper"><h3>(2026-07) PREDOCTORAL en Inmunogenética</h3><p><a href="https://neiker.eus/job.zip">Publicado el listado provisional de candidaturas</a></p><p>Alegaciones (Plazo hasta el 17/11/2026)</p><p><strong>(2026-05) TEMPORAL Oficial/a Especialista de Mantenimiento</strong></p><p>Publicado listado final de puntuaciones</p><h3>(2024-01) Bolsa antigua</h3><p>Publicado listado final</p></div></div></div><div class="vc_tta-panel"><div class="vc_tta-panel-heading"><span class="vc_tta-title-text">Ofertas archivadas</span></div><div class="vc_tta-panel-body"><h3>(2026-99) Archivada</h3></div></div>';
 const calls=parseNeikerJobs(html,now);assert.equal(calls.length,2);assert.equal(calls[0].status,'En curso');assert.equal(calls[0].deadline,null);assert.deepEqual(calls[0].documents,[]);assert.deepEqual(calls[0].acceptedQualifications,[]);assert.equal(calls[1].status,'Cerrada');assert.equal(calls[1].province,null);
 assert.throws(()=>parseNeikerJobs('<h1>Website unavailable</h1>',now));
});
