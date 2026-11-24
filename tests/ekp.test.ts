import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEkpBases,parseEkpIndex} from '../scripts/scrapers/ekp';

const urls={
 '2026001ekp':'https://www.qualisconsultores.es/wp-content/uploads/2026/03/2026001EKP-bases-aux-admin2026-rev-EKP.pdf',
 '2026002ekp':'https://www.qualisconsultores.es/wp-content/uploads/2026/06/2026002EKP-DEF-bases-resp-explotacion-gipuzkoa-.pdf',
};
const section=(code:keyof typeof urls,role:string)=>`<div class="wpb_text_column"><div class="wpb_wrapper"><h3>EUSKADIKO KIROL PORTUAK: ${role} / REF. ${code}</h3></div></div><div class="wpb_text_column"><a href="${urls[code]} ">Bases Generales y Específicas</a><a href="https://www.qualisconsultores.es/candidatos-${code}.pdf">Relación de admitidos/as provisionales</a></div>`;

test('EKP selects only its two original bases, ignoring candidate documents and other employers',()=>{
 const html=`<h2>OFERTA PÚBLICA DE EMPLEO: PROCESOS EN CURSO</h2>${section('2026001ekp','AUXILIAR ADMINISTRATIVO/A')}${section('2026002ekp','RESPONSABLE DE EXPLOTACIÓN PORTUARIA')}<h3>OTRA EMPRESA: OFERTA / REF. 2026003ekp</h3>`;
 const listings=parseEkpIndex(html);
 assert.deepEqual(listings.map(item=>item.code),['2026001ekp','2026002ekp']);
 assert.deepEqual(listings.map(item=>item.basesUrl),[urls['2026001ekp'],urls['2026002ekp']]);
 assert.throws(()=>parseEkpIndex(html.replace(urls['2026001ekp'],'https://example.org/bases.pdf')));
});

test('EKP checks vacancy, qualification, location, language and deadline in its own PDF',()=>{
 const text='código de convocatoria: 2026001ekp. Bases para la cobertura de un puesto de Auxiliar Administrativo/a al servicio de Euskadiko Kirol Portuak. El puesto se desempeñará en el puerto deportivo de Mutriku. El plazo de presentación de solicitudes será hasta el 9 de abril de 2026. Formación: Grado Medio en Administración y Finanzas, gestión administrativa, asistencia a la dirección o similar. Experiencia mínima de 6 meses. Permiso de conducir B. Euskera Nivel PL-2 o B2 o equivalente.';
 const call=parseEkpBases({code:'2026001ekp',basesUrl:urls['2026001ekp']},text,'a'.repeat(64),'2026-11-24T12:00:00.000Z');
 assert.equal(call.places,1);assert.equal(call.location,'Mutriku');assert.equal(call.deadline,'2026-04-09');
 assert.equal(call.language?.level,'B2');assert.equal(call.documents[0]?.url,urls['2026001ekp']);
 assert.throws(()=>parseEkpBases({code:'2026001ekp',basesUrl:urls['2026001ekp']},text.replace('9 de abril','10 de abril'),'a'.repeat(64),'2026-11-24T12:00:00.000Z'));
});
