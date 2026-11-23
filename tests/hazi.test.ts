import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHaziList,enrichHaziBases,applyHaziCalendar} from '../scripts/scrapers/hazi';
const now='2026-11-20T16:30:00.000Z';
const title='Convocatoria externa de un puesto indefinido «C-Técnica/o jurídico en contratación»';
const page=(name=title)=>`<h1>TRABAJA en HAZI</h1><section><h2>${name}</h2><a href="/wp-content/uploads/BASES.pdf">PERFIL REQUERIDO</a><a href="/wp-content/uploads/CALENDARIO.pdf">CALENDARIO DEL PROCESO</a><a href="/wp-content/uploads/RESULTADOS.pdf">VER LISTADO</a><a href="https://www.adecco.com/apply">ESTE ENLACE</a></section>`;
const bases=`CONVOCATORIA EXTERNA PARA LA SELECCIÓN DE UN PUESTO INDEFINIDO C-TÉCNICO/A JURÍDICO EN CONTRATACIÓN
Fundación HAZI Fundazioa
3.- LUGAR DE TRABAJO
Su centro podrá ser Donostia (Gipuzkoa), Abadiño (Bizkaia) o Arkaute (Araba).
Durante los primeros meses su sede será Donostia.
4.- TRIBUNAL
6.- DESARROLLO DEL PROCESO
Presentación de candidaturas, que finalizará el 20/11/2026, incluido.
1.- Requisitos imprescindibles y excluyentes:
• Licenciatura o Grado universitario oficial en Derecho, incluida cualquier doble titulación con Derecho.
• Experiencia mínima de 18 meses.
• Euskera a nivel de C1 o equivalente.
• Carnet de conducir tipo B.
2.- Requisitos valorables:
2.1.- Específicos del puesto:
La valoración se realizará mediante prueba escrita basada en estos conocimientos.
• Normativa de contratación del sector público, con especial atención al
 régimen de los PANAPS. (0-20 puntos)
9
\f• Organización y régimen jurídico de las fundaciones públicas. (0-10 puntos)
Para superar esta fase es necesario lograr 30 puntos.
2.2.- Experiencia demostrada:
• Grado en Psicología y francés B2 como méritos.`;
test('HAZI keeps each call with its own legal profile and calendar without downloading candidates or external applications',()=>{
 const calls=parseHaziList(page(),now);assert.equal(calls.length,1);assert.equal(calls[0].places,1);
 assert.equal(parseHaziList(page().replace('<h1>TRABAJA en HAZI</h1>','<h2>TRABAJA en HAZI</h2>'),now).length,1);
 assert.deepEqual(calls[0].documents.map(d=>d.kind),['bases','calendario']);
 assert.equal(calls[0].documents.some(d=>/RESULTADOS|adecco/.test(d.url)),false);
 assert.throws(()=>parseHaziList(page().replace('/wp-content/uploads/BASES.pdf','https://evil.example/bases.pdf'),now));
 assert.throws(()=>parseHaziList(page().replace('PERFIL REQUERIDO','SOLICITUD'),now));
 assert.throws(()=>parseHaziList('<h1>TRABAJA en HAZI</h1>',now));
});
test('HAZI reads mandatory studies, Basque and written-exam knowledge blocks without using merit degrees or a temporary office as the province',()=>{
 const call=enrichHaziBases(parseHaziList(page(),now)[0],bases,now);
 assert.deepEqual(call.acceptedQualifications,['derecho']);assert.equal(call.language?.level,'C1');assert.equal(call.languageStatus,'known');
 assert.equal(call.province,null);assert.match(call.location,/Abadiño/);assert.match(call.location,/Donostia/);
 assert.equal(call.deadline,'2026-11-20');assert.equal(call.status,'Abierta');assert.equal(call.topics.length,2);
 assert.match(call.topics[0],/régimen de los PANAPS/);assert.equal(call.topics[0].includes('9'),false);
 assert.equal(call.topics.some(t=>/Para superar|Psicología/.test(t)),false);
 assert.throws(()=>enrichHaziBases(parseHaziList(page(),now)[0],bases.replace('C-TÉCNICO/A JURÍDICO EN CONTRATACIÓN','C-MARCAS Y MERCADOS'),now));
});
test('HAZI compares the application calendar with the bases and keeps conflicting deadlines pending instead of choosing one',()=>{
 const call=enrichHaziBases(parseHaziList(page(),now)[0],bases,now);
 const calendar='CALENDARIO PROCESO EXTERNO C-SECRETARÍA TÉCNICA (TÉCNICO/A EN CONTRATACIÓN)\nDel 05/11/2026 hasta el 19/11/2026: plazo de recepción de solicitudes.\nPlazo de reclamación: hasta el 11/12/2026.';
 applyHaziCalendar(call,calendar,now);assert.equal(call.deadline,null);assert.equal(call.status,'Pendiente de confirmar');
 assert.match(call.requirements.join(' '),/2026-11-19/);assert.match(call.requirements.join(' '),/2026-11-20/);
 assert.throws(()=>applyHaziCalendar(call,calendar.replace('C-SECRETARÍA TÉCNICA (TÉCNICO/A EN CONTRATACIÓN)','C-MARCAS Y MERCADOS'),now));
});
test('HAZI retains the literal ADE alternative while mapping its official academic abbreviation locally',()=>{
 const name='Convocatoria externa de un puesto indefinido C-Marcas y Mercados';
 const text=bases.replaceAll('C-TÉCNICO/A JURÍDICO EN CONTRATACIÓN','C-MARCAS Y MERCADOS').replace('Licenciatura o Grado universitario oficial en Derecho, incluida cualquier doble titulación con Derecho.','Diplomatura/Grado universitario en Empresariales, ADE, Marketing, turismo o similar');
 const call=enrichHaziBases(parseHaziList(page(name),now)[0],text,now);
 assert.match(call.educationText,/ADE/);assert.deepEqual(call.acceptedQualifications,['ade']);
});
