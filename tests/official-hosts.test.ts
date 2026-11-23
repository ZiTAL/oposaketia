import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedUrl} from '../scripts/scrapers/http';
test('municipal discovery requires explicit host approval and preserves URL restrictions',()=>{
 assert.throws(()=>allowedUrl('https://udal.example.org/'));
 assert.equal(allowedUrl('https://udal.example.org/',['udal.example.org']).hostname,'udal.example.org');
 for(const url of ['https://other.example.org/','https://sub.udal.example.org/','http://udal.example.org/','https://user:password@udal.example.org/','https://udal.example.org:8443/'])assert.throws(()=>allowedUrl(url,['udal.example.org']));
 for(const host of ['localhost','127.0.0.1','169.254.169.254','printer.local','node.internal'])assert.throws(()=>allowedUrl('https://'+host+'/',[host]));
});
