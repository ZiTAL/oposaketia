import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MockAgent} from 'undici';
import {OfficialClient} from '../scripts/scrapers/http';

test('a robots.txt redirect to a public HTML page does not recursively fetch robots.txt',async()=>{
  const dispatcher=new MockAgent();dispatcher.disableNetConnect();
  const pool=dispatcher.get('https://municipal.example.org');
  pool.intercept({path:'/robots.txt'}).reply(302,'',{headers:{location:'/landing'}});
  pool.intercept({path:'/landing'}).reply(200,'<h1>Public homepage</h1>',{headers:{'content-type':'text/html'}});
  pool.intercept({path:'/jobs'}).reply(200,'<h1>Public vacancies</h1>',{headers:{'content-type':'text/html'}});
  const directory=await mkdtemp(join(tmpdir(),'oposaketia-robots-'));
  const client=new OfficialClient(directory,0,{approvedHosts:['municipal.example.org'],dispatcher,maxAttempts:1});
  try{assert.match(await client.text('https://municipal.example.org/jobs'),/Public vacancies/);assert.equal(client.requests,3);dispatcher.assertNoPendingInterceptors();}
  finally{await client.close();await rm(directory,{recursive:true,force:true});}
});

test('content redirects still enforce the destination host robots rules',async()=>{
  const dispatcher=new MockAgent();dispatcher.disableNetConnect();
  const source=dispatcher.get('https://source.example.org'),target=dispatcher.get('https://target.example.org');
  source.intercept({path:'/robots.txt'}).reply(200,'User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}});
  source.intercept({path:'/jobs'}).reply(302,'',{headers:{location:'https://target.example.org/jobs'}});
  target.intercept({path:'/robots.txt'}).reply(200,'User-agent: *\nDisallow: /jobs',{headers:{'content-type':'text/plain'}});
  const directory=await mkdtemp(join(tmpdir(),'oposaketia-robots-'));
  const client=new OfficialClient(directory,0,{approvedHosts:['source.example.org','target.example.org'],dispatcher,maxAttempts:1});
  try{await assert.rejects(()=>client.text('https://source.example.org/jobs'),/robots.txt no permite/);assert.equal(client.requests,3);dispatcher.assertNoPendingInterceptors();}
  finally{await client.close();await rm(directory,{recursive:true,force:true});}
});

test('a robots redirect loop stops at the same bounded redirect limit',async()=>{
  const dispatcher=new MockAgent();dispatcher.disableNetConnect();
  const pool=dispatcher.get('https://municipal.example.org');
  pool.intercept({path:'/robots.txt'}).reply(302,'',{headers:{location:'/landing'}}).persist();
  pool.intercept({path:'/landing'}).reply(302,'',{headers:{location:'/robots.txt'}}).persist();
  const directory=await mkdtemp(join(tmpdir(),'oposaketia-robots-'));
  const client=new OfficialClient(directory,0,{approvedHosts:['municipal.example.org'],dispatcher,maxAttempts:1});
  try{await assert.rejects(()=>client.text('https://municipal.example.org/jobs'),/Demasiadas redirecciones/);assert.equal(client.requests,6);}
  finally{await client.close();await rm(directory,{recursive:true,force:true});}
});

test('crawl-delay is respected for its origin without slowing unrelated official sources',async()=>{
  const dispatcher=new MockAgent();dispatcher.disableNetConnect();
  const slow=dispatcher.get('https://slow.example.org'),fast=dispatcher.get('https://fast.example.org');
  let slowRules=0,slowContent=0,fastRules=0,fastContent=0;
  slow.intercept({path:'/robots.txt'}).reply(()=>{slowRules=performance.now();return {statusCode:200,data:'User-agent: *\nAllow: /\nCrawl-delay: 1',responseOptions:{headers:{'content-type':'text/plain'}}};});
  slow.intercept({path:'/jobs'}).reply(()=>{slowContent=performance.now();return {statusCode:200,data:'Slow source',responseOptions:{headers:{'content-type':'text/html'}}};});
  fast.intercept({path:'/robots.txt'}).reply(()=>{fastRules=performance.now();return {statusCode:200,data:'User-agent: *\nAllow: /',responseOptions:{headers:{'content-type':'text/plain'}}};});
  fast.intercept({path:'/jobs'}).reply(()=>{fastContent=performance.now();return {statusCode:200,data:'Fast source',responseOptions:{headers:{'content-type':'text/html'}}};});
  const directory=await mkdtemp(join(tmpdir(),'oposaketia-crawl-delay-'));
  const client=new OfficialClient(directory,0,{approvedHosts:['slow.example.org','fast.example.org'],dispatcher,maxAttempts:1});
  try{
    await client.text('https://slow.example.org/jobs');await client.text('https://fast.example.org/jobs');
    assert.ok(slowContent-slowRules>=900,'the slow origin must retain its own delay');
    assert.ok(fastContent-fastRules<500,'another origin must use its own rules');dispatcher.assertNoPendingInterceptors();
  }finally{await client.close();await rm(directory,{recursive:true,force:true});}
});
