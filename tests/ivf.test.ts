import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseIvfCall} from '../scripts/scrapers/ivf';

const profile={url:'https://www.euskadi.eus/web01-sedeopec/es/contenidos/empleo_publico/ivf_participadas_jun26/es_def/index.shtml',title:'Técnico/a analista de participadas',deadline:'2026-07-01',places:1} as const;
const section=(label:string,value:string)=>`<div class="r01gContentTabSeccion"><div class="r01gContentSeccionTitulo">${label}</div><div class="r01gContentSeccionTexto">${value}</div></div>`;
const html=`<div class="r01gCabeceraTitle"><h2>Técnico/a analista de participadas</h2></div><div class="r01gContetnSateDate">11/06/2026 - 01/07/2026</div><div class="r01gEventPlace">Bilbao <br> Bizkaia</div><div id="body_resumen">${section('¿Quién oferta?:','Instituto Vasco de Finanzas')}${section('Plaza:','Técnico/a analista de participadas')}${section('Nº Plazas:','1')}${section('Titulación:','Grado o licenciatura en Administración y Dirección de Empresas, Economía, Finanzas, contabilidad y actuariales, Ingeniería o Derecho.')}${section('Perfil lingüístico:','No preceptivos: Euskera (se valorará hasta PL3) Preceptivo: Inglés (PL2)')}${section('Otros requisitos:','Experiencia laboral en puesto similar de un mínimo de 2 años.')}</div><div id="body_convocatoria"></div>`;

test('IVF checks official employer, deadline, vacancies and merits separately from mandatory English',()=>{
 const {call,basesUrl}=parseIvfCall(profile,html,'2026-11-24T12:00:00.000Z');
 assert.equal(call.organization,'Instituto Vasco de Finanzas');assert.equal(call.places,1);
 assert.equal(call.deadline,'2026-07-01');assert.equal(call.province,'Bizkaia');
 assert.equal(call.language,null);assert.equal(call.syllabusUrl,null);assert.equal(basesUrl,null);
 assert.match(call.requirements.join(' '),/Inglés PL2 preceptivo; euskera hasta PL3 valorable/);
 assert.throws(()=>parseIvfCall(profile,html.replace('Instituto Vasco de Finanzas','Empresa privada'),'2026-11-24T12:00:00.000Z'));
 assert.throws(()=>parseIvfCall(profile,html.replace('01/07/2026','02/07/2026'),'2026-11-24T12:00:00.000Z'));
 assert.throws(()=>parseIvfCall(profile,html.replace('Nº Plazas:</div><div class="r01gContentSeccionTexto">1','Nº Plazas:</div><div class="r01gContentSeccionTexto">2'),'2026-11-24T12:00:00.000Z'));
});
