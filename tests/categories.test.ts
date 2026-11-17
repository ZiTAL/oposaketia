import {test}from'node:test';
import assert from'node:assert/strict';
import {catalogueSchema,defaultProfile,filterCalls,profileSchema}from'../src/lib/catalogue';
import data from'../data/demo.json';
const calls=catalogueSchema.parse(data);
test('category selections match any chosen category and combine with provinces, states and favorites',()=>{
 const selected=filterCalls(calls,{...defaultProfile,categories:['Administración','Sanidad']});
 assert.equal(selected.length,5);assert.ok(selected.every(call=>['Administración','Sanidad'].includes(call.category)));
 assert.deepEqual(filterCalls(calls,{...defaultProfile,categories:['Administración','Sanidad'],provinces:['Bizkaia']}).map(call=>call.id),['auxiliar-administracion']);
 assert.equal(filterCalls(calls,{...defaultProfile,categories:[]}).length,6);
 assert.equal(filterCalls(calls,{...defaultProfile,categories:['Educación']}).length,0);
 assert.equal(filterCalls(calls,{...defaultProfile,categories:['Administración','Sanidad'],statuses:['Abierta']}).length,0);
 assert.deepEqual(filterCalls(calls,{...defaultProfile,categories:['Administración','Sanidad'],favorites:['enfermeria']},true).map(call=>call.id),['enfermeria']);
});
test('single-category profiles migrate and explicit multi-category selections take precedence',()=>{
 const {categories,...legacy}=defaultProfile;
 const migrated=profileSchema.parse({...legacy,category:'Sanidad',provinces:['Bizkaia'],statuses:['Abierta'],favorites:['saved']});
 assert.deepEqual(migrated.categories,['Sanidad']);assert.deepEqual(migrated.provinces,['Bizkaia']);assert.deepEqual(migrated.statuses,['Abierta']);assert.deepEqual(migrated.favorites,['saved']);assert.equal('category'in migrated,false);
 assert.deepEqual(profileSchema.parse({...legacy,category:'Todas'}).categories,[]);
 assert.deepEqual(profileSchema.parse({...legacy,category:'Sanidad',categories:['Educación','Servicios']}).categories,['Educación','Servicios']);
 assert.equal(profileSchema.safeParse({...defaultProfile,categories:['Invalid']}).success,false);
});
