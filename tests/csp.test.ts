import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentSecurityPolicy, createNonce } from '../src/lib/csp';

const nonce = 'test-nonce';
const directive = (csp: string, name: string) => csp.split('; ').find(part => part.startsWith(`${name} `)) ?? '';

test('production CSP allows the per-request nonce and no inline scripts', () => {
  const csp = contentSecurityPolicy(nonce, false);
  assert.match(directive(csp, 'script-src'), new RegExp(`'nonce-${nonce}'`));
  assert.match(directive(csp, 'script-src'), /'strict-dynamic'/);
  assert.match(directive(csp, 'script-src'), /'self'/);
  assert.doesNotMatch(directive(csp, 'script-src'), /'unsafe-inline'|'unsafe-eval'/);
  assert.match(csp, /upgrade-insecure-requests$/);
  assert.match(directive(csp, 'frame-ancestors'), /'none'/);
  assert.match(directive(csp, 'object-src'), /'none'/);
});

test('development CSP only adds unsafe-eval and drops the https upgrade', () => {
  const csp = contentSecurityPolicy(nonce, true);
  assert.match(directive(csp, 'script-src'), /'unsafe-eval'/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
  assert.equal(contentSecurityPolicy(nonce, true).includes("default-src 'self'"), true);
});

test('every nonce is unique and never breaks out of the CSP value', () => {
  const values = new Set(Array.from({ length: 50 }, createNonce));
  assert.equal(values.size, 50);
  for (const value of values) assert.match(value, /^[A-Za-z0-9-]+$/);
  assert.match(contentSecurityPolicy(values.values().next().value!, false), /script-src [^;]+/);
});
