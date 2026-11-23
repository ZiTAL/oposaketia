import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frenchDate, parseCapbList } from '../scripts/scrapers/capb';

test('CAPB parses French dates and rejects impossible dates', () => {
  assert.equal(frenchDate('Date limite : 21 nov. 2026'), '2026-11-21');
  assert.equal(frenchDate('31 février 2026'), null);
  assert.equal(frenchDate('inconnue'), null);
});

test('CAPB excludes unsolicited applications and preserves unknown requirements and locations', () => {
  const card = (href:string, location:string) => `<article class="offres"><h2><a href="/linstitution/nos-offres-demploi/offres-demploi-et-stages/${href}">Agent technique</a></h2><p class="adresse"><span class="bold">Localisation :</span>${location}</p><p class="picto_date">Date limite : 21 nov. 2026</p><p class="grade"><span class="bold">Catégorie :</span>C</p></article>`;
  const calls = parseCapbList(card('agent','Mauléon-Licharre') + card('autre','Territoire non précisé') + card('candidature-spontanee','Bayonne'), '2026-11-17T00:00:00.000Z');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].province, 'Zuberoa');
  assert.equal(calls[0].deadline, '2026-11-21');
  assert.equal(calls[0].status, 'Abierta');
  assert.equal(calls[1].province, null);
  assert.deepEqual(calls[0].acceptedQualifications, []);
  assert.deepEqual(calls[0].topics, []);
  assert.equal(parseCapbList(card('agent','Bayonne'), '2026-11-22T00:00:00.000Z')[0].status,'Cerrada');
});
