import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArkauteDetail,enrichArkauteBases} from '../scripts/scrapers/arkaute';
import reviews from '../scripts/reviews/arkaute.json';
const now='2026-11-19T00:00:00Z';
const field=(label:string,text:string)=>`<div class="r01gContentTabSeccion"><div class="r01gContentSeccionTitulo">${label}</div><div class="r01gContentSeccionTexto">${text}</div></div>`;
const url='https://arkauteakademiamuseoa.euskadi.eus/contenidos/empleo_publico/conjunta/es_def/index.shtml';
const row={physicalUrl:url,documentName:'Título antiguo',rrhhSponsor:'Academia Vasca de Policía y Emergencias',rrhhStartDate:'30/10/2026',rrhhEndDate:'26/11/2026',rrhhTerritory:'',territory:''};
test('Arkaute reads a published increase and avoids retaining the stale initial vacancy count',()=>{
 const html=field('¿Quién oferta?:',row.rrhhSponsor)+field('Plaza:','Agente de la Ertzaintza')+field('Nº Plazas:','150')+field('Bases:','<a href="/increase.pdf">Ampliación del número de plazas convocadas</a>');
 const call=parseArkauteDetail(html,row,now);assert.equal(call.places,null);assert.equal(call.documents.length,1);
 enrichArkauteBases(call,'Calendario orientativo',call.documents[0].url,'hash');assert.equal(call.places,null);
 enrichArkauteBases(call,'Se convocaron 150 plazas.\nLEHENENGOA.- 177 plaza gehitzea     PRIMERO.- Incrementar en 177 plazas el\n2025eko azaroaren 3ko Ebazpenaren    número de las convocadas en el\nprocedimiento selectivo.',call.documents[0].url,'hash');
 assert.equal(call.places,327);assert.equal(call.deadline,'2026-11-26');assert.match(call.requirements[0],/327 plazas en total/);
});
test('Arkaute requires published regional scope and uses the actual job fields instead of the website brand',()=>{
 const html='<h1>Museo de la Policía Vasca</h1>'+field('¿Quién oferta?:',row.rrhhSponsor)+field('Plaza:','Agente de los Cuerpos de Policía del País Vasco, Ertzaintza y Policía Local')+field('Nº Plazas:','593. (430 Ertzaintza y 163 Policía Local)')+field('Titulación:','Título de Bachiller o equivalente')+field('Perfil lingüístico:','344 plazas con fecha vencida, 86 sin fecha de preceptividad. Perfil 1 de la Ertzaintza.')+field('Bases:','<a href="/bases.pdf">Bases convocatoria</a><a href="/candidates.pdf">Listas de admitidos</a>');
 const call=parseArkauteDetail(html,row,now);assert.match(call.title,/Cuerpos de Policía/);assert.equal(call.places,593);assert.equal(call.status,'Abierta');assert.equal(call.deadline,'2026-11-26');assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.province,null);assert.equal(call.language,null);assert.equal(call.documents.length,1);
 assert.throws(()=>parseArkauteDetail(html,{...row,territory:'Navarra'},now));
 assert.throws(()=>parseArkauteDetail(html.replace('Agente de los Cuerpos de Policía del País Vasco, Ertzaintza y Policía Local','Administrativo'),row,now));
});
test('Arkaute derives interim-pool scope from its published legal duties and keeps language merits separate',()=>{
 const html=field('¿Quién oferta?:',row.rrhhSponsor)+field('Plaza:','Bolsa de Agentes interinos de Policía Local')+field('Funciones y tareas:','Las funciones establecidas en la Ley de Policía del País Vasco.')+field('Titulación:','Título de Bachiller');
 const call=parseArkauteDetail(html,row,now);assert.equal(call.territory,'Euskadi');
 enrichArkauteBases(call,'TEMARIO\n1.–La Constitución Española y los derechos fundamentales.','https://arkauteakademiamuseoa.euskadi.eus/bases.pdf','unknown-checksum');assert.equal(call.topics.length,1);assert.equal(call.language,null);assert.equal(call.languageStatus,'unknown');
 const review=reviews[0];enrichArkauteBases(call,'',review.url,review.sha256);assert.equal(call.languageStatus,'unknown');
 call.sourceHash=review.fichaSha256;enrichArkauteBases(call,'',review.url,review.sha256);assert.equal(call.language,null);assert.equal(call.languageStatus,'known');assert.match(call.requirements[0],/mérito/);
});
