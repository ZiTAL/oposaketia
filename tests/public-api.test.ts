import {test} from 'node:test';import assert from 'node:assert/strict';
import type {OpenAPI} from 'openapi-types';
import SwaggerParser from '@apidevtools/swagger-parser';
import {catalogueSchema,effectiveStatus} from '../src/lib/catalogue';
import {parseListQuery,selectCalls,InvalidQuery} from '../src/lib/api/query';
import {openapi} from '../src/lib/api/openapi';
import {GET as list} from '../src/app/api/v1/calls/route';
import {GET as detail} from '../src/app/api/v1/calls/[id]/route';
import {GET as sourceList} from '../src/app/api/v1/sources/route';
import {GET as options} from '../src/app/api/v1/options/route';
import {GET as health} from '../src/app/api/v1/health/route';
import {GET as specification} from '../src/app/api/v1/openapi.json/route';
import {OPTIONS} from '../src/lib/api/http';
import {callListSchema,callDetailSchema,sourceListSchema,optionsSchema} from '../src/lib/api/contracts';
import data from '../data/demo.json';
const calls=catalogueSchema.parse(data);
test('public queries combine multi-select filters, normalize accents, paginate and retain stable ordering',()=>{
 const query=parseListQuery(new URLSearchParams('province=Bizkaia&province=Gipuzkoa&category=Administraci%C3%B3n&limit=1'));
 const expected=calls.filter(c=>['Bizkaia','Gipuzkoa'].includes(c.province??'')&&c.category==='Administración');
 const result=selectCalls(calls,query);assert.equal(result.pagination.total,expected.length);assert.ok(result.calls.length<=1);
 const empty=selectCalls(calls,parseListQuery(new URLSearchParams('page=100000')));assert.deepEqual(empty.calls,[]);
 const nursing=selectCalls(calls,parseListQuery(new URLSearchParams('qualification=enfermeria')));assert.ok(nursing.calls.some(c=>c.id==='enfermeria'));
 const sorted=selectCalls(calls,parseListQuery(new URLSearchParams('limit=200')));assert.deepEqual(sorted.calls.map(c=>c.id),selectCalls(calls.toReversed(),parseListQuery(new URLSearchParams('limit=200'))).calls.map(c=>c.id));
 assert.ok(sorted.calls.every(c=>c.status===effectiveStatus(c)));
});
test('invalid, excessive and ambiguous queries return validation errors',()=>{
 for(const query of ['limit=0','limit=201','limit=1.5','limit=abc','page=-1','page=100001','sort=nope','province=Atlantis','secret=x','page=1&page=2','q='+ 'a'.repeat(201),'status=Abierta,Cerrada'])assert.throws(()=>parseListQuery(new URLSearchParams(query)),InvalidQuery);
});
test('public routes return documented schemas, CORS, 400/404/503 and no credentials',async()=>{
 const oldDemo=process.env.DEMO_MODE,oldDb=process.env.DATABASE_URL;delete process.env.DATABASE_URL;process.env.DEMO_MODE='true';
 try{
  const response=await list(new Request('http://localhost/api/v1/calls?limit=2'));assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');assert.equal(response.headers.has('Access-Control-Allow-Credentials'),false);callListSchema.parse(await response.json());
  const invalid=await list(new Request('http://localhost/api/v1/calls?limit=999'));assert.equal(invalid.status,400);assert.equal((await invalid.json()).error.message,'limit must be an integer between 1 and 200');
  const call=calls[0];const item=await detail(new Request('http://localhost'),{params:Promise.resolve({id:call.id})});callDetailSchema.parse(await item.json());
  assert.equal((await detail(new Request('http://localhost'),{params:Promise.resolve({id:'does-not-exist'})})).status,404);
  sourceListSchema.parse(await(await sourceList()).json());optionsSchema.parse(await options().json());assert.equal((await health()).status,200);assert.equal(OPTIONS().status,204);
  assert.equal((await specification().json()).openapi,'3.1.0');
  process.env.DEMO_MODE='false';const unavailable=await list(new Request('http://localhost/api/v1/calls'));assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).error.code,'UNAVAILABLE');
 }finally{if(oldDemo===undefined)delete process.env.DEMO_MODE;else process.env.DEMO_MODE=oldDemo;if(oldDb===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldDb;}
});
test('OpenAPI validates with the Swagger parser and describes every versioned read endpoint',async()=>{
 const doc=await SwaggerParser.validate(structuredClone(openapi) as unknown as OpenAPI.Document);assert.equal(doc.info.version,'1.0.0');
 assert.deepEqual(Object.keys(openapi.paths).sort(),['/calls','/calls/{id}','/sources','/health','/options','/openapi.json'].sort());
});
