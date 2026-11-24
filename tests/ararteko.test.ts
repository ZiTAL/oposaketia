import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARARTEKO_JOBS,parseArartekoBases,parseArartekoList,parseArartekoPage} from '../scripts/scrapers/ararteko';

const pageUrl='https://transparencia.ararteko.eus/es/dos-tecnicos-o-tecnicas-de-area-resolucion-de-12-de-julio-de-2024';
const pdfUrl='https://transparencia.ararteko.eus/sites/default/files/2024-10/resolucion-de-12-de-julio-de-2024%2C-del-ararteko.pdf';

test('Ararteko reads its process navigation and the linked official bases',()=>{
 const html=`<h1 class="page-title">Procesos selectivos</h1><nav class="book-navigation"><ul class="menu"><li><a href="/es/dos-tecnicos-o-tecnicas-de-area-resolucion-de-12-de-julio-de-2024">Dos técnicos</a></li><li><a href="/es/tecnicoa-responsable-del-area-de-educacion-resolucion-de-21-de-diciembre-de-2023">Educación</a></li><li><a href="/es/tecnicoa-responsable-en-las-materias-de-contratacion-publica-y-de-gestion-contable-y-presupuestaria-resolucion-de-21-de-diciembre-de-2023">Contratación</a></li></ul></nav>`;
 const listings=parseArartekoList(html);
 assert.equal(listings.length,3);
 assert.equal(listings[0].pageUrl,pageUrl);
 const detail=`<h1 class="page-title">Dos técnicos de área - Resolución de 12 de julio de 2024</h1><div class="field--name-field-media-document"><a href="${pdfUrl}">Bases</a></div>`;
 assert.equal(parseArartekoPage('2024',pageUrl,detail).pdfUrl,pdfUrl);
 assert.throws(()=>parseArartekoPage('2024',pageUrl,detail.replace(pdfUrl,ARARTEKO_JOBS)));
});

test('Ararteko keeps mandatory C1 separate from merit C2 and does not calculate relative deadlines',()=>{
 const listing={key:'2024' as const,pageUrl,pdfUrl};
 const text=`BOLETÍN OFICIAL DEL PAÍS VASCO 2024/4070. RESOLUCIÓN del Ararteko. Segunda.– Requisitos. Disponen del título universitario de licenciatura o de grado en Derecho y acrediten una experiencia de, al menos, dos años en funciones jurídicas. Asimismo, deberán acreditar, como mínimo, un conocimiento de euskera correspondiente al nivel C1. Tercera.– Méritos. Conocimiento de euskera (nivel C2). Las solicitudes se presentarán dentro del plazo de 15 días hábiles contados a partir del siguiente a la publicación de la presente Resolución en el Boletín Oficial del País Vasco.`;
 const call=parseArartekoBases(listing,text,'a'.repeat(64),'2026-11-24T09:00:00.000Z');
 assert.equal(call.status,'Cerrada');assert.equal(call.deadline,null);
 assert.deepEqual(call.language,{name:'euskera',level:'C1'});
 assert.equal(call.places,2);assert.deepEqual(call.topics,[]);
 assert.throws(()=>parseArartekoBases(listing,text.replace('nivel C1','nivel C2'),'a'.repeat(64),'2026-11-24T09:00:00.000Z'));
});
