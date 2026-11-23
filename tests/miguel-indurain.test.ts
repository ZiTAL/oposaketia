import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseIndurainNews,parseIndurainVacancy} from '../scripts/scrapers/miguel-indurain';
test('Indurain selects its own hiring news and separates requirements from merits',()=>{
  const item=(title:string,url:string)=>`<div class="news-body"><h3 class="news-title">${title}</h3><a class="news-link" href="${url}">Leer más</a></div>`;
  const html=item('La Fundación Miguel Indurain abre un proceso de selección para incorporar una oficial administrativa','/es/noticias/empleo')+item('La Fundación abre una licitación de sus servicios de comunicación','/es/noticias/contrato')+'<ul class="pagination"><a href="/es/noticias?pagina=2&categoria=institucional">2</a></ul>';
  const list=parseIndurainNews(html);assert.equal(list.pages,2);assert.equal(list.urls.length,1);
  assert.equal(parseIndurainNews(html.replace('pagina=2&categoria=institucional','categoria=institucional')).pages,1);
  const call=parseIndurainVacancy('<h1 class="noticia-titulo">La Fundación Miguel Indurain abre un proceso de selección para incorporar una oficial administrativa</h1><div class="noticia-texto"><p>El puesto ofrece contrato de seis meses.</p><p>Entre los requisitos mínimos se encuentran disponer de experiencia y formación de grado superior de administración.</p><p>La Fundación valorará también euskera C1.</p></div>','https://www.fundacionmiguelindurain.com/es/noticias/empleo','2026-11-18T00:00:00Z');
  assert.equal(call.language,null);assert.equal(call.deadline,null);assert.equal(call.status,'Pendiente de confirmar');assert.deepEqual(call.acceptedQualifications,['fp-superior']);assert.doesNotMatch(call.educationText,/C1/);assert.deepEqual(call.topics,[]);
  assert.throws(()=>parseIndurainNews('<h1>Unavailable</h1>'));
});
