// API configuration and service
const API_BASE_URL =  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

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

      const data = await response.json();
      
      // Handle BigInt conversion if present
      return data.map((item: any) => ({
        ...item,
        year: typeof item.year === 'bigint' ? Number(item.year) : item.year
      }));
    } catch (error) {
      console.error('API query failed:', error);
      throw error;
    }
  }
}

export const apiService = VDemApiService.getInstance();