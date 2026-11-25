import { fetch, EnvHttpProxyAgent, type Dispatcher } from 'undici';
import robotsParser from 'robots-parser';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {municipalPortals} from '../municipal-portals';

// Use the HTTP library's actual client identity for requests and robots rules.
const agent = 'undici';
const allowedDomains = [...Object.values(municipalPortals).map(portal=>new URL(portal.url).hostname),'www.agoitz.eus','ablitas.es','www.villadeallo.org','www.fundapa.org','www.izkigolf.eus', 'www.indesa.eus', 'www.qualisconsultores.es', 'bilbaorkestra.eus', 'www.etxepare.eus', 'transparencia.ararteko.eus', 'hkee-tvcp.eus', 'www.unibasq.eus', 'es.euskadikoorkestra.eus', 'www.tafalla.es', 'www.baranain.es', 'www.villava.es', 'espace-pro.anglet-tourisme.com', 'hazi.eus', 'defensornavarra.es', 'mancoribera.com', 'mairaga.es', 'www.mancomunidadvaldizarbe.com', 'mcp.es', 'www.valledeegues.com', 'www.baztan.eus', 'www.estella-lizarra.com', 'neiker.eus', 'www.xn--maeru-pta.es', 'www.leioa.net', 'www.berrioplano.es', 'www.orkoien.com', 'lasecurecrute.fr', 'parlamentodenavarra.es', 'fundacionmiguelindurain.com', 'fundacionbaluarte.com', 'www.itelazpi.eus', 'fundaciongizain.es', 'navarrabiomed.es', 'choisirleservicepublic.gouv.fr', 'elgoibar.eus', 'www.zizurkil.eus', 'www.hondarribia.eus', 'www.ibarra.eus', 'orio.eus', 'www.andoain.eus', 'www.hernani.eus', 'data.le64.fr', 'gestiononline.bioef.eus', 'musikene.eus', 'apigw.convoca.online', 'recrutement-administratif.univ-pau.fr', 'tracasa.viterbit.site', 'ch-cote-basque.fr', 'emploi-territorial.fr', 'sociedadespublicasdenavarra.es', 'communaute-paysbasque.fr', 'euskadi.eus', 'web.lanbide.eus', 'navarra.es', 'cdg-64.fr', 'gipuzkoa.eus', 'gipuzkoa.net', 'bizkaia.eus', 'araba.eus', 'boe.es', 'eitbtaldea.eus', 'donostia.eus', 'ehu.eus', 'osakidetza.eus', 'vitoria-gasteiz.org', 'euskotren.eus', 'euskotren.iformalia.es'];
export function allowedUrl(value: string, approvedHosts: readonly string[] = []) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !(allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)) || (approvedHosts.includes(url.hostname) && /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(url.hostname) && !/\.(?:local|internal|localhost|test|invalid|onion)$/i.test(url.hostname)))) throw new Error('URL fuera de las fuentes oficiales permitidas');
  return url;
}
export function decodeOfficialText(body: Buffer, type: string) {
  const charset = type.match(/charset=["']?([^;\s"']+)/i)?.[1] ?? body.subarray(0, 3000).toString('ascii').match(/charset\s*=\s*["']?([^;\s"'>]+)/i)?.[1] ?? 'utf-8';
  return new TextDecoder(charset).decode(body);
}
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const delay = (ms: number, signal?:AbortSignal) => sleep(ms,undefined,{signal});
export class OfficialClient {
  private dispatcher:Dispatcher;
  private robots = new Map<string, ReturnType<typeof robotsParser>>();
  private last = new Map<string, number>();
  private territorialCookies = new Map<string,string>();
  requests = 0;
  constructor(private cacheDir: string, private readonly interval = 500, private options: { approvedHosts?: readonly string[]; timeoutMs?: number; maxAttempts?: number; signal?: AbortSignal; dispatcher?:Dispatcher } = {}) {this.dispatcher=options.dispatcher??new EnvHttpProxyAgent();}
  async close() { try { await this.dispatcher.close(); } finally { this.territorialCookies.clear(); } }
  private async request(url: URL, headers: Record<string, string> = {}, redirects = 0, submission?: {body:string}, robotsRequest=false): Promise<{ body: Buffer; type: string; etag?: string; modified?: string; notModified?: boolean }> {
    if (redirects > 5) throw new Error('Demasiadas redirecciones');
    const declared=this.robots.get(url.origin)?.getCrawlDelay(agent)??0;
    if(!Number.isFinite(declared)||declared<0)throw new Error('Invalid robots crawl-delay');
    const interval=Math.max(this.interval,declared*1000);
    await delay(Math.max(0, (this.last.get(url.origin) ?? 0) + interval - Date.now()),this.options.signal);
    this.last.set(url.origin, Date.now()); this.requests++;
    const publicSearchOrigin = url.origin === 'https://www.emploi-territorial.fr';
    const cookies = publicSearchOrigin && this.territorialCookies.size ? {Cookie:[...this.territorialCookies].map(([key,value])=>`${key}=${value}`).join('; ')} : {};
    const response = await fetch(url, { dispatcher: this.dispatcher, redirect: 'manual', headers: { 'User-Agent': agent, ...headers, ...cookies }, ...(submission?{method:'POST',body:submission.body}:{}), signal: this.options.signal?AbortSignal.any([this.options.signal,AbortSignal.timeout(this.options.timeoutMs ?? 30000)]):AbortSignal.timeout(this.options.timeoutMs ?? 30000) });
    if(publicSearchOrigin)for(const raw of response.headers.getSetCookie()){
      const pair=raw.split(';',1)[0],equal=pair.indexOf('=');
      const key=pair.slice(0,equal),value=pair.slice(equal+1);
      if(equal>0&&/^(?:PHPSESSID|TS[0-9a-f]+)$/i.test(key)&&/^[A-Za-z0-9_.,=\/-]{1,4096}$/.test(value))this.territorialCookies.set(key,value);
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const next = allowedUrl(new URL(response.headers.get('location') ?? '', url).href, this.options.approvedHosts);
      await response.body?.cancel();
      // Content redirects require the destination's rules. Retrieving the
      // rules themselves must not recursively request them again; all hops
      // still pass the URL allowlist and the redirect limit (RFC 9309 §2.3.1.2).
      if (!robotsRequest&&next.pathname !== '/robots.txt') await this.checkRobots(next);
      return this.request(next, {}, redirects + 1,undefined,robotsRequest);
    }
    if (response.status === 304) return { body: Buffer.alloc(0), type: '', notModified: true };
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status} en ${url.hostname}${url.pathname}`); }
    if (Number(response.headers.get('content-length')) > 30_000_000) { await response.body?.cancel(); throw new Error('Documento demasiado grande'); }
    const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    if (reader) while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 30_000_000) { await reader.cancel(); throw new Error('Documento demasiado grande'); } chunks.push(part.value); }
    return { body: Buffer.concat(chunks), type: response.headers.get('content-type') ?? '', etag: response.headers.get('etag') ?? undefined, modified: response.headers.get('last-modified') ?? undefined };
  }
  private async checkRobots(url: URL) {
    if (!this.robots.has(url.origin)) {
      let text = '';
      try {
        const result = await this.request(new URL('/robots.txt', url),{},0,undefined,true);
        if (/^text\/plain/i.test(result.type) || /^\s*(?:#|User-agent:)/i.test(result.body.toString())) text = result.body.toString();
      } catch (error) {
        if (!(error instanceof Error && /HTTP (404|410) /.test(error.message))) throw error;
      }
      // Some sources express rules as absolute URLs; normalize those too.
      text = text.replace(/^(Disallow|Allow):\s*https?:\/\/[^/]+(\/.*)$/gim, '$1: $2');
      this.robots.set(url.origin, robotsParser(new URL('/robots.txt', url).href, text));
    }
    const rules = this.robots.get(url.origin)!;
    if (rules.isAllowed(url.href, agent) === false) throw new Error(`robots.txt no permite ${url.hostname}${url.pathname}`);
  }
  async get(value: string) {
    const url = allowedUrl(value, this.options.approvedHosts); await this.checkRobots(url);
    await mkdir(this.cacheDir, { recursive: true });
    const file = join(this.cacheDir, hash(url.href) + '.json');
    let cached: { body: string; type: string; etag?: string; modified?: string } | undefined;
    try { cached = JSON.parse(await readFile(file, 'utf8')); } catch {}
    const headers: Record<string, string> = {};
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (cached?.modified) headers['If-Modified-Since'] = cached.modified;
    let result;
    const maxAttempts = this.options.maxAttempts ?? 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try { result = await this.request(url, headers); break; }
      catch (error) {
        if(this.options.signal?.aborted)throw error;
        if (error instanceof Error && /HTTP (400|401|403|404|410) /.test(error.message)) throw error;
        if (attempt === maxAttempts - 1) throw error;
        await delay(2000 * (attempt + 1));
      }
    }
    if (!result) throw new Error('Respuesta vacía');
    if (result.notModified && cached) return { body: Buffer.from(cached.body, 'base64'), type: cached.type };
    if (result.notModified) throw new Error('304 sin caché');
    await writeFile(file + '.tmp', JSON.stringify({ ...result, body: result.body.toString('base64') }));
    await rename(file + '.tmp', file);
    return result;
  }
  async territorialSearchPage(page=1) {
    if(!Number.isInteger(page)||page<1||page>100)throw new Error('Invalid public search page');
    const url=allowedUrl(page===1?'https://www.emploi-territorial.fr/emploi-mobilite/?search-dept=064':'https://www.emploi-territorial.fr/recherche_emploi_mobilite/');
    await this.checkRobots(url);
    // These anonymous search cookies are memory-only and never cached or logged.
    // A fresh first page establishes the public department filter in the session.
    const result=page===1?await this.request(url):await this.request(url,{'Content-Type':'application/x-www-form-urlencoded'},0,{body:new URLSearchParams({page:String(page),ajax:'1'}).toString()});
    if(!/text|html/i.test(result.type))throw new Error('Public search did not return HTML');
    return decodeOfficialText(result.body,result.type);
  }
  async text(url: string) {
    const result = await this.get(url);
    if (!/text|json|xml|html/i.test(result.type)) throw new Error('Se esperaba HTML, JSON o XML');
    return decodeOfficialText(result.body,result.type);
  }
}
