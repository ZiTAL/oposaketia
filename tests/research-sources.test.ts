import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBiogipuzkoaList} from '../scripts/scrapers/biogipuzkoa';
const now='2026-11-18T00:00:00.000Z';
test('Biogipuzkoa imports its own recent offers, excluding cancelled jobs, internships and old archives',()=>{
  const row=(id:number,title:string,end:string,state='ABIERTA')=>`<tr><td><a href="/ConvocatoriasPropiasBioef/es/Convocatorias/VerConvocatoria/${id}">${title}</a></td><td>18/11/2026 0:00</td><td>${end} 23:59</td><td>${state}</td></tr>`;
  const html='<h3 id="TipoConvocatoria">OFERTAS BIOGIPUZKOA</h3><div id="GvConvocatorias"><table><tbody>'+row(1,'Coordinador de ensayos clínicos en Hospital Donostia','03/12/2026')+row(2,'Oferta anulada','03/12/2026')+row(3,'Prácticas de verano','03/12/2026')+row(4,'Investigador','03/12/2023')+row(5,'Investigador postdoctoral','03/12/2026','CERRADA')+'</tbody></table></div>';
  const calls=parseBiogipuzkoaList(html,now);
  assert.equal(calls.length,2);assert.equal(calls[0].organization,'Biogipuzkoa');assert.equal(calls[0].province,'Gipuzkoa');assert.equal(calls[0].deadline,'2026-12-03');assert.equal(calls[0].status,'Abierta');assert.equal(calls[1].status,'Cerrada');assert.equal(calls[1].province,null);assert.deepEqual(calls[0].acceptedQualifications,[]);
  assert.throws(()=>parseBiogipuzkoaList(html.replace('OFERTAS BIOGIPUZKOA','OTRAS OFERTAS'),now));
});
