import { headers } from 'next/headers';
import { defaultLocale, isLocale } from './locales';
export async function requestLocale() {
  const locale = (await headers()).get('x-oposaketia-locale');
  return isLocale(locale) ? locale : defaultLocale;
}
