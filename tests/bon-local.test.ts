import {test} from 'node:test';import assert from 'node:assert/strict';import {parseBonIndex,parseBonLocalSummary,parseBonLocalArticle} from '../scripts/scrapers/bon-local';
const now='2026-11-20T00:00:00Z',bulletin={url:'https://bon.navarra.es/es/boletin/-/sumario/2026/231',year:2026,number:231,publishedAt:'2026-11-19'};
test('BON index binds printed dates to canonical bulletin identities and published month references',()=>{
 const html='<h1>Índice de boletines</h1><a href="https://bon.navarra.es/es/boletin/-/sumario/2026/231">Nº 231 | 19 de noviembre de 2026</a><a href="https://bon.navarra.es/es/boletines/-/boletinmes/2026/10">octubre 2026</a>';
 const result=parseBonIndex(html,'https://bon.navarra.es/es/indice-boletines');assert.deepEqual(result.bulletins,[bulletin]);assert.equal(result.months[0].month,10);
 const skipLink=html+'<a href="#contenido">Saltar al contenido</a>';
 assert.equal(parseBonIndex(skipLink,'https://bon.navarra.es/es/boletines/-/boletinmes/2026/10').months.length,1);
 const extraordinary=html.replaceAll('231','217').replace('19 de noviembre de 2026','29 de octubre de 2026 EXTRAORDINARIO');
 assert.equal(parseBonIndex(extraordinary,'https://bon.navarra.es/es/indice-boletines').bulletins[0].publishedAt,'2026-10-29');
 assert.throws(()=>parseBonIndex(html.replace('2026/231','2025/231'),'https://bon.navarra.es/es/indice-boletines'));
});
test('BON summary selects new local public recruitment and never follows nominations, corrections, staff-only calls or other chapters',()=>{
 const html='<div><p id="numero_boletin">BOLETÍN Nº 231 - 19 de noviembre de 2026</p><p class="b-ambito">1. Comunidad Foral de Navarra</p><p class="b-seccion">1.2. Autoridades</p><p><a href="/es/anuncio/-/texto/2026/231/1">Convocatoria de un puesto estatal</a></p><p class="b-ambito">2. Administración Local de Navarra</p><p class="b-seccion">2.1. Oposiciones y concursos. Oferta Pública de Empleo</p><p class="b-denominacion">ANSOÁIN</p><p><a href="/es/anuncio/-/texto/2026/231/17">Concurso-oposición de tres plazas de educador/a social</a></p><p><a href="/es/anuncio/-/texto/2026/231/18">Concurso-oposición de una plaza. Propuesta de contratación</a></p><p><a href="/es/anuncio/-/texto/2026/231/19">Convocatoria restringida al personal fijo</a></p><p><a href="/es/anuncio/-/texto/2026/231/20">Convocatoria. Corrección de errores</a></p><p class="b-seccion">2.2. Otros anuncios</p><p><a href="/es/anuncio/-/texto/2026/231/21">Convocatoria de ayudas sociales</a></p></div>';
 const jobs=parseBonLocalSummary(html,bulletin);assert.equal(jobs.length,1);assert.equal(jobs[0].issuer,'ANSOÁIN');assert.equal(jobs[0].url,'https://bon.navarra.es/es/anuncio/-/texto/2026/231/17');
 assert.equal(parseBonLocalSummary(html.replace('Concurso-oposición de tres plazas de educador/a social','Oposición de servicios múltiples. Contratación'),bulletin).length,0);
 assert.equal(parseBonLocalSummary(html.replace('19 de noviembre de 2026','19 de noviembre de 2026 - EXTRAORDINARIO'),bulletin).length,1);
});
test('BON article verifies its chapter, issuer and title and keeps joint language profiles unconfirmed',()=>{
 const item={title:'Concurso-oposición de tres plazas de educador/a social',issuer:'ANSOÁIN',url:'https://bon.navarra.es/es/anuncio/-/texto/2026/231/17',bulletin};
 const html='<h2>BOLETÍN Nº 231 - 19 de noviembre de 2026</h2><p class="a-ambito">2. Administración Local de Navarra</p><p class="a-seccion">2.1. Oposiciones y concursos. Oferta Pública de Empleo</p><p class="a-denominacion">ANSOÁIN</p><p class="a-titulo">'+item.title+'</p><p class="foral-normal">1.5. Estar en posesión del certificado C1 de euskera u otra titulación reconocida equivalente.</p><p class="foral-normal">2.–Requisitos.</p><p class="foral-normal">Estar en posesión del título de Grado en Educación Social.</p><p class="foral-normal">Poseer la titulación de C1 de Euskera para las plazas con perfil preceptivo.</p><p class="foral-normal">3.–Solicitudes. Veinte días naturales desde la publicación.</p><p class="foral-normal">ANEXO I.–TEMARIO</p><p class="foral-normal">1.–La Constitución y los derechos fundamentales.</p>';
 const call=parseBonLocalArticle(html,item,now)!;assert.equal(call.province,'Navarra');assert.deepEqual(call.acceptedQualifications,['educacion-social']);assert.equal(call.languageStatus,'unknown');assert.equal(call.language,null);assert.equal(call.deadline,null);assert.equal(call.topics.length,1);
 assert.throws(()=>parseBonLocalArticle(html.replace('a-denominacion">ANSOÁIN','a-denominacion">OTRO MUNICIPIO'),item,now));
});
