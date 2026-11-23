import { z } from 'zod';
import { provinces, provinceTerritory } from './geography';

export const territories = ['Euskadi', 'Navarra', 'País Vasco francés'] as const;
export const categoryChoices = ['Administración', 'Sanidad', 'Educación', 'Servicios'] as const;
export const universitySpecialties = [
  { id: 'enfermeria', label: 'Enfermería' },
  { id: 'medicina', label: 'Medicina' },
  { id: 'fisioterapia', label: 'Fisioterapia' },
  { id: 'farmacia', label: 'Farmacia' },
  { id: 'veterinaria', label: 'Veterinaria' },
  { id: 'psicologia', label: 'Psicología' },
  { id: 'trabajo-social', label: 'Trabajo Social' },
  { id: 'educacion-social', label: 'Educación Social' },
  { id: 'ciencias-politicas', label: 'Ciencias Políticas' },
  { id: 'sociologia', label: 'Sociología' },
  { id: 'derecho', label: 'Derecho' },
  { id: 'economia', label: 'Economía' },
  { id: 'ade', label: 'Administración y Dirección de Empresas' },
  { id: 'educacion-infantil', label: 'Educación Infantil' },
  { id: 'educacion-primaria', label: 'Educación Primaria' },
  { id: 'arquitectura', label: 'Arquitectura' },
  { id: 'ingenieria-informatica', label: 'Ingeniería Informática' },
  { id: 'ingenieria-industrial', label: 'Ingeniería Industrial' },
  { id: 'ingenieria-civil', label: 'Ingeniería Civil' },
  { id: 'ingenieria-telecomunicaciones', label: 'Ingeniería de Telecomunicaciones' },
  { id: 'biologia', label: 'Biología' },
  { id: 'quimica', label: 'Química' },
] as const;
export function isUniversitySpecialty(id: string) { return universitySpecialties.some(item => item.id === id); }
type UniversitySpecialty = typeof universitySpecialties[number]['id'];
// These are subject names, not automatic equivalences between national diplomas.
const specialtyNames: Record<UniversitySpecialty,string> = {
  enfermeria:'enfermeria|erizaintza(?:ko|n)?|soins infirmiers|sciences infirmieres',
  medicina:'medicina(?! veterinaria)|medikuntza(?:ko|n)?|medecine(?! veterinaire)',
  fisioterapia:'fisioterapia|fisioterapia(?:ko|n)?|kinesitherapie|masso kinesitherapie',
  farmacia:'farmacia|farmazia(?:ko|n)?|pharmacie',
  veterinaria:'veterinaria|albaitaritza(?:ko|n)?|medecine veterinaire',
  psicologia:'psicologia|psikologia(?:ko|n)?|psychologie',
  'trabajo-social':'trabajo social|gizarte langintza(?:ko|n)?|travail social',
  'educacion-social':'educacion social|gizarte hezkuntza(?:ko|n)?|education sociale',
  'ciencias-politicas':'ciencias politicas|politologia|politika zientzi(?:ak|etako|en)|politika eta administrazio zientzi(?:ak|etako|en)|zientzia politiko(?:ak|etako|en)?|sciences politiques',
  sociologia:'sociologia|soziologia(?:ko|n)?|sociologie',
  derecho:'derecho|zuzenbide(?:a|an|ko|aren)?|droit',
  economia:'economia|ekonomia(?:n|ko|ren)?|economie|sciences economiques',
  ade:'administracion y direccion de empresas|enpresen administrazio(?:a)? eta zuzendaritza(?:n|ko|ren)?|administration et (?:direction|gestion) des entreprises',
  'educacion-infantil':'educacion infantil|haur hezkuntza(?:ko|n)?|education de la petite enfance',
  'educacion-primaria':'educacion primaria|lehen hezkuntza(?:ko|n)?|enseignement primaire',
  arquitectura:'arquitectura(?! tecnica)|arkitektura(?:ko|n)?(?! tekniko)|architecture(?! technique)',
  'ingenieria-informatica':'ingenieria informatica|informatika ingeniaritza(?:ko|n)?|ingeniaritza informatiko(?:ko|a)?|ingenierie informatique',
  'ingenieria-industrial':'ingenieria industrial|industria ingeniaritza(?:ko|n)?|ingeniaritza industrial(?:eko|a)?|genie industriel|ingenierie industrielle',
  'ingenieria-civil':'ingenieria civil|ingeniaritza zibil(?:eko|a)?|genie civil|ingenierie civile',
  'ingenieria-telecomunicaciones':'ingenieria (?:de |en )?telecomunicaciones|telekomunikazio(?:etako)? ingeniaritza(?:ko|n)?|ingenierie des telecommunications',
  biologia:'biologia|biologia(?:ko|n)?|biologie',
  quimica:'quimica|kimika(?:ko|n)?|chimie',
};
const specialtyPatterns=universitySpecialties.map(({id})=>({id,pattern:new RegExp(`\\b(?:${specialtyNames[id]})\\b`)}));
const degreePattern=/\b(?:grado(?!\s+(?:medio|superior))|graduad[oa]|diplomatura|diplomad[oa]|licenciatura|licenciad[oa]|titulacion universitaria|licence|bachelor|gradu(?:a|ko|aren)?|graduatu(?:a|ak)?|lizentziatura(?:ko|ren|n)?|lizentziadun(?:a|ak)?|diplomadun(?:a|ak)?)\b/g;

export function isGeneralUniversityRequirement(text:string):boolean{
  const value=normalize(text).replace(/\s+/g,' ');
  return /\btitulo (?:oficial )?universitario de grado, (?:de )?licenciatura, (?:de )?ingenieria o (?:de )?arquitectura\b/.test(value)||/\btitulo de diplomado universitario, ingeniero tecnico, arquitecto tecnico, grado o titulacion declarada oficialmente equivalente\b/.test(value)||/\btitulo de grado, (?:de )?diplomado universitario, (?:de )?ingeniero tecnico, (?:de )?arquitecto tecnico,? o (?:de )?titulo equivalente\b/.test(value);
}

export function universityRequirements(text:string){
  const groups:UniversitySpecialty[][]=[];
  let needsReview=false,cumulative=false,unsupportedCumulative=false;
  const value=normalize(text).replace(/[’']/g,' ').replace(/[-‐‑]/g,' ').replace(/\s+/g,' ');
  for(let clause of value.split(/[.!?;]\s*/)){
    // This legal umbrella names university degree families, not Architecture
    // as a required specialty (the generic grado matcher handles it).
    if(isGeneralUniversityRequirement(clause))continue;
    // Prefix merit markers end a required list. Postfix EU/FR merit markers
    // qualify their whole sentence; mixed clauses stay conservative.
    clause=clause.split(/\b(?:se valorara[n]?|se valoran|meritos|valorables|a titre de merite)\b/)[0];
    if(/\b(?:souhaite[es]*|apprecie[es]*|un atout|baloratuko|baloragarri)\b/.test(clause))continue;
    if(/\b(?:no se (?:exige|requiere)|ez da behar|ez da eskatzen|non exige)\b/.test(clause))continue;
    clause=clause.split(/\b(?:experiencia|conocimientos|perfil linguistico|euskera|idiomas|experience|competences|connaissances|esperientzia|ezagutzak|hizkuntza)\b/)[0];
    const anchors=[...clause.matchAll(degreePattern)].filter(anchor=>{
      const after=clause.slice(anchor.index!+anchor[0].length),before=clause.slice(0,anchor.index);
      if(/^graduad[oa]$/.test(anchor[0])&&/^\s+(?:escolar|en (?:eso|e\.s\.o|educacion secundaria))\b/.test(after))return false;
      return !(anchor[0]==='grado'&&/\b(?:formacion profesional|fp) (?:de )?(?:primer|segundo)\s*$/.test(before));
    });
    if(!anchors.length)continue;
    if(/\b(?:master|doctorado|doctorat|doktorego|masterra|homologacion|homologation)\b/.test(clause))needsReview=true;
    if(/\b(?:y|et|eta|avec|ademas)\s+(?:un[e]?\s+)?(?:master|doctorado|doctorat|doktorego|masterra)\b/.test(clause))unsupportedCumulative=true;
    // Basque commonly puts the degree after its subjects. Spanish/French
    // normally put it first; text before that anchor is not a degree list.
    const basquePostfix=/\b(?:gradu(?:a|aren|ko)?|graduatu(?:a|ak)?|lizentziatura(?:ko|ren|n)?|lizentziadun(?:a|ak)?|diplomadun(?:a|ak)?)\b/.test(clause);
    const sentenceGroups:UniversitySpecialty[][]=[];
    for(const [index,anchor] of anchors.entries()){
      const from=basquePostfix?(index?anchors[index-1].index!+anchors[index-1][0].length:0):anchor.index!;
      const to=basquePostfix?anchor.index!:anchors[index+1]?.index;
      const list=clause.slice(from,to).split(/\b(?:master|doctorado|doctorat|doktorego|masterra)\b/)[0];
      const ids=specialtyPatterns.flatMap(({id,pattern})=>{
        const match=pattern.exec(list);return match?[{id,index:match.index}]:[];
      }).toSorted((a,b)=>a.index-b.index).map(({id})=>id);
      if(!ids.length)continue;
      const connector=basquePostfix?clause.slice(from):clause.slice(0,from);
      const and=basquePostfix?/^\s*eta\b/.test(connector):/\b(?:y|et|eta)\s+(?:un[e]?\s+)?$/.test(connector);
      if(and&&sentenceGroups.length){sentenceGroups.push(ids);cumulative=true;needsReview=true;}
      else if(sentenceGroups.length)sentenceGroups[sentenceGroups.length-1].push(...ids);
      else sentenceGroups.push(ids);
    }
    if(sentenceGroups.length&&groups.length&&/^(?:ademas|ainsi que|horrez gain)\b/.test(clause.trim())){cumulative=true;needsReview=true;}
    groups.push(...sentenceGroups);
  }
  // Separate sentences list alternative acceptable degree families unless
  // an explicit cumulative connector above states otherwise.
  const specialties=[...new Set(groups.flat())];
  return {specialties,groups:cumulative?groups:[specialties],cumulative,needsReview,unsupportedCumulative};
}
export function specificUniversityQualifications(text: string): UniversitySpecialty[] {
  return universityRequirements(text).specialties;
}
export function normalizeCallQualifications(call:Call):Call{
  const parsed=universityRequirements(call.educationText);
  return {...call,acceptedQualifications:requiredQualifications(call,parsed)};
}
function requiredQualifications(call:Call,parsed:ReturnType<typeof universityRequirements>){
  const explicit=[...normalize(call.educationText).matchAll(degreePattern)].length>0;
  const retained=call.acceptedQualifications.filter(id=>call.reviewStatus!=='automatic'||!explicit||!isUniversitySpecialty(id)||parsed.specialties.includes(id as UniversitySpecialty));
  const general=isGeneralUniversityRequirement(call.educationText)?['grado' as const]:[];
  return [...new Set([...retained,...general,...parsed.specialties])];
}
export const qualifications = [
  { id: 'eso', label: 'ESO o equivalente' },
  { id: 'bachiller', label: 'Bachillerato' },
  { id: 'fp-medio', label: 'FP de grado medio' },
  { id: 'fp-superior', label: 'FP de grado superior' },
  { id: 'grado', label: 'Grado universitario (acceso general)' },
  ...universitySpecialties,
  { id: 'bac', label: 'Baccalauréat francés' },
  { id: 'licence', label: 'Licence francesa' },
] as const;
export const languageLevels = ['Sin acreditar', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const qualificationId = z.enum(qualifications.map(item => item.id));
export const callSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1), organization: z.string().min(1),
  territory: z.enum(territories), province: z.enum(provinces).nullable().default(null), location: z.string().min(1),
  category: z.enum(categoryChoices),
  group: z.string(), places: z.number().int().positive().nullable(),
  acceptedQualifications: z.array(qualificationId),
  educationText: z.string().min(1),
  language: z.object({ name: z.enum(['euskera', 'francés']), level: z.enum(languageLevels).exclude(['Sin acreditar']) }).nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value).nullable(),
  status: z.enum(['Abierta', 'Próximamente', 'Cerrada', 'En curso', 'Calendario', 'Pendiente de confirmar', 'Ejemplo']),
  description: z.string().min(1), requirements: z.array(z.string()),
  topics: z.array(z.string()),
  sourceUrl: z.url().refine(url => url.startsWith('https://')),
  syllabusUrl: z.url().refine(url => url.startsWith('https://')).nullable(),
  isDemo: z.boolean(), verifiedAt: z.iso.datetime().nullable(),
  scrapedAt: z.iso.datetime().nullable().default(null),
  sourceId: z.string().nullable().default(null),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/).nullable().default(null),
  reviewStatus: z.enum(['automatic', 'reviewed']).default('reviewed'),
  languageStatus: z.enum(['unknown', 'known']).default('known'),
  documents: z.array(z.object({ title: z.string(), url: z.url().refine(url => url.startsWith('https://')), kind: z.enum(['bases', 'temario', 'guia', 'calendario']), checkedAt: z.iso.datetime().nullable().default(null), sha256: z.string().nullable().default(null) })).default([]),
}).superRefine((item, ctx) => {
  if (item.province && provinceTerritory(item.province) !== item.territory) ctx.addIssue({ code: 'custom', message: 'La provincia no pertenece al territorio indicado.' });
  if (item.isDemo !== (item.status === 'Ejemplo')) ctx.addIssue({ code: 'custom', message: 'Los ejemplos deben usar el estado Ejemplo.' });
  if (!item.isDemo && !item.verifiedAt && !(item.scrapedAt && item.sourceId && item.sourceHash)) ctx.addIssue({ code: 'custom', message: 'Los registros reales requieren fecha de verificación.' });
  if (item.status === 'Abierta' && !item.deadline) ctx.addIssue({ code: 'custom', message: 'Una convocatoria abierta requiere fecha de cierre.' });
});
export const catalogueSchema = z.array(callSchema).superRefine((items, ctx) => {
  if (new Set(items.map(item => item.id)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Hay identificadores duplicados.' });
});
export type Call = z.infer<typeof callSchema>;
export const provinceChoices = [...provinces, 'Sin concretar'] as const;
export const statusChoices = ['Abierta', 'Próximamente', 'En curso', 'Cerrada', 'Calendario', 'Pendiente de confirmar'] as const;
export const statusSortOrder = ['Abierta', 'Próximamente', 'En curso', 'Calendario', 'Pendiente de confirmar', 'Cerrada', 'Ejemplo'] as const;
export const profileSchema = z.preprocess(input => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const legacy = input as Record<string, unknown>;
  // Preserve a previously selected province; removed territory filters must not
  // invisibly restrict the new multi-province selection.
  return { ...legacy,
    provinces: 'provinces' in legacy ? legacy.provinces : provinceChoices.some(value => value === legacy.province) ? [legacy.province] : [],
    categories: 'categories' in legacy ? legacy.categories : categoryChoices.some(value => value === legacy.category) ? [legacy.category] : [],
    statuses: 'statuses' in legacy ? legacy.statuses : statusChoices.some(value => value === legacy.status) ? [legacy.status] : [],
  };
}, z.object({
  qualifications: z.array(qualificationId).max(qualifications.length),
  euskera: z.enum(languageLevels), francés: z.enum(languageLevels),
  provinces: z.array(z.enum(provinceChoices)).max(provinceChoices.length).default([]).transform(values => [...new Set(values)]),
  search: z.string().max(200),
  categories: z.array(z.enum(categoryChoices)).max(categoryChoices.length).default([]).transform(values => [...new Set(values)]),
  favorites: z.array(z.string()).max(1000), recent: z.array(z.string().max(200)).max(8),
  onlyMatches: z.boolean(),
  statuses: z.array(z.enum(statusChoices)).max(statusChoices.length).default([]).transform(values => [...new Set(values)]),
}));
export type Profile = z.infer<typeof profileSchema>;
export const defaultProfile: Profile = { qualifications: [], euskera: 'Sin acreditar', francés: 'Sin acreditar', provinces: [], search: '', categories: [], favorites: [], recent: [], onlyMatches: false, statuses: [] };
export function assess(call: Call, profile: Profile) {
  const parsed=universityRequirements(call.educationText);
  const required = requiredQualifications(call,parsed);
  const education = !parsed.unsupportedCumulative&&(parsed.cumulative?parsed.groups.every(group=>group.some(id=>profile.qualifications.includes(id))):required.some(id => profile.qualifications.includes(id)));
  const pending = parsed.needsReview || call.reviewStatus === 'automatic' || call.languageStatus === 'unknown';
  const language = call.languageStatus === 'unknown' || !call.language || languageLevels.indexOf(profile[call.language.name]) >= languageLevels.indexOf(call.language.level);
  return { education, educationKnown: required.length > 0, language, pending, matches: education && language };
}
export function effectiveStatus(call: Call, today = new Date().toISOString().slice(0, 10)) {
  return call.status === 'Abierta' && call.deadline && call.deadline < today ? 'Cerrada' : call.status;
}
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function filterCalls(calls: Call[], profile: Profile, saved = false, localize: (value: string) => string = value => value) {
  const query = normalize(profile.search.trim());
  return calls.filter(call =>
    (!profile.provinces.length || profile.provinces.some(province => province === 'Sin concretar' ? call.province === null : call.province === province)) &&
    (!profile.categories.length || profile.categories.includes(call.category)) &&
    (!profile.statuses.length || profile.statuses.some(status => effectiveStatus(call) === status)) &&
    (!query || normalize(`${call.title} ${call.organization} ${call.location} ${call.province ?? ''} ${call.category} ${localize(call.province ?? '')} ${localize(call.category)} ${localize(call.territory)}`).includes(query)) &&
    (!saved || profile.favorites.includes(call.id)) &&
    (!profile.onlyMatches || assess(call, profile).matches)
  );
}
