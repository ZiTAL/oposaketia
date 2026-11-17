export const iparraldeProvinces = ['Lapurdi', 'Baja Navarra', 'Zuberoa'] as const;
export const provinces = ['Araba / Álava', 'Bizkaia', 'Gipuzkoa', 'Navarra', ...iparraldeProvinces] as const;
export type Province = typeof provinces[number];
export function provinceTerritory(province: Province): 'Euskadi' | 'Navarra' | 'País Vasco francés' {
  if (iparraldeProvinces.some(value => value === province)) return 'País Vasco francés';
  return province === 'Navarra' ? 'Navarra' : 'Euskadi';
}
export function provinceFromEuskadiRow(row: Record<string, string>): Province | null {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const aliases: Record<string, Province> = { 'araba': 'Araba / Álava', 'alava': 'Araba / Álava', 'araba/alava': 'Araba / Álava', 'araba / alava': 'Araba / Álava', 'alava/araba': 'Araba / Álava', 'alava / araba': 'Araba / Álava', 'bizkaia': 'Bizkaia', 'vizcaya': 'Bizkaia', 'gipuzkoa': 'Gipuzkoa', 'guipuzcoa': 'Gipuzkoa' };
  const codes: Record<string, Province> = { '1': 'Araba / Álava', '01': 'Araba / Álava', '20': 'Gipuzkoa', '48': 'Bizkaia' };
  const evidence = [aliases[normalize(row.territory ?? '')], aliases[normalize(row.rrhhTerritory ?? '')], codes[row.territorycode ?? '']].filter(Boolean);
  const unique = [...new Set(evidence)];
  // Conflicting or regional-only metadata does not establish a province.
  return unique.length === 1 ? unique[0] : null;
}
