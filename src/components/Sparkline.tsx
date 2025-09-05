import React from 'react';
import { VDemDataPoint } from '@/lib/data';

interface SparklineProps {
  data: VDemDataPoint[];
  variable: string;
  countries: string[];
}

export function Sparkline({ data, variable, countries }: SparklineProps) {
  const filteredData = data.filter(d => d.variable === variable);
  
  if (filteredData.length === 0) {
    return (
      <div className="sparkline-container bg-muted/50 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  // Get data range for normalization
  const values = filteredData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Generate SVG path for each country
  const paths = countries.slice(0, 2).map((countryId, index) => {
    const countryData = filteredData
      .filter(d => d.country === countryId)
      .sort((a, b) => a.year - b.year);
    
    if (countryData.length === 0) return null;
    
    const points = countryData.map((d, i) => {
      const x = (i / (countryData.length - 1)) * 100;
      const y = range > 0 ? ((d.value - minValue) / range) * 70 + 15 : 50;
      return `${x},${100 - y}`;
    });
    
    const pathD = `M${points.join(' L')}`;
    const colors = ['hsl(var(--primary-blue))', 'hsl(var(--primary-purple))', 'hsl(var(--accent-teal))'];
    
    return (
      <path
        key={countryId}
        d={pathD}
        fill="none"
        stroke={colors[index]}
        strokeWidth="1.5"
        opacity="0.8"
      />
    );
  }).filter(Boolean);

  return (
    <div className="sparkline-container">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {paths}
      </svg>
    </div>
  );
}