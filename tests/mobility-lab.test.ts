import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMobilityLabBases,parseMobilityLabIndex} from '../scripts/scrapers/mobility-lab';

const codes=['202601mobilitylab','202602mobilitylab','202603mobilitylab'] as const;
const pdf=(code:string,kind:string)=>`https://www.qualisconsultores.es/wp-content/uploads/2026/06/${code}-${kind}.pdf`;
const section=(code:string)=>`<div class="wpb_text_column"><h3>FUNDACIÓN VITORIA – GASTEIZ ARABA MOBILITY LAB: TÉCNICO/A / REF. ${code}</h3></div><div class="wpb_text_column"><a href="${pdf(code,'general')} ">Bases Generales / Oinarri Orokorrak</a><a href="${pdf(code,'specific')} ">Bases Específicas / Oinarri Espezifikoak</a><a href="${pdf(code,'results')}">Listado de puntuaciones definitivas</a></div>`;

test('Mobility Lab selects three external bases pairs and excludes internal promotion and results',()=>{
 const html=`<h2>OFERTA PÚBLICA DE EMPLEO: PROCESOS EN CURSO</h2>${codes.map(section).join('')}<h3>FUNDACIÓN VITORIA – GASTEIZ ARABA MOBILITY LAB: PROMOCIÓN INTERNA / REF. 202604mobilitylab</h3>`;
 const listings=parseMobilityLabIndex(html);
 assert.deepEqual(listings.map(item=>item.code),codes);
 assert.equal(listings[0].generalUrl,pdf(codes[0],'general'));
 assert.equal(listings[2].specificUrl,pdf(codes[2],'specific'));
 assert.throws(()=>parseMobilityLabIndex(html.replace(pdf(codes[1],'specific'),'https://example.org/foreign.pdf')));
});

test('Mobility Lab does not impose merit-only Basque in the European projects call',()=>{
 const listing={code:'202603mobilitylab' as const,generalUrl:pdf('202603mobilitylab','general'),specificUrl:pdf('202603mobilitylab','specific')};
 const general='FUNDACIÓN VITORIA-GASTEIZ ARABA MOBILITY LAB. código de convocatoria: 202603mobilitylab. cobertura de un puesto de: Técnica/o Proyectos Europeos. Parque Tecnológico de Vitoria-Gasteiz. El plazo de presentación de solicitudes será hasta el 18 de junio de 2026.';
 const specific='FUNDACIÓN VITORIA-GASTEIZ ARABA MOBILITY LAB. código de convocatoria: 202603mobilitylab. PUESTO DE TÉCNICO/A DE PROYECTOS EUROPEOS. El plazo de presentación de solicitudes será hasta el 18 de junio de 2026. FASE 1: Ingeniería, logística, arquitectura o similares. Inglés – C1. FASE 2: Idiomas: Euskera C1 /C2 (5 puntos).';
 const call=parseMobilityLabBases(listing,general,specific,'a'.repeat(64),'b'.repeat(64),'2026-11-24T12:00:00.000Z');
 assert.equal(call.places,1);assert.equal(call.deadline,'2026-06-18');
 assert.equal(call.language,null);assert.match(call.requirements.join(' '),/Inglés C1 preceptivo/);
 assert.equal(call.documents.length,2);assert.equal(call.syllabusUrl,null);
 assert.throws(()=>parseMobilityLabBases(listing,general,specific.replace('C1 /C2 (5 puntos)','C1 obligatorio'),'a'.repeat(64),'b'.repeat(64),'2026-11-24T12:00:00.000Z'));
});
