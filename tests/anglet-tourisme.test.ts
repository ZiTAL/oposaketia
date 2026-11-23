import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAngletJobs} from '../scripts/scrapers/anglet-tourisme';
const now='2026-11-23T10:00:00.000Z';
const section=(heading:string,pdf:string,closed=true)=>`<div><h2>${heading}</h2><p>${closed?'Le poste a été pourvu, le recrutement est désormais clos.':''} Poste basé à Anglet, Côte basque. Candidature avant le 22/08/2025.</p><a href="http://espace-pro.anglet-tourisme.com/uploads/2025/08/${pdf}">à télécharger</a></div>`;
test('Anglet tourism keeps only visually reviewed own closed offers and published dates',()=>{
 const html='<h1>Anglet Côte Basque recrute</h1>'+section("POSTE D'ATTACHÉ(E) COMMERCIAL(E)",'Attache_Commercial_OTANGLET.pdf');
 const call=parseAngletJobs(html,now)[0];assert.equal(call.province,'Lapurdi');assert.equal(call.deadline,'2025-08-22');assert.equal(call.status,'Cerrada');assert.deepEqual(call.acceptedQualifications,[]);assert.equal(call.documents[0].url.startsWith('https://'),true);
 assert.throws(()=>parseAngletJobs(html.replace('Attache_Commercial_OTANGLET.pdf','unknown.pdf'),now));
 assert.throws(()=>parseAngletJobs(html.replace('Poste basé à Anglet','Poste basé à Pau'),now));
 assert.throws(()=>parseAngletJobs(html.replace('Le poste a été pourvu, le recrutement est désormais clos.',''),now));
 assert.throws(()=>parseAngletJobs(html.replace('espace-pro.anglet-tourisme.com','evil.example'),now));
});
