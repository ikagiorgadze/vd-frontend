import { getVariableName } from '@/lib/variable-codes';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Link2, Filter, X, ChevronDown } from 'lucide-react';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import HelpIcon from '@/components/ui/help-icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  // Multiple explanations by country
  const [explanationsByCountry, setExplanationsByCountry] = useState<Record<string, string> | null>(null);
  const [showExplainOverlay, setShowExplainOverlay] = useState(false);
  // Picker for choosing up to 3 countries when more than 3 are selected
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [pickerCountries, setPickerCountries] = useState<string[]>([]);
  // Grid container ref (for potential future use)
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Refs for FLIP animations (smooth reflow when layout/selection changes)
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});
  // Controlled animation key so lines draw from left to right right after data loads
  const [animateKey, setAnimateKey] = useState<number>(0);
  // transient copy feedback: which variable's share link was just copied
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  // Ref to receive revealMeasure from the sidebar
  const sidebarRevealRef = useRef<((code: string, displayLabel?: string) => void) | null>(null);
  const registerReveal = (fn: ((code: string, displayLabel?: string) => void) | null) => {
    sidebarRevealRef.current = fn;
  };

  // Load chart data
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const vars = (currentQuery.variables && currentQuery.variables.length > 0)
        ? currentQuery.variables
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

  // Selected variables (unlimited)
  const selectedVars = (currentQuery.variables && currentQuery.variables.length > 0)
    ? currentQuery.variables
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
  const unifiedVars = useMemo(() => [...vdemVars, ...imfVars, ...otherVars], [vdemVars, imfVars, otherVars]);
  // No measured grid; we use fixed auto-rows and vertical scroll for unlimited charts

  // Explanation entries helper (used to control overlay layout)
  const explainEntries = explanationsByCountry ? Object.entries(explanationsByCountry) : [];
  const explainCount = explainEntries.length;

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
  // Remove applying an inline transition here so layout shifts don't animate.
  // We still clear transform and willChange immediately so elements snap to their new place.
  el.style.transform = '';
  el.style.willChange = '';
      }
    });
    // Store for next cycle
    prevRectsRef.current = currentRects;
  }, [unifiedVars]);

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

  // Helper to turn LLM text into React nodes (same as single explanation, reused per country)
  function renderExplanationText(text: string): React.ReactNode {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0; let key = 0;

    // Accept headings in multiple forms:
    // - **Summary:** (existing)
    // - Summary / Why it matters / Drivers/Context / Caveats (case-insensitive, optional colon)
    const boldHeadingRegex = /^\s*\*\*(.+?):\*\*\s*$/;
    const canonicalHeaders = new Set([
      'summary',
      'why it matters',
      'drivers/context',
      'drivers / context',
      'drivers- context',
      'drivers - context',
      'context',
      'caveats',
    ]);
    const isPlainHeader = (raw: string) => {
      const t = raw.trim().replace(/\s{2,}$/g, ''); // drop trailing spaces used for markdown breaks
      // Allow optional trailing colon
      const noColon = t.replace(/:$/, '').toLowerCase();
      return canonicalHeaders.has(noColon);
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Bold markdown heading (e.g., **Summary:**)
      const boldHeadingMatch = boldHeadingRegex.exec(trimmed);
      if (boldHeadingMatch) {
        blocks.push(
          <h4 key={key++} className="text-base font-semibold mt-3 mb-1.5">{boldHeadingMatch[1]}</h4>
        );
        i++;
        continue;
      }

      // Plain text heading lines from provided examples (e.g., "Summary")
      if (isPlainHeader(trimmed)) {
        // Normalize display text (capitalize first letter of each word and keep slash spacing)
        const display = trimmed.replace(/:$/, '');
        blocks.push(
          <h4 key={key++} className="text-base font-semibold mt-3 mb-1.5">{display}</h4>
        );
        i++;
        continue;
      }

      // Bulleted list grouping
      if (trimmed.startsWith('- ')) {
        const items: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          items.push(lines[i].trim().slice(2));
          i++;
        }
        const listKey = key++;
        blocks.push(
          <ul key={listKey} className="list-disc ml-5 my-2 space-y-1">
            {items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}
          </ul>
        );
        continue;
      }

      // Blank line spacing
      if (trimmed.length === 0) {
        blocks.push(<div key={key++} className="h-2" />);
        i++;
        continue;
      }

      // Paragraph
      blocks.push(<p key={key++} className="mb-2">{renderInline(line)}</p>);
      i++;
    }
    return <article>{blocks}</article>;
  }

  async function runExplainForCountries(countries: string[]) {
    if (selectedForExplain.length !== 2 || countries.length === 0) return;
    const [indexA, indexB] = selectedForExplain;
    setExplaining(true);
    setExplainError(null);
    setExplanationsByCountry(null);
    try {
      const results = await Promise.allSettled(
        countries.map(async (country) => {
          const res = await apiService.explainRelationships({ indexA, indexB, country, execute: true });
          const text = typeof res?.explanation === 'string' ? res.explanation.trim() : '';
          return { country, text };
        })
      );
      const map: Record<string, string> = {};
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const { country, text } = r.value as { country: string; text: string };
          map[country] = text || `No explanation returned. Requested: ${indexA} vs ${indexB} for ${country}.`;
        } else {
          const country = countries[idx];
          const reason = (r as PromiseRejectedResult).reason as unknown;
          const msg = reason && typeof (reason as { message?: unknown }).message === 'string' ? (reason as { message: string }).message : String(reason ?? 'Failed');
          map[country] = /\b404\b/.test(msg) ? 'No correlation was found.' : (msg || 'Failed to fetch explanation');
        }
      });
      setExplanationsByCountry(map);
      setExplainTimestamp(new Date());
      setExplainExpanded(false);
      setShowExplainOverlay(true);
    } finally {
      setExplaining(false);
    }
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

  const handleShareLink = (v?: string) => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // set transient UI feedback for the specific chart button
      if (v) {
        // clear any previous timer
        if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
        setCopiedVar(v);
        // clear after 1s
        copyTimerRef.current = window.setTimeout(() => {
          setCopiedVar(null);
          copyTimerRef.current = null;
        }, 1000);
      }
      // You could also show a toast here if desired
      console.log('Link copied to clipboard');
    }).catch((err) => {
      console.warn('Failed to copy link', err);
    });
  };

  // Remove a variable/chart from the selection
  const removeChart = (v: string) => {
    // Also unselect from explain selection if present
    setSelectedForExplain(prev => prev.filter(x => x !== v));
    const vars = (currentQuery.variables && currentQuery.variables.length > 0)
      ? currentQuery.variables
      : (currentQuery.variable ? [currentQuery.variable] : []);
    const nextVars = vars.filter(x => x !== v);
    const next: QueryState = { ...currentQuery };
    if (nextVars.length > 0) {
      next.variables = nextVars;
      next.variable = nextVars[0];
    } else {
      next.variables = undefined;
      next.variable = undefined;
    }
    handleQueryUpdate(next);
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
    // Append WEO/IMF suffix for chart titles when applicable
    const formatImfSuffixLocal = (code: string) => {
      if (!code) return '';
      const parts = code.split('.').map(p => p.toUpperCase());
      const hasV = parts.includes('V');
      const hasQ = parts.includes('Q');
      const hasXDC = parts.includes('XDC');
      const hasUSD = parts.includes('USD');
      const hasPD = parts.includes('PD');
      const hasIX = parts.includes('IX');
      const pieces: string[] = [];
      if (hasV && hasXDC) pieces.push('Current prices in domestic currency');
      else if (hasV && hasUSD) pieces.push('Current prices in US dollar');
      else if (hasQ && hasXDC) pieces.push('Constant prices in domestic currency');
      else if (hasQ && hasUSD) pieces.push('Constant prices in US dollar');
      if (hasPD || hasIX) pieces.push('Price-deflator / index');
      if (pieces.length === 0) return '';
      return ` — ${pieces.join(', ')}`;
    };
    const variableLabelWithSuffix = variableLabel + (isImfVar(v) ? formatImfSuffixLocal(v) : '');
  const rows = chartDataByVar[v] || [];
    // Unique clipPath id to reveal line from left->right; include animateKey to retrigger on data refresh
    const safeVarId = v.replace(/[^a-zA-Z0-9_-]/g, '-');
  const clipId = `reveal-${safeVarId}-${animateKey}`;
  const drawAnimName = `draw-${safeVarId}-${animateKey}`;
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
  className={`relative bg-card border rounded-xl p-2 sm:p-3 box-border mx-auto w-full h-full flex flex-col ${selected ? 'border-success-green ring-2 ring-inset ring-success-green/50' : 'border-border hover:border-muted'}`}
      >
        {/* Remove chart button */}
        <button
          type="button"
          aria-label="Remove chart"
          title="Remove chart"
          onClick={(e) => { e.stopPropagation(); removeChart(v); }}
          className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-1.5 shrink-0">
          <h2 className="text-base font-semibold">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); sidebarRevealRef.current?.(v, variableLabel); }}
              className="text-left w-full text-base font-semibold p-0 m-0"
            >
              {variableLabelWithSuffix}
            </button>
          </h2>
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
              <defs>
                {/* CSS keyframes injected into SVG for reliable stroke-dashoffset animation */}
                <style>{`
                  @keyframes ${drawAnimName} { to { stroke-dashoffset: 0; } }
                `}</style>
                {/* Dots fade-in after the line draw completes */}
                <style>{`
                  @keyframes dots-${safeVarId}-${animateKey} { to { opacity: 1; } }
                `}</style>
                <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                  <rect x="0" y="0" width="100%" height="100%" />
                </clipPath>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="year" 
                stroke="hsl(var(--muted-foreground))"
              />
              {/* Compute Y axis domain to ensure negative values are visible and ranges have padding */}
              {(() => {
                const allValues: number[] = [];
                for (const row of rows) {
                  for (const cid of currentQuery.countries) {
                    const v = row[cid] as number | null | undefined;
                    if (v !== null && v !== undefined && !Number.isNaN(v)) allValues.push(v);
                  }
                }
                if (allValues.length === 0) {
                  return (
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => {
                        if (value === null) return 'N/A';
                        if (variableUnit === '%') return `${(value as number).toFixed(1)}%`;
                        if ((variableScale || '').includes('0-1')) return (value as number).toFixed(3);
                        return (value as number).toFixed(2);
                      }}
                    />
                  );
                }

                const dataMin = Math.min(...allValues);
                const dataMax = Math.max(...allValues);
                let pad = (dataMax - dataMin) * 0.08;
                if (!Number.isFinite(pad) || pad === 0) pad = Math.abs(dataMin) * 0.08 || Math.abs(dataMax) * 0.08 || 1;
                let minDomain = dataMin - pad;
                let maxDomain = dataMax + pad;
                // If the data is all positive, allow min to be 0 for visual grounding, unless negative values exist
                if (dataMin >= 0 && minDomain > 0) minDomain = 0;
                // If the data is all negative, allow max to be 0 for grounding
                if (dataMax <= 0 && maxDomain < 0) maxDomain = 0;

                // Avoid degenerate domain
                if (Math.abs(maxDomain - minDomain) < 1e-6) {
                  minDomain = minDomain - 1;
                  maxDomain = maxDomain + 1;
                }

                return (
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    domain={[minDomain, maxDomain]}
                    tickFormatter={(value) => {
                      if (value === null) return 'N/A';
                      if (variableUnit === '%') return `${(value as number).toFixed(1)}%`;
                      if ((variableScale || '').includes('0-1')) return (value as number).toFixed(3);
                      return (value as number).toFixed(2);
                    }}
                  />
                );
              })()}
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
                      <p className="font-medium mb-2">{`${variableLabelWithSuffix} — Year: ${label}`}</p>
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
        // line drawing duration (s) — keep in sync with CSS animation below
        const lineDrawDuration = 0.9;
        const dotsAnimName = `dots-${safeVarId}-${animateKey}`;
        return (
          <Line
                    key={countryId}
                    type="monotone"
                    dataKey={countryId}
                    stroke={getCountryColor(index)}
                    strokeWidth={2}
          // hide dots initially and animate their opacity after the line draw finishes
          dot={{ r: 4, strokeWidth: 0, fill: getCountryColor(index) }}
                    name={country?.name}
        // Use stroke-dashoffset animation for clear left-to-right reveal
        isAnimationActive={false}
        connectNulls={false}
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: `${drawAnimName} 0.9s ease-out forwards`,
          transition: 'none',
          opacity: 1,
        }}
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
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
          <Button
            variant={copiedVar === v ? 'default' : 'outline'}
            size="sm"
            className={`h-8 px-2 text-xs ${copiedVar === v ? 'bg-success-green text-white border-success-green' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleShareLink(v); }}
          >
            <Link2 className="h-4 w-4 mr-1" />
            {copiedVar === v ? 'Copied' : 'Copy Share Link'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background h-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_360px] gap-0 p-4 h-full overflow-hidden min-h-0">
        {/* Left: Chart area fills all space up to the sidebar */}
        <div className="pr-0 sm:pr-4 min-h-0 h-full overflow-hidden relative">
          {/* Mobile-only Filters button (only on small screens) */}
          <div className="flex items-center justify-end mb-3 sm:hidden">
            <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
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
              {/* Explain Correlations button moved into sidebar; no CTA here */}
              {/* Grid of charts: 1 column on mobile, 2 columns on desktop; vertically scrollable, unlimited charts */}
              <div className="flex-1 min-h-0">
                <div
                  ref={gridRef}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full overflow-y-auto min-h-0"
                  style={{ gridAutoRows: unifiedVars.length === 1 ? '630px' : '420px' }}
                >
          {unifiedVars.map((v) => (
                    <div
                      key={`cell-${v}`}
                      ref={(el) => { tileRefs.current[v] = el; }}
                      className={`min-h-0 will-change-transform [contain:content] ${unifiedVars.length === 1 ? 'sm:col-span-2' : ''}`}
                      style={{ height: '100%' }}
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
          {showExplainOverlay && explanationsByCountry && Object.keys(explanationsByCountry).length > 0 && (
            <div className="absolute inset-0 z-20 flex items-start justify-center p-3 sm:p-6">
              {/* Click outside to close */}
              <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" onClick={() => setShowExplainOverlay(false)} />
              <div className="relative w-full max-w-7xl mt-4 sm:mt-8 text-sm">
                <div className="flex items-center justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={() => setShowExplainOverlay(false)}>Close</Button>
                </div>
                <div className="max-h-[70vh] overflow-auto">
                  {/* Layout rules:
                      - 1 explanation: center and constrain width (previous behavior)
                      - 2 or 3 explanations: use responsive columns so cards share available width side-by-side
                  */}
                  {explainCount === 1 ? (
                    <div className="flex justify-center">
                      {explainEntries.map(([countryId, text]) => {
                        const country = getCountryById(countryId);
                        return (
                          <div key={countryId} className="w-full sm:w-3/4 lg:w-2/3 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-md shadow-2xl p-6 sm:p-7">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>AI response</span>
                                {explainTimestamp && <span>· {explainTimestamp.toLocaleString()}</span>}
                              </div>
                              <div className="text-base font-semibold text-muted-foreground">{country?.name || countryId}</div>
                            </div>
                            <div className="leading-relaxed text-sm">
                              {renderExplanationText(text)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(explainCount, 3)} gap-6`}>
                      {explainEntries.map(([countryId, text]) => {
                        const country = getCountryById(countryId);
                        return (
                          <div key={countryId} className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur-md shadow-2xl p-6 sm:p-7">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>AI response</span>
                                {explainTimestamp && <span>· {explainTimestamp.toLocaleString()}</span>}
                              </div>
                              <div className="text-base font-semibold text-muted-foreground">{country?.name || countryId}</div>
                            </div>
                            <div className="leading-relaxed text-sm">
                              {renderExplanationText(text)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Country picker overlay when more than 3 countries are selected */}
          {showCountryPicker && (
            <div className="absolute inset-0 z-30 flex items-start justify-center p-3 sm:p-6">
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" onClick={() => setShowCountryPicker(false)} />
              <div className="relative w-full max-w-lg mt-10 rounded-2xl border border-border bg-background shadow-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Pick up to 3 countries</h3>
                  <Button size="sm" variant="outline" onClick={() => setShowCountryPicker(false)}>Cancel</Button>
                </div>
                <div className="max-h-[50vh] overflow-auto space-y-2">
                  {currentQuery.countries.map((cid) => {
                    const c = getCountryById(cid);
                    const checked = pickerCountries.includes(cid);
                    const disableUnchecked = !checked && pickerCountries.length >= 3;
                    return (
                      <label key={cid} className={`flex items-center gap-3 p-2 rounded hover:bg-muted ${disableUnchecked ? 'opacity-60' : ''}`}>
                        <Checkbox checked={checked} onCheckedChange={(val) => {
                          const v = Boolean(val);
                          setPickerCountries((prev) => {
                            if (v) {
                              if (prev.includes(cid)) return prev;
                              if (prev.length >= 3) return prev;
                              return [...prev, cid];
                            } else {
                              return prev.filter(x => x !== cid);
                            }
                          });
                        }} disabled={disableUnchecked} />
                        <span className="text-sm">{c?.name || cid}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCountryPicker(false)}>Close</Button>
                  <Button size="sm" disabled={pickerCountries.length === 0} onClick={async () => { setShowCountryPicker(false); await runExplainForCountries(pickerCountries); }}>Explain</Button>
                </div>
              </div>
            </div>
          )}
        </div>
  {/* Right: Sidebar - fixed width on desktop */}
  <div id="desktop-sidebar-scroll" className="hidden sm:block h-full overflow-y-auto min-h-0">
          <ChartSidebar
            currentQuery={currentQuery}
            onQueryChange={handleQueryUpdate}
            registerReveal={registerReveal}
            explainControls={
              <Button
                size="sm"
                variant="default"
                aria-busy={explaining}
                disabled={!(selectedForExplain.length === 2 && currentQuery.countries.length > 0) || explaining}
                onClick={async () => {
                  if (selectedForExplain.length !== 2 || currentQuery.countries.length === 0) return;
                  const selected = currentQuery.countries;
                  if (selected.length <= 3) {
                    await runExplainForCountries(selected);
                  } else {
                    setPickerCountries(selected.slice(0, 3));
                    setShowCountryPicker(true);
                  }
                }}
                title={currentQuery.countries[0] ? `Using ${getCountryById(currentQuery.countries[0])?.name || currentQuery.countries[0]}` : 'Select a country to enable'}
              >
                {explaining ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Explaining...
                  </span>
                ) : (
                  'Explain Correlations'
                )}
              </Button>
            }
          />
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
            <div id="mobile-sidebar-scroll" className="flex-1 overflow-y-auto min-h-0">
            <ChartSidebar
              currentQuery={currentQuery}
              onQueryChange={handleQueryUpdate}
              registerReveal={registerReveal}
              explainControls={
                <Button
                  size="sm"
                  variant="default"
                  aria-busy={explaining}
                  disabled={!(selectedForExplain.length === 2 && currentQuery.countries.length > 0) || explaining}
                  onClick={async () => {
                    if (selectedForExplain.length !== 2 || currentQuery.countries.length === 0) return;
                    const selected = currentQuery.countries;
                    if (selected.length <= 3) {
                      await runExplainForCountries(selected);
                    } else {
                      setPickerCountries(selected.slice(0, 3));
                      setShowCountryPicker(true);
                    }
                  }}
                  title={currentQuery.countries[0] ? `Using ${getCountryById(currentQuery.countries[0])?.name || currentQuery.countries[0]}` : 'Select a country to enable'}
                >
                  {explaining ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      Explaining...
                    </span>
                  ) : (
                    'Explain Correlations'
                  )}
                </Button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}