import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMoncayoBases} from '../scripts/scrapers/moncayo';

const now='2026-11-25T00:00:00.000Z';
const numbered=[1,2,3,4,5,6,7,8,9,10,11,12,11,13,14];
const paragraph=(value:string)=>`<p class="foral-f-parrafo-c">${value}</p>`;
const article=`<p class="a-denominacion">MANCOMUNIDAD DE AGUAS DEL MONCAYO</p>
<p class="a-titulo">Modificación convocatoria para la provisión, mediante concurso-oposición de dos puestos de trabajo de Encargado/a de la Mancomunidad de Aguas del Moncayo</p>
${[
 'Mediante Resolución de Presidencia número 3/2020, de 10 de enero, se corrigieron las bases.',
 '–La primera, al turno libre.',
 '–La segunda, al turno de promoción.',
 'b) Hallarse en posesión como mínimo del título de Bachiller, del título de FPII o titulación equivalente.',
 'e) Estar en posesión del carnet de conducir, clase C.',
 'Deberá disponer de la tarjeta de cualificación del conductor (CAP) antes del nombramiento.',
 'Las instancias se presentarán en el plazo de 30 días naturales a partir del siguiente al de la publicación.',
 'Temario',
 ...numbered.map((n,i)=>`${n}. ${i===14?'Seguridad y salud en el trabajo':'Materia '+(i+1)}`),
].map(paragraph).join('')}`;

test('Moncayo imports only the external turn and preserves the original annex numbering',()=>{
 const call=parseMoncayoBases(article,now);
 assert.equal(call.organization,'Mancomunidad de Aguas del Moncayo');
 assert.equal(call.places,1);assert.equal(call.status,'Cerrada');assert.equal(call.deadline,null);
 assert.equal(call.topics.length,15);assert.equal(call.topics[12].startsWith('11.'),true);
 assert.deepEqual(call.acceptedQualifications,['bachiller','fp-superior']);
 assert.throws(()=>parseMoncayoBases(article.replace('–La primera, al turno libre.','–La primera, al turno de promoción.'),now));
 assert.throws(()=>parseMoncayoBases(article.replace('carnet de conducir, clase C','carnet de conducir, clase B'),now));
});
