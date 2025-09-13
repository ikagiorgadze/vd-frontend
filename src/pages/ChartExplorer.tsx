import { getVariableName } from '@/lib/variable-codes';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Link2, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartSidebar from '@/components/ChartSidebar';
import { fetchVDemData, VDemDataPoint } from '@/lib/data';
import { getVariableById } from '@/lib/variables';
import { getCountryById } from '@/lib/countries';
import { QueryState, stateToUrlParams } from '@/lib/url-state';
import { apiService } from '@/lib/api';


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
  // Selection and explanation state
  const [selectedForExplain, setSelectedForExplain] = useState<string[]>([]);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainExpanded, setExplainExpanded] = useState(false);
  const [explainTimestamp, setExplainTimestamp] = useState<Date | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [showExplainOverlay, setShowExplainOverlay] = useState(false);
  // Measured square cell size for the 2x2 grid so all 4 fit without scroll
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number | null>(null);
  const [rowCount, setRowCount] = useState<number>(1);
  const [layoutReady, setLayoutReady] = useState<boolean>(false);
  // Refs for FLIP animations (smooth reflow when layout/selection changes)
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});
  // Controlled animation key so lines draw from left to right right after data loads
  const [animateKey, setAnimateKey] = useState<number>(0);

  // Load chart data
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const vars = (currentQuery.variables && currentQuery.variables.length > 0)
        ? currentQuery.variables.slice(0, 4)
        : (currentQuery.variable ? [currentQuery.variable] : []);
      if (vars.length === 0) {
        setDataByVar({});
        setChartDataByVar({});
        setLoading(false);
        return;
      }

  setLoading(true);
  // Clear previous data to avoid stale charts flashing during new requests
  setDataByVar({});
  setChartDataByVar({});
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
          const nextRaw: Record<string, VDemDataPoint[]> = {};
          const nextRows: Record<string, ChartRow[]> = {};
          for (const [v, arr] of pairs) {
            nextRaw[v] = arr;
            // Transform to chart rows now so charts mount only after data is fully ready
            if (!arr || arr.length === 0) {
              nextRows[v] = [];
            } else {
              const years = [...new Set(arr.map(d => d.year))].sort();
              const transformed: ChartRow[] = years.map(year => {
                const yearData: ChartRow = { year } as ChartRow;
                currentQuery.countries.forEach(countryId => {
                  const dataPoint = arr.find(d => d.year === year && d.country === countryId);
                  yearData[countryId] = dataPoint?.value ?? null;
                });
                return yearData;
              });
              nextRows[v] = transformed;
            }
          }
          setDataByVar(nextRaw);
          setChartDataByVar(nextRows);
          setLoading(false);
          // Trigger a new animation cycle for lines on fresh data
          setAnimateKey((k) => k + 1);
        }
      } catch (e) {
        if (!cancelled) {
          setDataByVar({});
          setChartDataByVar({});
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

  const handleQueryUpdate = (newQuery: QueryState) => {
    onQueryChange(newQuery);
    const params = stateToUrlParams(newQuery);
    setSearchParams(params);
  };

  // Selected variables (up to 4)
  const selectedVars = (currentQuery.variables && currentQuery.variables.length > 0)
    ? currentQuery.variables.slice(0, 4)
    : (currentQuery.variable ? [currentQuery.variable] : []);

  // Decide dataset category ordering and build unifiedVars list
  const isImfVar = (v: string) => {
    return (
      !!IMF_WEO_CODE_TO_DESC[v] ||
      !!IMF_NEA_CODE_TO_DESC[v] ||
      (/[A-Z]/.test(v) && /\./.test(v) && !/^v\d|^e_/i.test(v))
    );
  };
  const isVdemVar = (v: string) => {
    if (isImfVar(v)) return false;
    return !!getVariableById(v);
  };
  const vdemVars = selectedVars.filter(isVdemVar);
  const imfVars = selectedVars.filter(isImfVar);
  const otherVars = selectedVars.filter(v => !vdemVars.includes(v) && !imfVars.includes(v));
  const unifiedVars = [...vdemVars, ...imfVars, ...otherVars].slice(0, 4);

  // Measure available grid area and compute per-row tile height based on count
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let raf = 0;
    const last = { w: 0, h: 0, rows: 0, cell: 0 };
    const computeMeasured = () => {
      const width = el.clientWidth;
      const height = el.clientHeight; // excludes header via flex layout
      const gap = 12; // px (gap-3)
      const count = unifiedVars.length;
      const desktop = width >= 640;
      const cols = desktop ? (count === 1 ? 1 : 2) : 1;
      const rows = Math.max(1, Math.ceil(count / cols));
      const FUDGE = 20; // padding/borders/ring allowance
      const rowHeight = Math.max(0, Math.floor((height - gap * (rows - 1)) / rows) - FUDGE);
      // Avoid tiny oscillations and redundant state updates
      const changed = (rows !== last.rows) || (Math.abs(rowHeight - last.cell) > 1) || (Math.abs(width - last.w) > 1) || (Math.abs(height - last.h) > 1);
      if (changed) {
        last.w = width; last.h = height; last.rows = rows; last.cell = rowHeight;
        setRowCount(rows);
        setCellSize(rowHeight);
        setLayoutReady(true);
      }
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(computeMeasured);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    schedule();
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [gridRef, unifiedVars.length]);

  // FLIP: measure before/after and animate movement without remounting
  useLayoutEffect(() => {
    const nodes = tileRefs.current;
    const prevRects = prevRectsRef.current;
    const currentRects: Record<string, DOMRect> = {};
    // Measure current rects
    Object.entries(nodes).forEach(([key, el]) => {
      if (el) currentRects[key] = el.getBoundingClientRect();
    });
    // Animate from previous rects
    Object.entries(currentRects).forEach(([key, rect]) => {
      const prev = prevRects[key];
      if (!prev) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (dx !== 0 || dy !== 0) {
        const el = nodes[key]!;
        el.style.willChange = 'transform';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // Force reflow
  // Force reflow to apply the initial transform before transitioning back to identity
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetWidth;
        el.style.transition = 'transform 250ms ease, height 250ms ease, width 250ms ease';
        el.style.transform = '';
        const cleanup = () => {
          el.style.transition = '';
          el.style.willChange = '';
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
      }
    });
    // Store for next cycle
    prevRectsRef.current = currentRects;
  }, [unifiedVars, rowCount, cellSize]);

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

  // Inline formatter used in explanation renderer
  function renderInline(s: string): React.ReactNode[] {
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, wrap: (c: React.ReactNode) => <strong>{c}</strong> },
      { regex: /\*(.*?)\*/g, wrap: (c: React.ReactNode) => <em>{c}</em> },
    ];
    let nodes: React.ReactNode[] = [s];
    for (const { regex, wrap } of patterns) {
      const next: React.ReactNode[] = [];
      nodes.forEach((node) => {
        if (typeof node !== 'string') { next.push(node); return; }
        let lastIndex = 0; let m: RegExpExecArray | null;
        while ((m = regex.exec(node)) !== null) {
          const [full, inner] = m; const start = m.index;
          if (start > lastIndex) next.push(node.slice(lastIndex, start));
          next.push(wrap(inner));
          lastIndex = start + full.length;
        }
        if (lastIndex < node.length) next.push(node.slice(lastIndex));
      });
      nodes = next;
    }
    return nodes;
  }

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

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // You could add a toast notification here
      console.log('Link copied to clipboard');
    });
  };

  // (moved up) Helper classification and unifiedVars construction

  // Renderer for a single chart card (kept identical to previous rendering for behavior parity)
  const renderChartCard = (v: string) => {
    const variableMeta = getVariableById(v);
    const variableLabel =
      variableMeta?.label ||
      getVariableName(v) ||
      IMF_WEO_CODE_TO_DESC[v] ||
      IMF_NEA_CODE_TO_DESC[v] ||
      v;
    const variableScale = variableMeta?.scale ?? '';
    const variableUnit = variableMeta?.unit;
  const rows = chartDataByVar[v] || [];
    const selected = selectedForExplain.includes(v);
    return (
      <div
        key={v}
        role="button"
        tabIndex={0}
        onClick={() => {
          setSelectedForExplain(prev => {
            const exists = prev.includes(v);
            if (exists) return prev.filter(x => x !== v);
            if (prev.length >= 2) return [prev[1], v];
            return [...prev, v];
          });
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedForExplain(prev => prev.includes(v) ? prev.filter(x => x !== v) : (prev.length >= 2 ? [prev[1], v] : [...prev, v])); } }}
  className={`bg-card border rounded-xl p-2 sm:p-3 box-border mx-auto w-full h-full flex flex-col transition-colors ${selected ? 'border-green-500 ring-2 ring-inset ring-green-500' : 'border-border hover:border-muted'}`}
      >
        <div className="mb-1.5 shrink-0">
          <h2 className="text-base font-semibold">{variableLabel}</h2>
          {variableScale && (
            <p className="text-muted-foreground text-xs">{variableScale}</p>
          )}
        </div>
  {loading ? (
          <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden">
            {/* Skeleton state reserves layout to avoid reflow; only shown while loading */}
            <div className="h-full w-full animate-pulse bg-gradient-to-b from-muted/40 to-card" />
          </div>
        ) : rows.length > 0 ? (
          <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
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
                  if ((variableScale || '').includes('0-1')) return (value as number).toFixed(3);
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
                              {country?.name}: {entry.value === null ? 'N/A' : (variableUnit === '%') ? `${(entry.value as number).toFixed(1)}%` : (variableScale || '').includes('0-1') ? (entry.value as number).toFixed(3) : (entry.value as number).toFixed(2)}
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
        isAnimationActive={!loading}
        animationBegin={0}
        animationDuration={800}
        animationEasing="ease-in-out"
        animationId={animateKey}
                  />
                );
              })}
            </LineChart>
              </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            No data available for the selected range.
          </div>
        )}
        {/* Actions for each variable */}
        <div className="flex items-center gap-2 pt-2 border-t border-border mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleDownloadCSVFor(v, rows); }}>
            <Download className="h-4 w-4 mr-1" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleShareLink(); }}>
            <Link2 className="h-4 w-4 mr-1" />
            Copy Share Link
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background h-[calc(100vh-64px)] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_360px] gap-0 p-4 h-full overflow-hidden min-h-0">
        {/* Left: Chart area fills all space up to the sidebar */}
        <div className="pr-0 sm:pr-4 min-h-0 h-full overflow-hidden relative">
          <div className="flex items-center justify-between mb-3">
            <div />
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
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Explain CTA */}
              <div className="flex items-center justify-end mb-2 gap-2 shrink-0">
                {explainError && (
                  <span className="text-sm text-red-600 mr-auto">{explainError}</span>
                )}
                <Button size="sm" variant="default" aria-busy={explaining} disabled={!(selectedForExplain.length === 2 && currentQuery.countries.length > 0) || explaining} onClick={async () => {
                  if (selectedForExplain.length !== 2 || currentQuery.countries.length === 0) return;
                  const [indexA, indexB] = selectedForExplain;
                  const country = currentQuery.countries[0];
                  setExplaining(true);
                  setExplainError(null);
                  setExplanationText(null);
                  try {
                    const res = await apiService.explainRelationships({ indexA, indexB, country, execute: true });
                    const text = typeof res?.explanation === 'string' ? res.explanation.trim() : '';
                    setExplanationText(text || `No explanation returned. Requested: ${indexA} vs ${indexB} for ${country}.`);
                    setExplainTimestamp(new Date());
                    setExplainExpanded(false);
                    setShowExplainOverlay(true);
                  } catch (err: unknown) {
                    setExplainError(err instanceof Error ? err.message : 'Failed to fetch explanation');
                  } finally {
                    setExplaining(false);
                  }
                }} title={currentQuery.countries[0] ? `Using ${getCountryById(currentQuery.countries[0])?.name || currentQuery.countries[0]}` : 'Select a country to enable'}>
                  {explaining ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Explaining...
                    </span>
                  ) : (
                    'Explain selected'
                  )}
                </Button>
              </div>
        {/* Grid of charts dynamically sized: 1 = full, 2 = side-by-side, 3-4 = 2x2 */}
              <div className="flex-1 min-h-0">
        <div
                  ref={gridRef}
      className={`grid grid-cols-1 ${unifiedVars.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-3 h-full transition-opacity duration-200 ${layoutReady ? 'opacity-100' : 'opacity-0'}`}
                  style={cellSize ? { gridTemplateRows: `repeat(${rowCount}, ${cellSize}px)` } : undefined}
                >
          {unifiedVars.map((v) => (
                    <div
                      key={`cell-${v}`}
                      ref={(el) => { tileRefs.current[v] = el; }}
                      className="min-h-0 transition-[height,transform] duration-250 ease-out will-change-transform [contain:content]"
                      style={{ height: cellSize ? `${cellSize}px` : undefined }}
                    >
                      {renderChartCard(v)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes moved into each chart panel */}
          {/* Explanation overlay (glass, transparent) anchored to chart area */}
          {showExplainOverlay && explanationText && (
            <div className="absolute inset-0 z-20 flex items-start justify-center p-3 sm:p-6">
              {/* Click outside to close */}
              <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" onClick={() => setShowExplainOverlay(false)} />
              <div className="relative w-full max-w-3xl mt-4 sm:mt-8 rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md shadow-xl p-4 sm:p-6 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>AI response</span>
                    {explainTimestamp && <span>· {explainTimestamp.toLocaleString()}</span>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowExplainOverlay(false)}>Close</Button>
                </div>
                <div className="max-h-[60vh] overflow-auto leading-relaxed">
                  {(() => {
                    const lines = explanationText.split('\n');
                    const blocks: React.ReactNode[] = [];
                    let i = 0; let key = 0;
                    const headingRegex = /^\s*\*\*(.+?):\*\*\s*$/;
                    while (i < lines.length) {
                      const line = lines[i];
                      const headingMatch = headingRegex.exec(line.trim());
                      if (headingMatch) { blocks.push(<h4 key={key++} className="text-base font-semibold mt-3 mb-1.5">{headingMatch[1]}</h4>); i++; continue; }
                      if (line.trim().startsWith('- ')) {
                        const items: string[] = [];
                        while (i < lines.length && lines[i].trim().startsWith('- ')) { items.push(lines[i].trim().slice(2)); i++; }
                        const listKey = key++;
                        blocks.push(<ul key={listKey} className="list-disc ml-5 my-2 space-y-1">{items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}</ul>);
                        continue;
                      }
                      if (line.trim().length === 0) { blocks.push(<div key={key++} className="h-2" />); i++; continue; }
                      blocks.push(<p key={key++} className="mb-2">{renderInline(line)}</p>);
                      i++;
                    }
                    return <article>{blocks}</article>;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
  {/* Right: Sidebar - fixed width on desktop */}
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