import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enrichVillavaBon,enrichVillavaPdf,parseVillavaDetail,parseVillavaList} from '../scripts/scrapers/villava';

const now='2026-11-23T00:00:00.000Z';
const title='Convocatoria concurso-oposición de una plaza de oficial de administración del personal';
const url='https://www.villava.es/convocatorias/oficial-administracion/';

test('Villava reads both archive pages and excludes restricted promotion',()=>{
  const card=(name:string,path:string)=>`<div class="call-item"><a href="https://www.villava.es/convocatorias/${path}/"><div class="call-item-title">${name}</div></a><div class="call-status-container">Abierta</div></div>`;
  const parsed=parseVillavaList(`<main>${card(title,'oficial-administracion')}${card('Convocatoria para promoción interna restringida','interna')}<a href="https://www.villava.es/convocatorias/page/2/">2</a></main>`);
  assert.equal(parsed.pages,2);
  assert.deepEqual(parsed.listings.map(item=>item.url),[url]);
});

test('Villava retains only original bases and does not trust a stale open label',()=>{
  const listing={title,url,status:'Abierta'};
  const html=`<main><h2 class="titulo-single">${title}</h2><div class="call-status-container">Abierta</div><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/206/27">Bases de la convocatoria (BON)</a><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/207/22">Corrección de las bases de la convocatoria</a><a href="https://www.villava.es/wp-content/uploads/2026/10/resultado.pdf">Resultado definitivo</a></main>`;
  const call=parseVillavaDetail(html,listing,now)!;
  assert.equal(call.status,'Pendiente de confirmar');
  assert.equal(call.deadline,null);
  assert.deepEqual(call.documents.map(doc=>doc.url),['https://bon.navarra.es/es/anuncio/-/texto/2026/206/27']);
  assert.equal(parseVillavaDetail(html.replace('Bases de la convocatoria (BON)','Lista de admitidos'),listing,now),null);
});

test('Villava enriches a verified BON bases article only from legal paragraphs',()=>{
  const listing={title,url,status:'Cerrada'};
  const detail=`<main><h2 class="titulo-single">${title}</h2><div class="call-status-container">Cerrada</div><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/206/27">Bases de la convocatoria</a></main>`;
  const call=parseVillavaDetail(detail,listing,now)!;
  enrichVillavaBon(call,'<p class="a-denominacion">VILLAVA</p><p class="a-seccion">2.1. Oposiciones</p><p class="a-titulo">Convocatoria</p><p class="foral-parrafo">2.–Requisitos</p><p class="foral-parrafo">Estar en posesión del título de Bachiller o equivalente.</p><p class="foral-parrafo">3.–Solicitudes</p>','https://bon.navarra.es/es/anuncio/-/texto/2026/206/27');
  assert.match(call.educationText,/Bachiller/);
  assert.deepEqual(call.acceptedQualifications,['bachiller']);
});

test('Villava reads the bullet syllabus and explicit alternative degrees in municipal bases',()=>{
  const listing={title,url,status:'Cerrada'};
  const detail=`<main><h2 class="titulo-single">${title}</h2><div class="call-status-container">Cerrada</div><a href="https://www.villava.es/wp-content/uploads/2026/05/bases.pdf">Bases de la convocatoria</a></main>`;
  const call=parseVillavaDetail(detail,listing,now)!;
  enrichVillavaPdf(call,'Hallarse en posesión del título de Graduado en Derecho; Administración y Dirección de Empresas; Economía; o título equivalente.\n\nLa prueba versará sobre el siguiente temario:\n   Ley 1 y sus contenidos.\n   Ley 2 y sus contenidos.\nLa puntuación máxima será de 50 puntos.',call.documents[0].url);
  assert.deepEqual(call.acceptedQualifications,['derecho','ade','economia']);
  assert.deepEqual(call.topics,['Ley 1 y sus contenidos.','Ley 2 y sus contenidos.']);
});
