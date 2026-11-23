import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDataset,parseEuskadiDetail} from '../scripts/scrapers/euskadi';
const now='2026-11-20T00:00:00Z',since='2026-08-22';
const row={documentName:'Convocatoria de auxiliar',physicalUrl:'https://www.gazteaukera.euskadi.eus/empleo-fixture',rrhhSponsor:'Organismo público',rrhhStartDate:'01/11/2026',rrhhEndDate:'30/11/2026',rrhhTerritory:'',territory:'',territorycode:'',municipality:''};
const html=(fields:Record<string,string>)=>'<h3>Convocatoria de auxiliar</h3>'+Object.entries(fields).map(([key,value])=>`<div class="bloqueInfo"><div class="cabecera">${key}</div><div class="info">${value}</div></div>`).join('');
test('Euskadi detail review considers only undeclared recent scopes, preserves default filtering and leaves Academy mirrors to their primary connector',()=>{
 const missing={...row},foreign={...row,rrhhTerritory:'Madrid'},conflicting={...row,rrhhTerritory:'Euskadi y Navarra'},old={...row,rrhhStartDate:'01/01/2024',rrhhEndDate:'30/01/2024'},academy={...row,rrhhSponsor:'Academia Vasca de Policía y Emergencias'};
 const data=JSON.stringify([missing,foreign,conflicting,old,academy]);
 assert.equal(parseDataset(data,since).length,0);
 assert.deepEqual(parseDataset(data,since,undefined,{includeUndeclared:true}),[missing]);
});
test('native Euskadi scope recovers a regional call without converting an institutional location into a work province',()=>{
 const c=parseEuskadiDetail(html({'Convoca':'Organismo público','Ámbito':'Euskadi','Requisitos':'Título de ESO.'}),{...row,municipality:'Bilbao',territorycode:'48'},now);
 assert.equal(c.territory,'Euskadi');assert.equal(c.province,null);assert.equal(c.location,'Euskadi');
 assert.throws(()=>parseEuskadiDetail(html({'Ámbito':'Resto de países'}),row,now));
 assert.throws(()=>parseEuskadiDetail(html({'Ámbito':'Euskadi'}),{...row,rrhhTerritory:'Madrid'},now));
 assert.throws(()=>parseEuskadiDetail(html({'Ámbito':'Euskadi'}),{...row,country:'Francia'},now));
});
test('Navarra municipal scope requires the named official municipality, a BON reference and a compatible published geographical scope',()=>{
 const data={'Convoca':'Ayuntamiento de Tudela','Ámbito':'Resto de CCAA','Fuente':'Boletín Oficial de Navarra 36 de 19-02-2026.'};
 const c=parseEuskadiDetail(html(data),row,now);assert.equal(c.territory,'Navarra');assert.equal(c.province,'Navarra');
 assert.throws(()=>parseEuskadiDetail(html({...data,Convoca:'Ayuntamiento de Tudela de Duero'}),row,now));
 assert.throws(()=>parseEuskadiDetail(html({...data,Fuente:'Boletín Oficial del Estado'}),row,now));
 assert.throws(()=>parseEuskadiDetail(html({...data,'Ámbito':'Resto de países'}),row,now));
});
test('contradictory declared and native target territories are rejected instead of choosing a location',()=>{
 assert.throws(()=>parseEuskadiDetail(html({'Ámbito':'Navarra'}),{...row,rrhhTerritory:'Euskadi'},now));
});
test('Euskadi language matching distinguishes required Basque, merits and unrelated or mixed languages',()=>{
 const declared={...row,rrhhTerritory:'Euskadi'};
 const parse=(profile:string,requirements='Título de ESO y conocimientos de euskera.')=>parseEuskadiDetail(html({'Convoca':'Organismo público','Perfil lingüístico':profile,'Requisitos':requirements}),declared,now);
 assert.deepEqual(parse('Euskera C1 preceptivo.').language,{name:'euskera',level:'C1'});
 assert.equal(parse('Euskera C1 se valorará como mérito.').language,null);
 assert.equal(parse('Inglés B2 obligatorio.','Euskera C1 obligatorio.').language,null);
 assert.equal(parse('Euskera C1 o B2 según la plaza.').language,null);
 assert.equal(parse('Euskera C1 sin fecha de preceptividad.').language,null);
});

test('native convocatoria and bilingual bases links are retained without importing candidate lists',()=>{
 const c=parseEuskadiDetail(html({'Ámbito':'Euskadi','Contenido':'<a href="https://www.euskadi.eus/bases.pdf">Convocatoria</a><a href="https://www.euskadi.eus/bilingual.pdf">Deialdia / Convocatoria</a><a href="https://www.euskadi.eus/candidates.pdf">Lista de admitidos</a>'}),row,now);
 assert.equal(c.documents.length,2);assert.equal(c.documents[0].checkedAt,null);
});
