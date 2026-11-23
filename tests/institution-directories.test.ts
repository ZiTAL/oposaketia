import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sectorDirectoryMatches,parseSectorWebsite,parseCpenWebsite} from '../scripts/institution-directories';
test('institution directory matching rejects ambiguous parent and subsidiary names',()=>{
 const rows=[{documentName:'Euskotren Participaciones, S.A.',friendlyUrl:'https://www.euskadi.eus/entidad/participaciones/'},{documentName:'Eusko Trenbideak (Euskotren)',friendlyUrl:'https://www.euskadi.eus/entidad/euskotren/'}];
 assert.throws(()=>sectorDirectoryMatches({name:'Euskotren'},rows),/ambiguous/i);
 assert.equal(sectorDirectoryMatches({name:'Euskotren Participaciones'},rows).length,1);
});
test('sector websites require the expected directory title and its website field, excluding footer links',()=>{
 const html='<title>HABE - Información financiera - Euskadi.eus</title><div class="r01gLocDataSociedad"><span class="r01gCommonDataSociedadTittle">Sitio Web:</span><span class="r01gCommonDataSociedadContent"><a href="http://habe.example.org/">HABE</a></span></div><footer><a href="https://weather.example.org">Meteorología</a></footer>';
 assert.equal(parseSectorWebsite(html,'HABE'),'https://habe.example.org/');assert.throws(()=>parseSectorWebsite(html,'Eustat'));
 assert.throws(()=>parseSectorWebsite(html.replace('http://habe.example.org/','http://127.0.0.1/'),'HABE'));
});
test('CPEN accepts only the company website field for the expected company',()=>{
 const html='<h1>CEIN</h1><a href="https://social.example.org">CPEN</a><a class="link-soc" href="http://www.cein.example.org">www.cein.example.org</a><a class="link-soc" href="info@cein.example.org">Email</a>';
 assert.equal(parseCpenWebsite(html,'CEIN'),'https://www.cein.example.org/');assert.throws(()=>parseCpenWebsite(html,'INTIA'));
 assert.throws(()=>parseCpenWebsite(html.replace('http://www.cein.example.org','https://user:password@www.cein.example.org'),'CEIN'));
});

test('sector website fields distinguish an explicit unpublished sentinel from unsafe or malformed links',()=>{
 const page=(href:string)=>`<title>Aukerak - Información financiera - Euskadi.eus</title><div class="r01gLocDataSociedad"><span class="r01gCommonDataSociedadTittle">Sitio Web:</span><span class="r01gCommonDataSociedadContent"><a href="${href}">No disponible.</a></span></div>`;
 assert.equal(parseSectorWebsite(page('No disponible.'),'Aukerak'),null);
 assert.throws(()=>parseSectorWebsite(page('javascript:alert(1)'),'Aukerak'));
 assert.throws(()=>parseSectorWebsite(page('not-a-published-website'),'Aukerak'));
});
