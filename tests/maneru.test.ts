import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseManeruPosts,applyReviewedManeruScan} from '../scripts/scrapers/maneru';
import reviews from '../scripts/reviews/maneru.json';
test('Mañeru accepts recent own hiring announcements, upgrades only published own document links and checks scan hashes',()=>{
 const review=reviews[1],post={id:8871,date:'2026-04-07T12:00:00',link:'https://www.xn--maeru-pta.es/peon-servicios-multiples-oferta-empleo/',title:{rendered:'Peón Servicios Múltiples. Oferta Empleo'},content:{protected:false,rendered:`<p>Oferta de Trabajo Ayuntamiento de Mañeru. Se abre convocatoria para la contratación temporal de un peón.</p><a href="${review.url.replace('https:','http:')}">Bando oferta empleo barrendero</a>`}};
 const calls=parseManeruPosts([post,{...post,id:1,title:{rendered:'Día de las mujeres rurales'}},{...post,id:2,date:'2019-01-01T00:00:00'}],'2026-11-19T00:00:00Z');assert.equal(calls.length,1);assert.equal(calls[0].documents[0].url,review.url);assert.equal(calls[0].deadline,null);
 assert.equal(applyReviewedManeruScan(calls[0],review.url,'0'.repeat(64),'2026-11-19T00:00:00Z'),false);
 assert.equal(applyReviewedManeruScan(calls[0],review.url,review.sha256,'2026-11-19T00:00:00Z'),true);assert.equal(calls[0].deadline,'2026-04-24');assert.equal(calls[0].status,'Cerrada');assert.deepEqual(calls[0].acceptedQualifications,[]);assert.equal(calls[0].province,'Navarra');
 assert.throws(()=>parseManeruPosts({error:'Unavailable'},'2026-11-19T00:00:00Z'));
});
