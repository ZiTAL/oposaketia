import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOsatekPosts,applyReviewedOsatekScan,enrichOsatekBases} from '../scripts/scrapers/osatek';
import reviews from '../scripts/reviews/osatek.json';
test('Osatek imports authorization notices, excluding candidate lists and selection panels',()=>{
  const a=(title:string,file:string)=>`<a href="/contenidos/informacion/osk_ostk_convocatoria_puestos/es_def/adjuntos/disposiciones/${file}.pdf">${title}</a>`;
  const html='<h1>Convocatoria de puestos</h1><div id="tab_item2697">'+a('Disposición de fecha 26 de enero de 2026 por la que se autoriza la convocatoria y se abre plazo en la categoría de MÉDICO/A RADIÓLOGO/A.','convocatoria')+a('Disposición por la que se aprueba la relación definitiva de aspirantes admitidos y excluidos','candidatos')+a('Disposición por la que se nombra al órgano de selección de la convocatoria','tribunal')+'</div><div id="tab_item5161">'+a('Disposición autorización convocatoria ampliación bolsa técnico manipulador','other-tab')+'</div>';
  const calls=parseOsatekPosts(html,'2026-11-18T00:00:00Z');assert.equal(calls.length,1);assert.equal(calls[0].organization,'Osatek');assert.equal(calls[0].status,'Pendiente de confirmar');assert.equal(calls[0].deadline,null);assert.equal(calls[0].province,null);assert.deepEqual(calls[0].acceptedQualifications,[]);assert.equal(calls[0].documents.length,1);assert.throws(()=>parseOsatekPosts('<h1>Unavailable</h1>','2026-11-18T00:00:00Z'));
});
test('Osatek specific requirements exclude nursing and languages listed only as merits',()=>{
 const review=reviews[0],html=`<h1>Convocatoria de puestos</h1><div id="tab_item2697"><a href="${review.url}">Disposición por la que se autoriza la convocatoria de técnico manipulador</a></div>`;
 const [call]=parseOsatekPosts(html,'2026-11-19T00:00:00Z');
 enrichOsatekBases(call,'c) Titulación: TER/TSIDyMN O EQUIVALENTE (Técnico Manipulador)\n\nd) No padecer enfermedad.\n\nMéritos: Grado en Enfermería. Euskera C1.','technical','https://www.osakidetza.euskadi.eus/bases.pdf');
 assert.deepEqual(call.acceptedQualifications,[]);assert.equal(call.language,null);assert.match(call.educationText,/TER\/TSIDyMN/);assert.doesNotMatch(call.educationText,/Enfermería/);
});
test('reviewed Osatek scans require an exact document checksum and separate qualification date from application deadline',()=>{
  const review=reviews[0],html=`<h1>Convocatoria de puestos</h1><div id="tab_item2697"><a href="${review.url}">Disposición por la que se autoriza la convocatoria de médico radiólogo</a></div>`;
  const [call]=parseOsatekPosts(html,'2026-11-18T00:00:00Z');
  assert.equal(applyReviewedOsatekScan(call,review.url,'0'.repeat(64),'2026-11-18T00:00:00Z'),false);assert.equal(call.deadline,null);
  assert.equal(applyReviewedOsatekScan(call,review.url,review.sha256,'2026-11-18T00:00:00Z'),true);assert.equal(call.deadline,'2026-12-31');assert.equal(call.status,'Abierta');assert.deepEqual(call.acceptedQualifications,['medicina']);assert.match(call.educationText,/Radiodiagnóstico/);assert.equal(call.province,null);
});
