import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseUliazpiList} from '../scripts/scrapers/uliazpi';
import {parseIfasList} from '../scripts/scrapers/ifas';
import {parseLantikList} from '../scripts/scrapers/lantik';
const now='2026-11-18T00:00:00.000Z';
test('Uliazpi excludes internal competitions and never stores volatile form state in call identities',()=>{
  const table=(heading:string,title:string)=>`<table><thead><tr><td>${heading}</td></tr></thead><tbody><tr><td><a href="/WAS/CORP/LLEHautaketaProzesuakWEB/concursosC/123/0/ver?_HDIV_STATE_=secret">${title}</a></td><td>Fecha y lugar examen</td></tr></tbody></table>`;
  const html=table('Ofertas de empleo','Médico/a')+table('Concurso de traslados','Traslados')+table('Bolsas de trabajo','Concursillo de responsable de centro');
  const calls=parseUliazpiList(html,now);
  assert.equal(calls.length,1);assert.equal(calls[0].status,'En curso');assert.equal(calls[0].province,'Gipuzkoa');assert.equal(calls[0].deadline,null);
  assert.ok(!calls[0].sourceUrl.includes('HDIV'));assert.deepEqual(calls[0].acceptedQualifications,[]);
  assert.equal(calls[0].id,parseUliazpiList(html.replace('secret','another-token'),now)[0].id);
});
test('Lantik distinguishes an active work pool from open registration and retains explicit closed processes',()=>{
  const card=(path:string,extra:string)=>`<div class="empleo"><div class="detalles"><h3><a href="/es/-/${path}">Técnico/a</a></h3><h4>Publicado el 8 de febrero de 2026</h4><div class="proceso cerrado">Proceso cerrado</div>${extra}</div></div>`;
  const calls=parseLantikList(card('pool','<a>BOLSA DE TRABAJO ACTIVA</a>')+card('closed',''),now);
  assert.equal(calls.length,2);assert.equal(calls[0].status,'En curso');assert.equal(calls[1].status,'Cerrada');assert.equal(calls[0].deadline,null);assert.equal(calls[0].province,'Bizkaia');
});

test('IFAS preserves its own host and source rather than mixing its vacancies with the Diputación',()=>{
  const calls=parseIfasList('<table class="ope_tabla90"><tr><td headers="Nombre"><a href="convocatoria.asp?id=355">Cocinero/a FP2</a></td><td headers="Plazas">4</td></tr></table>',now);
  assert.equal(calls.length,1);assert.equal(calls[0].sourceId,'ifas');assert.equal(new URL(calls[0].sourceUrl).hostname,'ifas.bizkaia.eus');assert.equal(calls[0].places,4);assert.equal(calls[0].deadline,null);assert.deepEqual(calls[0].acceptedQualifications,[]);
});
