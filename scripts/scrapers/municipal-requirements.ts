import {type Call} from '../../src/lib/catalogue';
import {clean,extractTopics,universityRequirementIds} from './shared';

export function enrichMunicipalBases(call:Call,text:string,url:string):Call{
  const value=text.replace(/\x07/g,'');
  const education=value.match(/(?:Estar|Hallarse) en posesi[oó]n[^\n]*(?:\n[^\n]+)*?(?=\n[ \t]*\n|\n\s*[a-z]\)|$)/i)?.[0];
  if(education&&/t[ií]tulo|titulaci[oó]n/i.test(education)){
    call.educationText=clean(education);call.acceptedQualifications=universityRequirementIds(call.educationText);
    // This is an explicit general university requirement, not a requirement
    // for a specific Architecture or Engineering specialty.
    if(/t[ií]tulo universitario de Grado, Diplomatura Universitaria, Ingenier[ií]a T[eé]cnica, Arquitectura T[eé]cnica/i.test(call.educationText))call.acceptedQualifications=['grado'];
  }
  const minimum=value.match(/(?:^|\n)\s*2[.ªº]?\s*[.–-]\s*(?:Requisitos|Condiciones de admisi[oó]n)[\s\S]*?(?=\n\s*3[.ªº]?\s*[.–-]|$)/i)?.[0];
  if(minimum&&/Poseer la titulaci[oó]n de C1 de Euskera/i.test(minimum)){call.language={name:'euskera',level:'C1'};call.languageStatus='known';}
  let topics=extractTopics(value);
  if(!topics.length){
    // Some official BOB programmes have an ANEXO I heading and explicit
    // Tema 1... entries without a standalone TEMARIO heading.
    const start=value.search(/^\s*Tema\s+1[.\-–]/m);
    if(start>=0)topics=extractTopics('TEMARIO\n'+value.slice(start));
  }
  if(topics.length){call.topics=topics;call.syllabusUrl=url;}
  return call;
}
