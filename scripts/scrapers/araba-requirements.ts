import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {clean,universityRequirementIds} from './shared';

const heading=/^(?:bases?\s+)?(?:\d{1,2}(?:\.\d{1,2})?[.ªº–-]+|(?:primera|segunda|tercera|cuarta|quinta|sexta|septima|octava|novena|decima)\.?)[\s.–-]*(.+)$/;
const sectionName=/^(?:requisitos|condiciones de admision|presentacion|solicitudes|instancias|perfil linguistico|conocimientos?|sistema|proceso|pruebas|tribunal|desarrollo|seleccion|meritos|adjudicacion|documentacion|plazos|funciones|contratacion)\b/;
function section(lines:string[],topic:RegExp):string[]{
 const headings=lines.flatMap((line,index)=>{const match=normalize(line).match(heading);return match&&sectionName.test(match[1])?[{index,title:match[1]}]:[];});
 const i=headings.findIndex(item=>topic.test(item.title));
 if(i<0)return [];
 return lines.slice(headings[i].index+1,headings[i+1]?.index);
}
function academicParagraph(lines:string[]):string|null{
 const education=/titul|graduad|bachiller|certificado de escolaridad|formacion profesional|\bfp\b/;
 const start=lines.findIndex((line,index)=>{
  let preview=line;
  for(const next of lines.slice(index+1,index+3)){
   if(!next||/^(?:[a-z][).]|[•–-])\s*/.test(next))break;
   preview+=' '+next;
  }
  const text=normalize(preview);
  return /estar en posesion|hallarse en posesion|tener|poseer|disponer|acreditar/.test(text)&&education.test(text)&&!(/euskera|euskara|linguistico/.test(text)&&!/grado|licenciatura|diplomatura|bachiller|formacion profesional/.test(text));
 });
 if(start<0)return null;
 const result=[lines[start]];
 for(const line of lines.slice(start+1)){
  if(!line)break;
  const value=normalize(line);
  if(/^(?:debera|debe|tener|poseer|disponer|estar|hallarse)\b/.test(value)&&/permiso|carnet|capacidad|nacionalidad|edad|inhabilitacion|experiencia|euskera/.test(value)&&!education.test(value))break;
  if(/^(?:[a-z][).]|[•–-])\s*/.test(line)&&!education.test(value)&&!/licenciatura|diplomatura|ingenier|arquitect|grado\b/.test(value))break;
  if(result.join(' ').length+line.length>5000)break;
  result.push(line);
 }
 return clean(result.join(' ')).replace(/^(?:[a-z][).]|[•–-])\s*/,'');
}
export function enrichArabaBases(target:Call,text:string,url:string):Call{
 const call=callSchema.parse(target);
 const doc=new URL(url),identity=doc.pathname.match(/\/botha\/Boletines\/(\d{4})\/(\d+)\/\1_\2_(\d+)_C\.pdf$/i);
 if(identity){
  const [,year,number,notice]=identity;
  if(!text.includes(`${year}-${notice}`)||!new RegExp(`\\bnum\\.?\\s*${Number(number)}\\b`).test(normalize(clean(text.slice(0,2000)))))throw new Error('BOTHA document does not match its published bulletin and announcement identity');
 }
 const lines=text.split(/\r?\n/).map(line=>clean(line.replace(/\f/g,''))).filter(line=>!/^www\.araba\.eus|^D\.L\.:|^\d{4}-\d{4,6}$|^\d+\/\d+$/.test(line));
 const specific=lines.filter(line=>/^requisitos de acceso\b/.test(normalize(line).match(heading)?.[1]??''));
 const general=section(lines,/^(?:requisitos|condiciones de admision)\b/);
 const minimum=specific.length===1?section(lines,/^requisitos de acceso\b/):general;
 const reserved=[...general,...minimum].find(line=>/^(?:ser|ostentar|tener) (?:la condicion de )?(?:personal fijo|funcionari[oa][^.;]{0,160}habilitacion)/.test(normalize(line).replace(/^(?:[a-z][).]|[•–-])\s*/,'')));
 if(reserved){
  call.educationText='El acceso está reservado al personal con la habilitación indicada en las bases; una titulación universitaria por sí sola no confirma elegibilidad.';
  call.acceptedQualifications=[];if(!call.requirements.includes(reserved))call.requirements=[reserved,...call.requirements];
 }else{
  const academic=academicParagraph(minimum);
  if(academic){call.educationText=academic;call.acceptedQualifications=universityRequirementIds(academic);}
 }
 for(const line of minimum){
  if(/(?:permiso|carnet) de (?:conducci[oó]n|conducir)/i.test(line)&&!call.requirements.includes(line))call.requirements=[line,...call.requirements];
 }
 const language=section(lines,/^(?:perfil linguistico|conocimiento.*eusk)/).join(' ');
 if(language&&/sin fecha de preceptividad|no constituye requisito de participacion|no se exige/.test(normalize(language))){
  call.language=null;call.languageStatus='known';
  if(!call.requirements.includes(language))call.requirements=[language,...call.requirements];
 }
 // A title-level or merits-level C1 is insufficient to set a requirement.
 // Mixed calls retain unknown language profiles until each post is identified.
 const start=lines.findIndex(line=>/^(?:ANEXO\s+[IVX\d]+\s*[.–:-]*\s*)?(?:TEMARIO|PROGRAMA)(?:\s+(?:GENERAL|ESPEC[ÍI]FICO|DE LA OPOSICI[ÓO]N|DE LAS PRUEBAS|PRUEBA TE[ÓO]RICA))?\s*$/i.test(line));
 if(start>=0){
  const topics:string[]=[];
  for(const line of lines.slice(start+1)){
   if(/^ANEXO\s+[IVX\d]+\b/i.test(line))break;
   if(!line||/^\d+$/.test(line)||/^[a-z]+, \d+ de [a-z]+ de \d{4}|^BOLET[IÍ]N OFICIAL|^DEL TERRITORIO HIST[ÓO]RICO|^N[uú]m\./i.test(line))continue;
   const number=line.match(/^(?:Tema\s+)?(\d{1,3})\s*[.–-]+\s*/i)?.[1];
   if(number&&Number(number)===topics.length+1)topics.push(line);
   else if(number&&/^Tema\s+/i.test(line))throw new Error('Araba explicit programme numbering is incomplete or contains several unseparated posts');
   else if(topics.length)topics[topics.length-1]+=' '+line;
  }
  if(topics.length>150)throw new Error('Unexpected Araba programme size');
  if(topics.length){call.topics=topics;call.syllabusUrl=url;}
 }
 const validated=callSchema.parse(call);
 // Document verification is owned by the downloader; retain its references.
 validated.documents=target.documents;Object.assign(target,validated);return target;
}
