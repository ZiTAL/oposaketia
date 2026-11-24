import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseElankidetzaBases,parseElankidetzaDetail,parseElankidetzaIndex} from '../scripts/scrapers/elankidetza';

const now='2026-11-24T12:00:00.000Z';
const profiles=[
 ['admin','Administrativo/a general','/administrativo/avcd/webela01-edukiconsolidacion/es/','consolidacion_adm'],
 ['cooperation','Técnico/a de cooperación','/tecnico-cooperacion/webela01-edukiconsolidacion/es/','consolidacion_tek_coop'],
 ['it','Técnico/a informático/a','/tecnico-en-informatica/avcd/webela01-edukiconsolidacion/es/','consolidacion_tek_inf'],
] as const;

test('eLankidetza resolves the three official profiles and their own bases URLs',()=>{
 const index=`<h1>Proceso especial de consolidación de empleo</h1><p>concurso de méritos de 4 puestos</p>${profiles.map(([,label,path])=>`<a href="${path}">${label}</a>`).join('')}`;
 const listings=parseElankidetzaIndex(index);
 assert.deepEqual(listings.map(item=>item.key),['admin','cooperation','it']);
 for(const [index,[,label,,pdfPath]] of profiles.entries()){
  const pdfUrl=`https://www.elankidetza.euskadi.eus/contenidos/informacion/${pdfPath}/es_def/adjuntos/boletin_cast.pdf`;
  const detail=`<h1>${label}</h1><p>29/12/2022 - 26/01/2023</p><a href="${pdfUrl}">(Anexo I) (PDF)</a><a href="${pdfUrl}">(Anexo II) (PDF)</a>`;
  assert.equal(parseElankidetzaDetail(listings[index],detail),pdfUrl);
  assert.throws(()=>parseElankidetzaDetail(listings[index],detail.replaceAll(pdfUrl,'https://example.org/bases.pdf')));
 }
});

test('eLankidetza checks each vacancy and keeps the IT language date unknown',()=>{
 const listings=profiles.map(([key,,path])=>({key,pageUrl:`https://www.elankidetza.euskadi.eus${path}`}));
 const text=`2022/5691 Agencia Vasca de Cooperación para el Desarrollo. concurso de méritos. dos puestos de Administrativo/a General, un puesto de Técnico/a Informático/a y un puesto de Técnico/a de Cooperación. ANEXO II título de Bachiller, de Técnico o equivalente. Administrativo/a General 2 05-2019 1. ANEXO III Técnico/a de Cooperación 4 12-2010 1. Técnico/a de Cooperación es requisito disponer de una titulación de grado, licenciatura, ingeniería y arquitectura de cualquier campo de estudio. Técnico/a Informático/a 3 1. Técnico/a Informático/a es requisito disponer de una titulación de grado, licenciatura o ingeniería. Ingeniería de telecomunicación.`;
 const calls=listings.map(listing=>parseElankidetzaBases(listing,'https://www.elankidetza.euskadi.eus/bases.pdf',text,'a'.repeat(64),now));
 assert.deepEqual(calls.map(call=>call.places),[2,1,1]);
 assert.deepEqual(calls.map(call=>call.deadline),['2023-01-26','2023-01-26','2023-01-26']);
 assert.equal(calls[0].language?.level,'B2');assert.equal(calls[1].language?.level,'C2');
 assert.equal(calls[2].language,null);assert.equal(calls[2].languageStatus,'unknown');
 assert.equal(calls[2].syllabusUrl,null);
 assert.throws(()=>parseElankidetzaBases(listings[0],'https://www.elankidetza.euskadi.eus/bases.pdf',text.replace('Administrativo/a General 2 05-2019 1','Administrativo/a General 1 05-2019 1'),'a'.repeat(64),now));
});
