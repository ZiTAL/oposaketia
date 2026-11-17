import {test}from'node:test';
import assert from'node:assert/strict';
import {catalogueSchema,defaultProfile,filterCalls,profileSchema}from'../src/lib/catalogue';
import demo from'../data/demo.json';
const [base]=catalogueSchema.parse(demo);
const calls=[
 {...base,id:'open',isDemo:false,status:'Abierta' as const,deadline:'2099-12-31',province:'Bizkaia' as const},
 {...base,id:'closed',isDemo:false,status:'Cerrada' as const,deadline:'2020-01-01',province:'Bizkaia' as const},
 {...base,id:'soon',isDemo:false,status:'Próximamente' as const,deadline:'2099-12-31',province:'Gipuzkoa' as const},
 {...base,id:'expired',isDemo:false,status:'Abierta' as const,deadline:'2020-01-01',province:'Bizkaia' as const},
];
test('any selected state matches and combines with province and favorites',()=>{
 assert.deepEqual(filterCalls(calls,{...defaultProfile,statuses:['Abierta','Próximamente']}).map(c=>c.id),['open','soon']);
 assert.deepEqual(filterCalls(calls,{...defaultProfile,statuses:['Abierta','Próximamente'],provinces:['Bizkaia']}).map(c=>c.id),['open']);
 assert.deepEqual(filterCalls(calls,{...defaultProfile,statuses:['Cerrada']}).map(c=>c.id),['closed','expired']);
 assert.equal(filterCalls(calls,{...defaultProfile,statuses:[]}).length,4);
 assert.equal(filterCalls(calls,{...defaultProfile,statuses:['En curso']}).length,0);
 assert.deepEqual(filterCalls(calls,{...defaultProfile,statuses:['Abierta','Cerrada'],favorites:['closed']},true).map(c=>c.id),['closed']);
});
test('legacy state preferences migrate for both old and current province profiles',()=>{
 const {statuses,...legacy}=defaultProfile;
 const migrated=profileSchema.parse({...legacy,provinces:['Bizkaia'],status:'Abierta',favorites:['favorite']});
 assert.deepEqual(migrated.statuses,['Abierta']);assert.deepEqual(migrated.provinces,['Bizkaia']);assert.deepEqual(migrated.favorites,['favorite']);assert.equal('status'in migrated,false);
 assert.deepEqual(profileSchema.parse({...legacy,status:'Todos'}).statuses,[]);
 assert.deepEqual(profileSchema.parse({...legacy,status:'Abierta',statuses:['Cerrada','Próximamente']}).statuses,['Cerrada','Próximamente']);
 const {provinces,...oldest}=legacy;
 const both=profileSchema.parse({...oldest,province:'Navarra',status:'En curso'});assert.deepEqual(both.provinces,['Navarra']);assert.deepEqual(both.statuses,['En curso']);
 assert.equal(profileSchema.safeParse({...defaultProfile,statuses:['Invalid']}).success,false);
});
