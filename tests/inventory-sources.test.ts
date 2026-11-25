import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CPEN_REVIEWED_ARCHIVE,parseCpenList,parseCpenDetail } from '../scripts/scrapers/cpen';
import { parseGipuzkoaList } from '../scripts/scrapers/gipuzkoa';
import { parseBizkaiaList } from '../scripts/scrapers/bizkaia';
import { parseTerritorialDetail } from '../scripts/scrapers/emploi-territorial';
import { parseIvapList } from '../scripts/scrapers/ivap';
const now='2026-11-17T00:00:00.000Z';

test('CPEN follows only its own job links and pagination, and reads the actual employer and requirements',()=>{
  const list=parseCpenList('<a class="job-card" href="/jobs/architect">Arquitecto</a><a class="job-card" href="https://example.com/jobs/other">Other</a><a class="next" rel="next" href="/jobs?page=2">Next</a>');
  assert.equal(list.links.length,1);assert.match(list.next!,/page=2$/);
  assert.throws(()=>parseCpenList('<a class="next" rel="next" href="https://example.com/jobs">Next</a>'));
  const call=parseCpenDetail('<meta name="author" content="NASUVINSA"><h1>Arquitecto/a</h1><div title="Ubicación">Pamplona/Iruña</div><p>Requisitos mínimos</p><div class="general-content"><p>Grado en Arquitectura</p><p>Experiencia de dos años</p></div>',list.links[0].url,now);
  assert.equal(call.organization,'NASUVINSA');assert.equal(call.province,'Navarra');
  assert.deepEqual(call.acceptedQualifications,['arquitectura']);assert.equal(call.status,'Pendiente de confirmar');assert.equal(call.deadline,null);assert.deepEqual(call.topics,[]);
  assert.throws(()=>parseCpenDetail('<h1>Not a job</h1>',list.links[0].url,now));
  const closed=parseCpenDetail('<meta name="author" content="INTIA, Instituto Navarro de Tecnología e Infraestructuras Agroalimentarias, S.A."><p>Oferta cerrada</p><h1>Personal técnico de gestión de personas</h1><p>Requisitos mínimos</p><div class="general-content"><p>Grado en Relaciones Laborales</p></div>',CPEN_REVIEWED_ARCHIVE[0],now);
  assert.equal(closed.organization.startsWith('INTIA'),true);
  assert.equal(closed.status,'Cerrada');assert.equal(closed.deadline,null);
  const nafarbide=parseCpenDetail('<meta name="author" content="NAFARBIDE, El Camino de los Navarros S.L."><p>Oferta cerrada</p><h1>Personal técnico sistemas de gestión</h1><p>Requisitos mínimos</p><div class="general-content"><p>Grado o Ingeniería en Organización Industrial</p></div>',CPEN_REVIEWED_ARCHIVE[1],now);
  assert.equal(nafarbide.organization.startsWith('NAFARBIDE'),true);
  assert.equal(nafarbide.status,'Cerrada');assert.equal(nafarbide.deadline,null);
  const ini=parseCpenDetail('<meta name="author" content="INI, Instituto Navarro de Inversiones, S.L."><p>Oferta cerrada</p><h1>Analista de inversiones</h1><p>Requisitos mínimos</p><div class="general-content"><p>Grado en Administración y Dirección de Empresas o Economía</p></div>',CPEN_REVIEWED_ARCHIVE[2],now);
  assert.match(ini.organization,/Instituto Navarro de Inversiones/);
  assert.equal(ini.status,'Cerrada');assert.equal(ini.deadline,null);
  const nasertic=parseCpenDetail('<meta name="author" content="NASERTIC, Navarra de Servicios y Tecnologías, S.A."><p>Oferta cerrada</p><h1>Personal técnico atención ciudadana</h1><p>Requisitos mínimos</p><div class="general-content"><p>Bachiller o FP Grado Medio Administrativo</p><p>Euskera nivel B2</p><p>Se ofrece</p><p>Contrato eventual</p></div>',CPEN_REVIEWED_ARCHIVE[3],now);
  assert.match(nasertic.organization,/NASERTIC/);
  assert.equal(nasertic.status,'Cerrada');assert.equal(nasertic.deadline,null);
  assert(nasertic.requirements.some(requirement=>requirement.includes('Euskera nivel B2')));
  assert(!nasertic.requirements.some(requirement=>requirement.includes('Contrato eventual')));
});
test('Gipuzkoa excludes internal appointments and duplicates, and never invents dates',()=>{
  const calls=parseGipuzkoaList('<a href="/WAS/CORP/LLEHautaketaProzesuakWEB/convocatorias/OP01-2026/lista/-1">Administrativo</a><a href="/WAS/CORP/LLEHautaketaProzesuakWEB/convocatorias/OP01-2026/lista/-1">Duplicated</a><a href="/WAS/CORP/LLEHautaketaProzesuakWEB/convocatorias/LD01-2026/lista/0">Internal</a>',now);
  assert.equal(calls.length,1);assert.equal(calls[0].province,'Gipuzkoa');assert.equal(calls[0].deadline,null);assert.match(calls[0].sourceUrl,/locale=es/);
});
test('Bizkaia preserves vacancies without treating a publication date as an application deadline',()=>{
  const calls=parseBizkaiaList('<table class="ope_tabla90"><tr><td headers="Nombre"><a href="convocatoria.asp?Idioma=CA&id=100" title="Fecha: 12/11/2026">Arquitecto/a</a></td><td headers="Plazas">13</td></tr></table>',now);
  assert.equal(calls.length,1);assert.equal(calls[0].places,13);assert.equal(calls[0].province,'Bizkaia');assert.equal(calls[0].deadline,null);assert.deepEqual(calls[0].acceptedQualifications,[]);
});
test('Emploi territorial excludes Béarn and only imports an explicitly confirmed Iparralde workplace',()=>{
  const field=(label:string,value:string)=>`<div class="offre-item"><div class="offre-item-label">${label}</div><div class="offre-item-value">${value}</div></div>`;
  const html=(town:string)=>'<h2 class="set-font-weight-bold">Gestionnaire</h2>'+field('Employeur','Syndicat mixte bil ta garbi')+field('Lieu de travail',`7 rue Joseph Latxague, ${town} (Pyrénées-Atlantiques (64))`)+field('Date limite de candidature','13/12/2026');
  const url='https://www.emploi-territorial.fr/offre/test';
  assert.equal(parseTerritorialDetail(html('Pau'),url,now),null);
  const call=parseTerritorialDetail(html('Bayonne'),url,now)!;
  assert.equal(call.organization,'Syndicat mixte bil ta garbi');assert.equal(call.province,'Lapurdi');assert.equal(call.deadline,'2026-12-13');assert.equal(call.status,'Abierta');
});
test('shared Euskadi search parser resolves relative links against the actual official portal',()=>{
  const html='<div class="r01srItem"><div class="r01srItemDocName"><a href="/empleo_publico/test">Test</a></div></div>';
  assert.equal(new URL(parseIvapList(html,'https://www.ejie.euskadi.eus/')[0].url).hostname,'www.ejie.euskadi.eus');
});
