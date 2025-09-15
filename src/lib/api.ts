// API configuration and service
// In dev, route through Vite's proxy (server.proxy['/api']) to avoid CORS.
// In all environments, allow override via VITE_API_BASE_URL.
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim()) ||
  '/api';

export interface ApiDataPoint {
  country_name: string;
  year: number;
  [key: string]: string | number | null;
}

export interface ApiQueryRequest {
  countries: string[];
  fields: string[];
  start_year: number;
  end_year: number;
}

// Types for Explain API (frontend payload shape)
export type IndexData = {
  year: number;
  observation: number;
};

export type Index = {
  name: string;
  data: IndexData[];
};

export type ExplainRequest = {
  indexA: Index;
  indexB: Index;
  country: string;
  execute?: boolean;
};

export type CorrelationType = 'highest' | 'lowest' | 'strongest' | 'weakest' | 'most_significant' | 'least_significant' | 'most_observations' | 'fewest_observations';

export type DatasetType = 'VDEM' | 'WEO' | 'NEA';

export type CorrelationRequest = {
  country: string;
  type: CorrelationType;
  dataset1: DatasetType;
  dataset2: DatasetType;
  minObservations?: number;
  limit?: number;
};

export type CorrelationResult = {
  indexA: string;
  indexB: string;
  r: number;
  n: number;
  p_value: number;
};

export type CorrelationsResponse = {
  correlations: CorrelationResult[];
};

export class VDemApiService {
  private static instance: VDemApiService;

  private constructor() {}

  public static getInstance(): VDemApiService {
    if (!VDemApiService.instance) {
      VDemApiService.instance = new VDemApiService();
    }
    return VDemApiService.instance;
  }


  async query(request: ApiQueryRequest): Promise<ApiDataPoint[]> {
    try {
  const response = await fetch(`${API_BASE_URL}/v-dem/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as unknown[];
      
      // Handle BigInt conversion if present
      return (data as ApiDataPoint[]).map((item: ApiDataPoint) => {
        const yearValue = (item as unknown as { year: number | bigint }).year;
        return {
          ...item,
          year: typeof yearValue === 'bigint' ? Number(yearValue) : yearValue,
        } as ApiDataPoint;
      });
    } catch (error) {
      console.error('API query failed:', error);
      throw error;
    }
  }

  async queryImf(request: ApiQueryRequest, opts?: { isNea?: boolean }): Promise<ApiDataPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/imf/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opts?.isNea ? { ...request, isNea: true } : request),
      });

      if (!response.ok) {
        throw new Error(`IMF API request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as unknown[];
      return (data as ApiDataPoint[]).map((item: ApiDataPoint) => {
        const yearValue = (item as unknown as { year: number | bigint }).year;
        return {
          ...item,
          year: typeof yearValue === 'bigint' ? Number(yearValue) : yearValue,
        } as ApiDataPoint;
      });
    } catch (error) {
      console.error('IMF API query failed:', error);
      throw error;
    }
  }

  // Explain relationships between two indices (dataset-agnostic)
  // Uses existing API base and fetch infra to avoid duplication.
  async explainRelationships(payload: ExplainRequest): Promise<{ explanation?: string } & Record<string, unknown>> {
    try {
  const response = await fetch(`${API_BASE_URL}/analysis/relationships/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, execute: payload.execute ?? true }),
      });

      if (!response.ok) {
        throw new Error(`Explain API failed: ${response.status} ${response.statusText}`);
      }

      // Backend may return JSON or plain text. Normalize to { explanation }
      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      try {
        if (contentType.includes('application/json') || raw.trim().startsWith('{')) {
          const parsed = JSON.parse(raw) as { explanation?: string } | string;
          if (typeof parsed === 'string') {
            return { explanation: parsed };
          }
          if (parsed && typeof parsed.explanation === 'string') {
            return parsed as { explanation: string };
          }
        }
      } catch {
        // ignore and fall back to raw text
      }
      return { explanation: raw };
    } catch (error) {
      console.error('Explain API request failed:', error);
      // TODO: refine error propagation/shape for UI handling
      throw error;
    }
  }

  // Get correlations between datasets
  async getCorrelations(payload: CorrelationRequest): Promise<CorrelationsResponse> {
    try {
      const params = new URLSearchParams({
        country: payload.country,
        type: payload.type,
        dataset1: payload.dataset1,
        dataset2: payload.dataset2,
        ...(payload.minObservations && { minObservations: payload.minObservations.toString() }),
        ...(payload.limit && { limit: payload.limit.toString() }),
      });

      const response = await fetch(`${API_BASE_URL}/analysis/relationships/datasets/correlations?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Correlations API failed: ${response.status} ${response.statusText}`);
      }

      const raw = await response.text();
      let data: CorrelationsResponse;

      // Handle if response is wrapped in ```
      if (raw.trim().startsWith('```')) {
        const lines = raw.split('\n');
        const jsonStart = lines.findIndex(line => line.trim().startsWith('{') || line.trim().startsWith('['));
        const jsonEnd = lines.slice(jsonStart).findIndex(line => line.trim().endsWith('}')) + jsonStart;
        const jsonContent = lines.slice(jsonStart, jsonEnd + 1).join('\n');
        data = JSON.parse(jsonContent);
      } else {
        data = JSON.parse(raw);
      }

      return data;
    } catch (error) {
      console.error('Correlations API request failed:', error);
      throw error;
    }
  }
}

export const apiService = VDemApiService.getInstance();