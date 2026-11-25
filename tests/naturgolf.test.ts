import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNaturgolfBases,parseNaturgolfPortal} from '../scripts/scrapers/naturgolf';

const pdf='https://www.izkigolf.eus/wp-content/uploads/2022/02/Anuncio-Bases-CONTRATACION-VIGILANTE-RECEPCIONISTA.pdf';
const page=`<h2>Perfil del contratante NATURGOLF S.A.</h2><h5>Convocatoria Contratación personal fijo discontinuo (cerrada)</h5><a href="${pdf}">Bases</a><a href="https://www.izkigolf.eus/resultado.pdf">Resultado</a>`;
const text=`BASES DE LA CONVOCATORIA DE NATURGOLF, S.A. PARA LA CONTRATACIÓN LABORAL DE VIGILANTE-RECEPCIONISTA. Con este proceso selectivo se cubrirá una plaza de carácter fijo en la plantilla de Naturgolf, SA como fijo discontinuo. Estar en posesión, como mínimo, del título de Graduado Escolar o de ESO. El plazo máximo será de 10 días naturales contados a partir del siguiente al de la publicación. CONOCIMIENTO DE EUSKERA (máximo 3 puntos).\nANEXO.- TEMARIO\nTema 1.- Reglamento Interno del Complejo Izki Golf.\nTema 2.- Fundamentos del Golf.\nTema 3.- Campos de Golf: Características y nomenclatura.\nTema 4.- El entorno. Montaña Alavesa.\nTema 5.- Protocolos atención al público.`;

test('Naturgolf reads its own labour bases and excludes procurement and candidate results',()=>{
 assert.equal(parseNaturgolfPortal(page),pdf);
 assert.throws(()=>parseNaturgolfPortal(page.replace('fijo discontinuo (cerrada)','suministro coches (cerrada)')));
 assert.throws(()=>parseNaturgolfPortal(page.replace('Anuncio-Bases-CONTRATACION-VIGILANTE-RECEPCIONISTA.pdf','contrato-servicios.pdf')));
});

test('Naturgolf keeps its relative deadline unknown and reads five annex topics',()=>{
 const call=parseNaturgolfBases(text,'a'.repeat(64),'2026-11-25T10:00:00.000Z');
 assert.equal(call.places,1);assert.equal(call.deadline,null);assert.equal(call.topics.length,5);assert.equal(call.language,null);
 assert.equal(call.acceptedQualifications[0],'eso');assert.equal(call.syllabusUrl,pdf);
 assert.throws(()=>parseNaturgolfBases(text.replace('Tema 5.-','Prueba 5.-'),'a'.repeat(64),'2026-11-25T10:00:00.000Z'));
});
