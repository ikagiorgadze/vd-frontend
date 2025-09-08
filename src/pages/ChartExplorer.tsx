import { getVariableName } from '@/lib/variable-codes';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Link2, Filter, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartSidebar from '@/components/ChartSidebar';
import { fetchVDemData, VDemDataPoint } from '@/lib/data';
import { getVariableById } from '@/lib/variables';
import { getCountryById } from '@/lib/countries';
import { QueryState, stateToUrlParams } from '@/lib/url-state';


type ChartExplorerProps = {
  currentQuery: QueryState;
  onQueryChange: (query: QueryState) => void;
};

export function ChartExplorer({ currentQuery, onQueryChange }: ChartExplorerProps) {
  const [, setSearchParams] = useSearchParams();
  const [dataByVar, setDataByVar] = useState<Record<string, VDemDataPoint[]>>({});
  const [loading, setLoading] = useState(true);
  type ChartRow = { year: number } & Record<string, number | null>;
  const [chartDataByVar, setChartDataByVar] = useState<Record<string, ChartRow[]>>({});
  // Mobile-only: whether filters sidebar is open
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Copy link UI state
  const [copied, setCopied] = useState(false);

  // Load chart data
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const vars = (currentQuery.variables && currentQuery.variables.length > 0)
        ? currentQuery.variables.slice(0, 5)
        : (currentQuery.variable ? [currentQuery.variable] : []);
      if (vars.length === 0) {
        setDataByVar({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const pairs = await Promise.all(
          vars.map(async (v) => {
            const result = await fetchVDemData(
              currentQuery.countries,
              v,
              currentQuery.startYear,
              currentQuery.endYear
            );
            return [v, result] as const;
          })
        );
        if (!cancelled) {
          const next: Record<string, VDemDataPoint[]> = {};
          for (const [v, arr] of pairs) next[v] = arr;
          setDataByVar(next);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setDataByVar({});
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    currentQuery.variable,
    currentQuery.variables,
    currentQuery.countries,
    currentQuery.startYear,
    currentQuery.endYear
  ]);
  // Transform data for each selected variable
  useEffect(() => {
    const next: Record<string, ChartRow[]> = {};
    Object.entries(dataByVar).forEach(([v, data]) => {
      if (!data || data.length === 0) {
        next[v] = [];
        return;
      }
      const years = [...new Set(data.map(d => d.year))].sort();
      const transformed: ChartRow[] = years.map(year => {
        const yearData: ChartRow = { year } as ChartRow;
        currentQuery.countries.forEach(countryId => {
          const dataPoint = data.find(d => d.year === year && d.country === countryId);
          yearData[countryId] = dataPoint?.value || null;
        });
        return yearData;
      });
      next[v] = transformed;
    });
    setChartDataByVar(next);
  }, [dataByVar, currentQuery.countries]);

  const handleQueryUpdate = (newQuery: QueryState) => {
    onQueryChange(newQuery);
    const params = stateToUrlParams(newQuery);
    setSearchParams(params);
  };

  // Selected variables (up to 5)
  const selectedVars = (currentQuery.variables && currentQuery.variables.length > 0)
    ? currentQuery.variables.slice(0, 5)
    : (currentQuery.variable ? [currentQuery.variable] : []);

  // DEBUG: Show selectedVars for troubleshooting
  // Remove this after confirming multi-chart works
  // console.log('selectedVars', selectedVars);

  // value formatting is handled per-variable in each chart

  const getCountryColor = (index: number) => {
    const colors = [
      'hsl(var(--primary-blue))',
      'hsl(var(--primary-purple))',
      'hsl(var(--accent-teal))',
      'hsl(var(--success-green))',
      'hsl(var(--warning-orange))'
    ];
    return colors[index % colors.length];
  };

  const handleDownloadCSVFor = (variableCode: string, rows: ChartRow[]) => {
    if (!rows || rows.length === 0) return;
    const csvHeaders = ['Year', ...currentQuery.countries.map(id => getCountryById(id)?.name || id)];
    const csvRows = rows.map(row => [
      row.year,
      ...currentQuery.countries.map(country => (row[country] ?? 'N/A'))
    ]);
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vdem-${variableCode}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLink = async () => {
    const url = window.location.href;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch (e) {
        console.error('Clipboard copy failed:', e);
      }
    } else {
      console.warn('Clipboard API not available in this environment.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-[13fr_1fr_6fr] gap-0 p-4 h-[calc(100vh-64px)] overflow-hidden min-h-0">
    {/* Left: Chart area (65%) */}
  <div className="pr-0 sm:pr-4 min-h-0 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Chart View</h1>
            </div>
            {/* Mobile-only Filters button */}
            <div className="sm:hidden">
              <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {selectedVars.length === 0 ? (
            <div className="h-96 flex items-center justify-center border border-border rounded-xl">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">No Variable Selected</h2>
                <p className="text-muted-foreground">Use the Chart Builder on the right to pick a measure.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Render a separate chart for each selected variable */}
              {selectedVars.map((v) => {
                const variableMeta = getVariableById(v);
                const variableLabel = variableMeta?.label ?? getVariableName(v) ?? v;
                const variableScale = variableMeta?.scale ?? '';
                const variableUnit = variableMeta?.unit;
                const rows = chartDataByVar[v] || [];
                return (
                  <div key={v} className="bg-card border border-border rounded-xl p-4 sm:p-6 mx-auto w-full max-w-[1600px]">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold">{variableLabel}</h2>
                      {variableScale && (
                        <p className="text-muted-foreground text-sm">{variableScale}</p>
                      )}
                    </div>
                    {rows.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={rows}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="year" 
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            tickFormatter={(value) => {
                              if (value === null) return 'N/A';
                              if (variableUnit === '%') return `${(value as number).toFixed(1)}%`;
                              if (variableScale.includes('0-1')) return (value as number).toFixed(3);
                              return (value as number).toFixed(2);
                            }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null;
                              // Sort payload according to currentQuery.countries order
                              const sortedPayload = payload.sort((a, b) => {
                                const aIndex = currentQuery.countries.indexOf(a.dataKey as string);
                                const bIndex = currentQuery.countries.indexOf(b.dataKey as string);
                                return aIndex - bIndex;
                              });
                              return (
                                <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium mb-2">{`${variableLabel} — Year: ${label}`}</p>
                                  {sortedPayload.map((entry, index) => {
                                    const country = getCountryById(entry.dataKey as string);
                                    return (
                                      <div key={index} className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-sm">
                                          {country?.name}: {entry.value === null ? 'N/A' : (variableUnit === '%') ? `${(entry.value as number).toFixed(1)}%` : variableScale.includes('0-1') ? (entry.value as number).toFixed(3) : (entry.value as number).toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }}
                          />
                          <Legend />
                          {currentQuery.countries.map((countryId, index) => {
                            const country = getCountryById(countryId);
                            return (
                              <Line
                                key={countryId}
                                type="monotone"
                                dataKey={countryId}
                                stroke={getCountryColor(index)}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name={country?.name}
                                connectNulls={false}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center border border-border rounded-xl">
                        <div className="text-center">
                          <p className="text-muted-foreground">No data available for the selected criteria</p>
                        </div>
                      </div>
                    )}
                    {/* Actions for each variable */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadCSVFor(v, rows)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                      <Button
                        variant={copied ? 'secondary' : 'outline'}
                        className={copied ? 'bg-green-600 text-white hover:bg-green-600' : ''}
                        size="sm"
                        onClick={handleShareLink}
                        disabled={copied}
                        aria-live="polite"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Copy Share Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes moved into each chart panel */}
        </div>
        {/* Middle gap (5%) - hidden on mobile */}
        <div className="hidden sm:block" />
    {/* Right: Sidebar (30%) - hidden on mobile */}
  <div id="sidebar-scroll-container" className="hidden sm:block h-full overflow-y-auto min-h-0">
          <ChartSidebar currentQuery={currentQuery} onQueryChange={handleQueryUpdate} />
        </div>
      </div>

      {/* Mobile full-screen Filters overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-background sm:hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
          <div id="mobile-sidebar-scroll-container" className="flex-1 overflow-y-auto min-h-0">
            <ChartSidebar currentQuery={currentQuery} onQueryChange={handleQueryUpdate} />
          </div>
        </div>
      )}
    </div>
  );
}