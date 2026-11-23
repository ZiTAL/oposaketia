import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseIvapDetail,type IvapListing} from '../scripts/scrapers/ivap';
const now='2026-11-20T16:00:00.000Z';
const listing:IvapListing={title:'Organizador/a de eventos agroalimentarios',url:'https://www.ivap.euskadi.eus/empleo_publico/eventos/webivap00-a3lanesk/es/',summary:'Oferta publicada en el IVAP',places:1,deadline:'2026-12-01',open:true,documents:[]};
test('IVAP uses native job and employer fields instead of navigation headings or a default government employer',()=>{
 const row=(key:string,value:string)=>`<div class="bloqueInfo"><div class="cabecera">${key}:</div><div class="info">${value}</div></div>`;
 const html='<h1 class="pageTitle"></h1><h2>Menú de empleo</h2><h2>Servicios más visitados</h2>'+row('Plaza',listing.title)+row('¿Quién oferta?','FUNDACIÓN HAZI FUNDAZIOA')+row('Titulación','Grado en Administración y Dirección de Empresas')+row('Perfil lingüístico','Euskera C1 e inglés C1')+'<a href="https://hazi.eus/bases.pdf">Bases de la convocatoria</a>';
 const call=parseIvapDetail(html,listing,now);
 assert.equal(call.title,listing.title);assert.equal(call.organization,'FUNDACIÓN HAZI FUNDAZIOA');
 assert.deepEqual(call.acceptedQualifications,['ade']);assert.equal(call.province,null);
 assert.equal(call.languageStatus,'unknown');assert.equal(call.language,null);
 assert.equal(call.requirements.includes('Euskera C1 e inglés C1'),true);
 assert.equal(call.documents[0].kind,'bases');assert.equal(call.documents[0].checkedAt,null);
});
test('IVAP falls back to the published listing title and keeps unknown employers and language requirements unknown',()=>{
 const call=parseIvapDetail('<h2>Menú de empleo</h2><h3>Información general</h3>',listing,now);
 assert.equal(call.title,listing.title);assert.equal(call.organization,'Consultar organismo convocante');
 assert.equal(call.languageStatus,'unknown');
});
