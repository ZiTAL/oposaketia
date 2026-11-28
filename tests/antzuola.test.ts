import test from 'node:test';
import assert from 'node:assert/strict';
import {ANTZUOLA_PAGE,parseAntzuolaArticle,parseAntzuolaIndex,parseAntzuolaNotice} from '../scripts/scrapers/antzuola';

const youthUrl=`${ANTZUOLA_PAGE}/830-bandoa-hiru-gazte-kontratatzea-bi-administrari-eta-kale-garbiketarako-peoi-bat`;
const cleanerUrl=`${ANTZUOLA_PAGE}/832-bandoa-udal-eraikinetarako-garbitzaile-bat-behar-da`;
const index=`<a href="${youthUrl}">BANDOA: HIRU GAZTE KONTRATATZEA</a><a href="${cleanerUrl}">BANDOA: UDAL ERAIKINETARAKO GARBITZAILE BAT BEHAR DA</a>`;
const youthPdf='Antzuolako Udalak hiru gazte kontratatuko ditu 12 hilabetez. Administraria (2). Kale-garbiketarako peoia (1). 16 urtetik gora eta 30 urtetik behera. Gazte Bermearen Sisteman izena emanda egotea. Administraria: erdi- edo goi-mailako heziketa-zikloa edo batxilergoa; 3. hizkuntza-eskakizuna (C1). Peoia: Oinarrizko Lanbide Heziketa, profesionaltasun-ziurtagiria edo DBH; 1. hizkuntza-eskakizuna (B1); B gidabaimena. 2026ko azaroaren 13a baino lehen.';
const cleanerPdf='Antzuolako Udalak garbitzaile bat kontratatu behar du, aldi baterako. Baldintza: euskaraz jakitea. Interesa dutenek azaroaren 6ra arte aurkeztu beharko dute CVa. Antzuolan, 2026ko azaroaren 4an.';
const now='2026-11-28T05:20:00Z',sha='a'.repeat(64);

test('Antzuola keeps two official notices bound to their own municipal PDFs',()=>{
  const [youth,cleaner]=parseAntzuolaIndex(index);
  const youthDocument=parseAntzuolaArticle(`<main><h1>HIRU GAZTE KONTRATATZEA</h1><a href="/attachments/article/830/BANDOA%20Hiru%20gazte%20kontratatzea.pdf">PDF</a></main>`,youth);
  const cleanerDocument=parseAntzuolaArticle(`<main><h1>UDAL ERAIKINETARAKO GARBITZAILE BAT BEHAR DA</h1><a href="/attachments/article/832/UDAL%20ERAIKINETARAKO%20GARBITZAILE%20BAT%20BEHAR%20DA.pdf">PDF</a></main>`,cleaner);
  const calls=[...parseAntzuolaNotice(youth,youthDocument,youthPdf,sha,now),...parseAntzuolaNotice(cleaner,cleanerDocument,cleanerPdf,sha,now)];
  assert.equal(calls.length,3);
  assert.deepEqual(calls.map(call=>call.places),[2,1,1]);
  assert.deepEqual(calls.map(call=>call.deadline),['2026-11-13','2026-11-13','2026-11-06']);
  assert.ok(calls.every(call=>call.status==='Cerrada'&&call.topics.length===0));
  assert.deepEqual(calls.map(call=>call.language?.level),['C1','B1',undefined]);
  assert.equal(calls[2].languageStatus,'unknown');
  assert.throws(()=>parseAntzuolaNotice(youth,youthDocument,youthPdf.replace('Administraria (2)','Administraria (3)'),sha,now));
  assert.throws(()=>parseAntzuolaNotice(cleaner,cleanerDocument,cleanerPdf.replace('2026ko azaroaren 4an','2025eko azaroaren 4an'),sha,now));
  assert.throws(()=>parseAntzuolaArticle('<main><h1>HIRU GAZTE KONTRATATZEA</h1><a href="https://example.com/attachments/article/830/BANDOA%20Hiru%20gazte%20kontratatzea.pdf">PDF</a></main>',youth));
});
