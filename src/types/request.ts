// Shared request type expected by controllers (backend/frontend interop)
// Keep in sync with ApiQueryRequest in lib/api.ts; includes optional isNea flag for IMF NEA queries.
export interface QueryRequest {
  countries: string[];      // Country names (not ISO codes) expected by API layer
  fields: string[];         // Variable codes requested
  start_year: number;       // Inclusive start year
  end_year: number;         // Inclusive end year
  isNea?: boolean;          // When true, treat IMF request as NEA dataset
}

// Narrow validator helper (runtime guard) if needed downstream
export function isQueryRequest(value: unknown): value is QueryRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.countries) &&
    Array.isArray(v.fields) &&
    typeof v.start_year === 'number' &&
    typeof v.end_year === 'number';
}
