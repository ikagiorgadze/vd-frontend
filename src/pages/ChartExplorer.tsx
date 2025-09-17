import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Link2, Filter, X, ChevronDown, HelpCircle } from 'lucide-react';
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
import { getVariableDisplayName } from '@/lib/variable-codes';
import { apiService, CorrelationPair } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faLinkSlash } from '@fortawesome/free-solid-svg-icons';


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
  // New pairing state for custom pairs
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null); // Single variable selected for pairing
  // Picker for choosing up to 3 countries when more than 3 are selected
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [pickerCountries, setPickerCountries] = useState<string[]>([]);
  // Grid container ref (for potential future use)
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Mobile viewport detection to adjust chart heights
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobileViewport = () => {
      setIsMobileViewport(window.innerWidth < 768); // md breakpoint
    };
    
    // Check on mount
    checkMobileViewport();
    
    // Listen for resize
    window.addEventListener('resize', checkMobileViewport);
    
    return () => {
      window.removeEventListener('resize', checkMobileViewport);
    };
  }, []);
  // Refs for FLIP animations (smooth reflow when layout/selection changes)
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});
  // Refs to track loaded data for granular incremental loading
  const loadedDataRef = useRef<{
    variables: Set<string>;
    countries: Set<string>;
    startYear: number;
    endYear: number;
  }>({
    variables: new Set(),
    countries: new Set(),
    startYear: 0,
    endYear: 0
  });
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
      
      // Also include variables from correlation pairs and custom pairs
      const pairVars: string[] = [];
      
      // From correlation pairs
      const correlationPairs = currentQuery.correlationPairs || [];
      correlationPairs.forEach(pair => {
        // Extract variable codes from correlation pair indices
        const var1 = pair.indexA.split(':')[1] || pair.indexA;
        const var2 = pair.indexB.split(':')[1] || pair.indexB;
        pairVars.push(var1, var2);
      });
      
      // From custom pairs
      const customPairs = currentQuery.customPairs || [];
      customPairs.forEach(pair => {
        pairVars.push(pair.var1, pair.var2);
      });
      
      // Combine regular variables with pair variables
      const allVars = [...new Set([...vars, ...pairVars])];

      
      if (allVars.length === 0) {
        setDataByVar({});
        setChartDataByVar({});
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const loaded = loadedDataRef.current;
      const currentVars = new Set(allVars);
      const currentCountries = new Set(currentQuery.countries);
      const currentStartYear = currentQuery.startYear;
      const currentEndYear = currentQuery.endYear;
      
      // Determine what data needs to be fetched
      const newVars = Array.from(currentVars).filter(v => !loaded.variables.has(v));
      const newCountries = Array.from(currentCountries).filter(c => !loaded.countries.has(c));
      const removedVars = Array.from(loaded.variables).filter(v => !currentVars.has(v));
      
      // Year range changes
      const yearRangeExpanded = currentStartYear < loaded.startYear || currentEndYear > loaded.endYear;
      const needsYearRefetch = yearRangeExpanded || loaded.startYear === 0; // First load
      
      // Build fetch plan
      const fetchPlans: Array<{
        variables: string[];
        countries: string[];
        startYear: number;
        endYear: number;
        reason: string;
      }> = [];
      
      // Plan 1: New variables for all current countries and years
      if (newVars.length > 0) {
        fetchPlans.push({
          variables: newVars,
          countries: Array.from(currentCountries),
          startYear: currentStartYear,
          endYear: currentEndYear,
          reason: 'new-variables'
        });
      }
      
      // Plan 2: New countries for existing variables
      if (newCountries.length > 0 && loaded.variables.size > 0) {
        const existingVars = Array.from(loaded.variables).filter(v => currentVars.has(v));
        if (existingVars.length > 0) {
          fetchPlans.push({
            variables: existingVars,
            countries: newCountries,
            startYear: currentStartYear,
            endYear: currentEndYear,
            reason: 'new-countries'
          });
        }
      }
      
      // Plan 3: Extended year range for existing variables and countries
      if (needsYearRefetch && loaded.variables.size > 0 && loaded.countries.size > 0) {
        const existingVars = Array.from(loaded.variables).filter(v => currentVars.has(v));
        const existingCountries = Array.from(loaded.countries).filter(c => currentCountries.has(c));
        
        if (existingVars.length > 0 && existingCountries.length > 0) {
          // Only fetch missing year ranges
          if (currentStartYear < loaded.startYear) {
            fetchPlans.push({
              variables: existingVars,
              countries: existingCountries,
              startYear: currentStartYear,
              endYear: Math.min(loaded.startYear - 1, currentEndYear),
              reason: 'extended-years-before'
            });
          }
          if (currentEndYear > loaded.endYear) {
            fetchPlans.push({
              variables: existingVars,
              countries: existingCountries,
              startYear: Math.max(loaded.endYear + 1, currentStartYear),
              endYear: currentEndYear,
              reason: 'extended-years-after'
            });
          }
        }
      }
      
      console.log('🔄 Incremental loading analysis:', {
        newVars: newVars.length > 0 ? newVars : '(none)',
        newCountries: newCountries.length > 0 ? newCountries : '(none)', 
        removedVars: removedVars.length > 0 ? removedVars : '(none)',
        yearRangeExpanded,
        fetchPlans: fetchPlans.map(p => `${p.reason}(${p.variables.length}vars,${p.countries.length}countries,${p.startYear}-${p.endYear})`)
      });
      
      if (fetchPlans.length === 0) {
        // No new data to fetch, just clean up unused variables
        if (removedVars.length > 0) {
          setDataByVar(prev => {
            const next = { ...prev };
            removedVars.forEach(v => delete next[v]);
            return next;
          });
          setChartDataByVar(prev => {
            const next = { ...prev };
            removedVars.forEach(v => delete next[v]);
            return next;
          });
          // Update loaded variables
          removedVars.forEach(v => loaded.variables.delete(v));
        }
        setLoading(false);
        return;
      }
      try {
        // Execute all fetch plans
        const allFetchResults: Array<[string, VDemDataPoint[]]> = [];
        
        for (const plan of fetchPlans) {
          console.log(`📡 Fetching ${plan.reason}: ${plan.variables.length} vars × ${plan.countries.length} countries (${plan.startYear}-${plan.endYear})`);
          const planResults = await Promise.all(
            plan.variables.map(async (v) => {
              const result = await fetchVDemData(
                plan.countries,
                v,
                plan.startYear,
                plan.endYear
              );
              return [v, result] as const;
            })
          );
          allFetchResults.push(...planResults);
        }
        if (!cancelled) {
          const newRawData: Record<string, VDemDataPoint[]> = {};
          
          // Group fetch results by variable
          for (const [v, arr] of allFetchResults) {
            if (!newRawData[v]) {
              newRawData[v] = [];
            }
            newRawData[v].push(...arr);
          }
          
          // Remove duplicates and sort by year
          for (const [v, arr] of Object.entries(newRawData)) {
            const uniqueMap = new Map<string, VDemDataPoint>();
            arr.forEach(point => {
              const key = `${point.country}-${point.year}`;
              uniqueMap.set(key, point);
            });
            newRawData[v] = Array.from(uniqueMap.values()).sort((a, b) => a.year - b.year);
          }
          
          // Transform to chart data
          const newChartData: Record<string, ChartRow[]> = {};
          for (const [v, arr] of Object.entries(newRawData)) {
            // Transform to chart rows now so charts mount only after data is fully ready
            if (!arr || arr.length === 0) {
              newChartData[v] = [];
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
              newChartData[v] = transformed;
            }
          }

          // Update both raw data and chart data together
          setDataByVar(prev => {
            const updatedRawData = { ...prev };
            
            // Merge new raw data
            for (const [v, newPoints] of Object.entries(newRawData)) {
              if (!updatedRawData[v]) {
                updatedRawData[v] = newPoints;
              } else {
                // Merge with existing data, avoiding duplicates
                const existingMap = new Map<string, VDemDataPoint>();
                updatedRawData[v].forEach(point => {
                  const key = `${point.country}-${point.year}`;
                  existingMap.set(key, point);
                });
                
                newPoints.forEach(point => {
                  const key = `${point.country}-${point.year}`;
                  existingMap.set(key, point); // This will overwrite or add
                });
                
                updatedRawData[v] = Array.from(existingMap.values()).sort((a, b) => a.year - b.year);
              }
            }
            
            // Remove unused variables
            removedVars.forEach(v => delete updatedRawData[v]);
            
            // Update chart data based on the updated raw data
            setChartDataByVar(prevChart => {
              const updatedChartData = { ...prevChart };
              
              // Rebuild chart data for all variables with new data plus existing ones that need country/year updates
              const varsToRebuild = new Set([
                ...Object.keys(newRawData),
                ...Array.from(loaded.variables).filter(v => allVars.includes(v))
              ]);
              
              for (const v of varsToRebuild) {
                const rawData = updatedRawData[v] || [];
                if (rawData.length === 0) {
                  updatedChartData[v] = [];
                } else {
                  // Get all years for this variable across all countries
                  const years = [...new Set(rawData.map(d => d.year))].sort();
                  const transformed: ChartRow[] = years.map(year => {
                    const yearData: ChartRow = { year } as ChartRow;
                    currentQuery.countries.forEach(countryId => {
                      const dataPoint = rawData.find(d => d.year === year && d.country === countryId);
                      yearData[countryId] = dataPoint?.value ?? null;
                    });
                    return yearData;
                  });
                  updatedChartData[v] = transformed;
                }
              }
              
              // Remove unused variables
              removedVars.forEach(v => delete updatedChartData[v]);
              
              return updatedChartData;
            });
            
            return updatedRawData;
          });
          
          // Update loaded data tracking
          loadedDataRef.current = {
            variables: new Set(allVars),
            countries: new Set(currentQuery.countries),
            startYear: currentStartYear,
            endYear: currentEndYear
          };
          
          setLoading(false);
          // Trigger a new animation cycle only when we have new data
          if (Object.keys(newRawData).length > 0) {
            setAnimateKey((k) => k + 1);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Data loading failed:', e);
          // For errors, don't clear existing data unless it's a complete reload
          if (loaded.variables.size === 0) {
            // First load failed, clear everything
            setDataByVar({});
            setChartDataByVar({});
            loadedDataRef.current = {
              variables: new Set(),
              countries: new Set(),
              startYear: 0,
              endYear: 0
            };
          }
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
    currentQuery.endYear,
    currentQuery.correlationPairs,
    currentQuery.customPairs
  ]);



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

  // Handle all pairs
  const correlationPairs = useMemo(() => currentQuery.correlationPairs || [], [currentQuery.correlationPairs]);
  const customPairs = useMemo(() => currentQuery.customPairs || [], [currentQuery.customPairs]);

  // Combine regular variables and pairs for rendering
  const allChartItems = useMemo(() => {
    const items: Array<{ 
      type: 'variable' | 'correlation-pair' | 'custom-pair'; 
      id: string; 
      data?: CorrelationPair | { var1: string; var2: string }
    }> = [];

    // Get variables that are part of any pairs (to exclude from individual display)
    const pairedVariables = new Set<string>();
    
    // From correlation pairs
    correlationPairs.forEach(pair => {
      const var1 = pair.indexA.split(':')[1] || pair.indexA;
      const var2 = pair.indexB.split(':')[1] || pair.indexB;
      pairedVariables.add(var1);
      pairedVariables.add(var2);
    });
    
    // From custom pairs
    customPairs.forEach(pair => {
      pairedVariables.add(pair.var1);
      pairedVariables.add(pair.var2);
    });

    // Priority order: correlation pairs first, then custom pairs, then separate charts
    // Add correlation pairs first
    correlationPairs.forEach((pair, index) => {
      items.push({
        type: 'correlation-pair',
        id: `correlation-pair-${index}`,
        data: pair
      });
    });

    // Add custom pairs second
    customPairs.forEach((pair, index) => {
      items.push({
        type: 'custom-pair',
        id: `custom-pair-${index}`,
        data: pair
      });
    });

    // Add regular variables (excluding those in pairs) last
    unifiedVars.forEach(v => {
      if (!pairedVariables.has(v)) {
        items.push({ type: 'variable', id: v });
      }
    });

    return items;
  }, [unifiedVars, correlationPairs, customPairs]);

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

  // Measure charts grid rect for aligning the fixed banner to charts width & left
  useEffect(() => {
    let rafId: number | null = null;
    const computeRect = () => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // Clamp to viewport horizontally to avoid overflow
      const margin = 8; // px safety margin on very small screens
      const maxWidth = Math.max(0, window.innerWidth - margin * 2);
      const width = Math.min(rect.width, maxWidth);
      // If we clamp width, ensure left also respects margin
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width));
      // Compute top offset just below the global header (if present)
      let top = 16; // fallback spacing
      const header = document.querySelector('header.bg-card') as HTMLElement | null;
      if (header) {
        const hRect = header.getBoundingClientRect();
        top = Math.max(16, Math.floor(hRect.bottom + 8));
      }
      // Round left/width to whole pixels to avoid jitter
      return { left: Math.round(left), width: Math.round(width), top };
    };

    const update = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const next = computeRect();
        if (!next) return;
        // Banner rect removed - no longer needed without apply changes banner
      });
    };

    // Initial measure
    update();
    const ro = new ResizeObserver(() => update());
    if (gridRef.current) ro.observe(gridRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  // Measure banner height to reserve space between header and charts so the banner doesn’t cover charts initially


  // (Reverted FLIP transform animation for stability)

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
  // Markdown hash headings e.g., "### Summary" or "#### Caveats"
  const mdHeadingRegex = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;
    const canonicalHeaders = new Set([
      'summary',
      'why it matters',
      'drivers/context',
      'drivers / context',
      'drivers- context',
      'drivers - context',
      'context',
  'caveats',
  'real examples',
  'examples',
  'statistical reliability'
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

      // Hash markdown heading (e.g., ### Summary)
      const mdHeadingMatch = mdHeadingRegex.exec(trimmed);
      if (mdHeadingMatch) {
        const title = mdHeadingMatch[1].replace(/:$/, '');
        blocks.push(
          <h4 key={key++} className="text-base font-semibold mt-3 mb-1.5">{title}</h4>
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

  async function runExplainForCountries(countries: string[], variables?: string[]) {
    const varsToUse = variables || selectedForExplain;
    if (varsToUse.length < 2 || countries.length === 0) return;
    const [indexA, indexB] = varsToUse.slice(0, 2);
    setExplaining(true);
    setExplainError(null);
    setExplanationsByCountry(null);
    try {
      const results = await Promise.allSettled(
        countries.map(async (country) => {
          // Build Index payloads from the currently displayed API data
          const buildIndex = (variableCode: string, cid: string) => {
            const raw = dataByVar[variableCode] || [];
            const series = raw
              .filter(d => d.country === cid && d.value !== null && d.value !== undefined && !Number.isNaN(d.value))
              .sort((a, b) => a.year - b.year)
              .map(d => ({ year: d.year, observation: Number(d.value) }));
            return { name: variableCode, data: series };
          };

          const payload = {
            indexA: buildIndex(indexA, country),
            indexB: buildIndex(indexB, country),
            country: getCountryById(country)?.name || country,
            execute: true,
          };

          const res = await apiService.explainRelationships(payload);
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



  // New pairing functions for custom pairs
  function toggleChartPairing(variable: string) {
    if (selectedForPairing === variable) {
      // Deselect if already selected
      setSelectedForPairing(null);
    } else if (selectedForPairing === null) {
      // Select first chart
      setSelectedForPairing(variable);
    } else {
      // Pair with second chart
      const firstVar = selectedForPairing;
      if (firstVar !== variable) {
        // Remove any existing pairs containing these variables
        const newCustomPairs = (currentQuery.customPairs || []).filter(
          pair => pair.var1 !== firstVar && pair.var2 !== firstVar && 
                  pair.var1 !== variable && pair.var2 !== variable
        );
        // Add new pair
        newCustomPairs.push({ var1: firstVar, var2: variable });
        onQueryChange({ ...currentQuery, customPairs: newCustomPairs });
      }
      setSelectedForPairing(null);
    }
  }

  function removeCustomPair(var1: string, var2: string) {
    const newCustomPairs = (currentQuery.customPairs || []).filter(
      pair => !(pair.var1 === var1 && pair.var2 === var2) && 
              !(pair.var1 === var2 && pair.var2 === var1)
    );
    onQueryChange({ ...currentQuery, customPairs: newCustomPairs });
  }

  function breakUpCorrelationPair(pair: CorrelationPair) {
    const newPairs = (currentQuery.correlationPairs || []).filter(
      p => !(p.indexA === pair.indexA && p.indexB === pair.indexB)
    );
    onQueryChange({ ...currentQuery, correlationPairs: newPairs });
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
    onQueryChange(next); // Don't update URL for chart removal
  };

  // Helper function to render paired charts


  // Helper function to render pair charts (both correlation and custom)
  const renderPairChart = (
    pairId: string, 
    pairData: CorrelationPair | { var1: string; var2: string }, 
    isCorrelationPair: boolean
  ) => {
    // Extract variable codes from the pair
    const var1 = isCorrelationPair 
      ? (pairData as CorrelationPair).indexA.split(':')[1] || (pairData as CorrelationPair).indexA
      : (pairData as { var1: string; var2: string }).var1;
    const var2 = isCorrelationPair 
      ? (pairData as CorrelationPair).indexB.split(':')[1] || (pairData as CorrelationPair).indexB
      : (pairData as { var1: string; var2: string }).var2;

    return (
      <div
        className="relative border rounded-xl p-2 sm:p-3 box-border mx-auto w-full h-full flex flex-col border-border"
        style={{ backgroundColor: isCorrelationPair ? 'rgba(59, 130, 246, 0.05)' : 'rgba(34, 197, 94, 0.05)' }} // Blue for correlation, green for custom
      >
        {/* Remove/Break up pair button */}
        <button
          type="button"
          aria-label={isCorrelationPair ? "Break up correlation pair" : "Remove custom pair"}
          title={isCorrelationPair ? "Break up correlation pair" : "Remove custom pair"}
          onClick={(e) => {
            e.stopPropagation();
            if (isCorrelationPair) {
              breakUpCorrelationPair(pairData as CorrelationPair);
            } else {
              removeCustomPair(var1, var2);
            }
          }}
          className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:text-white hover:bg-red-500 hover:border-red-500"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Pair info header */}
        <div className="mb-2 text-center">
          {isCorrelationPair ? (
            <>
              <h3 className="text-sm font-medium text-primary">Correlation Pair</h3>
              <p className="text-xs text-muted-foreground">
                r = {(pairData as CorrelationPair).r.toFixed(3)} • n = {(pairData as CorrelationPair).n} • p = {(pairData as CorrelationPair).p_value.toFixed(4)}
              </p>
            </>
          ) : (
            <h3 className="text-sm font-medium text-green-600">Custom Pair</h3>
          )}
        </div>

        {/* Charts container */}
        <div className={`${isMobileViewport ? 'flex flex-col' : 'flex'} flex-1 min-h-0`}>
          {/* Left chart */}
          <div className={`flex-1 ${isMobileViewport ? 'pb-2 border-b border-border' : 'pr-2 border-r border-border'}`}>
            {renderChartCard(var1, true, true)}
          </div>

          {/* Right chart */}
          <div className={`flex-1 ${isMobileViewport ? 'pt-2' : 'pl-2'}`}>
            {renderChartCard(var2, true, true)}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Left chart actions */}
          {!isMobileViewport && (
            <div className="flex items-center gap-2 pr-2">
              <Button
                size="sm"
                className="h-8 px-2 text-xs bg-muted text-foreground border-border hover:bg-white hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); handleDownloadCSVFor(var1, chartDataByVar[var1] || []); }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download CSV
              </Button>
            </div>
          )}

          {/* Right chart actions */}
          <div className="flex items-center justify-between gap-2 pl-2">
            {!isMobileViewport && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 px-2 text-xs bg-muted text-foreground border-border hover:bg-white hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); handleDownloadCSVFor(var2, chartDataByVar[var2] || []); }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download CSV
                </Button>
              </div>
            )}

            {/* Explain correlations button */}
            <Button
              size="sm"
              className={`${isMobileViewport ? 'h-10 px-3 text-sm' : 'h-8 px-2 text-xs'} bg-primary text-primary-foreground hover:bg-primary/90`}
              onClick={async (e) => {
                e.stopPropagation();
                if (currentQuery.countries.length > 0) {
                  const selected = currentQuery.countries;
                  if (selected.length <= 3) {
                    await runExplainForCountries(selected, [var1, var2]);
                  } else {
                    setPickerCountries(selected.slice(0, 3));
                    setShowCountryPicker(true);
                  }
                }
              }}
              disabled={explaining}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Explain Correlation
            </Button>
          </div>
        </div>
      </div>
    );
  };
  const renderChartCard = (v: string, isPaired: boolean = false, isInPairContainer: boolean = false) => {
    const variableMeta = getVariableById(v);
    const variableLabel = getVariableDisplayName(v);
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
    return (
      <div
        key={v}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (isMobileViewport && !isInPairContainer) {
            toggleChartPairing(v);
          }
          // Individual charts are no longer selectable for explanation
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isMobileViewport && !isInPairContainer) {
              toggleChartPairing(v);
            }
          }
        }}
  className={`relative ${isInPairContainer ? 'bg-transparent border-0 p-0' : isPaired ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'bg-card'} ${!isInPairContainer ? `border rounded-xl ${isMobileViewport ? 'py-2 px-1' : 'p-2 sm:p-3'} box-border mx-auto w-full h-full` : 'w-full h-full'} flex flex-col ${!isInPairContainer ? `border-border hover:border-muted ${selectedForPairing === v && isMobileViewport ? 'bg-green-500/20' : selectedForPairing === v && !isMobileViewport ? 'ring-2 ring-green-500 border-green-500' : ''}` : ''}`}
      >
        {/* Remove chart button - only show when not in pair container */}
        {!isInPairContainer && (
          <button
            type="button"
            aria-label="Remove chart"
            title="Remove chart"
            onClick={(e) => { e.stopPropagation(); removeChart(v); }}
            className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* Pair chart button - only show when not in pair container */}
        {!isInPairContainer && (
          <button
            type="button"
            aria-label="Pair chart"
            title="Pair chart"
            onClick={(e) => { e.stopPropagation(); toggleChartPairing(v); }}
            className={`absolute ${isMobileViewport ? 'bottom-2 right-2' : 'bottom-1 right-1'} inline-flex items-center justify-center rounded-md border text-muted-foreground hover:text-white ${
              selectedForPairing === v 
                ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                : 'border-border hover:bg-green-500 hover:border-green-500'
            } ${isMobileViewport ? 'h-9 w-9' : 'h-7 w-7'}`}
          >
            <FontAwesomeIcon icon={faLink} className={`${isMobileViewport ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </button>
        )}
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
            <LineChart 
              data={rows}
              margin={isMobileViewport ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 5, right: 30, bottom: 5, left: 20 }}
            >
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
                      width={isMobileViewport ? 0 : undefined}
                      tick={!isMobileViewport}
                      tickFormatter={(value) => {
                        if (isMobileViewport) return '';
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
                    width={isMobileViewport ? 0 : undefined}
                    tick={!isMobileViewport}
                    tickFormatter={(value) => {
                      if (isMobileViewport) return '';
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
        {/* Actions for each variable - only show when not in pair container */}
        {!isInPairContainer && !isMobileViewport && (
          <div className="flex items-center gap-2 pt-2 border-t border-border mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleDownloadCSVFor(v, rows); }}>
              <Download className="h-4 w-4 mr-1" />
              Download CSV
            </Button>
            <Button
              variant={copiedVar === v ? 'default' : 'outline'}
              size="sm"
              className={`h-8 px-2 text-xs ${copiedVar === v ? 'bg-muted text-foreground border-border' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleShareLink(v); }}
            >
              <Link2 className="h-4 w-4 mr-1" />
              {copiedVar === v ? 'Copied' : 'Copy Share Link'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-background h-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_360px] gap-0 p-0 sm:p-4 h-full overflow-hidden min-h-0">
        {/* Left: Chart area fills all space up to the sidebar */}
        <div className="pr-0 sm:pr-4 min-h-0 h-full overflow-hidden relative">
          {/* Mobile filter button - floating action button style */}
          <div className="sm:hidden fixed bottom-32 right-6 z-40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFiltersOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border-2"
            >
              <Filter className="h-5 w-5" />
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
              {/* Pending changes notification and apply button */}
              {/* Pending changes banner: fixed to follow the entire page (no layout spacer) */}


              {/* Grid of charts: responsive layout - single chart full width, multiple charts side by side */}
              <div className="flex-1 min-h-0">
                {/* Spacer so the fixed banner doesn’t overlap charts initially */}

                <div
                  ref={gridRef}
                  className={`grid gap-4 h-full overflow-y-auto min-h-0 ${
                    isMobileViewport || allChartItems.length === 1
                      ? 'grid-cols-1'
                      : 'grid-cols-2'
                  }`}
                  style={{ 
                    gridAutoRows: isMobileViewport 
                      ? '640px' 
                      : (allChartItems.length === 1 
                          ? (allChartItems[0]?.type.includes('pair') ? '420px' : '630px')
                          : '420px'
                        ) 
                  }}
                >
          {allChartItems.map((item) => {
            if (item.type === 'variable') {
              return (
                <div
                  key={`cell-${item.id}`}
                  ref={(el) => { tileRefs.current[item.id] = el; }}
                  className="min-h-0 will-change-transform [contain:content] relative overflow-hidden isolate"
                  style={{ height: isMobileViewport ? '640px' : '100%' }}
                >
                  {renderChartCard(item.id, false, false)}
                </div>
              );
            } else if (item.type === 'correlation-pair') {
              return (
                <div
                  key={item.id}
                  className="min-h-0 will-change-transform [contain:content] relative overflow-hidden isolate"
                  style={{
                    height: isMobileViewport ? '640px' : '100%',
                    gridColumn: isMobileViewport ? 'span 1' : 'span 2'
                  }}
                >
                  {renderPairChart(item.id, item.data!, true)}
                </div>
              );
            } else if (item.type === 'custom-pair') {
              return (
                <div
                  key={item.id}
                  className="min-h-0 will-change-transform [contain:content] relative overflow-hidden isolate"
                  style={{
                    height: isMobileViewport ? '640px' : '100%',
                    gridColumn: isMobileViewport ? 'span 1' : 'span 2'
                  }}
                >
                  {renderPairChart(item.id, item.data!, false)}
                </div>
              );
            }
            return null;
          })}
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
                  <Button size="sm" disabled={pickerCountries.length === 0} onClick={async () => { setShowCountryPicker(false); await runExplainForCountries(pickerCountries, selectedForExplain); }}>Explain</Button>
                </div>
              </div>
            </div>
          )}
        </div>
  {/* Right: Sidebar - fixed width on desktop */}
  <div id="desktop-sidebar-scroll" className="hidden sm:block h-full overflow-y-auto min-h-0">
          <ChartSidebar
            currentQuery={currentQuery}
            onQueryChange={onQueryChange}
            registerReveal={registerReveal}
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
              onQueryChange={onQueryChange}
              registerReveal={registerReveal}

            />
          </div>
        </div>
      )}
    </div>
  );
}