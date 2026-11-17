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
// Recognize explicit degree names, never job titles, subject matter or generic engineering.
export function specificUniversityQualifications(text: string): (typeof universitySpecialties[number]['id'])[] {
  const value = normalize(text);
  return universitySpecialties.filter(item => {
    const subject = item.id === 'ade' ? 'administracion y direccion de empresas' : item.id === 'ingenieria-telecomunicaciones' ? 'ingenieria (?:de |en )?telecomunicaciones' : normalize(item.label) + (item.id === 'arquitectura' ? '(?! tecnica)' : '');
    return new RegExp('\\b(?:grado|graduado|graduada|diplomatura|diplomado|diplomada|licenciatura|licenciado|licenciada)(?: universitari[oa])?(?: oficial)? (?:en |de )?' + subject + '\\b').test(value);
  }).map(item => item.id);
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
  const required = [...new Set([...call.acceptedQualifications, ...specificUniversityQualifications(call.educationText)])];
  const education = required.some(id => profile.qualifications.includes(id));
  const pending = call.reviewStatus === 'automatic' || call.languageStatus === 'unknown';
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
