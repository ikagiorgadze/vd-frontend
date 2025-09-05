export interface Country {
  id: string;
  name: string;
  iso3: string;
  flag?: string;
  region?: string;
}

export const COUNTRIES: Country[] = [
  { id: 'DEU', name: 'Germany', iso3: 'DEU', flag: '🇩🇪', region: 'Europe' },
  { id: 'MDA', name: 'Moldova', iso3: 'MDA', flag: '🇲🇩', region: 'Europe' },
  { id: 'UKR', name: 'Ukraine', iso3: 'UKR', flag: '🇺🇦', region: 'Europe' },
  { id: 'USA', name: 'United States', iso3: 'USA', flag: '🇺🇸', region: 'Americas' },
  { id: 'GBR', name: 'United Kingdom', iso3: 'GBR', flag: '🇬🇧', region: 'Europe' },
  { id: 'FRA', name: 'France', iso3: 'FRA', flag: '🇫🇷', region: 'Europe' },
  { id: 'POL', name: 'Poland', iso3: 'POL', flag: '🇵🇱', region: 'Europe' },
  { id: 'HUN', name: 'Hungary', iso3: 'HUN', flag: '🇭🇺', region: 'Europe' },
  { id: 'RUS', name: 'Russia', iso3: 'RUS', flag: '🇷🇺', region: 'Europe' },
  { id: 'CHN', name: 'China', iso3: 'CHN', flag: '🇨🇳', region: 'Asia' },
  { id: 'IND', name: 'India', iso3: 'IND', flag: '🇮🇳', region: 'Asia' },
  { id: 'BRA', name: 'Brazil', iso3: 'BRA', flag: '🇧🇷', region: 'Americas' }
];

export function getCountryById(id: string): Country | undefined {
  return COUNTRIES.find(c => c.id === id);
}

export function searchCountries(query: string): Country[] {
  const lowercaseQuery = query.toLowerCase();
  return COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(lowercaseQuery) ||
    c.id.toLowerCase().includes(lowercaseQuery)
  );
}