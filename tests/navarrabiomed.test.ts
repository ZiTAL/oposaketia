import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNavarrabiomedDetail,enrichNavarrabiomedRequirements} from '../scripts/scrapers/navarrabiomed';
const now='2026-11-18T00:00:00.000Z';
const html='<h1>Personal coordinador de estudios</h1><div class="field--name-field-ref-empleo"><div class="field--item">26-44</div></div><div class="field--name-field-fecha-publicacion"><time datetime="2026-11-18">18/11/2026</time></div><div class="field--name-field-fecha-cierre"><time datetime="2026-12-02">02/12/2026</time></div><div class="field--name-body">Trabajo en la Plataforma de Ensayos Clínicos de Navarrabiomed.</div><div class="field--name-field-attach-empleo"><a href="/sites/default/files/bases.pdf">Bases del proceso</a></div>';
test('Navarrabiomed preserves real closing dates and public bases and identifies the legal employer',()=>{
  const call=parseNavarrabiomedDetail(html,'https://www.navarrabiomed.es/es/empleo/26-44-test',now);
  assert.equal(call.organization,'Fundación Miguel Servet · Navarrabiomed');assert.equal(call.deadline,'2026-12-02');assert.equal(call.status,'Abierta');assert.equal(call.province,'Navarra');assert.equal(call.documents.length,1);assert.deepEqual(call.acceptedQualifications,[]);
});
test('Navarrabiomed uses minimum university specialties and alternatives, excluding merits and English from the Basque language field',()=>{
  const call=parseNavarrabiomedDetail(html,'https://www.navarrabiomed.es/es/empleo/26-44-test',now);
  enrichNavarrabiomedRequirements(call,'Requisitos mínimos del puesto:\nTitulación: Titulación Universitaria en Enfermería\nConocimientos Específicos: Inglés B1\nConocimientos y méritos valorables\nGrado en Medicina');
  assert.deepEqual(call.acceptedQualifications,['enfermeria']);assert.equal(call.language,null);assert.equal(call.category,'Sanidad');assert.ok(!call.educationText.includes('Medicina'));
  enrichNavarrabiomedRequirements(call,'Requisitos mínimos del puesto:\nTitulación: Titulación universitaria en Ingeniería Informática, Ingeniería Industrial, Ingeniería de Telecomunicaciones o similar\nExperiencia: Desarrollo de software\nConocimientos y méritos valorables\nGrado en Derecho');
  assert.deepEqual(call.acceptedQualifications,['ingenieria-informatica','ingenieria-industrial','ingenieria-telecomunicaciones']);
});
