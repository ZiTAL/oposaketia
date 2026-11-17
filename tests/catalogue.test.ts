import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, catalogueSchema, defaultProfile, effectiveStatus, filterCalls, profileSchema } from '../src/lib/catalogue';
import data from '../data/demo.json';
const calls = catalogueSchema.parse(data);
test('specific qualifications are required: a general degree does not qualify for nursing', () => {
  const call = calls.find(c => c.id === 'enfermeria')!;
  assert.equal(assess(call, { ...defaultProfile, qualifications: ['grado'], euskera: 'C1' }).education, false);
  assert.equal(assess(call, { ...defaultProfile, qualifications: ['enfermeria'], euskera: 'B2' }).matches, true);
  assert.equal(assess(call, { ...defaultProfile, qualifications: ['enfermeria'] }).matches, false);
});
test('French and Spanish qualifications are not automatically equivalent', () => {
  const call = calls.find(c => c.id === 'redacteur-territorial')!;
  assert.equal(assess(call, { ...defaultProfile, qualifications: ['bachiller'], francés: 'C2' }).matches, false);
  assert.equal(assess(call, { ...defaultProfile, qualifications: ['bac'], francés: 'B2' }).matches, true);
});
test('combined filters, favorites, and accent-insensitive searches', () => {
  assert.equal(filterCalls(calls, { ...defaultProfile, search: 'administracion', provinces: ['Araba / Álava', 'Bizkaia', 'Gipuzkoa'] }).length, 2);
  assert.equal(filterCalls(calls, { ...defaultProfile, favorites: ['enfermeria'] }, true)[0].id, 'enfermeria');
  assert.equal(filterCalls(calls, { ...defaultProfile, onlyMatches: true }).length, 0);
});
test('invalid stored profiles and unverified live records are rejected', () => {
  assert.equal(profileSchema.safeParse({ ...defaultProfile, euskera: 'C9' }).success, false);
  assert.equal(catalogueSchema.safeParse([{ ...calls[0], isDemo: false, status: 'Abierta', deadline: '2027-01-01' }]).success, false);
  assert.equal(catalogueSchema.safeParse([calls[0], calls[0]]).success, false);
  assert.equal(catalogueSchema.safeParse([{ ...calls[0], deadline: '2027-02-31' }]).success, false);
  assert.equal(catalogueSchema.safeParse([{ ...calls[0], sourceUrl: 'javascript:alert(1)' }]).success, false);
});
test('a passed deadline closes an otherwise open call', () => {
  assert.equal(effectiveStatus({ ...calls[0], status: 'Abierta', deadline: '2026-01-01' }, '2026-01-02'), 'Cerrada');
  assert.equal(effectiveStatus({ ...calls[0], status: 'Abierta', deadline: '2026-01-01' }, '2026-01-01'), 'Abierta');
});
