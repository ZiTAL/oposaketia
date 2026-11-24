import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyOrkestraBases,parseOrkestraDetail,parseOrkestraList} from '../scripts/scrapers/orkestra';

const now='2026-11-24T10:00:00.000Z';
const detailUrl='https://es.euskadikoorkestra.eus/orquesta/trabajar-en-la-orquesta/3-violines-tutti';
const pdfUrl='https://es.euskadikoorkestra.eus/sites/default/files/basesejercicios_violin_tutti_2027_enero.pdf';
const listing={title:'3 Violines tutti',url:detailUrl};
const detail=`<h1>3 Violines tutti</h1><a href="${pdfUrl}">Bases</a><a href="https://es.euskadikoorkestra.eus/sites/default/files/lista-candidatos.pdf">Lista de candidaturas</a>`;
const bases=`CONCURSO PARA SELECCIÓN DE INSTRUMENTISTAS\n3 VIOLINES TUTTI\nBASES\n1.- DESCRIPCION DEL PUESTO DE TRABAJO.\nSe ofrecen 3 puestos de VIOLIN TUTTI.\n2.- REQUISITOS.\nEstar en posesión del Título Superior o equivalente.\n3.- ADMISION DE CANDIDATOS.\nLas personas se deberán inscribir antes del 27/11/2026.\n4.- TRIBUNAL.\n5.- REALIZACIÓN DE LAS PRUEBAS.`;

test('Orkestra lists only official employment cards and requires a unique detail URL',()=>{
  const html=`<h1>Trabajar en la orquesta</h1><div class="view-content"><div class="puesto"><h2>3 Violines tutti</h2><h3>26 Enero 2027</h3><div class="enlaces"><a href="${detailUrl}">Más información</a></div></div></div>`;
  assert.deepEqual(parseOrkestraList(html),[listing]);
  assert.throws(()=>parseOrkestraList(html.replace('3 Violines tutti','')));
  assert.throws(()=>parseOrkestraList(html.replace('</div></div>',`</div></div><div class="puesto"><h2>3 Violines tutti</h2><div class="enlaces"><a href="${detailUrl}">Más información</a></div></div>`)));
});

test('Orkestra uses the PDF admission date, not the audition date, and excludes candidate lists',()=>{
  const {call}=parseOrkestraDetail(detail,listing,now);
  const verified=applyOrkestraBases(call,bases,'a'.repeat(64),now);
  assert.equal(verified.deadline,'2026-11-26');
  assert.equal(verified.status,'Abierta');
  assert.equal(verified.places,3);
  assert.equal(verified.documents.length,1);
  assert.equal(verified.syllabusUrl,pdfUrl);
  assert.deepEqual(verified.acceptedQualifications,[]);
  assert.throws(()=>applyOrkestraBases(call,bases.replace('27/11/2026',''), 'a'.repeat(64),now));
  assert.throws(()=>applyOrkestraBases(call,bases.replace('3 VIOLINES TUTTI','FAGOT SOLISTA'), 'a'.repeat(64),now));
});
