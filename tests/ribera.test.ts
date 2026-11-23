import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRiberaPosts,enrichRiberaBases} from '../scripts/scrapers/ribera';
const now='2026-11-20T00:00:00Z';
const post={id:4632,date:'2024-12-30T10:00:00',link:'https://mancoribera.com/2024/12/30/oferta-de-empleo/',title:{rendered:'Oferta de empleo: Convocatoria de empleo Oficial Administrativo'},content:{rendered:'<a href="/wp-content/uploads/bases.pdf">Bases de la convocatoria para oficial administrativo</a><a href="/form.docx">Modelo de instancia</a><a href="/results.pdf">Puntuación total–Propuesta de nombramiento</a>',protected:false}};
test('Ribera separates original employment posts and their bases from procurement, phase notices, forms and candidate lists',()=>{
 const calls=parseRiberaPosts([post,{...post,id:2,title:{rendered:'Aviso de deuda tributaria'}},{...post,id:3,title:{rendered:'Oferta de empleo: Resultados de la convocatoria'}},{...post,id:4,date:'2021-12-29T10:00:00'}],now);
 assert.equal(calls.length,1);assert.equal(calls[0].status,'Cerrada');assert.equal(calls[0].deadline,null);assert.equal(calls[0].documents.length,1);
 assert.throws(()=>parseRiberaPosts([post,post],now));
 assert.throws(()=>parseRiberaPosts([{...post,link:'https://example.org/job'}],now));
 assert.throws(()=>parseRiberaPosts(Array.from({length:100},(_,i)=>({...post,id:i+1})),now));
});
test('Ribera confirms SERINSA as the employer in each legal document and reads the actual minimum academic alternatives',()=>{
 const call=parseRiberaPosts([post],now)[0];
 enrichRiberaBases(call,'SERVICIOS PÚBLICOS DE LA RIBERA (SERINSA)\nCONVOCATORIA DE OFICIAL ADMNISTRATIVO\nBase 1. Objeto. Empresa pública de la Mancomunidad de la Ribera.\nBase 2.–Requisitos de los participantes.\nc. Tener titulación mínima de Bachillerato, FPII Administrativa y Comercial o Ciclo Superior Administración.\nd. Poseer capacidad.\nBase 3.–Procedimiento. Quince días desde la publicación.\nANEXO II\nTEMARIO PRUEBA TEÓRICA\n1. La Ley de Procedimiento Administrativo.\nAdministración electrónica y derechos, artículos 1 al\n21. Capítulo de recursos administrativos.\n2. Microsoft Excel y hojas de cálculo.\n10\nANEXO III.–BAREMO DE MÉRITOS\n1. Grado universitario como mérito.','https://mancoribera.com/wp-content/uploads/bases.pdf');
 assert.equal(call.organization,'Servicios Públicos de la Ribera, S.A.U. (SERINSA)');assert.deepEqual(call.acceptedQualifications,['bachiller','fp-superior']);assert.equal(call.topics.length,2);assert.match(call.topics[0],/21\. Capítulo/);assert.doesNotMatch(call.topics[1],/10/);assert.equal(call.deadline,null);
 assert.throws(()=>enrichRiberaBases(call,'Mancomunidad de la Ribera. Convocatoria de vigilante. Base 2. Requisitos.','https://mancoribera.com/wp-content/uploads/wrong.pdf'));
});
test('Ribera keeps the vigilance driving permit separate and never treats an SNE invitation as staff-only access',()=>{
 const call=parseRiberaPosts([{...post,title:{rendered:'Oferta de empleo: Convocatoria de lista temporal de empleo Vigilante'},content:{rendered:'<p>El SNE solicitará demandantes; podrán participar también quienes cumplan los requisitos.</p><a href="/wp-content/uploads/vigilante.pdf">Bases de la convocatoria temporal de vigilantes</a>',protected:false}}],now)[0];
 enrichRiberaBases(call,'SERVICIOS PÚBLICOS DE LA RIBERA (SERINSA)\nCONVOCATORIA DEL PUESTO DE VIGILANTE\nBase 1.–Objeto. Empresa pública de la Mancomunidad de la Ribera.\nBase 2. –Requisitos.\nc. Estar en posesión del título de Graduado Escolar, Graduado en E.S.O., Formación Profesional de Grado Medio o equivalente.\nd. Poseer capacidad.\nf. Estar en posesión del carnet de conducir vehículos de la clase B.\ng. Nacionalidad.\nBase 3.–Procedimiento.\nANEXO II TEMARIO PRUEBA TEÓRICA\n1.- Estatutos de la Mancomunidad de la Ribera.','https://mancoribera.com/wp-content/uploads/vigilante.pdf');
 assert.deepEqual(call.acceptedQualifications,['eso','fp-medio']);assert.match(call.requirements.join(' '),/clase B/);assert.equal(call.topics.length,1);assert.equal(call.language,null);
});
