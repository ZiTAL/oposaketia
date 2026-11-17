import { fetch, EnvHttpProxyAgent } from 'undici';
import robotsParser from 'robots-parser';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

// Use the HTTP library's actual client identity for requests and robots rules.
const agent = 'undici';
const allowedDomains = ['euskadi.eus', 'web.lanbide.eus', 'navarra.es', 'cdg-64.fr', 'gipuzkoa.eus', 'gipuzkoa.net', 'bizkaia.eus', 'araba.eus', 'boe.es', 'eitbtaldea.eus', 'donostia.eus', 'ehu.eus', 'osakidetza.eus', 'vitoria-gasteiz.org', 'euskotren.eus', 'euskotren.iformalia.es'];
export function allowedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) throw new Error('URL fuera de las fuentes oficiales permitidas');
  return url;
}
export function decodeOfficialText(body: Buffer, type: string) {
  const charset = type.match(/charset=["']?([^;\s"']+)/i)?.[1] ?? body.subarray(0, 3000).toString('ascii').match(/charset\s*=\s*["']?([^;\s"'>]+)/i)?.[1] ?? 'utf-8';
  return new TextDecoder(charset).decode(body);
}
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export class OfficialClient {
  private dispatcher = new EnvHttpProxyAgent();
  private robots = new Map<string, ReturnType<typeof robotsParser>>();
  private last = new Map<string, number>();
  requests = 0;
  constructor(private cacheDir: string, private interval = 500) {}
  async close() { await this.dispatcher.close(); }
  private async request(url: URL, headers: Record<string, string> = {}, redirects = 0): Promise<{ body: Buffer; type: string; etag?: string; modified?: string; notModified?: boolean }> {
    if (redirects > 4) throw new Error('Demasiadas redirecciones');
    await delay(Math.max(0, (this.last.get(url.origin) ?? 0) + this.interval - Date.now()));
    this.last.set(url.origin, Date.now()); this.requests++;
    const response = await fetch(url, { dispatcher: this.dispatcher, redirect: 'manual', headers: { 'User-Agent': agent, ...headers }, signal: AbortSignal.timeout(30000) });
    if ([301,302,303,307,308].includes(response.status)) {
      const next = allowedUrl(new URL(response.headers.get('location') ?? '', url).href);
      await response.body?.cancel();
      // Every redirect is checked against the allowlist and its own robots rules.
      if (next.pathname !== '/robots.txt') await this.checkRobots(next);
      return this.request(next, {}, redirects + 1);
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
        const result = await this.request(new URL('/robots.txt', url));
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
    const crawlDelay = rules.getCrawlDelay(agent);
    if (crawlDelay) this.interval = Math.max(this.interval, crawlDelay * 1000);
  }
  async get(value: string) {
    const url = allowedUrl(value); await this.checkRobots(url);
    await mkdir(this.cacheDir, { recursive: true });
    const file = join(this.cacheDir, hash(url.href) + '.json');
    let cached: { body: string; type: string; etag?: string; modified?: string } | undefined;
    try { cached = JSON.parse(await readFile(file, 'utf8')); } catch {}
    const headers: Record<string, string> = {};
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (cached?.modified) headers['If-Modified-Since'] = cached.modified;
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { result = await this.request(url, headers); break; }
      catch (error) {
        if (error instanceof Error && /HTTP (400|401|403|404|410) /.test(error.message)) throw error;
        if (attempt === 2) throw error;
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
  async text(url: string) {
    const result = await this.get(url);
    if (!/text|json|xml|html/i.test(result.type)) throw new Error('Se esperaba HTML, JSON o XML');
    return decodeOfficialText(result.body,result.type);
  }
}
