import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseEguesList,parseEguesDetail,isRestrictedEguesBases,enrichEguesBases} from '../scripts/scrapers/egues';
const now='2026-11-19T00:00:00Z',home='https://www.valledeegues.com/convocatorias/';
const card=(slug:string,title:string,state:string)=>`<div class="call-item"><a href="${home}${slug}/"><div class="call-item-title">${title}</div></a><div class="call-status-container">${state}</div></div>`;
test('Egues follows all published pages, selects explicit current states and excludes internal promotion',()=>{
 const page=parseEguesList(card('public','Trabajador social','En resolución')+card('internal','Promoción interna restringida','En resolución')+card('old','Archivo histórico','')+'<a class="next page-numbers" href="'+home+'page/2/">Siguiente</a>',home);
 assert.equal(page.items.length,1);assert.equal(page.next,home+'page/2/');
 assert.throws(()=>parseEguesList(card('a','Puesto','Abierta')+'<a class="next page-numbers" href="https://outside.test/page/2/">Next</a>',home));
});
test('Egues isolates native detail and preserves the published public-company employer and documentary phase',()=>{
 const item={url:home+'andacelay/',title:'Educador infantil en la Sociedad Mercantil Municipal Andacelay, S.L.',state:'En resolución'};
 const html='<main><h2>'+item.title+'</h2><div class="contenido content"><a href="/bases.pdf">Bases convocatoria</a><a href="/private.pdf">Resultados definitivos</a><a href="/form.pdf">Instancia</a></div></main>';
 const call=parseEguesDetail(html,item,now);assert.equal(call.organization,'Sociedad Mercantil Municipal Andacelay, S.L.');assert.equal(call.documents.length,1);assert.equal(call.status,'Cerrada');assert.deepEqual(call.acceptedQualifications,[]);assert.equal(call.province,'Navarra');
 enrichEguesBases(call,'ANEXO II.\nTEMARIO CONVOCATORIA SERVICIOS GENERALES\nTema 1 Condiciones mínimas de seguridad en los lugares de trabajo\nTema 2 Equipos de protección individual',call.documents[0].url);assert.equal(call.topics.length,2);
 assert.throws(()=>parseEguesDetail(html.replace('<h2>','<h1>'),item,now));
});
test('Egues excludes a staff-only provision procedure and retains public temporary recruitment alongside training lists',()=>{
 assert.equal(isRestrictedEguesBases('a) Ostentar la condición de personal fijo del Área de Bienestar Social del Ayuntamiento del Valle de Egüés.'),true);
 assert.equal(isRestrictedEguesBases('I.–FORMACIÓN. Personal fijo. II.–CONVOCATORIA PARA LA CONTRATACIÓN TEMPORAL.'),false);
});
