import {test} from 'node:test';import assert from 'node:assert/strict';
import {assess,defaultProfile,profileSchema,specificUniversityQualifications,universitySpecialties,catalogueSchema} from '../src/lib/catalogue';
import {educationIds} from '../scripts/scrapers/shared';
import data from '../data/demo.json';
test('legacy study selections are removed from browser preferences',()=>{
 const parsed=profileSchema.parse({...defaultProfile,qualifications:universitySpecialties.map(s=>s.id),euskera:'C1',onlyMatches:true,favorites:['saved']});
 assert.equal('qualifications' in parsed,false);
 assert.equal('euskera' in parsed,false);
 assert.equal('onlyMatches' in parsed,false);
 assert.deepEqual(parsed.favorites,['saved']);
});
test('explicit degrees distinguish medicine, engineering branches and jobs with related subject matter',()=>{
 assert.deepEqual(educationIds('Grado en Medicina'),['medicina']);
 assert.deepEqual(educationIds('Licenciatura en Derecho'),['derecho']);
 assert.deepEqual(educationIds('Grado en Ingeniería Informática'),['ingenieria-informatica']);
 assert.deepEqual(educationIds('Grado en Ingeniería Civil'),['ingenieria-civil']);
 assert.deepEqual(specificUniversityQualifications('Técnico de medicina. Experiencia en informática.'),[]);
 assert.deepEqual(specificUniversityQualifications('Grado en Arquitectura Técnica'),[]);
 assert.deepEqual(specificUniversityQualifications('Máster en Psicología'),[]);
});
test('previously imported explicit study requirements match specialties without accepting unrelated general degrees',()=>{
 const call={...catalogueSchema.parse(data)[0],acceptedQualifications:[],educationText:'Grado en Medicina'};
 assert.equal(assess(call,{...defaultProfile,qualifications:['grado','medicina']}).education,true);
 assert.equal(assess(call,{...defaultProfile,qualifications:['grado','ingenieria-civil']}).education,false);
 assert.equal(assess(call,{...defaultProfile,qualifications:['grado']}).education,false);
});
test('municipal social-education, political-science and sociology requirements remain distinct from related jobs and social work',()=>{
 assert.deepEqual(educationIds('Grado en Educación Social'),['educacion-social']);
 assert.deepEqual(educationIds('Gizarte Hezkuntzako gradua'),['educacion-social']);
 assert.deepEqual(educationIds('Grado en Ciencias Políticas y de la Administración'),['ciencias-politicas']);
 assert.deepEqual(educationIds('Politika eta Administrazio Zientzietako gradua'),['ciencias-politicas']);
 assert.deepEqual(educationIds('Licenciatura en Sociología'),['sociologia']);
 assert.deepEqual(educationIds('Licence en sociologie'),['sociologia']);
 assert.deepEqual(specificUniversityQualifications('Educador social. Experiencia en sociología.'),[]);
 assert.deepEqual(educationIds('Grado en Trabajo Social'),['trabajo-social']);
});
test('Graduado Escolar is recognized for employment without treating school or vocational subjects as university specialties',()=>{
 assert.deepEqual(educationIds('Título de Graduado Escolar o equivalente'),['eso']);
 assert.deepEqual(educationIds('Certificado de Escolaridad'),[]);
 assert.deepEqual(specificUniversityQualifications('Graduado Escolar y Formación Profesional de primer grado en Cuidados Auxiliares de Enfermería'),[]);
});
