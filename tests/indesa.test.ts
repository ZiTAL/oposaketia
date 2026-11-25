import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indesaTopics,isIndesaResponsibleNotice,parseIndesaBases,parseIndesaEmployment} from '../scripts/scrapers/indesa';

const pdf='https://www.indesa.eus/wp-content/uploads/2026/05/0-0-Bases-responsable-del-dpto-laboral-1.pdf';
const listing=`<div class="event-item"><div class="event-content"><div class="event-meta"><span class="event-date">25 mayo 2026</span><span class="event-category">Ofertas externas</span></div><h3>RESPONSABLE DEPARTAMENTO LABORAL</h3></div><div class="event-details"><p>Bases generales del proceso. <a href="${pdf}">Ver documento</a></p><p>Resultado definitivo <a href="https://www.indesa.eus/resultado.pdf">Ver documento</a></p></div></div>`;
const topics=['Convenio colectivo vigente: BOTHA Núm. 133, de 22/11/2024','Estatutos Indesa 2010 S.L.',...Array.from({length:13},(_,i)=>`Normativa laboral específica y procedimientos internos número ${i+1}`),'Aplicación SAP de RRHH'];
const bases=`BASES GENERALES Y ESPECÍFICAS DE PROCESO SELECTIVO mediante convocatoria conjunta interna y externa para dar cobertura indefinida de una plaza de estructura como Responsable del Departamento Laboral, INDESA 2010 S.L. FINALIZARÁ A LAS 12:00 HORAS del 19 de Junio de 2026. TITULACIÓN REQUERIDA Y OBLIGATORIA: Grado en relaciones laborales o RRHH, Ciencias del trabajo, Derecho, o Administración y Dirección de empresas. experiencia mínima de tres años en puesto similar. carnet de conducir, clase B.\nANEXO I- TEMARIO.\nFASE CONOCIMIENTOS\n${topics.map(item=>` - ${item}`).join('\n')}\nANEXO II- DESTINO, REQUISITOS Y FUNCIONES DEL PUESTO.`;

test('Indesa selects its external job and original bases, excluding candidate results',()=>{
 assert.equal(parseIndesaEmployment(listing),pdf);
 assert.equal(isIndesaResponsibleNotice('https://enplegupublikoa.araba.eus/es/-/indesa-apertura-proceso-seleccion-responsable-departamento-laboral?p_l_back_url=%2Fes%2Fsector-publico-foral'),true);
 assert.equal(isIndesaResponsibleNotice('https://example.org/es/-/indesa-apertura-proceso-seleccion-responsable-departamento-laboral'),false);
 assert.throws(()=>parseIndesaEmployment(listing.replace('Ofertas externas','Ofertas internas')));
});

test('Indesa keeps the external priority condition, deadline and annex topics',()=>{
 const call=parseIndesaBases(bases,'a'.repeat(64),'2026-11-24T12:00:00.000Z');
 assert.equal(call.places,1);assert.equal(call.deadline,'2026-06-19');assert.equal(call.topics.length,16);assert.equal(call.syllabusUrl,pdf);
 assert.match(call.description,/prioridad de la lista interna/);
 assert.throws(()=>parseIndesaBases(bases.replace('19 de Junio','20 de Junio'),'a'.repeat(64),'2026-11-24T12:00:00.000Z'));
 assert.deepEqual(indesaTopics(bases.replace('ANEXO I- TEMARIO','ANEXO I- RESULTADOS')),[]);
});
