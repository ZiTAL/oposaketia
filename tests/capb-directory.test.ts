import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCapbMunicipalWebsite} from '../scripts/scrapers/capb-directory';

test('CAPB website extraction checks the commune and ignores unrelated links and personal contact fields',()=>{
  const html='<h1>Ahetze</h1><a href="https://maps.example.org/">Directions</a><p class="mail"><a href="mailto:mairie@example.org">Email</a></p><p class="picto_site_internet"><a href="https://www.ahetze.fr/">Site internet</a></p>';
  assert.equal(parseCapbMunicipalWebsite(html,'Ahetze'),'https://www.ahetze.fr/');
  assert.throws(()=>parseCapbMunicipalWebsite(html,'Anglet'));
  assert.equal(parseCapbMunicipalWebsite('<h1>Ahetze</h1><a href="https://maps.example.org/">Directions</a>','Ahetze'),null);
  assert.throws(()=>parseCapbMunicipalWebsite('<h1>Ahetze</h1><p class="picto_site_internet"><a href="javascript:alert(1)">Site</a></p>','Ahetze'));
});
