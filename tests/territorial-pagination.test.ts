import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scrapeEmploiTerritorial} from '../scripts/scrapers/emploi-territorial';
import {OfficialClient} from '../scripts/scrapers/http';
const now='2026-11-18T00:00:00.000Z';
const link=(id:string)=>`<a href="/offre/${id}">${id}</a>`;
const first='<input id="nb-offres" value="3">'+link('a')+link('b');
function detail(town:string){return `<h2 class="set-font-weight-bold">Agent</h2><div class="offre-item"><div class="offre-item-label">Employeur</div><div class="offre-item-value">Commune</div></div><div class="offre-item"><div class="offre-item-label">Lieu de travail</div><div class="offre-item-value">1 rue Exemple, ${town} (Pyrénées-Atlantiques (64))</div></div>`;}
test('department search reads every page before filtering actual Iparralde workplaces',async()=>{
 const pages:number[]=[];
 const client={territorialSearchPage:async(page=1)=>{pages.push(page);return page===1?first:link('c');},text:async(url:string)=>detail(url.endsWith('/b')?'Pau':'Bayonne')};
 const calls=await scrapeEmploiTerritorial(client,now,()=>{});
 assert.deepEqual(pages,[1,2]);assert.equal(calls.length,2);assert.ok(calls.every(call=>call.province==='Lapurdi'));
});
test('department search rejects repeated or incomplete result pages',async()=>{
 const repeated={territorialSearchPage:async()=>first,text:async()=>detail('Bayonne')};
 await assert.rejects(scrapeEmploiTerritorial(repeated,now,()=>{}),/répète/);
 const incomplete={territorialSearchPage:async(page=1)=>page===1?first.replace('value="3"','value="4"'):link('c'),text:async()=>detail('Bayonne')};
 await assert.rejects(scrapeEmploiTerritorial(incomplete,now,()=>{}),/incomplète/);
});
test('anonymous search page API cannot submit arbitrary forms or unbounded page numbers',async()=>{
 const client=new OfficialClient('/tmp/oposaketia-public-search-test');
 try{for(const page of [0,-1,1.5,101])await assert.rejects(client.territorialSearchPage(page),/Invalid public search page/);}finally{await client.close();}
});
