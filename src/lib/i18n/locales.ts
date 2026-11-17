export const locales = ['eu', 'es', 'fr'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'eu';
export const localeStorageKey = 'oposaketia:locale:v1';
export function isLocale(value: unknown): value is Locale { return typeof value === 'string' && locales.some(locale => locale === value); }
export function pathLocale(path: string): Locale | null {
  const first = path.split('/')[1]; return isLocale(first) ? first : null;
}
export function localizedPath(path: string, locale: Locale) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Expected a local path');
  const prefix = pathLocale(path.split(/[?#]/)[0]);
  const rest = prefix ? path.slice(prefix.length + 1) : path;
  return `/${locale}${!rest || rest === '/' ? '' : rest.startsWith('/') || rest.startsWith('?') || rest.startsWith('#') ? rest : '/' + rest}`;
}
