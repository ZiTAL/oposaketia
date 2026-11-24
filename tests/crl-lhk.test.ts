import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCrlLhkBases} from '../scripts/scrapers/crl-lhk';

const now='2026-11-24T09:00:00.000Z';
const html=`<div class="colCentralinterior"><h1>CONSEJO DE RELACIONES LABORALES</h1><p>El proceso selectivo será por el sistema de concurso. Las solicitudes se presentan en el plazo de veinte (20) días hábiles contados a partir del día siguiente al de la publicación de la convocatoria en el Boletín Oficial del País Vasco.</p><h6>ANEXO II AL ACUERDO</h6><p>Se convoca una (1) plaza de Técnico/a en negociación colectiva. – Destino: Bilbao.</p><ol><li>La titulación requerida para el acceso es el título de grado o licenciatura en Derecho.</li></ol><p>Es requisito de provisión la acreditación del perfil lingüístico 3 de euskera.</p><h6>ANEXO III AL ACUERDO</h6><p>Se convocan dos (2) plazas de Administrativo/a área de relaciones laborales. – Destinos: Bilbao y Donostia-San Sebastián.</p><ol><li>Las titulaciones requeridas son el Título de Graduado en Educación Secundaria Obligatoria o el título de Bachiller, de Técnico/a de Grado Medio de Formación Profesional o equivalente.</li></ol><p>Es requisito de provisión la acreditación del perfil lingüístico 2 de euskera.</p></div>`;

test('CRL separates the technical and administrative annexes and their destinations',()=>{
 const [tech,admin]=parseCrlLhkBases(html,now);
 assert.equal(tech.places,1);assert.equal(tech.province,'Bizkaia');assert.equal(tech.group,'A2');
 assert.deepEqual(tech.language,{name:'euskera',level:'C1'});
 assert.equal(admin.places,2);assert.equal(admin.province,null);assert.equal(admin.location,'Bilbao y Donostia-San Sebastián');
 assert.deepEqual(admin.language,{name:'euskera',level:'B2'});
 assert.equal(tech.status,'Cerrada');assert.equal(admin.deadline,null);
 assert.deepEqual(tech.topics,[]);assert.deepEqual(admin.topics,[]);
 assert.notEqual(tech.id,admin.id);
});

test('CRL rejects an unrecognized degree or silent loss of an annex',()=>{
 assert.throws(()=>parseCrlLhkBases(html.replace('grado o licenciatura en Derecho','grado en Economía'),now));
 assert.throws(()=>parseCrlLhkBases(html.replace('ANEXO III AL ACUERDO','RESULTADOS'),now));
});
