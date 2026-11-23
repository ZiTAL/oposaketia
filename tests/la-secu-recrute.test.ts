import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSecuSearch,parseSecuVacancy} from '../scripts/scrapers/la-secu-recrute';
const now='2026-11-18T00:00:00Z';
const url='https://www.lasecurecrute.fr/offre-emploi/gestionnaire/nouvelle-aquitaine/1087951';
test('Sécu search checks the region and complete count before filtering actual workplace',()=>{
 const card=(town:string,n:number)=>`<article class="carte-offre" id="offre_${n}"><header><a href="${url+n}"><h3>Gestionnaire</h3><h4>CPAM BAYONNE</h4></a></header><span class="ico-localisation"><span class="sr-only">Localisation</span> ${town}</span></article>`;
 const html='<input type="checkbox" id="check-region-75" value="75" checked><label for="check-region-75">Nouvelle Aquitaine</label><h2>2 offres d’emploi d’après vos critères</h2>'+card('BAYONNE',1)+card('PAU',2);
 const result=parseSecuSearch(html);assert.equal(result.length,1);assert.equal(result[0].town,'Bayonne');
 assert.throws(()=>parseSecuSearch(html.replace('2 offres','3 offres')));assert.throws(()=>parseSecuSearch(html.replace(' checked','')));
});
test('Sécu uses the offer workplace and deadline, excludes related cards and retains Bac+2 as published',()=>{
 const listing={url,title:'Gestionnaire',organization:'CPAM BAYONNE',town:'Bayonne'};
 const job={'@type':'JobPosting',title:'Gestionnaire',hiringOrganization:{name:'CPAM BAYONNE'},jobLocation:{address:{addressLocality:'BAYONNE',addressCountry:'FR'}},validThrough:'2026-11-26T00:00',datePosted:'2026-11-18T00:00'};
 const html=`<script type="application/ld+json">${JSON.stringify(job)}</script><h1>Gestionnaire</h1><div class="details"><h3>Votre formation</h3><p>BAC+2 à minima</p><h2>Informations complémentaires</h2><p>Related vacancy: licence en droit</p></div>`;
 const call=parseSecuVacancy(html,listing,now);assert.equal(call.deadline,'2026-11-26');assert.equal(call.status,'Abierta');assert.equal(call.province,'Lapurdi');assert.equal(call.educationText,'BAC+2 à minima');assert.deepEqual(call.acceptedQualifications,[]);assert.deepEqual(call.topics,[]);assert.equal(call.language,null);
 assert.throws(()=>parseSecuVacancy(html.replace('"addressLocality":"BAYONNE"','"addressLocality":"PAU"'),listing,now));
 assert.deepEqual(parseSecuVacancy(html.replace('BAC+2 à minima','Diplôme d’État de Docteur en Médecine'),listing,now).acceptedQualifications,['medicina']);
 assert.deepEqual(parseSecuVacancy(html.replace('BAC+2 à minima','Formation Bac+2, ou niveau Bac avec une expérience professionnelle confirmée.'),listing,now).acceptedQualifications,['bac']);
});
