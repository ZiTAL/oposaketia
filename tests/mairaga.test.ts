import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMairagaPosts,enrichMairagaBases} from '../scripts/scrapers/mairaga';
const now='2026-11-20T00:00:00Z';
const title='Convocatoria para la provisión de tres plazas de chófer al servicio de la Mancomunidad de Mairaga mediante concurso-oposición y en régimen laboral fijo';
const post=(id:number,t=title)=>({id,date:'2026-02-05T09:05:47',link:`https://mairaga.es/convocatoria-${id}/`,title:{rendered:t},content:{rendered:'<a href="https://mairaga.es/wp-content/uploads/2026/02/bases.pdf">CONVOCATORIA CHÓFER</a><a href="https://mairaga.es/candidatos.pdf">Lista de admitidos</a>',protected:false}});
test('Mairaga keeps original public calls, binds phase notices to their own process and excludes staff-only or third-party news',()=>{
 const calls=parseMairagaPosts([post(1),post(2,title+'. Propuesta de nombramiento.'),post(5,title+'. Valoración provisional de la fase de concurso.'),post(3,title.replace('tres plazas','un puesto')+' en turno restringido'),post(4,title.replace('Mancomunidad de Mairaga','Ayuntamiento de Tafalla'))],now);
 assert.equal(calls.length,1);assert.equal(calls[0].status,'Cerrada');assert.equal(calls[0].deadline,null);assert.equal(calls[0].documents.length,1);assert.equal(calls[0].province,'Navarra');
 assert.throws(()=>parseMairagaPosts([post(1),post(1)],now));
 assert.throws(()=>parseMairagaPosts([{...post(1),link:'https://example.org/call'}],now));
 assert.throws(()=>parseMairagaPosts(Array.from({length:100},(_,i)=>post(i+1)),now));
});
test('Mairaga reads academic alternatives only from admission requirements and keeps driving credentials separate',()=>{
 const call=parseMairagaPosts([post(1)],now)[0];
 enrichMairagaBases(call,'Convocatoria de chófer al servicio de la Mancomunidad de Mairaga\n2.–Requisitos de las personas aspirantes.\nc) Hallarse en posesión del título de graduado escolar, formación profesional de primer grado o equivalente.\nd) Poseer capacidad.\nf) Hallarse en posesión del carnet de conducir clase C, con carnet de capacitación profesional en vigor (CAP).\n2.2. Acreditación.\n3. Solicitudes. Quince días desde la publicación.','https://mairaga.es/wp-content/uploads/bases.pdf');
 assert.deepEqual(call.acceptedQualifications,['eso']);assert.match(call.requirements.join(' '),/CAP/);assert.equal(call.deadline,null);assert.equal(call.language,null);
 assert.throws(()=>enrichMairagaBases(call,'Convocatoria del Ayuntamiento de Tafalla\n2. Requisitos.','https://mairaga.es/wp-content/uploads/wrong.pdf'));
});
test('Mairaga retains degree bullet alternatives and complete programme items while excluding annex forms and signature metadata',()=>{
 const call=parseMairagaPosts([post(1,title.replace('tres plazas de chófer','una relación de aspirantes de licenciado en económicas'))],now)[0];
 enrichMairagaBases(call,'Mancomunidad de Mairaga. Relación de licenciado en económicas.\n2. Requisitos de los aspirantes.\nc) Hallarse en posesión de alguna de las siguientes titulaciones:\n- Grado o licenciatura en administración y dirección de empresas.\n- Grado o licenciatura en economía.\nLas personas aspirantes que aleguen equivalencias deberán acreditarlas.\nd) Poseer capacidad.\n3. Solicitudes.\nANEXO I.- TEMARIO\n1. Ley de Administración Local:\nBienes, contratación y personal.\nDocumento firmado electrónicamente desde plataforma | Página 9 de 11\nCód. Validación: NOT-A-TOPIC\n2. Hacienda local y presupuestos.\nANEXO II\nMODELO DE INSTANCIA\n1. Nombre del solicitante.','https://mairaga.es/wp-content/uploads/economic.pdf');
 assert.deepEqual(call.acceptedQualifications,['ade','economia']);assert.match(call.educationText,/economía/);assert.equal(call.topics.length,2);assert.match(call.topics[0],/contratación y personal/);assert.doesNotMatch(call.topics.join(' '),/NOT-A-TOPIC|solicitante|firmado/);
});
