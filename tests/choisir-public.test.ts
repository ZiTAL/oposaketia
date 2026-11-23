import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChoisirDetail,scrapeChoisirPublic,CHOISIR_LIST} from '../scripts/scrapers/choisir-public';
const now='2026-11-18T00:00:00.000Z';
const detail=(town:string)=>`<main><h1>Gestionnaire administratif</h1><ul><li class="ic--user"><span class="sr-only">Employeur :</span> Service public<br>Présent à Pau, Bayonne et Anglet</li><li class="ic--pin"><span class="sr-only">Localisation :</span> Avenue de la gare 64100 ${town}</li></ul><p>Date limite de candidature : 04/12/2026</p><div class="block-table"><h3>Niveau d'études minimum requis</h3><span>Niveau 4 Baccalauréat</span></div></main>`;
test('Choisir uses the actual workplace rather than employer campus descriptions or broad structured geography',()=>{
  assert.equal(parseChoisirDetail(detail('Pau'),'https://choisirleservicepublic.gouv.fr/offre-emploi/test/',now),null);
  const call=parseChoisirDetail(detail('Bayonne'),'https://choisirleservicepublic.gouv.fr/offre-emploi/test/',now)!;
  assert.equal(call.organization,'Service public');assert.equal(call.province,'Lapurdi');assert.equal(call.status,'Abierta');assert.equal(call.deadline,'2026-12-04');assert.deepEqual(call.acceptedQualifications,['bac']);assert.deepEqual(call.documents,[]);
  const named=detail('Bayonne').replace('Gestionnaire administratif','Gestionnaire administratif - COMMUNE DE BAYONNE').replace('Service public','Communes');
  assert.equal(parseChoisirDetail(named,'https://choisirleservicepublic.gouv.fr/offre-emploi/test/',now)!.organization,'COMMUNE DE BAYONNE');
});
test('Choisir reads the full declared departmental result count and rejects repeated pages',async()=>{
  const offer=(id:string)=>`<div class="fr-card--offer"><h3><a href="/offre-emploi/${id}/">Poste</a></h3></div>`;
  const page=(ids:string[])=>`<div><input class="js-search-input" data-slug="locations" value="242" checked><label>Pyrénées Atlantiques</label></div><p class="focus-on-ajax">3 offres d'emploi trouvées</p>${ids.map(offer).join('')}<a href="${CHOISIR_LIST}page/2/">Dernière page</a>`;
  const warnings:string[]=[];
  const calls=await scrapeChoisirPublic({text:async url=>url===CHOISIR_LIST?page(['one','two']):url.includes('/page/2/')?page(['three']):detail(url.includes('/two/')?'Pau':'Bayonne')},now,message=>warnings.push(message));
  assert.equal(calls.length,2);assert.deepEqual(warnings,[]);
  await assert.rejects(()=>scrapeChoisirPublic({text:async()=>page(['one','two'])},now,()=>{}),/repeats|incomplete/i);
  await assert.rejects(()=>scrapeChoisirPublic({text:async()=>page(['one','two']).replace('Pyrénées Atlantiques','Landes')},now,()=>{}),/department/i);
});
