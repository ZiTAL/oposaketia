import {test} from 'node:test';import assert from 'node:assert/strict';
import {assess,defaultProfile,profileSchema,specificUniversityQualifications,universitySpecialties,catalogueSchema} from '../src/lib/catalogue';
import {educationIds} from '../scripts/scrapers/shared';
import data from '../data/demo.json';
test('specialties survive stored profiles including legacy nursing selections',()=>{
 assert.equal(profileSchema.safeParse({...defaultProfile,qualifications:universitySpecialties.map(s=>s.id)}).success,true);
 assert.equal(profileSchema.safeParse({...defaultProfile,qualifications:['enfermeria']}).success,true);
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
