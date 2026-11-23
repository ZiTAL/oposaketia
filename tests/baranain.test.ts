import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enrichBaranainBases,extractBaranainAnnexTopics,parseBaranainDetail,parseBaranainList} from '../scripts/scrapers/baranain';

test('Barañáin follows its employment archive and excludes internal processes and results',()=>{
  const card=(title:string,path:string)=>`<article class="entrada"><div class="list-title"><a href="https://www.baranain.es/${path}/">${title}</a></div></article>`;
  const result=parseBaranainList(`<main>${card('Convocatoria para tres plazas de agente de policía','policia')}${card('Concurso de traslado de nueve plazas','traslado')}${card('Relación definitiva concurso-oposición','resultado')}<a href="https://www.baranain.es/category/empleo-2/page/6/">6</a></main>`);
  assert.equal(result.pages,6);
  assert.deepEqual(result.listings.map(item=>item.url),['https://www.baranain.es/policia/']);
});

test('Barañáin maps only an explicit academic admission clause',()=>{
  const listing={title:'Pruebas selectivas para un puesto',url:'https://www.baranain.es/puesto/'};
  const html=`<head><meta property="article:published_time" content="2026-10-29T08:00:00+00:00"></head><main><h2 class="titulo-single">${listing.title}</h2><a href="https://www.baranain.es/wp-content/uploads/2026/10/bases.pdf">Bases convocatoria</a></main>`;
  const generic=parseBaranainDetail(html,listing,'2026-11-23T00:00:00.000Z')!;
  enrichBaranainBases(generic,'c) Hallarse en posesión del título de diplomado universitario, ingeniero técnico, arquitecto técnico, grado o titulación declarada oficialmente equivalente.\nd) Otros requisitos.\nEn méritos se valora música.',generic.documents[0].url);
  assert.deepEqual(generic.acceptedQualifications,['grado']);
  const specialist=parseBaranainDetail(html,listing,'2026-11-23T00:00:00.000Z')!;
  enrichBaranainBases(specialist,'c) Estar en posesión del título de Diplomado/a en Relaciones Laborales o Graduado/a en Relaciones Laborales.\nd) Otros requisitos.',specialist.documents[0].url);
  assert.deepEqual(specialist.acceptedQualifications,[]);
  assert.match(specialist.educationText,/Relaciones Laborales/);
  const broad=parseBaranainDetail(html,listing,'2026-11-23T00:00:00.000Z')!;
  enrichBaranainBases(broad,'c) Hallarse en posesión de título universitario de grado, diplomatura universitaria, ingeniería técnica, arquitectura técnica, o título declarado equivalente.\nd) Otros requisitos.',broad.documents[0].url);
  assert.deepEqual(broad.acceptedQualifications,['grado']);
});

test('Barañáin extracts wrapped topics only from the published syllabus annex',()=>{
  const text='ANEXO I. Solicitud.\n1. Dato personal\nANEXO II. Temario.\nParte general\nTema 1.–La Constitución Española\ny sus derechos.\nTema 2.–Administración local.\fANEXO III. BAREMO DE MÉRITOS\n1.- Servicios prestados';
  assert.deepEqual(extractBaranainAnnexTopics(text),['Tema 1.–La Constitución Española y sus derechos.','Tema 2.–Administración local.']);
});

test('Barañáin retains only municipal bases and leaves an unverified deadline unknown',()=>{
  const listing={title:'Convocatoria para tres plazas de agente de policía',url:'https://www.baranain.es/policia/'};
  const html=`<head><meta property="article:published_time" content="2026-10-29T08:00:00+00:00"></head><main><h2 class="titulo-single">${listing.title}</h2><a href="https://www.baranain.es/wp-content/uploads/2026/10/bases-policia.pdf">Bases convocatoria</a><a href="https://www.baranain.es/wp-content/uploads/2026/10/lista-admitidos.pdf">Lista de admitidos convocatoria</a></main>`;
  const call=parseBaranainDetail(html,listing,'2026-11-23T00:00:00.000Z');
  assert.equal(call?.status,'Pendiente de confirmar');
  assert.equal(call?.places,3);
  assert.deepEqual(call?.acceptedQualifications,[]);
  assert.deepEqual(call?.documents.map(doc=>doc.title),['Bases convocatoria']);
  assert.equal(parseBaranainDetail(html.replace('2026-10-29','2024-10-29'),listing,'2026-11-23T00:00:00.000Z'),null);
  assert.equal(parseBaranainDetail(html.replace('Bases convocatoria','Lista de admitidos'),listing,'2026-11-23T00:00:00.000Z'),undefined);
});
