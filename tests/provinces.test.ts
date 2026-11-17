import {test} from 'node:test';
import assert from 'node:assert/strict';
import {provinceFromEuskadiRow}from'../src/lib/geography';
import {catalogueSchema,callSchema,defaultProfile,filterCalls,profileSchema}from'../src/lib/catalogue';
import data from'../data/demo.json';
const calls=catalogueSchema.parse(data);
test('source province names and codes normalize to the same province',()=>{
 assert.equal(provinceFromEuskadiRow({rrhhTerritory:'Álava'}),'Araba / Álava');
 assert.equal(provinceFromEuskadiRow({territory:'Araba/Álava',territorycode:'01'}),'Araba / Álava');
 assert.equal(provinceFromEuskadiRow({territory:'Vizcaya',territorycode:'48'}),'Bizkaia');
 assert.equal(provinceFromEuskadiRow({rrhhTerritory:'Guipúzcoa'}),'Gipuzkoa');
});
test('regional or conflicting metadata does not acquire a guessed province',()=>{
 assert.equal(provinceFromEuskadiRow({rrhhTerritory:'Comunidad Autónoma del País Vasco',municipality:'Bilbao'}),null);
 assert.equal(provinceFromEuskadiRow({territory:'Gipuzkoa',territorycode:'48'}),null);
 const french=calls.find(call=>call.territory==='País Vasco francés')!;assert.equal(french.province,null);
});
test('multiple provinces match any selection and combine with other filters',()=>{
 assert.deepEqual(filterCalls(calls,{...defaultProfile,provinces:['Bizkaia']}).map(c=>c.id),['auxiliar-administracion']);
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:['Bizkaia','Gipuzkoa']}).length,2);
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:['Navarra']}).length,2);
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:['Sin concretar']})[0].territory,'País Vasco francés');
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:['Navarra','Sin concretar']}).length,3);
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:[]}).length,calls.length);
 assert.equal(filterCalls(calls,{...defaultProfile,search:'alava'})[0].id,'enfermeria');
 assert.equal(filterCalls(calls,{...defaultProfile,provinces:['Bizkaia','Navarra'],favorites:['auxiliar-administracion']},true).length,1);
});
test('legacy profiles preserve a selected province, studies and favorites without hidden territory filters',()=>{
 const {provinces,...base}={...defaultProfile,qualifications:['bachiller'],favorites:['auxiliar-administracion']};
 const legacy={...base,territory:'Euskadi',province:'Bizkaia'};
 const parsed=profileSchema.parse(legacy);assert.deepEqual(parsed.provinces,['Bizkaia']);assert.deepEqual(parsed.qualifications,['bachiller']);assert.deepEqual(parsed.favorites,['auxiliar-administracion']);
 assert.equal('territory' in parsed,false);assert.equal('province' in parsed,false);
 assert.deepEqual(profileSchema.parse({...legacy,province:'Todas'}).provinces,[]);
 assert.deepEqual(profileSchema.parse({...legacy,province:'Sin concretar'}).provinces,['Sin concretar']);
 assert.deepEqual(profileSchema.parse({...legacy,provinces:['Gipuzkoa','Navarra']}).provinces,['Gipuzkoa','Navarra']);
 assert.equal(callSchema.safeParse({...calls[0],province:'Navarra'}).success,false);
 assert.equal(profileSchema.safeParse({...defaultProfile,provinces:['Unknown']}).success,false);
});
test('Iparralde provinces accept French calls and never absorb unlocated regional calendars',()=>{
 const french=calls.find(call=>call.territory==='País Vasco francés')!;
 const local=catalogueSchema.parse(['Lapurdi','Baja Navarra','Zuberoa'].map((province,i)=>({...french,id:'iparralde-'+i,province})));
 assert.deepEqual(filterCalls([...local,french],{...defaultProfile,provinces:['Lapurdi','Zuberoa']}).map(c=>c.province),['Lapurdi','Zuberoa']);
 assert.equal(filterCalls([...local,french],{...defaultProfile,provinces:['Sin concretar']}).length,1);
 assert.equal(callSchema.safeParse({...french,province:'Lapurdi',territory:'Euskadi'}).success,false);
 assert.deepEqual(profileSchema.parse({...defaultProfile,provinces:['Lapurdi','Baja Navarra','Zuberoa','Bizkaia']}).provinces,['Lapurdi','Baja Navarra','Zuberoa','Bizkaia']);
});
