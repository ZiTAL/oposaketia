import { test } from 'node:test';
import assert from 'node:assert/strict';
import {parseTracasaDetail} from '../scripts/scrapers/tracasa';
import {parseUppaList} from '../scripts/scrapers/uppa';
import {parseChcbList} from '../scripts/scrapers/chcb';
const now='2026-11-17T00:00:00.000Z';
test('Tracasa requires a real JobPosting in Navarra and never infers education from the job title',()=>{
  const job={'@type':'JobPosting',title:'Ingeniero/a',hiringOrganization:{name:'Tracasa'},jobLocation:{address:{addressLocality:'Pamplona/Iruña',addressRegion:'Navarra'}}};
  const html=`<script type="application/ld+json">${JSON.stringify(job)}</script><h3 class="kt-infobox__subtitle">Requisitos</h3><div><p>FP de grado superior</p><p>Experiencia en datos</p></div>`;
  const call=parseTracasaDetail(html,'https://tracasa.viterbit.site/test/',now);
  assert.deepEqual(call.acceptedQualifications,['fp-superior']);assert.equal(call.deadline,null);assert.equal(call.province,'Navarra');
  assert.throws(()=>parseTracasaDetail(html.replace('Navarra','Madrid'),'https://tracasa.viterbit.site/test/',now));
  assert.throws(()=>parseTracasaDetail('<h1>Ingeniero</h1>','https://tracasa.viterbit.site/test/',now));
});
test('hospital parser imports competition notices but excludes result-only blocks and candidate lists',()=>{
  const html='<div class="mise_en_avant"><h2>Concours de Psychologue</h2><a href="/avis.pdf">Avis de concours</a><a href="/dossier.pdf">Dossier de candidature</a><a href="/resultats.pdf">Résultats nominaux</a></div><div class="mise_en_avant"><h2>Concours administratif</h2><a href="/resultats-autre.pdf">Résultats</a></div>';
  const calls=parseChcbList(html,now);
  assert.equal(calls.length,1);assert.equal(calls[0].documents.length,2);assert.equal(calls[0].province,null);assert.equal(calls[0].deadline,null);assert.deepEqual(calls[0].acceptedQualifications,[]);
});

test('UPPA imports only explicit Bayonne or Anglet campuses and reads the French closing date',()=>{
  const card=(id:number,campus:string)=>`<div class="well" id="offre_${id}"><h3>Project Manager</h3><dl><dt>Structure de rattachement</dt><dd>${campus}</dd><dt>Candidatures ouvertes</dt><dd>du 13 novembre 2026 au 7 décembre 2026</dd></dl><a href="/${id}/fichier_offre/">télécharger</a></div>`;
  const calls=parseUppaList('<div id="liste_offres">'+card(1,'Collège EEI _ Site de Bayonne')+card(2,'Campus de Pau')+'</div>',now);
  assert.equal(calls.length,1);assert.equal(calls[0].province,'Lapurdi');assert.equal(calls[0].deadline,'2026-12-07');assert.deepEqual(calls[0].acceptedQualifications,[]);
});
