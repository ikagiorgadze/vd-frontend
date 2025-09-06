import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartCard } from '@/components/ChartCard';
import { VDEM_VARIABLES } from '@/lib/variables';
import { fetchVDemData, VDemDataPoint } from '@/lib/data';
import { QueryState, buildChartUrl } from '@/lib/url-state';

interface DashboardProps {
  currentQuery: QueryState;
  onQueryChange: (query: QueryState) => void;
}

// Sample countries for demo cards when user hasn't selected any
const SAMPLE_COUNTRIES = ['moldova', 'serbia', 'romania'];

export function Dashboard({ currentQuery, onQueryChange }: DashboardProps) {
  const navigate = useNavigate();
  const [cardData, setCardData] = useState<Record<string, VDemDataPoint[]>>({});
  const [loading, setLoading] = useState(true);

  // Use sample countries when none are selected
  const effectiveCountries = currentQuery.countries.length
    ? currentQuery.countries
    : SAMPLE_COUNTRIES;

  // Exclude population from the sample cards
  const variablesForCards = VDEM_VARIABLES.filter(v => v.id !== 'e_pop');

  // Load data for example cards
  useEffect(() => {
    const loadCardData = async () => {
      setLoading(true);
      const promises = variablesForCards.map(async (variable) => {
        const data = await fetchVDemData(
          effectiveCountries,
          variable.id,
          currentQuery.startYear,
          currentQuery.endYear
        );
        return [variable.id, data] as [string, VDemDataPoint[]];
      });

      const results = await Promise.all(promises);
      const dataMap = Object.fromEntries(results);
      setCardData(dataMap);
      setLoading(false);
    };

    loadCardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCountries, currentQuery.startYear, currentQuery.endYear]);

  const handleCardClick = (variable: string) => {
    // When no countries selected, prefill with sample ones for the chart page
    const overrides = currentQuery.countries.length === 0
      ? { countries: SAMPLE_COUNTRIES }
      : undefined;
    // Also set variables list to the single selected var to align with multi-chart behavior
    const url = buildChartUrl(currentQuery, variable, {
      ...(overrides || {}),
      variables: [variable],
    });
    navigate(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading democracy indicators...</p>
        </div>
      </div>
    );
  }

  const hasQuery = currentQuery.variable || currentQuery.category;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">V-Dem Compare</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Compare democracy indicators across countries in seconds. 
            Explore trends, analyze patterns, and make data-driven insights about democratic development worldwide.
          </p>
        </div>

        {/* Query Status */}
        {!hasQuery ? (
          <div className="max-w-md mx-auto mb-12 p-6 bg-card border border-border rounded-xl text-center">
            <h3 className="font-semibold mb-2">Get Started</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Click “Explore Data” in the header to build custom charts, or browse the examples below.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto mb-12 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Selection</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{currentQuery.countries.length} countries</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium">{currentQuery.startYear}-{currentQuery.endYear}</span>
                  {currentQuery.category && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium text-primary">{currentQuery.category}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {variablesForCards.map((variable) => (
            <ChartCard
              key={variable.id}
              variable={variable}
              data={cardData[variable.id] || []}
              countries={effectiveCountries}
              onClick={() => handleCardClick(variable.id)}
            />
          ))}
        </div>

        {/* Data Attribution */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Data source: <span className="font-medium">V-Dem Institute, v15</span> • 
            Built for democratic analysis and comparison
          </p>
        </div>
      </div>
    </div>
  );
}