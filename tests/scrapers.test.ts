import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseDataset,parseEuskadiDetail}from'../scripts/scrapers/euskadi';
import {parseNavarraList,parseNavarraDetail,enrichFromBon}from'../scripts/scrapers/navarra';
import {discoverCalendar,parseFrenchCalendar}from'../scripts/scrapers/cdg64';
import {parseEitbList,parseEitbDetail}from'../scripts/scrapers/eitb';
import {parseDonostiaList,parseDonostiaDetail}from'../scripts/scrapers/donostia';
import {parseArabaList,parseArabaDetail}from'../scripts/scrapers/araba';
import {parseEhuList,parseEhuDetail}from'../scripts/scrapers/ehu';
import {parseIvapList,parseIvapDetail}from'../scripts/scrapers/ivap';
import {parseOsakidetzaList,parseOsakidetza}from'../scripts/scrapers/osakidetza';
import {allowedUrl,decodeOfficialText}from'../scripts/scrapers/http';
import {baseCall,educationIds,extractTopics,parseDate}from'../scripts/scrapers/shared';
import {assess,defaultProfile}from'../src/lib/catalogue';
const now='2026-11-16T12:00:00.000Z';
const row={documentName:'Título antiguo',physicalUrl:'https://www.gazteaukera.euskadi.eus/contenidos/empleo_publico/prueba/es_def/index.shtml',rrhhTerritory:'Comunidad Autónoma del País Vasco',territory:'Gipuzkoa',rrhhStartDate:'01/11/2026',rrhhEndDate:'30/11/2026',rrhhSponsor:'Ayuntamiento',rrhhRules:'',rrhhVacancies:'1'};
test('EITB parses current public recruitment calls and links their official bases',()=>{
 const html='<div class="convocatoria"><div class="header"><a href="/es/convocatoria-publica-detalle.php?id=1"><h2>15_ADMIN — ADMINISTRATIVO/A</h2></a><p><svg></svg>EITB Media S.A.U. - ETB</p></div><div class="description">Administrativo/a</div><div class="info-convocatoria">Plazo inscripción: 06/11/2026 - 21/11/2026 Número de plazas: 3</div><div class="row">Tipo de proceso selectivo: Concurso oposición</div></div>';
 const listing=parseEitbList(html)[0];assert.equal(listing.title,'Administrativo/a');assert.equal(listing.deadline,'2026-11-21');assert.equal(listing.places,3);
 const call=parseEitbDetail('<div id="pdf-list"><a href="/descargaFichero.php?cod_ope=1">BASES ADMINISTRATIVO</a></div>',listing,now);
 assert.equal(call.sourceId,'eitb');assert.equal(call.organization,'EITB Media S.A.U. - ETB');assert.equal(call.status,'Abierta');assert.equal(call.documents[0].kind,'bases');
});
test('Donostia only exposes published in-deadline records and preserves explicit requirements',()=>{
 const html='<div id="lista_enmarcha"><p><a href="/app/info/ofertadeempleo.nsf/vFichaId/abc?OpenDocument"><strong>Donostiako Udala: 2 Agente Guardia Municipal. Año 2026</strong></a><strong> (2 plazas)</strong></p><p><strong>Plazo de inscripción </strong>desde 13/11/2026 hasta 11/12/2026</p><p><strong>Requisitos: </strong>Bachiller, nivel 0 de euskara</p><p><strong>Tipo de Oferta: </strong>Convocatoria</p></div>';
 const listing=parseDonostiaList(html)[0];assert.equal(listing.title,'Agente Guardia Municipal. Año 2026');assert.equal(listing.organization,'Donostiako Udala');assert.equal(listing.places,2);assert.equal(listing.deadline,'2026-12-11');
 const call=parseDonostiaDetail('<ul id="documentos_ofertaempleo"><li><strong>BASES Y ANEXO TEMARIO</strong><a href="/app/info/oferta.nsf/doc/$file/bases.pdf">bases.pdf</a></li></ul>',listing,now);
 assert.equal(call.province,'Gipuzkoa');assert.equal(call.status,'Abierta');assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.languageStatus,'unknown');assert.equal(call.documents[0].kind,'temario');
});
test('Álava portal limits extraction to recent official local and foral announcements',()=>{
 const url='https://enplegupublikoa.araba.eus/es/administracion-local';const html='<ul><li class="list-group-item"><span class="asset-category">Ayuntamiento de Samaniego</span><a href="/es/-/operario-bolsa">Aprobación de bases y convocatoria para constituir una bolsa de operario/a</a><span>2026-11-13</span><div>Organismo: Ayuntamiento de Samaniego</div></li></ul>';
 const listing=parseArabaList(html,url)[0];assert.equal(listing.organization,'Ayuntamiento de Samaniego');assert.equal(listing.published,'2026-11-13');
 const call=parseArabaDetail('<div class="journal-content-article"><p>Convocatoria de bolsa de empleo. Consulta las bases oficiales.</p></div>',listing,now);
 assert.equal(call.province,'Araba / Álava');assert.equal(call.status,'Pendiente de confirmar');assert.match(call.description,/bases oficiales/);
});
test('EHU OPE finder follows unique public selection processes and extracts its specific bases',()=>{
 const html='<div><a href="?tipo-convocatoria=1&proceso=432&pestanya=1">Abierta</a><a href="?tipo-convocatoria=1&proceso=432&pestanya=1">Abierta</a><a href="?tipo-convocatoria=1&proceso=432&pestanya=2">Tribunales</a></div>';
 const listings=parseEhuList(html);assert.equal(listings.length,1);assert.equal(listings[0].process,'432');
 const detail='<h2>Escala Administrativa</h2><h3>Plazas convocadas</h3><p>37 plazas por turno libre</p><h3>Requisitos</h3><p>Título de Bachiller o título de Técnico</p><h3>Bases de la convocatoria</h3><a href="https://www.euskadi.eus/bases.pdf">Bases específicas</a><h3>Solicitudes</h3><p>Plazo de presentación de solicitudes: Del 1 al 21 de septiembre de 2026, ambos incluidos.</p>';
 const call=parseEhuDetail(detail,listings[0],now);assert.equal(call.title,'Escala Administrativa');assert.equal(call.places,37);assert.equal(call.deadline,'2026-09-21');assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.documents[0].kind,'bases');
});
test('IVAP result cards retain active status, dates, plazas and official bases',()=>{
 const html='<ul><li class="r01srItem"><div class="r01srItemCommon"><em class="r01srItemDocName"><a href="/empleo_publico/escala-administrativa/web01-sedeopec/es/">Escala Administrativa</a></em><div class="r01srItemDocDesc">Nº Plazas: 12</div><div class="r01srItemDetails">Plazo de inscripción abierto (01/11/2026 - 30/11/2026)</div></div><div class="r01srItemMetaData"><a href="/bases.pdf">Bases específicas</a></div></li></ul>';
 const listing=parseIvapList(html)[0];assert.equal(listing.places,12);assert.equal(listing.deadline,'2026-11-30');assert.equal(listing.open,true);assert.equal(listing.documents[0].title,'Bases específicas');
 const detail='<div class="r01gContentTabSeccion"><span class="r01gContentSeccionTitulo">Grupo:</span><span class="r01gContentSeccionTexto">C1</span></div><div class="r01gContentTabSeccion"><span class="r01gContentSeccionTitulo">Titulación:</span><span class="r01gContentSeccionTexto">Título de Bachiller</span></div>';
 const call=parseIvapDetail(detail,listing,now);assert.equal(call.sourceId,'ivap');assert.equal(call.group,'C1');assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.status,'Abierta');
});
test('Osakidetza public portal only imports categories from the latest official OPE',()=>{
 const html='<div class="table-cell"><a class="featured-container__link">ADMINISTRARIA</a><span>2023-2024-2025 EPE Hasiera-data: 2026/03/22</span></div><div class="table-cell"><a class="featured-container__link">OLD JOB</a><span>2020 EPE Hasiera-data: 2020/03/22</span></div>';
 const listing=parseOsakidetzaList(html);assert.equal(listing.length,1);assert.equal(listing[0].title,'ADMINISTRARIA');
 const call=parseOsakidetza(html,listing[0],now);assert.equal(call.sourceId,'osakidetza');assert.equal(call.category,'Administración');assert.equal(call.status,'En curso');assert.equal(call.documents.length,2);
});
test('Euskadi only selects the requested territory and recent/future deadlines',()=>{
 const data=[row,{...row,rrhhTerritory:'Andalucía',territory:'Huelva'},{...row,rrhhStartDate:'01/01/2013',rrhhEndDate:'02/01/2013'}];
 assert.equal(parseDataset(JSON.stringify(data),'2026-08-18').length,1);
});
test('Euskadi uses the current page title, actual education and linguistic text, without CEFR conversion',()=>{
 const call=parseEuskadiDetail('<h1>Información General</h1><h3>Administrativo/a actual</h3><div class="bloqueInfo"><div class="cabecera">Convoca:</div><div class="info">Ayuntamiento actual</div></div><div class="bloqueInfo"><div class="cabecera">Requisitos:</div><div class="info">Título de Bachiller. Perfil lingüístico 3 de euskera.</div></div><div class="bloqueInfo"><div class="cabecera">Plazo:</div><div class="info">11/12/2026</div></div><a href="https://www.gipuzkoa.eus/bases.pdf">Dealdia/Convocatoria</a>',row,now);
 assert.equal(call.title,'Administrativo/a actual');assert.equal(call.organization,'Ayuntamiento actual');assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.deadline,'2026-12-11');assert.equal(call.language,null);assert.equal(call.languageStatus,'unknown');assert.equal(call.verifiedAt,null);assert.equal(call.reviewStatus,'automatic');assert.equal(call.documents[0].kind,'bases');
 assert.equal(assess(call,{...defaultProfile,qualifications:['bachiller']}).pending,true);
});
test('unknown page layouts are not silently converted into invented calls',()=>{
 assert.throws(()=>parseEuskadiDetail('<title>Blocked</title>',row,now));assert.throws(()=>parseNavarraList('<html>No results</html>'));
});
test('Navarra follows pagination and normalizes tracking parameters',()=>{
 const result=parseNavarraList(`<li class="searcher-result"><div class="searcher-result-category">En resolución</div><a class="searcher-result-title" href="https://www.navarra.es/es/tramites/on/-/line/test?back=true&amp;pageBackId=123">Puesto</a><div class="searcher-result-description">2 plazas</div></li><a href="javascript:document.form._cur.value = '10'; paginate()">10</a>`);
 assert.equal(result.pages,10);assert.equal(result.listings[0].url,'https://www.navarra.es/es/tramites/on/-/line/test');
});
test('Navarra does not confuse an appeals deadline with an entry deadline',()=>{
 const call=parseNavarraDetail('<section id="content"><h1>Titulado/a</h1><div id="infoDirigido">Título universitario de Grado, de Licenciatura, de Ingeniería o Arquitectura.</div><div id="infoNormativa"><a href="https://bon.navarra.es/es/anuncio/-/texto/2026/208/2">Resolución</a></div><p>Alegaciones del 17 de noviembre al 1 de diciembre.</p></section>',{title:'Titulado',url:'https://www.navarra.es/es/tramites/on/-/line/test',summary:'Las 2 plazas (nivel A)',state:'En resolución'},now);
 assert.equal(call.status,'En curso');assert.equal(call.deadline,null);assert.equal(call.places,2);assert.deepEqual(call.acceptedQualifications,['grado']);
});
test('BON only extracts topics inside the syllabus annex, not candidate lists',()=>{
 const call=baseCall('navarra','https://www.navarra.es/es/tramites/on/-/line/test',now,'Navarra');
 const html='<p class="foral-f-parrafo-c">Tema 99.–Mención anterior al temario.</p><p class="foral-f-titulo2-t2-c">ANEXO I.–TEMARIO</p><p class="foral-f-parrafo-c">Tema 1.–La Constitución Española.</p><p class="foral-f-titulo2-t2-c">ANEXO II.–PLAZAS</p><p class="foral-f-parrafo-c">Tema 2.–No es parte del temario.</p>';
 enrichFromBon(call,html,'https://bon.navarra.es/es/anuncio/-/texto/2026/208/2',now);
 assert.deepEqual(call.topics,['Tema 1.–La Constitución Española.']);assert.ok(call.syllabusUrl);
});
test('CDG calendar discovery selects the newest dated official PDF',()=>{
 const link=discoverCalendar('<a href="/index.php?eID=dumpFile&amp;f=1">Calendrier concours et examens 2026</a><a href="/index.php?eID=dumpFile&amp;f=2">Calendrier concours et examens 2027</a>');assert.ok(link.url.includes('f=2'));
});
test('French calendars are never presented as open calls or local destinations',()=>{
 const lines=['Calendrier prévisionnel 2027 - Concours','     Intitulé                         Conditions d’accès                  Dates           Organisateur', '                              Concours externe : ouvert aux',"                              candidats titulaires d'un","                              baccalauréat de l'enseignement",'                              secondaire.', 'Rédacteur territorial                                                 02/02/2027', '                                                                      10/03/2027', 'Concours externe, interne','Cat. B'];
 const calls=parseFrenchCalendar(lines.join('\n'),'https://www.cdg-64.fr/index.php?eID=dumpFile&f=2',now);assert.equal(calls[0].status,'Calendario');assert.equal(calls[0].places,null);assert.equal(calls[0].location,'Nouvelle-Aquitaine · ámbito regional');assert.deepEqual(calls[0].acceptedQualifications,['bac']);assert.equal(calls[0].syllabusUrl,null);
});
test('qualification mapping is conservative and dates and fetch destinations are validated',()=>{
 assert.deepEqual(educationIds('Grado en Psicología'),['psicologia']);assert.deepEqual(educationIds('Grado en Enfermería'),['enfermeria']);assert.deepEqual(educationIds('Sin titulación extraída'),[]);assert.equal(parseDate('31/02/2026'),null);assert.equal(parseDate('16/11/26'),'2026-11-16');
 for(const url of ['http://www.navarra.es/','https://navarra.es.evil.test/','https://127.0.0.1/','https://www.navarra.es:8443/','https://user:pass@www.navarra.es/'])assert.throws(()=>allowedUrl(url));
 assert.ok(allowedUrl('https://bon.navarra.es/es/anuncio/'));
});

test('official pages with Latin-1 charset preserve accented job titles',()=>{
 const body=Buffer.from('Técnico/a de administración','latin1');assert.equal(decodeOfficialText(body,'text/html; charset=iso-8859-1'),'Técnico/a de administración');
});
test('applying a snapshot does not accidentally trigger a live scrape',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 await assert.rejects(promisify(execFile)(process.execPath,['--import','tsx','scripts/apply-scrape.ts','/nonexistent/oposaketia-test-snapshot'],{timeout:5000}),error=>{
  const result=error as Error&{stdout?:string;stderr?:string};assert.match(result.stderr??'',/ENOENT/);assert.doesNotMatch(result.stdout??'',/Consultando fuente/);return true;
 });
});

test('municipal discovery includes the last year without extending other organizations or geography',()=>{
 const row={rrhhTerritory:'Bizkaia',rrhhSponsor:'Ayuntamiento de Bilbao',rrhhEndDate:'01/02/2026'};
 const rows=[row,{...row,rrhhSponsor:'Empresa pública'},{...row,rrhhTerritory:'Madrid'},{...row,rrhhEndDate:'01/02/2025'}];
 assert.deepEqual(parseDataset(JSON.stringify(rows),'2026-08-19'),[row]);
});
