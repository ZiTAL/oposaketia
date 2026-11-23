import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMunicipalGipuzkoa,isEmptyMunicipalSeat} from '../scripts/scrapers/municipal-gipuzkoa';
const now='2026-11-18T00:00:00.000Z';
const link=(host:string,code:string,title='Administrari plaza',process='6914')=>`<a href="https://${host}/WAS/CORP/LLEHautaketaProzesuakWEB/concursosAytos/${process}/0/${code}/ver">${title}</a>`;
test('municipal lists enforce the published seat and municipality and deduplicate seat aliases',()=>{
  const html=link('uzt.gipuzkoa.eus','9')+link('udal.egoitza.gipuzkoa.eus','9')+link('uzt.gipuzkoa.eus','40')+link('evil.example','9')+link('uzt.gipuzkoa.eus','9','Udaltzaingoa: zerbitzu eginkizunak','100');
  const calls=parseMunicipalGipuzkoa(html,'andoain',now);
  assert.equal(calls.length,1);assert.equal(calls[0].organization,'Ayuntamiento de Andoain');assert.equal(calls[0].province,'Gipuzkoa');
  assert.equal(calls[0].status,'Pendiente de confirmar');assert.equal(calls[0].deadline,null);assert.equal(calls[0].places,null);assert.deepEqual(calls[0].acceptedQualifications,[]);assert.deepEqual(calls[0].documents,[]);
  assert.equal(parseMunicipalGipuzkoa(link('uzt.gipuzkoa.eus','40'),'hernani',now)[0].organization,'Ayuntamiento de Hernani');
  assert.equal(parseMunicipalGipuzkoa(link('uzt.gipuzkoa.eus','61'),'orio',now)[0].location,'Orio');
  assert.deepEqual(parseMunicipalGipuzkoa(link('uzt.gipuzkoa.eus','62'),'orio',now),[]);
});
test('municipal seat relative links stay scoped to their published municipality',()=>{
  const root='https://uzt.gipuzkoa.eus/WAS/CORP/LLEHautaketaProzesuakWEB/concursosAytos/014?idioma=eu';
  const relative='<a href="/WAS/CORP/LLEHautaketaProzesuakWEB/concursosAytos/6115/0/14/ver">Gizarte laguntzailea</a>';
  assert.equal(parseMunicipalGipuzkoa(relative,'asteasu',now,root).length,1);
  assert.deepEqual(parseMunicipalGipuzkoa(relative,'arama',now,root),[]);
  assert.equal(parseMunicipalGipuzkoa(link('erakunde.egoitza.gipuzkoa.eus','8'),'amezketa',now).length,1);
});
test('empty municipal seats require the specific employment module and municipality identity',()=>{
  const html='<div class="textoAyuntamiento">ARAMA<span>Zerbitzu Telematikoak</span></div><div class="actualidad"><h2>ENPLEGU PUBLIKOAREN ESKAINTZA</h2><div class="panel-body noticiaHome"><p></p></div></div>';
  assert.equal(isEmptyMunicipalSeat(html,'arama'),true);assert.equal(isEmptyMunicipalSeat(html,'asteasu'),false);
  assert.equal(isEmptyMunicipalSeat(html.replace('<p></p>','<p>Connection error</p>'),'arama'),false);assert.equal(isEmptyMunicipalSeat('<h1>ARAMA</h1>','arama'),false);
});
