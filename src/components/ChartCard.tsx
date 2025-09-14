import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { VDemVariable } from '@/lib/variables';
import { getCountryById } from '@/lib/countries';
import { VDemDataPoint, getLatestValue } from '@/lib/data';
import { Sparkline } from './Sparkline';

interface ChartCardProps {
  variable: VDemVariable;
  data: VDemDataPoint[];
  countries: string[];
  onClick: () => void;
  selected?: boolean;
}

export function ChartCard({ variable, data, countries, onClick, selected = false }: ChartCardProps) {
  const formatValue = (value: number | null) => {
    if (value === null) return 'N/A';
    
    if (variable.unit === '%') {
      return `${Math.round(value)}%`;
    }
    
    if (variable.scale.includes('0-1')) {
      return value.toFixed(2);
    }
    
    return value.toFixed(1);
  };

  const getValueColor = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    
    if (variable.direction === 'higher-better') {
      if (value >= 0.7 || (variable.unit === '%' && value >= 70)) {
        return 'text-success-green';
      } else if (value <= 0.3 || (variable.unit === '%' && value <= 30)) {
        return 'text-warning-orange';
      }
    }
    
    return 'text-foreground';
  };

  return (
    <div 
      onClick={onClick}
      className={`chart-card group ${selected ? 'border-success-green ring-2 ring-inset ring-success-green/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {variable.label}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{variable.scale}</p>
        </div>
        
        <div className="ml-4">
          {variable.direction === 'higher-better' ? (
            <TrendingUp className="h-4 w-4 text-success-green" />
          ) : (
            <TrendingDown className="h-4 w-4 text-warning-orange" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Sparkline data={data} variable={variable.id} countries={countries} />
        </div>
      </div>

      {/* Latest Values */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Latest Values
        </p>
        <div className="flex flex-wrap gap-2">
          {countries.slice(0, 3).map(countryId => {
            const country = getCountryById(countryId);
            const latestValue = getLatestValue(data, countryId);
            
            return (
              <div key={countryId} className="country-badge">
                <span className={getValueColor(latestValue)}>
                  {formatValue(latestValue)}
                </span>
              </div>
            );
          })}
          {countries.length > 3 && (
            <div className="country-badge">
              +{countries.length - 3} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}