import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogueSchema } from '../src/lib/catalogue';
import { sortCalls } from '../src/lib/explorer-sort';
import demo from '../data/demo.json';

const [base] = catalogueSchema.parse(demo);
const calls = [
  { ...base, id: 'closed', title: 'Cerrada', status: 'Cerrada' as const, deadline: '2026-05-01' },
  { ...base, id: 'later', title: 'Más tarde', status: 'Abierta' as const, deadline: '2099-12-02' },
  { ...base, id: 'sooner', title: 'Antes', status: 'Abierta' as const, deadline: '2099-12-01' },
];

test('sorts calls by status priority, then deadline and title', () => {
  assert.deepEqual(sortCalls(calls, 'status', 'es').map(call => call.id), ['sooner', 'later', 'closed']);
});

test('sorts provinces alphabetically and places unspecified provinces last', () => {
  const byProvince = [
    { ...base, id: 'unspecified', province: null },
    { ...base, id: 'bizkaia', province: 'Bizkaia' as const },
    { ...base, id: 'araba', province: 'Araba / Álava' as const },
  ];

  assert.deepEqual(sortCalls(byProvince, 'province', 'es').map(call => call.id), ['araba', 'bizkaia', 'unspecified']);
});

test('sorts titles with the selected locale without mutating the source list', () => {
  const source = [
    { ...base, id: 'zeta', title: 'Zorro' },
    { ...base, id: 'alfa', title: 'Árbitro' },
  ];
  const originalOrder = source.map(call => call.id);

  assert.deepEqual(sortCalls(source, 'title', 'es').map(call => call.id), ['alfa', 'zeta']);
  assert.deepEqual(source.map(call => call.id), originalOrder);
});
