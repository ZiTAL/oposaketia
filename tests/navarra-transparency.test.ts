import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseNavarraTransparency,matchNavarraTransparency} from '../scripts/navarra-transparency';
test('Navarra transparency binds company websites to their own legal row and omits tax/contact fields',()=>{
 const html='<h1>Sociedades Públicas</h1><table><tr><td class="views-field-title">TRACASA</td><td class="views-field-field-nif">NOT-EXPORTED</td><td class="views-field-field-nombre-entidad">TRABAJOS CATASTRALES, S.A.</td><td class="views-field-field-web-transparencia"><a href="https://tracasa.es/transparencia/">✔</a></td></tr><tr><td class="views-field-title">TRACASA INSTRUMENTAL</td><td class="views-field-field-nombre-entidad">TRACASA INSTRUMENTAL, S.L.</td><td class="views-field-field-web-transparencia"><a href="https://itracasa.es/transparencia/">✔</a></td></tr></table>';
 const rows=parseNavarraTransparency(html,'companies');assert.equal(rows.length,2);assert.equal(JSON.stringify(rows).includes('NOT-EXPORTED'),false);
 assert.equal(matchNavarraTransparency({id:'a',name:'TRACASA Instrumental'},rows)?.url,'https://itracasa.es/transparencia/');assert.equal(matchNavarraTransparency({id:'b',name:'TRACASA'},rows)?.url,'https://tracasa.es/transparencia/');
 assert.throws(()=>parseNavarraTransparency(html.replace('https://tracasa.es/transparencia/','https://user:pass@tracasa.es/'),'companies'));
});
test('Navarra institutional and foundation references require the expected heading and named institutional links',()=>{
 const html='<h1>Fundaciones y consorcios</h1><div class="field"><a href="https://www.fundapa.org/">Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad</a><a href="https://www.navarra.es/presupuestos">Ley Foral de Presupuestos</a></div>';
 const rows=parseNavarraTransparency(html,'foundations');assert.equal(rows.length,1);assert.equal(matchNavarraTransparency({id:'f',name:'Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad'},rows)?.url,'https://www.fundapa.org/');
 assert.throws(()=>parseNavarraTransparency('<h1>Error</h1>','foundations'));
});
test('Navarra agencies bind named service websites, skip statutes and retain published relative institutional references',()=>{
 const rows=parseNavarraTransparency('<h1>Organismos Autónomos</h1><div class="field"><a href="https://www.navarra.es/es/hacienda">HACIENDA FORAL DE NAVARRA</a><a href="https://www.lexnavarra.navarra.es/statute">- Estatutos</a><a href="http://www.euskarabidea.es/castellano">EUSKARABIDEA/INSTITUTO NAVARRO DEL EUSKERA</a></div>','agencies');assert.equal(rows.length,2);assert.equal(matchNavarraTransparency({id:'e',name:'Euskarabidea'},rows)?.url,'https://www.euskarabidea.es/castellano');
 const [administration]=parseNavarraTransparency('<h1>Sector Público Foral</h1><div class="field"><a href="/transparencia/funciones-estructura-organigrama">Administración de la Comunidad Foral de Navarra</a></div>','institutions');assert.equal(administration.url,'https://gobiernoabierto.navarra.es/transparencia/funciones-estructura-organigrama');
});
