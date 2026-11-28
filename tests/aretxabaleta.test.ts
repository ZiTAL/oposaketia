import test from 'node:test';
import assert from 'node:assert/strict';
import {ARETXABALETA_PAGE,parseAretxabaletaBases,parseAretxabaletaDetail,parseAretxabaletaIndex} from '../scripts/scrapers/aretxabaleta';

const libraryUrl=`${ARETXABALETA_PAGE}/liburutegiko-laguntzailea-egun-1-2-kontratatzeko-deialdia-1`;
const workersUrl=`${ARETXABALETA_PAGE}/2-peoi-kontratatzeko-deialdia-6`;
const row=(id:string,title:string,url:string)=>`<tr><td>${id}</td><td><a href="${url}">${title}</a></td><td>2026/11/24</td><td>2026/11/30</td></tr>`;
const index=`<div id="content-core"><div id="tab-0"><table>${row('2026ILAE0019','Liburutegiko laguntzailea egun ½ kontratatzeko deialdia',libraryUrl)}${row('2026ILAE0018','2 peoi kontratatzeko deialdia',workersUrl)}</table></div></div>`;
const detail=(id:string,pdf:string,info:string)=>`<div id="content-core"><h2 id="file-number">Expediente zenbakia: ${id}</h2><dl class="contract-dates">Azken eguna 2026/11/30</dl><dd class="info">${info}</dd><dl class="contract-files"><a href="${pdf}">Oinarriak</a></dl></div>`;
const libraryPdf=`${libraryUrl}/oinarriak_liburutegiko-laguntzailea.pdf/@@download/file/Oinarriak_liburutegiko%20laguntzailea.pdf`;
const workersPdf=`${workersUrl}/oinarriak_peoiak.pdf/@@download/file/Oinarriak_peoiak.pdf`;
const common='ARETXABALETAKO UDALA. Lehiaketa bidez. Bailaran erroldatuta egotea. Lanbiden izena eman beharko da 2026ko azaroaren 30erako.';

test('Aretxabaleta binds the two verified municipal calls to their own bases',()=>{
  const [library,workers]=parseAretxabaletaIndex(index);
  const first=parseAretxabaletaDetail(detail(library.id,libraryPdf,'Liburutegiko laguntzailea egun ½ kontratatzeko deialdia'),library);
  const second=parseAretxabaletaDetail(detail(workers.id,workersPdf,'2 peoi kontratatzeko deialdia'),workers);
  const a=parseAretxabaletaBases(library,first,`${common} liburutegiko laguntzaile bat. Titulazioa: Batxilergoa edo teknikoa. Euskarako 3.Hizkuntza eskakizuna. C1 hizkuntza eskakizunaren egiaztagiria.`, 'a'.repeat(64),'2026-11-28T07:18:00Z');
  const b=parseAretxabaletaBases(workers,second,`${common} bi peoi kontratatuko ditu. Euskarako lehen hizkuntza eskakizuna edo handiagoa izateagatik 5 puntu.`, 'b'.repeat(64),'2026-11-28T07:18:00Z');
  assert.deepEqual([a.places,b.places],[1,2]);
  assert.deepEqual([a.status,b.status],['Abierta','Abierta']);
  assert.deepEqual(a.acceptedQualifications,['bachiller']);
  assert.deepEqual(b.acceptedQualifications,[]);
  assert.equal(b.languageStatus,'unknown');
  assert.ok(a.documents[0].url.includes('liburutegiko'));
  assert.equal(parseAretxabaletaBases(library,first,`${common} liburutegiko laguntzaile bat. Titulazioa: Batxilergoa edo teknikoa. Euskarako 3.Hizkuntza eskakizuna. C1 hizkuntza eskakizunaren egiaztagiria.`, 'a'.repeat(64),'2026-12-01T00:00:00Z').status,'Cerrada');
  assert.throws(()=>parseAretxabaletaIndex(index.replace('2026ILAE0018','2026ILAE0017')));
  assert.throws(()=>parseAretxabaletaDetail(detail(library.id,workersPdf,'Liburutegiko laguntzailea egun ½ kontratatzeko deialdia'),library));
  assert.throws(()=>parseAretxabaletaBases(workers,second,common,'b'.repeat(64),'2026-11-28T07:18:00Z'));
});
