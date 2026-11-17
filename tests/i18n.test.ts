import {test}from'node:test';import assert from'node:assert/strict';
import {locales,isLocale,localizedPath,pathLocale,defaultLocale}from'../src/lib/i18n/locales';
import {messages,messageEntries,translate}from'../src/lib/i18n/messages';
import {categoryChoices,provinceChoices,statusChoices,qualifications,filterCalls,defaultProfile,catalogueSchema}from'../src/lib/catalogue';
import demo from'../data/demo.json';
test('all UI message entries provide three non-empty translations with the same interpolation fields',()=>{
 assert.equal(defaultLocale,'eu');
 assert.equal(new Set(messageEntries.map(([key])=>key)).size,messageEntries.length);
 const placeholders=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 for(const [es,eu,fr]of messageEntries){for(const text of [es,eu,fr])assert.ok(text.trim(),es);assert.deepEqual(placeholders(eu),placeholders(es),es);assert.deepEqual(placeholders(fr),placeholders(es),es);}
 for(const key of [...categoryChoices,...provinceChoices.filter(p=>p!=='Sin concretar'),...statusChoices,...qualifications.map(q=>q.label)])for(const locale of locales)assert.ok(messages[locale][key],`${locale}: ${key}`);
 assert.equal(translate('fr','Página {page} de {pages} · {count} resultados',{page:2,pages:4,count:75}),'Page 2 sur 4 · 75 résultats');
});
test('locale URLs preserve paths, query strings and fragments, without accepting external destinations',()=>{
 assert.equal(localizedPath('/oposiciones/call-1?sort=name#temario','eu'),'/eu/oposiciones/call-1?sort=name#temario');
 assert.equal(localizedPath('/fr/fuentes','es'),'/es/fuentes');assert.equal(localizedPath('/es?x=1#filters','fr'),'/fr?x=1#filters');
 assert.equal(localizedPath('/','eu'),'/eu');assert.equal(pathLocale('/fr/oposiciones/test'),'fr');assert.equal(pathLocale('/france'),null);assert.equal(isLocale('de'),false);
 assert.throws(()=>localizedPath('//example.com','fr'));assert.throws(()=>localizedPath('https://example.com','es'));
});
test('localizing labels does not mutate saved enum values and localized province searches work',()=>{
 const calls=catalogueSchema.parse(demo);const profile={...defaultProfile,provinces:['Bizkaia' as const],categories:['Administración' as const]};
 assert.equal(filterCalls(calls,profile)[0].id,filterCalls(calls,profile,false,key=>translate('fr',key))[0].id);
 assert.equal(filterCalls(calls,{...defaultProfile,search:'Biscaye'},false,key=>translate('fr',key))[0].id,'auxiliar-administracion');
 assert.equal(profile.provinces[0],'Bizkaia');assert.equal(translate('fr','Un titre officiel non traduit'),'Un titre officiel non traduit');
});
