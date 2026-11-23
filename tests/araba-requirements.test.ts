import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArabaDetail,parseArabaPages,parseArabaList} from '../scripts/scrapers/araba';
import {enrichArabaBases} from '../scripts/scrapers/araba-requirements';
const now='2026-11-20T00:00:00Z';
const listing={title:'Bolsa de operario/a de servicios múltiples',url:'https://enplegupublikoa.araba.eus/es/-/operario',organization:'Ayuntamiento de Samaniego',published:'2026-11-13',sourcePage:'https://enplegupublikoa.araba.eus/es/administracion-local'};
const call=()=>parseArabaDetail('<div class="journal-content-article"><a href="https://www.araba.eus/botha/Boletines/2026/131/2026_131_03235_C.pdf">Anuncio (BOTHA)</a><a href="https://www.araba.eus/candidates.pdf">Listado de admitidos</a><a href="https://www.araba.eus/form.pdf">Modelo de solicitud</a></div>',listing,now);
test('Araba follows only published same-list pagination and rejects hostile origins or unrelated query parameters',()=>{
 const html='<div class="language-selector"><a href="/c/portal/update_language?redirect=/es/administracion-local?delta=20&start=2&p_l_id=8222&languageId=eu_ES">eu</a></div><a href="/es/administracion-local?delta=20&start=2">Página 2</a><a href="/es/administracion-local?delta=60">60 Elementos por página</a>';
 assert.deepEqual(parseArabaPages(html,listing.sourcePage),['https://enplegupublikoa.araba.eus/es/administracion-local?delta=20&start=2']);
 assert.doesNotThrow(()=>parseArabaPages(html+'<a href="#main-content">Saltar al contenido principal</a>',listing.sourcePage+'?delta=20&start=2'));
 assert.throws(()=>parseArabaPages(html.replaceAll('/es/administracion-local?delta=20&start=2','https://example.org/es/administracion-local?delta=20&start=2'),listing.sourcePage));
 assert.throws(()=>parseArabaPages(html.replaceAll('start=2','start=2&token=secret'),listing.sourcePage));
});
test('Araba document metadata starts unchecked and excludes forms and candidate records',()=>{
 const c=call();assert.equal(c.documents.length,1);assert.equal(c.documents[0].checkedAt,null);assert.equal(c.documents[0].sha256,null);
});
test('Samaniego school-attendance certificate stays distinct from ESO and its non-preceptive Basque profile remains a merit',()=>{
 const c=call();
 enrichArabaBases(c,'viernes, 13 de noviembre de 2026 • Núm. 131\nAYUNTAMIENTO DE SAMANIEGO\nBolsa de operario de servicios múltiples\nTercera. Requisitos de participación\n• Poseer capacidad funcional.\n• Estar en posesión del Certificado de escolaridad o titulación equivalente,\n de conformidad con la configuración del puesto.\n• Disponer del permiso de conducción B.\nCuarta. Perfil lingüístico\nEl puesto tiene asignado perfil lingüístico 1 sin fecha de preceptividad. Su acreditación no constituye requisito de participación. El conocimiento de euskera se valorará como mérito.\nQuinta. Sistema selectivo\nConcurso de méritos, sin pruebas de oposición.\n2026-03235',c.documents[0].url);
 assert.match(c.educationText,/Certificado de escolaridad/);assert.deepEqual(c.acceptedQualifications,[]);assert.match(c.requirements.join(' '),/permiso de conducción B/);assert.equal(c.language,null);assert.equal(c.languageStatus,'known');assert.equal(c.deadline,null);assert.equal(c.topics.length,0);
 assert.throws(()=>enrichArabaBases(call(),'Núm. 131\nAYUNTAMIENTO DE SAMANIEGO\nBolsa de operario\n2026-99999',c.documents[0].url));
});
test('Araba extracts academic alternatives and full programme items from their own sections, excluding merits and annex forms',()=>{
 const c=call();
 enrichArabaBases(c,'Núm. 131\nAYUNTAMIENTO DE SAMANIEGO\nConvocatoria de operario\n2.–Requisitos de participación\nc) Estar en posesión del título de Bachillerato o Formación Profesional de segundo grado.\nd) Tener capacidad funcional.\n3.–Solicitudes\nQuince días desde la publicación.\n4.–Méritos\nSe valorará Grado en Enfermería y C1 de euskera.\nANEXO II.–TEMARIO\n1. Procedimiento administrativo y recursos, artículos 1 al\n21. CAPÍTULO de revisión administrativa.\n2. Mantenimiento y trabajos de servicios múltiples.\n3. Organización institucional del Territorio Histórico de Álava.\nwww.araba.eus\n2026-03235\n2/3\nANEXO III.–MODELO DE SOLICITUD\n1. Datos de la persona solicitante.',c.documents[0].url);
 assert.deepEqual(c.acceptedQualifications,['bachiller','fp-superior']);assert.equal(c.topics.length,3);assert.match(c.topics[0],/21\. CAPÍTULO/);assert.doesNotMatch(c.topics.join(' '),/araba.eus|03235|solicitante/);assert.equal(c.language,null);
});
test('Araba retains mandatory habilitation conditions without matching a reserved civil-servant post to a general university degree',()=>{
 const c=call();
 enrichArabaBases(c,'Núm. 131\nAYUNTAMIENTO DE SAMANIEGO\n2.–Requisitos\na) Ser funcionario con habilitación de carácter nacional.\nb) Estar en posesión de cualquier título de grado.\n3.–Solicitudes\nANEXO II\n1. Requisitos de acceso\nc) Estar en posesión del título de Bachillerato.\n2. Funciones del puesto\n2026-03235',c.documents[0].url);
 assert.deepEqual(c.acceptedQualifications,[]);assert.match(c.requirements.join(' '),/habilitación/);
});

test('Araba uses a unique specific admission annex ahead of generic degree placeholders and preserves wrapped education alternatives',()=>{
 const c=call(),doc=c.documents[0];
 enrichArabaBases(c,'Núm. 131\nAYUNTAMIENTO DE SAMANIEGO\n2.–Requisitos de participación\nb) Estar en posesión del título exigido en la convocatoria específica.\n3.–Solicitudes\nANEXO II\n1. Requisitos de acceso\nAdemás de los establecidos en las bases generales, se deberá estar en posesión del\nTítulo de Bachiller o Técnico (Formación Profesional de Grado Medio o Superior), o\nhaber abonado los derechos para su expedición.\nDeberá estar en posesión del permiso de conducción B.\n2. Funciones del puesto\nTrabajos de atención al público.\n2026-03235',c.documents[0].url);
 assert.deepEqual(c.acceptedQualifications,['bachiller','fp-superior','fp-medio']);assert.match(c.educationText,/Bachiller/);assert.doesNotMatch(c.educationText,/permiso/);assert.match(c.requirements.join(' '),/conducción B/);doc.checkedAt=now;assert.equal(c.documents[0].checkedAt,now);
});

test('an unsupported explicit programme sequence never partially overwrites verified call fields',()=>{
 const c=call(),before=structuredClone(c);
 assert.throws(()=>enrichArabaBases(c,'Núm. 131\n2.–Requisitos\nc) Estar en posesión del título de Bachillerato.\n3.–Solicitudes\nTEMARIO\nTema 1. Procedimiento administrativo.\nTema 3. Otra parte sin identificar.\n2026-03235',c.documents[0].url));
 assert.deepEqual(c,before);
});

test('Araba preserves an existing notice identity when Liferay adds a paginated return URL',()=>{
 const fixture=(back:string)=>`<ul><li><a href="/es/-/operario?p_l_back_url=${back}&amp;p_l_back_url_title=Administracion+Local">Convocatoria de bolsa de operario</a><span>2026-11-13</span><div>Organismo: Ayuntamiento de Samaniego</div></li></ul>`;
 const first=parseArabaList(fixture('%2Fes%2Fadministracion-local'),listing.sourcePage)[0];
 const next=parseArabaList(fixture('%2Fes%2Fadministracion-local%3Fdelta%3D20%26start%3D2'),listing.sourcePage)[0];
 assert.equal(first.url,next.url);
});
