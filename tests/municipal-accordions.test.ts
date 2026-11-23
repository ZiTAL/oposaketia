import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseMunicipalAccordions,enrichAccordionBon} from '../scripts/scrapers/municipal-accordions';
import {educationIds} from '../scripts/scrapers/shared';
const now='2026-11-19T00:00:00Z';
const block=(id:string,title:string,body:string)=>`<div class="bloque"><a class="bloque-tab" href="#${id}">${title}</a><div class="contenido-bloque" id="${id}">${body}</div></div>`;
test('municipal bases recognize dotted E.S.O. as an explicit education requirement',()=>{
 assert.deepEqual(educationIds('Título Graduado en E.S.O, Formación Profesional de Grado Medio o equivalente'),['eso','fp-medio']);
});
test('municipal accordions isolate each process, exclude transfers and candidate documents, and preserve absolute deadlines',()=>{
 const html='<h1>Empleo Público</h1><div class="contenido content"><h2>PROCESOS EN CURSO</h2>'+block('a','Educador/a infantil','<a href="/bases.pdf">CONVOCATORIA Relación temporal Educadora</a><a href="/candidates.pdf">Lista definitiva personas admitidas</a><strong>Fin plazo presentación de solicitudes: 11/09/2026.</strong>')+block('b','Concurso traslado de una plaza de conserje','<a href="/other.pdf">Bases</a>')+'<h2>PROCESOS CERRADOS</h2>'+block('c','Oficial administrativo','<a href="/old.pdf">Convocatoria</a>')+'</div>';
 const calls=parseMunicipalAccordions(html,'estella',now);assert.equal(calls.length,2);assert.equal(calls[0].deadline,'2026-09-11');assert.equal(calls[0].status,'Cerrada');assert.equal(calls[1].status,'Cerrada');assert.equal(calls[0].documents.length,1);assert.match(calls[0].documents[0].url,/bases.pdf$/);assert.equal(calls[0].province,'Navarra');assert.deepEqual(calls[0].acceptedQualifications,[]);
});
test('Baztan keeps Basque bases links and process phases without treating merits or annex forms as requirements',()=>{
 const html='<div class="contenido content"><p>✔ AKTIBOAK</p>'+block('2','Deialdia, Zuzenbideko lizentziadunaren plaza bat','<a href="https://bon.navarra.es/eu/iragarkia/-/texto/2026/159/18">Deialdiaren oinarriak</a><a href="/form.pdf">I-Eranskina</a><a href="/private.pdf">Behin-behineko onartuen eta baztertuen zerrenda</a>')+'</div>';
 const [call]=parseMunicipalAccordions(html,'baztan',now);assert.equal(call.status,'En curso');assert.equal(call.documents.length,1);assert.equal(call.languageStatus,'unknown');assert.deepEqual(call.acceptedQualifications,[]);assert.equal(call.places,null);
 assert.throws(()=>parseMunicipalAccordions('<h1>Error</h1>','baztan',now));
 const paragraphs=['OINARRIAK','1.–Arau orokorrak.','2.–Izangaiek bete beharreko baldintzak.','c) Zuzenbideko gradua edo lizentzia edukitzea, edo horien baliokidetzat jotzen den beste titulu bat.','e) Euskara jakitea. Euskaraz dakiela frogatzeko, C1 mailaren titulua aurkeztu beharko du.','3.–Eskabideak.','II. ERANSKINA.–GAI-ZERRENDA','1.–Espainiako 1978ko Konstituzioa.','III. ERANSKINA.–KONTRATAZIO ZERRENDAK','1.–Hurrenkera eta kontratazio arauak.'];
 enrichAccordionBon(call,paragraphs.map(p=>`<p class="foral-normal">${p}</p>`).join(''),call.documents[0].url);assert.deepEqual(call.acceptedQualifications,['derecho']);assert.deepEqual(call.language,{name:'euskera',level:'C1'});assert.equal(call.topics.length,1);
});
