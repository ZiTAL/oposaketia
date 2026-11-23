import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFENSOR_LIST,parseDefensorList,parseDefensorDetail,enrichDefensorBases} from '../scripts/scrapers/defensor-navarra';
const now='2026-11-20T16:00:00.000Z';
const url=DEFENSOR_LIST+'/convocatoria-administrativo';
const title='Convocatoria para la provisión, mediante concurso de méritos, de una plaza de Administrativo/a';
const page=(deadline='de 28 de diciembre de 2022 a 11 de enero de 2023')=>`<h1>${title}</h1><div id="content-for-layout"><div class="article"><h2>${title}</h2><p>PLAZO DE PRESENTACIÓN DE SOLICITUDES: ${deadline}.</p><a href="/files/bases.pdf">Bases reguladoras de la convocatoria</a><a href="/files/solicitud.pdf">Solicitud de participación</a><a href="/files/resultado.pdf">Resultado valoración de méritos</a><p>Resolución de nombramiento de PERSONA PRIVADA.</p></div></div>`;
test('Defensor discovers only its own personnel calls, excluding rosters, recommendations, forms and other origins',()=>{
 const html=`<h1>Información sobre personal [Art. 19]</h1><a href="${url}">${title}</a><a href="${url}">${title}</a><a href="${DEFENSOR_LIST}/lista-contratacion-temporal">Lista de contratación temporal</a><a href="/es/resoluciones-defensor/convocatoria">Convocatoria de otro organismo</a><a href="https://evil.example${new URL(url).pathname}">${title}</a><a href="${DEFENSOR_LIST}/resultado">Resultado de convocatoria</a>`;
 assert.deepEqual(parseDefensorList(html),[{title,url}]);
 assert.throws(()=>parseDefensorList('<h1>Recomendaciones sobre empleo público</h1>'));
});
test('Defensor uses the explicit application range, leaves relative deadlines unknown and never exports candidate text',()=>{
 const call=parseDefensorDetail(page(),url,now);
 assert.equal(call.deadline,'2023-01-11');assert.equal(call.status,'Cerrada');assert.equal(call.places,1);
 assert.equal(call.documents.length,1);assert.equal(call.documents[0].checkedAt,null);
 assert.equal(JSON.stringify(call).includes('PERSONA PRIVADA'),false);
 assert.equal(parseDefensorDetail(page('quince días desde su publicación en el BON'),url,now).deadline,null);
 assert.equal(parseDefensorDetail(page('de 1 de noviembre de 2026 a 31 de noviembre de 2026'),url,now).deadline,null);
 assert.equal(parseDefensorDetail(page('de 1 de diciembre de 2026 a 10 de diciembre de 2026'),url,now).status,'Próximamente');
 assert.throws(()=>parseDefensorDetail(page().replace('/files/bases.pdf','https://evil.example/bases.pdf'),url,now));
});
test('Defensor verifies legal identity and separates mandatory studies from merit degrees and the parliamentary employer',()=>{
 const call=parseDefensorDetail(page(),url,now);
 const text=`ANEXO I\nBases reguladoras de la convocatoria de Administrativo/a de la oficina del Defensor del Pueblo de Navarra\n1. Objeto\nEl nombramiento conferirá el carácter de funcionario o funcionaria del Parlamento de Navarra.\n2. Requisitos.\n2.1. Para ser admitidas\na) Nacionalidad.\nb) Edad.\nc) Hallarse en posesión del título de bachiller superior, formación profesional de segundo\ngrado, o equivalente.\nd) Capacidad.\n2.4. No podrán concurrir quienes sean personal fijo con puesto de Administrativo/a.\n3. Solicitudes\n4. Méritos: Grado en Derecho y euskera C1.`;
 const enriched=enrichDefensorBases(call,text);
 assert.deepEqual(enriched.acceptedQualifications,['bachiller','fp-superior']);
 assert.match(enriched.organization,/Parlamento de Navarra/);assert.match(enriched.organization,/Defensor/);
 assert.equal(enriched.languageStatus,'unknown');assert.equal(enriched.language,null);assert.deepEqual(enriched.topics,[]);
 assert.equal(enriched.educationText.includes('Derecho'),false);
 assert.throws(()=>enrichDefensorBases(parseDefensorDetail(page(),url,now),text.replaceAll('Administrativo/a','Técnico/a')));
 assert.throws(()=>enrichDefensorBases(parseDefensorDetail(page(),url,now),text.replaceAll('Defensor del Pueblo de Navarra','Otra institución')));
});
