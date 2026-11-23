import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTafallaDetail,parseTafallaList} from '../scripts/scrapers/tafalla';

test('Tafalla follows published pages and excludes internal promotion',()=>{
  const card=(title:string,url:string,status:string)=>`<div class="call-item"><a href="${url}"><div class="call-item-title">${title}</div></a><div class="call-status-container">${status}</div></div>`;
  const listing=parseTafallaList(card('Convocatoria de una plaza de Profesor/a de Saxofón','https://www.tafalla.es/convocatorias/profesor-saxofon/','Abierta')+card('Convocatoria en promoción interna restringida','https://www.tafalla.es/convocatorias/interna/','Abierta')+'<a href="https://www.tafalla.es/convocatorias/page/3/">3</a>');
  assert.equal(listing.pages,3);
  assert.deepEqual(listing.listings.map(item=>item.title),['Convocatoria de una plaza de Profesor/a de Saxofón']);
  assert.throws(()=>parseTafallaList('<div class="call-item"></div>'),/incompleta/);
});

test('Tafalla requires its own bases and does not trust an undated open label',()=>{
  const listing={title:'Convocatoria de una plaza de Profesor/a de Saxofón',url:'https://www.tafalla.es/convocatorias/profesor-saxofon/',status:'Abierta'};
  const html=`<main><h2 class="titulo-single">${listing.title}</h2><div class="call-status-container">Abierta</div><p>Temática: Educación</p><a href="https://www.tafalla.es/wp-content/uploads/2026/10/bases-saxofon.pdf">Bases convocatoria</a><a href="https://www.tafalla.es/wp-content/uploads/2026/10/lista-admitidos.pdf">Lista de admitidos</a></main>`;
  const call=parseTafallaDetail(html,listing,'2026-11-23T00:00:00.000Z');
  assert.equal(call?.status,'Pendiente de confirmar');
  assert.equal(call?.places,1);
  assert.deepEqual(call?.acceptedQualifications,[]);
  assert.deepEqual(call?.documents.map(doc=>doc.title),['Bases convocatoria']);
  assert.equal(parseTafallaDetail(html.replace('Bases convocatoria','Lista de admitidos'),listing,'2026-11-23T00:00:00.000Z'),null);
  assert.throws(()=>parseTafallaDetail(html,{...listing,title:'Otra plaza'},'2026-11-23T00:00:00.000Z'),/no coincide/);
});
