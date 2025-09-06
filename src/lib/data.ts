import { apiService, ApiQueryRequest, ApiDataPoint } from './api';
import { getVariableCode, getVariableName } from './variable-codes';
import { getCountryById } from './countries';

export interface VDemDataPoint {
  country: string;
  year: number;
  value: number;
  variable: string;
}

// Transform API response to internal format
function transformApiData(
  apiData: ApiDataPoint[], 
  variable: string, 
  countries: string[]
): VDemDataPoint[] {
  const variableCode = getVariableCode(variable);
  if (!variableCode) {
    console.warn(`No code found for variable: ${variable}`);
    return [];
  }

  const result: VDemDataPoint[] = [];
  
  for (const row of apiData) {
    // Match incoming API country name to our country slug IDs via name
    const countryId = countries.find(id => {
      const country = getCountryById(id);
      return country?.name === row.country_name;
    });
    
    if (!countryId) continue;
    
  const value = (row as unknown as Record<string, unknown>)[variableCode];
    if (value !== null && value !== undefined) {
      result.push({
        country: countryId,
        year: row.year,
    value: Number(value as number),
        variable
      });
    }
  }

  return result;
}

// Sample data generator for demo purposes (fallback)
function generateSampleData(
  countries: string[], 
  variable: string, 
  years: number[]
): VDemDataPoint[] {
  const data: VDemDataPoint[] = [];
  
  // Base values and trends for different variables
  const variableConfig = {
    v2elsuffrage: { base: 85, trend: 0.5, variance: 5 },
    v2xel_frefair: { base: 0.7, trend: -0.01, variance: 0.1 },
    v2x_freexp_altinf: { base: 0.6, trend: -0.005, variance: 0.08 },
    v2merange: { base: 2.5, trend: -0.02, variance: 0.3 },
    v2x_jucon: { base: 0.65, trend: -0.008, variance: 0.1 },
    v2x_egaldem: { base: 0.55, trend: -0.003, variance: 0.05 }
  };

  const config = variableConfig[variable as keyof typeof variableConfig] || 
                 { base: 0.5, trend: 0, variance: 0.1 };

  countries.forEach((country, countryIndex) => {
    const countryOffset = countryIndex * 0.1 - 0.05; // Different baselines per country
    
    years.forEach((year, yearIndex) => {
      const trendValue = config.trend * yearIndex;
      const randomVariance = (Math.random() - 0.5) * config.variance;
      
      let value = config.base + countryOffset + trendValue + randomVariance;
      
      // Clamp values based on variable type
      if (variable === 'v2elsuffrage') {
        value = Math.max(0, Math.min(100, value));
      } else if (['v2xel_frefair', 'v2x_freexp_altinf', 'v2x_jucon', 'v2x_egaldem'].includes(variable)) {
        value = Math.max(0, Math.min(1, value));
      } else if (variable === 'v2merange') {
        value = Math.max(0, Math.min(4, value));
      }
      
      data.push({
        country,
        year,
        value: parseFloat(value.toFixed(3)),
        variable
      });
    });
  });
  
  return data;
}

export async function fetchVDemData(
  countries: string[],
  variable: string,
  startYear: number,
  endYear: number
): Promise<VDemDataPoint[]> {
  // If no countries are selected, do not call the API (many backends error on IN ())
  if (countries.length === 0) {
    return [];
  }
  // Get variable code for API
  const variableCode = getVariableCode(variable);
  if (!variableCode) {
    console.warn(`No API code found for variable: ${variable}, using sample data`);
    return generateSampleData(countries, variable, Array.from(
      { length: endYear - startYear + 1 }, 
      (_, i) => startYear + i
    ));
  }

  // Map country IDs to country names for API
  const countryNames = countries.map(countryId => {
    const country = getCountryById(countryId);
    return country?.name || countryId;
  });

  const apiRequest: ApiQueryRequest = {
    countries: countryNames,
    fields: [variableCode],
    start_year: startYear,
    end_year: endYear
  };

  try {
    const apiData = await apiService.query(apiRequest);
    return transformApiData(apiData, variable, countries);
  } catch (error) {
    console.error('API call failed, falling back to sample data:', error);
    // Fall back to sample data if API fails
    return generateSampleData(countries, variable, Array.from(
      { length: endYear - startYear + 1 }, 
      (_, i) => startYear + i
    ));
  }
}

export function getLatestValue(data: VDemDataPoint[], country: string): number | null {
  const countryData = data
    .filter(d => d.country === country)
    .sort((a, b) => b.year - a.year);
  
  return countryData.length > 0 ? countryData[0].value : null;
}

export function generateSparklineData(data: VDemDataPoint[], country: string): number[] {
  return data
    .filter(d => d.country === country)
    .sort((a, b) => a.year - b.year)
    .map(d => d.value);
}