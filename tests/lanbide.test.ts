import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseLanbideList,parseLanbideDetail,enrichLanbideBolsas,LANBIDE_HOME} from '../scripts/scrapers/lanbide';
const html=`<div class="results__filter--type"><a class="current" href="javascript:cambiar_origen(3)">Empleo público</a></div><div class="result--offer--job"><h2><a href="javascript:ver_detalle('123')">Gestor web</a></h2><span itemprop="addressRegion">Bizkaia</span><p itemprop="description">Bolsa pública</p><span itemprop="datePosted">03/11/2026</span></div><a href="javascript:cambiar_pagina(2)">Siguiente</a>`;
test('Lanbide only accepts public result pages, resolves public detail GET requests and paginates by offset',()=>{
 const page=parseLanbideList(html);assert.equal(page.next,11);assert.equal(page.listings.length,1);assert.equal(page.listings[0].province,'Bizkaia');assert.equal(new URL(page.listings[0].url).searchParams.get('CTRG'),'3');
 assert.equal(parseLanbideList(html.replace('Bizkaia','Madrid')).listings.length,0);assert.throws(()=>parseLanbideList(html.replace('cambiar_origen(3)','cambiar_origen(1)')));
});
test('Lanbide keeps employer and missing eligibility unknown, and only enriches current own bolsas',()=>{
 const listing=parseLanbideList(html).listings[0];const now='2026-11-17T00:00:00.000Z';
 const detail=`<div class="offer--job"><h1 itemprop="title">Gestor web</h1><ul><li><b>Organismo:</b>Lanbide</li><li><b>Nº de puestos:</b>2</li></ul><div class="offer__info"><section class="offer__info__section--description"><h2>Descripción</h2><div>Bolsa pública</div></section><a href="${LANBIDE_HOME}">Más información</a></div></div>`;
 const call=parseLanbideDetail(detail,listing,now);assert.equal(call.organization,'Lanbide');assert.equal(call.status,'Pendiente de confirmar');assert.deepEqual(call.acceptedQualifications,[]);assert.equal(call.places,2);
 const other={...call,organization:'Ayuntamiento de Bilbao',documents:[...call.documents]};const old={...call,sourceUrl:call.sourceUrl+'&old=1',documents:[...call.documents]};
 enrichLanbideBolsas([call,other,old],'<body>El plazo para incribirse en las Bolsas es del 3 al 20 de noviembre de 2026</body>',now,new Map([[call.sourceUrl,'2026-11-03'],[old.sourceUrl,'2025-11-03']]));assert.equal(call.deadline,'2026-11-20');assert.equal(call.status,'Abierta');assert.equal(other.deadline,null);assert.equal(old.deadline,null);
});
