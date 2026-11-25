import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FUNDAPA_BASES,parseFundapaBoard,parseFundapaBases} from '../scripts/scrapers/fundapa';

const now='2026-11-25T00:00:00.000Z';
const board=`<div class="card"><p class="elcolor">17 junio 2026</p><h6>Resultados pruebas</h6><a href="https://www.fundapa.org/resultados.pdf">Descargar</a></div>
<div class="card"><p class="elcolor">26 marzo 2026</p><h6>CONVOCATORIA PARA LA CREACION DE UNA LISTA DE SUSTITUCION TEMPORAL DEL PUESTO DE TECNICO ECONOMICO EN FUNDAPA</h6><a href="${FUNDAPA_BASES}">Descargar</a></div>`;
const topics=['Protección jurídica de las personas con discapacidad','Ley 8/2021','Ley Foral 31/2022','Prestaciones de la Seguridad Social','Afiliación y altas de trabajadores','El IRPF en Navarra','Impuesto sobre el patrimonio en Navarra','Impuesto sobre Sucesiones y Donaciones en Navarra'];
const bases=`CONVOCATORIA PARA ELABORAR UNA LISTA DE CONTRATACIÓN TEMPORAL PARA LA SUSTITUCIÓN DE TECNICO ECONÓMICO DE GRADO MEDIO EN FUNDACION PUBLICA NAVARRA
Es objeto de la presente convocatoria la elaboración de una lista de contratación, a través de pruebas selectivas para cubrir las necesidades de sustitución temporal.
Grado universitario en Administración y Dirección de empresas o Economía, Diplomatura en ciencias empresariales, Licenciatura en Administración y Dirección de Empresas o Economía, o titulaciones equivalentes.
Quienes deseen participar pueden solicitarlo hasta el 6 de abril de 2026 a las 14 horas.
TEMARIO:
${topics.map(topic=>`o   ${topic}`).join('\n')}
4.- ADMISIÓN DE ASPIRANTES Y RECLAMACIONES
La prueba consistirá en un Examen tipo Test.`;

test('FUNDAPA selects the original announcement and its eight published topics',()=>{
 assert.equal(parseFundapaBoard(board),FUNDAPA_BASES);
 const call=parseFundapaBases(bases,'a'.repeat(64),now);
 assert.equal(call.organization,'Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad');
 assert.equal(call.deadline,'2026-04-06');assert.equal(call.status,'Cerrada');
 assert.equal(call.places,null);assert.equal(call.topics.length,8);
 assert.equal(call.syllabusUrl,FUNDAPA_BASES);
 assert.throws(()=>parseFundapaBoard(board.replace('26 marzo 2026','17 junio 2026')));
 assert.throws(()=>parseFundapaBases(bases.replace('6 de abril de 2026','7 de abril de 2026'),'a'.repeat(64),now));
});
