import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseUnibasqBases,parseUnibasqDetail,parseUnibasqList} from '../scripts/scrapers/unibasq';

const now='2026-11-24T08:00:00.000Z';
const job='https://www.unibasq.eus/es/portal-de-transparencia/empleo-y-contratacion-ofertas-vigentes/proceso-tecnico/';
const pdf='https://www.unibasq.eus/wp-content/uploads/2024/06/Bases-proceso-creacion-bolsa-de-trabajo-Tecnico_a-de-Evaluacion-en-Unibasq.pdf';
const listing={title:'Proceso para la creación de una bolsa de trabajo para cubrir temporalmente puestos de Técnico/a de Evaluación',url:job,closed:true,directPdf:false};

test('Unibasq reads the closed employment list without treating candidate documents as jobs',()=>{
 const html=`<h1>Portal de Transparencia</h1><h2>Procesos de selección finalizados</h2><div class="et_pb_text_inner"><ul><li><a href="${job}">${listing.title}</a> <strong>(Cerrado)</strong></li></ul></div>`;
 assert.deepEqual(parseUnibasqList(html),[listing]);
 assert.throws(()=>parseUnibasqList(html.replace('Procesos de selección finalizados','Concursos y becas')));
 assert.throws(()=>parseUnibasqList(html.replace(job,'https://example.com/empleo/')));
});

test('Unibasq selects bases and retains the actual deadline and degree alternatives',()=>{
 const detail=`<h1>Portal de Transparencia</h1><h2>${listing.title}</h2><a href="${pdf}">Bases que regulan el proceso</a><a href="https://www.unibasq.eus/wp-content/uploads/2024/06/lista-aspirantes.pdf">Listado definitivo de aspirantes</a>`;
 assert.equal(parseUnibasqDetail(detail,listing),pdf);
 const bases=`UNIBASQ Agencia de Calidad del Sistema Universitario Vasco. 4. - REQUISITOS ESPECÍFICOS 4.1. Titulación en alguna de las siguientes disciplinas universitarias de licenciatura o grado: Administración y Dirección de Empresas; Economía; Derecho o Sociología. 4.2. Conocimientos de Euskara nivel C1. 8.- PLAZO DE PRESENTACION hasta las 14:00 horas del día 15 de junio de 2024. ${' '.repeat(1000)}`;
 const call=parseUnibasqBases(listing,pdf,bases,'a'.repeat(64),now);
 assert.equal(call.deadline,'2024-06-15');assert.equal(call.status,'Cerrada');assert.equal(call.province,'Araba / Álava');
 assert.equal(call.language?.level,'C1');assert.deepEqual(call.acceptedQualifications,[]);
 assert.deepEqual(call.topics,[]);assert.equal(call.syllabusUrl,null);
 assert.throws(()=>parseUnibasqBases(listing,pdf,bases.replace('Derecho o Sociología','Geografía'), 'a'.repeat(64),now));
});
