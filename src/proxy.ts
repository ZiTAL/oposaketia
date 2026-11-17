import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, pathLocale } from './lib/i18n/locales';
export function proxy(request: NextRequest) {
  const locale = pathLocale(request.nextUrl.pathname);
  const headers = new Headers(request.headers);
  headers.set('x-oposaketia-locale', locale ?? defaultLocale);
  if (!locale) return NextResponse.next({ request: { headers } });
  const url = request.nextUrl.clone();
  url.pathname = request.nextUrl.pathname.slice(locale.length + 1) || '/';
  // Locale prefixes apply to pages, never to API or framework resources.
  if (/^\/(?:api|_next)(?:\/|$)/.test(url.pathname)) return new NextResponse(null, { status: 404 });
  return NextResponse.rewrite(url, { request: { headers } });
}
export const config = { matcher: ['/((?!api(?:/|$)|_next(?:/|$)|icon\\.svg|favicon\\.ico|.*\\.(?:png|jpg|svg|webp|css|js)$).*)'] };
