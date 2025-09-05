import { VDemCategory } from './variables';

export interface QueryState {
  countries: string[];
  startYear: number;
  endYear: number;
  variable?: string;
  variables?: string[];
  category?: VDemCategory;
  subcategory?: string;
  chartType?: 'line' | 'bar' | 'area' | 'scatter';
  normalize?: boolean;
  compareRegion?: boolean;
}

export const DEFAULT_STATE: QueryState = {
  countries: ['MDA', 'DEU', 'UKR'],
  startYear: 2010,
  endYear: 2024,
  chartType: 'line',
  normalize: false,
  compareRegion: false
};

export function stateToUrlParams(state: QueryState): URLSearchParams {
  const params = new URLSearchParams();
  
  if (state.countries.length > 0) {
    params.set('countries', state.countries.join(','));
  }
  
  params.set('from', state.startYear.toString());
  params.set('to', state.endYear.toString());
  
  // Multi-variable support: include 'vars' (comma-separated) and keep 'var' as first for compatibility
  const vars = (state.variables && state.variables.length > 0)
    ? state.variables.slice(0, 5)
    : (state.variable ? [state.variable] : []);
  if (vars.length > 0) {
    params.set('vars', vars.join(','));
    params.set('var', vars[0]);
  } else if (state.variable) {
    params.set('var', state.variable);
  }
  if (state.category) params.set('cat', state.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, ''));
  if (state.subcategory) params.set('sub', state.subcategory);
  if (state.chartType && state.chartType !== 'line') params.set('chart', state.chartType);
  if (state.normalize) params.set('normalize', 'true');
  if (state.compareRegion) params.set('region', 'true');
  
  return params;
}

export function urlParamsToState(params: URLSearchParams): QueryState {
  const varsParam = params.get('vars');
  const vars = varsParam ? varsParam.split(',').filter(Boolean) : [];
  const variable = params.get('var') || (vars.length > 0 ? vars[0] : undefined);

  return {
    countries: params.get('countries')?.split(',').filter(Boolean) || DEFAULT_STATE.countries,
    startYear: parseInt(params.get('from') || DEFAULT_STATE.startYear.toString()),
    endYear: parseInt(params.get('to') || DEFAULT_STATE.endYear.toString()),
    variable,
    variables: vars.length > 0 ? vars.slice(0, 5) : undefined,
    category: params.get('cat') ? 
      (decodeURIComponent(params.get('cat')!)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 & $2') as VDemCategory) : 
      undefined,
    subcategory: params.get('sub') || undefined,
    chartType: (params.get('chart') as QueryState['chartType']) || DEFAULT_STATE.chartType,
    normalize: params.get('normalize') === 'true',
    compareRegion: params.get('region') === 'true'
  };
}

export function buildChartUrl(baseState: QueryState, variable: string): string {
  const newState = { ...baseState, variable };
  const params = stateToUrlParams(newState);
  return `/chart?${params.toString()}`;
}