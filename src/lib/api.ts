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
      const response = await fetch(`${API_BASE_URL}/query`, {
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
}

export const apiService = VDemApiService.getInstance();