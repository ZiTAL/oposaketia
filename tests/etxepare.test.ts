import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEtxepareBases,parseEtxepareNews,parseEtxeparePage} from '../scripts/scrapers/etxepare';

const now='2026-11-24T09:00:00.000Z';
const news=`<h1>Hiru lanpostu hautatzeko prozedura</h1><p>Hautagaitzak aurkezteko epea 2024ko urtarrilaren 18ra arte.</p><p>Ikus-entzunezkoak, irudia eta multimedia. Telekomunikazioak eta Informatika Sistemak. Eskola-graduatua, DBH.</p><a href="/eu/komunikazio-digitaleko-teknikaria">Digitala</a><a href="/eu/sistemen-teknikaria">Sistemak</a><a href="/eu/administrari-laguntzailea">Administraria</a>`;

test('Etxepare binds three news links to their own BOPV specific bases',()=>{
 const entries=parseEtxepareNews(news);
 assert.deepEqual(entries.map(item=>item.key),['digital','systems','admin']);
 const detail=`<h1>Komunikazio digitaleko teknikaria</h1><p>Aurkezteko azken eguna: 2024-01-18</p><a href="https://www.euskadi.eus/web01-bopv/eu/bopv2/datos/2023/12/2305774e.shtml">Oinarri espezifikoak</a>`;
 const listing=parseEtxeparePage('digital',entries[0].pageUrl,detail);
 assert.equal(listing.bopvUrl,'https://www.euskadi.eus/web01-bopv/eu/bopv2/datos/2023/12/2305774e.shtml');
 assert.throws(()=>parseEtxeparePage('digital',entries[0].pageUrl,detail.replace('2305774e.shtml','2305775e.shtml')));
 assert.throws(()=>parseEtxepareNews(news.replace('2024ko urtarrilaren 18ra','2024ko urtarrilaren 19ra')));
});

test('Etxepare keeps the closed deadline and links the syllabus PDF without claiming it was downloaded',()=>{
 const pageUrl='https://www.etxepare.eus/eu/komunikazio-digitaleko-teknikaria';
 const listing={key:'digital' as const,pageUrl,bopvUrl:'https://www.euskadi.eus/web01-bopv/eu/bopv2/datos/2023/12/2305774e.shtml',pdfUrl:'https://www.euskadi.eus/web01-bopv/eu/bopv2/datos/2023/12/2305774e.pdf'};
 const html=`<p>Oinarri espezifikoak Etxepare Euskal Institutua Kodea: EL08. Hautaketa-sistema: txanda irekia. Oposizio-lehiaketaren sistema. Euskararen 4. hizkuntza-eskakizuna. Ingelesa (C1). Lantokia: Donostian.</p>`;
 const call=parseEtxepareBases(listing,html,now);
 assert.equal(call.status,'Cerrada');assert.equal(call.deadline,'2024-01-18');
 assert.equal(call.province,'Gipuzkoa');assert.deepEqual(call.language,{name:'euskera',level:'C2'});
 assert.equal(call.syllabusUrl,listing.pdfUrl);assert.deepEqual(call.topics,[]);
 assert.equal(call.documents[0].checkedAt,now);assert.equal(call.documents[1].checkedAt,null);
 assert.equal(call.documents[1].sha256,null);
 assert.throws(()=>parseEtxepareBases(listing,html.replace('EL08','EL09'),now));
});
