import {test} from 'node:test';
import assert from 'node:assert/strict';
import {specificUniversityQualifications,universityRequirements,normalizeCallQualifications,assess,defaultProfile,catalogueSchema} from '../src/lib/catalogue';
import demo from '../data/demo.json';
const basauri='Hallarse en posesión del título de Licenciatura o Grado en Derecho, Ciencias Políticas y de la Administración, Administración y Dirección de empresas, Economía, Ciencias Actuariales y Financieras o equivalente. Euskera, perfil 3 con fecha de preceptividad vencida';
test('Basauri lists Derecho, Political Science, ADE and Economics as alternatives, including previously imported records',()=>{
  assert.deepEqual(specificUniversityQualifications(basauri),['derecho','ciencias-politicas','ade','economia']);
  const call={...catalogueSchema.parse(demo)[0],acceptedQualifications:['derecho'] as const,educationText:basauri};
  for(const id of ['derecho','ciencias-politicas','economia','ade'] as const)assert.equal(assess({...call,acceptedQualifications:[...call.acceptedQualifications]},{...defaultProfile,qualifications:[id]}).education,true);
  const normalized=normalizeCallQualifications({...call,acceptedQualifications:[...call.acceptedQualifications]});
  assert.deepEqual(normalized.acceptedQualifications,['derecho','ciencias-politicas','ade','economia']);
  assert.deepEqual(call.acceptedQualifications,['derecho']);assert.equal(normalized.educationText,basauri);
});
test('Basque lists allow the degree after the subjects, including business names with eta',()=>{
  assert.deepEqual(specificUniversityQualifications('Zuzenbidean, Ekonomian edo Enpresen Administrazio eta Zuzendaritzan lizentziatura edo gradua izatea.'),['derecho','economia','ade']);
  assert.deepEqual(specificUniversityQualifications('Informatika Ingeniaritzako gradua behar da.'),['ingenieria-informatica']);
  assert.deepEqual(specificUniversityQualifications('Zuzenbideko edo Ekonomiako unibertsitate-gradu edo lizentziatura titulua.'),['derecho','economia']);
  assert.deepEqual(specificUniversityQualifications('Zuzenbideko lizentziaduna izatea.'),['derecho']);
});
test('French subject identifiers preserve the source diploma and recognize enumerated alternatives',()=>{
  assert.deepEqual(specificUniversityQualifications('Licence en droit, économie ou administration et gestion des entreprises exigée.'),['derecho','economia','ade']);
  assert.deepEqual(specificUniversityQualifications('Licence en psychologie ou travail social.'),['psicologia','trabajo-social']);
  assert.deepEqual(specificUniversityQualifications('Licence en sciences économiques.'),['economia']);
});
test('merits, duties, negation and unsupported degree levels do not create required specialties',()=>{
  for(const text of ['Se valorará Grado en Economía','Ekonomiako gradua izatea baloratuko da.','Licence en économie souhaitée.','No se requiere Grado en Derecho.','Máster en Psicología','Grado superior en Química','Grado en Arquitectura Técnica','Técnico de medicina. Experiencia en informática.'])assert.deepEqual(specificUniversityQualifications(text),[],text);
  assert.deepEqual(specificUniversityQualifications('Grado en Derecho. Se valorará Grado en Economía.'),['derecho']);
  assert.deepEqual(specificUniversityQualifications('Grado en Derecho y experiencia en Economía.'),['derecho']);
  assert.deepEqual(specificUniversityQualifications('Título universitario de Grado, de Licenciatura, de Ingeniería o Arquitectura.'),[]);
  const old={...catalogueSchema.parse(demo)[0],reviewStatus:'automatic' as const,acceptedQualifications:['derecho','economia'] as ('derecho'|'economia')[],educationText:'Grado en Derecho. Se valorará Grado en Economía.'};
  assert.equal(assess(old,{...defaultProfile,qualifications:['economia']}).education,false);
  assert.deepEqual(normalizeCallQualifications(old).acceptedQualifications,['derecho']);
});
test('two explicitly cumulative degrees require both profile specialties',()=>{
  const call={...catalogueSchema.parse(demo)[0],acceptedQualifications:[],educationText:'Grado en Derecho y Grado en Economía.'};
  assert.equal(universityRequirements(call.educationText).cumulative,true);
  assert.equal(assess(call,{...defaultProfile,qualifications:['derecho']}).education,false);
  assert.equal(assess(call,{...defaultProfile,qualifications:['derecho','economia']}).education,true);
  const mixed={...call,educationText:'Grado en Derecho o Grado en Economía y Grado en Química.'};
  assert.equal(assess(mixed,{...defaultProfile,qualifications:['quimica']}).education,false);
  assert.equal(assess(mixed,{...defaultProfile,qualifications:['economia','quimica']}).education,true);
  const eu={...call,educationText:'Zuzenbideko gradua eta Ekonomiako gradua.'};
  assert.equal(assess(eu,{...defaultProfile,qualifications:['derecho']}).education,false);
  const master={...call,educationText:'Grado en Derecho y Máster en Psicología.'};
  assert.deepEqual(specificUniversityQualifications(master.educationText),['derecho']);
  assert.equal(assess(master,{...defaultProfile,qualifications:['derecho']}).education,false);
});
