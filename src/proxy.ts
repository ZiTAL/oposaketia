import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy, createNonce } from './lib/csp';
import { defaultLocale, pathLocale } from './lib/i18n/locales';
export function proxy(request: NextRequest) {
  const locale = pathLocale(request.nextUrl.pathname);
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-oposaketia-locale', locale ?? defaultLocale);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = locale ? rewriteForLocale(request, headers, locale) : NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}
function rewriteForLocale(request: NextRequest, headers: Headers, locale: string) {
  const url = request.nextUrl.clone();
  url.pathname = request.nextUrl.pathname.slice(locale.length + 1) || '/';
  // Locale prefixes apply to pages, never to API or framework resources.
  if (/^\/(?:api|_next)(?:\/|$)/.test(url.pathname)) return new NextResponse(null, { status: 404 });
  return NextResponse.rewrite(url, { request: { headers } });
}
export const config = { matcher: [{ source: '/((?!api(?:/|$)|_next(?:/|$)|icon\\.svg|favicon\\.ico|.*\\.(?:png|jpg|svg|webp|css|js)$).*)', missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }] }] };
