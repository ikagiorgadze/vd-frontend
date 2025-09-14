export type ImfOrigin = 'weo' | 'nea';

// Tracks where an IMF code was picked from in the UI (WEO vs NEA)
// This avoids ambiguity when code patterns overlap or JSON files differ by structure.
const originMap = new Map<string, ImfOrigin>();

export function setImfOrigin(code: string, origin: ImfOrigin) {
  if (!code) return;
  originMap.set(code, origin);
}

export function getImfOrigin(code: string): ImfOrigin | undefined {
  return originMap.get(code);
}
