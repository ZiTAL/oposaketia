import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iparraldeProvince,iparraldeWorkplaceTown} from '../scripts/iparralde-geography';

test('Iparralde workplaces require an actual commune rather than a departmental name or an employer office list',()=>{
  assert.equal(iparraldeWorkplaceTown('Avenue de la gare, 64100 Bayonne'),'Bayonne');
  assert.equal(iparraldeWorkplaceTown('64100 BAYONNE CEDEX 4'),'Bayonne');
  assert.equal(iparraldeWorkplaceTown('Rectorat de Bordeaux, campus de Pau, Anglet et Bayonne'),null);
  assert.equal(iparraldeWorkplaceTown('Pyrénées Atlantiques (64), France'),null);
  assert.equal(iparraldeWorkplaceTown('64000 Pau'),null);
  assert.equal(iparraldeProvince('Pau'),null);
  assert.equal(iparraldeProvince('Ciboure'),'Lapurdi');
  assert.equal(iparraldeProvince('Saint-Jean-Pied-de-Port'),'Baja Navarra');
  assert.equal(iparraldeProvince('Tardets-Sorholus'),'Zuberoa');
  assert.equal(iparraldeProvince('Lichos'),null);
  assert.equal(iparraldeProvince('Sames'),null);
});
