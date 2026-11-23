import {test} from 'node:test';import assert from 'node:assert/strict';import {parseMcpList,parseMcpDetail,enrichMcpBases} from '../scripts/scrapers/mcp';
const now='2026-11-20T00:00:00Z',url='https://www.mcp.es/oferta-de-empleo/puesto';
test('MCP selection cards preserve references and phase without mistaking display dates for application deadlines',()=>{
 const html='<h1>Ofertas de empleo</h1><ul><li><a href="/oferta-de-empleo/puesto"><h3>Puesto técnico</h3></a><p>REF. 2026/000038</p><p>18/11/2026 a 31/12/2026</p><p>✕ Proceso de selección</p></li></ul>';
 const [item]=parseMcpList(html);assert.equal(item.reference,'2026/000038');assert.equal(item.url,url);assert.equal(item.phase,'Proceso de selección');
 assert.throws(()=>parseMcpList(html.replace('/oferta-de-empleo/puesto','https://outside.test/oferta-de-empleo/puesto')));
});
test('MCP binds the public-company employer and minimum requirements to its own process and skips candidate documents',()=>{
 const item={url,title:'Puesto técnico',reference:'2026/000038',phase:'Proceso de selección'};
 const html='<h1>Ofertas de empleo</h1><div><div><p>✕ Proceso de selección</p><h1>Puesto técnico</h1><p>REF. 2026/000038</p></div><section>SCPSA, Sociedad de la Mancomunidad Comarca de Pamplona</section><section><h3>Requisitos:</h3><ul><li>Titulación mínima: Título de Bachiller.</li></ul></section><section><a href="https://recursos-prod.mcp.es/documents/convocatoria.pdf">CONVOCATORIA</a><a href="https://recursos-prod.mcp.es/documents/candidates.pdf">Lista de personas admitidas</a></section></div>';
 const call=parseMcpDetail(html,item,now);assert.equal(call.organization,'Servicios de la Comarca de Pamplona, S.A. (SCPSA)');assert.equal(call.deadline,null);assert.equal(call.status,'Pendiente de confirmar');assert.equal(call.documents.length,1);assert.deepEqual(call.acceptedQualifications,['bachiller']);assert.equal(call.province,'Navarra');assert.equal(call.languageStatus,'unknown');
 assert.throws(()=>parseMcpDetail(html.replace('2026/000038','2026/999999'),item,now));
 enrichMcpBases(call,'COMPETENCIAS TÉCNICAS: (Asimilable al Temario)\nConocimientos comunes\n• Conocimiento aplicado de la norma\nUNE-EN ISO/IEC 17025 y sistemas de calidad.\nPágina 2 de 7\n• Prevención de riesgos laborales.\nCOMPETENCIAS PERSONALES:\n• Trabajo en equipo.\nPLAZO DE PRESENTACIÓN\nFase Externa: hasta el 18/11/2026\nCOMISIÓN DE SELECCIÓN:',call.documents[0].url,now);
 assert.equal(call.deadline,'2026-11-18');assert.equal(call.status,'Cerrada');assert.equal(call.topics.length,2);assert.match(call.topics[0],/norma UNE-EN ISO/);assert.equal(call.topics.some(t=>/Página|Trabajo en equipo/.test(t)),false);
});
