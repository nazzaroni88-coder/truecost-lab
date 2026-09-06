/**
 * Shareable links without a backend: the scenario is encoded into the URL hash as
 * base64url(JSON). Decoding is defensive — anything malformed is ignored.
 */

export interface SharedScenario<I = unknown> {
  calculatorId: string;
  name: string;
  inputs: I;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare<I>(s: SharedScenario<I>): string {
  return toBase64Url(JSON.stringify({ v: 1, c: s.calculatorId, n: s.name, i: s.inputs }));
}

export function decodeShare(hashOrToken: string): SharedScenario | null {
  try {
    let token = hashOrToken;
    if (token.startsWith('#')) token = token.slice(1);
    const m = token.match(/(?:^|&)s=([^&]+)/);
    if (m) token = m[1];
    if (!token) return null;
    const obj = JSON.parse(fromBase64Url(token)) as { v?: number; c?: string; n?: string; i?: unknown };
    if (!obj || typeof obj !== 'object' || typeof obj.c !== 'string' || !obj.i || typeof obj.i !== 'object') return null;
    return { calculatorId: obj.c, name: typeof obj.n === 'string' ? obj.n.slice(0, 80) : 'Shared scenario', inputs: obj.i };
  } catch {
    return null;
  }
}

export function buildShareUrl<I>(s: SharedScenario<I>, path: string): string {
  const base = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  return `${base}#s=${encodeShare(s)}`;
}
