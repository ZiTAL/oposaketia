import {load} from 'cheerio';import {callSchema,normalize,type Call} from '../../src/lib/catalogue';import {OfficialClient,hash} from './http';import {baseCall,categoryFor,clean,extractTopics,linkList,pdfText,universityRequirementIds} from './shared';import {enrichMunicipalBases} from './municipal-requirements';
export const VALDIZARBE_LIST='https://www.mancomunidadvaldizarbe.com/empleo/';
const company='Servicios Arga Valdizarbe / Arga Izarbeibarko Zerbitzuak, S.L.';
export function parseValdizarbe(html:string,now:string):Call[]{
 const $=load(html),blocks=$('.page-builder-tabs__tabpanel .block-text');if(!blocks.length)throw new Error('Valdizarbe published employment tabs missing');
 const calls:Call[]=[];
 for(const block of blocks.toArray()){
  let title='',parts:string[]=[];
  const finish=()=>{
   if(!title)return;if(/restringid|personal fijo|traslado|promocion interna/.test(normalize(title)))return;
   const section=load(parts.join('')),links=linkList(section,'a[href]',VALDIZARBE_LIST).filter(link=>{const url=new URL(link.url);return url.origin==='https://www.mancomunidadvaldizarbe.com'&&!url.username&&!url.password&&!url.port&&/\.pdf$/i.test(url.pathname);});
   const bases=links.filter(link=>/^bases de la convoca(?:toria|toia)$|^condicionado para cubrir/i.test(link.title));
   const unique=[...new Map(bases.map(link=>[link.url,link])).values()];if(unique.length!==1)throw new Error('Valdizarbe process legal bases missing or ambiguous');
   const call=baseCall('valdizarbe',unique[0].url,now,'Navarra');call.sourceUrl=VALDIZARBE_LIST;call.title=title;call.organization=/servicios arga valdizarbe/.test(normalize(title))?company:'Mancomunidad de Valdizarbe / Izarbeibarko Mankomunitatea';call.location='Valdizarbe / Izarbeibar';call.province='Navarra';call.category=categoryFor(title);
   const phase=normalize(title+' '+links.map(link=>link.title).join(' '));
   if(/desistid|desiert|nombramiento|acta puntuaciones definitivas/.test(phase))call.status='Cerrada';else if(/admitid|excluid|resultado|puntuaciones/.test(phase))call.status='En curso';
   const annexes=links.filter(link=>/^(?:anexo\s+II\s*[.\-–]?\s*temario|temario|anexo\s+IV\s*[.\-–:]?\s*titulaciones)$/i.test(link.title));
   call.documents=[...unique,...annexes].filter((link,index,all)=>all.findIndex(other=>other.url===link.url)===index).map(link=>({...link,kind:/temario/i.test(link.title)?'temario':'bases',checkedAt:null,sha256:null}));
   call.description='Proceso publicado en los apartados anuales de empleo de la Mancomunidad de Valdizarbe. Se distinguen la mancomunidad y su empresa pública cuando las bases identifican el empleador contractual. Se leen bases, anexo académico y temario; se excluyen turnos reservados al personal fijo y formularios de candidatura. No se calculan plazos relativos ni se deducen titulaciones del puesto.';
   call.sourceHash=hash(title+section.html());calls.push(callSchema.parse(call));
  };
  for(const paragraph of $(block).children('p').toArray()){
   const p=$(paragraph),value=clean(p.text());if(p.children('strong').length&&/^Convocatoria\b/i.test(value)){finish();title=value;parts=[];}else if(title)parts.push($.html(paragraph));
  }finish();
 }
 if(!calls.length||new Set(calls.map(call=>call.id)).size!==calls.length)throw new Error('Valdizarbe public process count missing or duplicated');return calls;
}
function spanishColumn(text:string):string{
 const lines=text.split(/\r?\n/),header=lines.slice(0,80).find(line=>{const index=line.indexOf('DEIALDIA');return index>=45&&index<=180;});
 if(!header)return text;const boundary=header.indexOf('DEIALDIA'),start=header.search(/\b(?:CONVOCATORIA|CONDICIONADO)\b/);
 return lines.map(line=>line.slice(start>=0&&start<boundary?start:0,boundary).trimEnd()).join('\n');
}
export function enrichValdizarbeBases(call:Call,text:string,url:string):Call{
 const spanish=spanishColumn(text);enrichMunicipalBases(call,spanish,url);
 const alternatives=spanish.match(/(?:Estar|Hallarse) en posesi[oó]n[\s\S]{0,500}?alguna de las siguientes titulaciones acad[eé]micas[\s\S]{0,2200}?(?=\n\s*C\))/i)?.[0];
 if(alternatives){call.educationText=clean(alternatives);call.acceptedQualifications=universityRequirementIds(alternatives);}
 const bulletRequirements=spanish.match(/Estar en posesi[oó]n de:\s*([–-]\s*Un t[ií]tulo de Diplomatura,[\s\S]{0,2500}?)(?=\n\s*d\))/i)?.[1];
 if(bulletRequirements){
  call.educationText=clean(bulletRequirements.split(/\n\s*[–-]\s+/)[0].replace(/^[–-]\s*/,''));call.acceptedQualifications=universityRequirementIds(call.educationText);call.requirements=[clean(bulletRequirements),...call.requirements];
  if(/Conocimiento de euskera de nivel B2 acreditado/.test(clean(bulletRequirements))){call.language={name:'euskera',level:'B2'};call.languageStatus='known';}
 }
 if(/un t[ií]tulo de diplomatura, (?:licenciatura o )?grado universitario o equivalente/i.test(clean(call.educationText)))call.acceptedQualifications=['grado'];
 const minimum=spanish.match(/Base\s+2[.\-–]+[\s\S]*?(?=Base\s+3[.\-–]|$)/i)?.[0];
 const language=minimum?.match(/2\.\d+\.\s*Estar en posesi[oó]n del t[ií]tulo de euskera, nivel\s+(B2|C1)([\s\S]*?)(?=\n2\.\d+\.|$)/i);
 if(language){call.language={name:'euskera',level:language[1].toUpperCase() as 'B2'|'C1'};call.languageStatus='known';call.requirements=[clean(language[0]),...call.requirements];}
 if(/secretaria/.test(normalize(call.title))&&/F\)\s*Acreditar el grado de dominio[\s\S]{0,1200}?\(C1, EGA/i.test(spanish)){
  call.language={name:'euskera',level:'C1'};call.languageStatus='known';call.requirements=['El apartado F de los requisitos exige euskera C1, mediante acreditación o las pruebas específicas previstas en las bases.',...call.requirements];
 }
 if(/personal laboral\s+temporal de la empresa Servicios Arga[\s\S]{0,100}Valdizarbe/i.test(spanish)){
  call.organization=company;call.requirements=['La base 1.5 identifica como empleadora contractual a Servicios Arga Valdizarbe / Arga Izarbeibarko Zerbitzuak, S.L.',...call.requirements];
 }
 return call;
}
export function enrichValdizarbeAnnex(call:Call,text:string,kind:'temario'|'titulaciones',url:string):Call{
 if(kind==='temario'){
  if(!/ANEXO\s+II\b|TEMARIO/i.test(text))throw new Error('Valdizarbe programme annex heading missing');let topics=extractTopics(text);if(!topics.length)topics=extractTopics('TEMARIO\n'+text.replace(/^\s*ANEXO\s+II\b[^\n]*/gm,''));if(!topics.length)throw new Error('Valdizarbe programme requires format review');call.topics=topics;call.syllabusUrl=url;
 }else{
  const start=text.search(/ANEXO\s+IV\s*[:.\-–]?\s*TITULACIONES/i);if(start<0)throw new Error('Valdizarbe academic annex heading missing');
  // Signed annexes may contain names, tax identifiers and verification stamps
  // before the academic list. Retain only the published degree rows.
  const rows=text.slice(start).split(/\r?\n/).map(clean).filter(line=>/^(?:GRADO\s+en\b|INGENIERO\s+T[ÉE]CNICO\b|ARQUITECTO\s+T[ÉE]CNICO\b)/i.test(line));
  if(!rows.length)throw new Error('Valdizarbe academic rows require format review');call.educationText='Titulaciones admitidas según el Anexo IV: '+rows.join('; ');call.acceptedQualifications=universityRequirementIds(rows.join('; '));
 }return call;
}
export function matchesValdizarbeBases(title:string,text:string):boolean{
 const expected=normalize(title),spanish=spanishColumn(text),start=spanish.search(/\b(?:CONVOCATORIA|CONDICIONADO)\b/i),opening=start<0?'':normalize(clean(spanish.slice(start,start+10000).split(/\n\s*(?:BASES\s*\n|Base\s+1[.\-–])/i,1)[0])).slice(0,7000);
 if(/oficial administrativ/.test(expected))return /oficial administrativ/.test(opening);
 if(/agente de acompanamiento/.test(expected))return /agente de acompanamiento/.test(opening);
 if(/igualdad/.test(expected))return /\b(?:tecnic[oa](?:\/a)?|agente)\s+(?:(?:de|en)\s+)?igualdad\b/.test(opening);
 if(/ingenieria|arquitectura/.test(expected))return /ingenieria|arquitectura|oficina tecnica/.test(opening);
 if(/secretaria/.test(expected))return /condicionado[\s\S]{0,1200}secretaria/.test(opening);
 return false;
}
export async function scrapeValdizarbe(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseValdizarbe(await client.text(VALDIZARBE_LIST),now);
 for(const call of calls){for(const doc of call.documents){try{const pdf=await pdfText(client,doc.url);doc.checkedAt=now;doc.sha256=pdf.sha256;
  if(doc.kind==='temario')enrichValdizarbeAnnex(call,pdf.text,'temario',doc.url);
  else if(/titulaciones/i.test(doc.title))enrichValdizarbeAnnex(call,pdf.text,'titulaciones',doc.url);
  else{if(!matchesValdizarbeBases(call.title,pdf.text)){call.documents=call.documents.filter(item=>item.url!==doc.url);call.requirements=['El enlace de bases publicado no permite confirmar este puesto; se ha excluido de sus documentos. Las condiciones de acceso necesitan verificación en la fuente oficial.',...call.requirements];warn(`${doc.url}: Linked bases do not confirm this post; excluded from its documents and requirements`);continue;}enrichValdizarbeBases(call,pdf.text,doc.url);}
 }catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'Document unavailable'}`);}}
  if(!call.acceptedQualifications.length)warn(`${call.id}: Academic qualifications remain unconfirmed; consult the linked bases and annexes`);
  if(!call.topics.length)warn(`${call.id}: Programme not automatically extracted; consult the linked bases`);
 }
 return calls.map(call=>callSchema.parse(call));
}
