import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { COUNTRIES, searchCountries } from '@/lib/countries';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/lib/url-state';
import { CATEGORIES, VDemCategory } from '@/lib/variables';
import { getSubcategoriesForCategory, getVariablesForSubcategory } from '@/lib/variable-mappings';
import { getVariableCode } from '@/lib/variable-codes';
import { HIDDEN_VARIABLE_CODES } from '@/lib/hidden-variables';
import { getVariableById, getSubcategoryById } from '@/lib/variables';
import { getMeasurePathByCode, getMeasurePathByLabel } from '@/lib/measure-index';
import { getVariableName } from '@/lib/variable-codes';
import { ChevronRight, ChevronDown, X, HelpCircle, Loader2 } from 'lucide-react';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import HelpIcon from '@/components/ui/help-icon';
import { cn } from '@/lib/utils';
import WEO_GROUPS from '@/weo-indicator-series-codes.json';
import NEA_GROUPS from '@/nea-indicator-series-codes.json';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import { setImfOrigin } from '@/lib/imf-origin';
import { toast as notify } from '@/components/ui/sonner-toast';
import { apiService, CorrelationType, DatasetType, CorrelationsRequest, CorrelationPair } from '@/lib/api';



interface ChartSidebarProps {
  currentQuery: QueryState;
  onQueryChange: (q: QueryState) => void;
  // Optional registration function: parent can receive the revealMeasure callback
  registerReveal?: (fn: ((code: string, displayLabel?: string) => void) | null) => void;
}

export function ChartSidebar({ 
  currentQuery, 
  onQueryChange, 
  registerReveal
}: ChartSidebarProps) {
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VDemCategory | 'all'>(currentQuery.category || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(currentQuery.subcategory || '');
  const [expandedCategories, setExpandedCategories] = useState<Set<VDemCategory>>(new Set());
  // Dataset grouping: currently only V-Dem Dataset. Keep structure to add more later (e.g., IMF Dataset)
  const VDEM_DATASET_KEY = 'dataset::vdem';
  const IMF_DATASET_KEY = 'dataset::imf';
  // Start with all datasets collapsed when entering the page
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [expandedImfCategories, setExpandedImfCategories] = useState<Set<string>>(new Set());
  const [expandedSubcats, setExpandedSubcats] = useState<Set<string>>(new Set());
  const [pendingScrollCode, setPendingScrollCode] = useState<string | null>(null);
  const scrollRetry = useRef(0);
  const measureRefs = useRef<Record<string, HTMLElement | null>>({});
  // Roving focus for keyboard navigation in the measures tree
  const [focusedKey, setFocusedKey] = useState<string>(VDEM_DATASET_KEY);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  // Local input state for years to avoid clamping on every keystroke
  const [fromYearInput, setFromYearInput] = useState<string>(String(currentQuery.startYear));
  const [toYearInput, setToYearInput] = useState<string>(String(currentQuery.endYear));
  // Commit year changes with validation and clamping
  const commitYear = (key: 'startYear' | 'endYear', value: string) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      // Reset inputs if invalid
      setFromYearInput(String(currentQuery.startYear));
      setToYearInput(String(currentQuery.endYear));
      return;
    }
    const rawStart = key === 'startYear' ? parsed : currentQuery.startYear;
    const rawEnd = key === 'endYear' ? parsed : currentQuery.endYear;
    const minYear = 1800;
    const maxYear = new Date().getFullYear();
  const start = Math.max(minYear, Math.min(maxYear, rawStart));
  let end = Math.max(minYear, Math.min(maxYear, rawEnd));
    if (end < start) end = start;
    setFromYearInput(String(start));
    setToYearInput(String(end));
    onQueryChange({ ...currentQuery, startYear: start, endYear: end });
  };
  // Collapsed state for countries section
  const [countriesCollapsed, setCountriesCollapsed] = useState<boolean>(false);
  // Collapsed state for years section
  const [yearsCollapsed, setYearsCollapsed] = useState<boolean>(false);
  // Mobile viewport detection
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
    };
  }, []);

  // Sync year inputs with query changes
  useEffect(() => {
    setFromYearInput(String(currentQuery.startYear));
    setToYearInput(String(currentQuery.endYear));
  }, [currentQuery.startYear, currentQuery.endYear]);

  // Measurement search
  const [measureSearch, setMeasureSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Correlations state
  const [correlationsLoading, setCorrelationsLoading] = useState(false);
  const [correlationsResults, setCorrelationsResults] = useState<CorrelationPair[]>([]);
  const [showCorrelationsResults, setShowCorrelationsResults] = useState(false);
  const correlationsRequestInProgress = useRef(false);

  // ...existing code...

  // Update correlation country when countries change
  // Ensure datasets and submenus are collapsed on first mount
  useEffect(() => {
    setExpandedDatasets(new Set());
    setExpandedImfCategories(new Set());
    setExpandedSubcats(new Set());
  }, []);

  // Auto-load correlations when parameters change
  useEffect(() => {
    const datasets = currentQuery.correlationDatasets || [];
    const hasRequiredParams = datasets.length === 2 && currentQuery.correlationCountry;

    if (hasRequiredParams && !correlationsRequestInProgress.current) {
      correlationsRequestInProgress.current = true;
      setCorrelationsLoading(true);
      
      const runCorrelationQuery = async () => {
        try {
          const request: CorrelationsRequest = {
            country: currentQuery.correlationCountry!,
            type: currentQuery.correlationType || 'strongest',
            dataset1: datasets[0],
            dataset2: datasets[1],
            limit: 10
          };

          const response = await apiService.getCorrelations(request);
          setCorrelationsResults(response.correlations);
          setShowCorrelationsResults(true);
        } catch (error) {
          console.error('Failed to fetch correlations:', error);
          notify.error('Failed to fetch correlations. Please try again.');
        } finally {
          setCorrelationsLoading(false);
          correlationsRequestInProgress.current = false;
        }
      };

      runCorrelationQuery();
    } else if (!hasRequiredParams) {
      // Clear results when parameters are incomplete
      setCorrelationsResults([]);
      setShowCorrelationsResults(false);
      correlationsRequestInProgress.current = false;
    }
  }, [
    currentQuery.correlationDatasets,
    currentQuery.correlationCountry,
    currentQuery.correlationType
  ]);

  const filteredCountries = useMemo(() => {
    return countrySearch ? searchCountries(countrySearch) : COUNTRIES;
  }, [countrySearch]);

  const subcategories = useMemo(() => {
    return selectedCategory !== 'all' ? getSubcategoriesForCategory(selectedCategory) : [];
  }, [selectedCategory]);

  const getVariables = (category: VDemCategory, subcat: string) =>
    getVariablesForSubcategory(category, subcat);

  // Build a flat index of all V-Dem and IMF measures for search suggestions
  type MeasureSuggestion =
    | { dataset: 'vdem'; label: string; code: string; cat: VDemCategory; sub: string }
    | { dataset: 'imf'; label: string; code: string; imfCat: 'imf-weo' | 'imf-nea' };

  const allSuggestions: MeasureSuggestion[] = useMemo(() => {
    const list: MeasureSuggestion[] = [];
    // V-Dem variables
    for (const cat of CATEGORIES) {
      const subs = getSubcategoriesForCategory(cat);
      for (const sub of subs) {
        const vars = getVariables(cat, sub);
        for (const vLabel of vars) {
          const code = getVariableCode(vLabel) ?? vLabel;
          if (!code || HIDDEN_VARIABLE_CODES.has(code)) continue;
          list.push({ dataset: 'vdem', label: vLabel, code, cat, sub });
        }
      }
    }
    // IMF variables
    for (const [code, desc] of Object.entries(IMF_WEO_CODE_TO_DESC)) {
      list.push({ dataset: 'imf', label: desc, code, imfCat: 'imf-weo' });
    }
    for (const [code, desc] of Object.entries(IMF_NEA_CODE_TO_DESC)) {
      list.push({ dataset: 'imf', label: desc, code, imfCat: 'imf-nea' });
    }
    return list;
  }, []);

  // Build WEO flat list from WEO JSON (label -> code)
  const WEO_FLAT_LIST = useMemo(() => {
    const flat = WEO_GROUPS as Record<string, string>;
    return Object.entries(flat);
  }, []);

  const filteredSuggestions: MeasureSuggestion[] = useMemo(() => {
    const q = measureSearch.trim().toLowerCase();
    if (!q) return [];
    const max = 12;
    const out: MeasureSuggestion[] = [];
    for (const s of allSuggestions) {
      const hay = s.label.toLowerCase();
      if (hay.includes(q)) {
        out.push(s);
        if (out.length >= max) break;
      }
    }
    return out;
  }, [measureSearch, allSuggestions]);

  const toggleCountry = (countryId: string) => {
    const isSelected = currentQuery.countries.includes(countryId);
    if (isSelected) {
      const newCountries = currentQuery.countries.filter(id => id !== countryId);
      onQueryChange({ ...currentQuery, countries: newCountries });
      return;
    }
  // No hard maximum — allow adding as many countries as the user wants
    const newCountries = [...currentQuery.countries, countryId];
    onQueryChange({ ...currentQuery, countries: newCountries });
  };

  const removeCountry = (countryId: string) => {
    onQueryChange({ ...currentQuery, countries: currentQuery.countries.filter(id => id !== countryId) });
  };

  const changeCategory = (cat: string) => {
    if (cat === 'all') {
      setSelectedCategory('all');
      setSelectedSubcategory('');
    } else {
      const c = cat as VDemCategory;
      setSelectedCategory(c);
      setSelectedSubcategory('');
    }
  };

  const changeSubcategory = (sub: string) => {
    setSelectedSubcategory(sub);
  };

  // Select or toggle a variable and set category/subcategory in a single update
  const selectVariable = (cat: VDemCategory, sub: string, nameOrCode: string) => {
    const code = getVariableCode(nameOrCode) ?? nameOrCode;
    const currentVars = currentQuery.variables ?? [];
    let nextVars: string[];
    if (currentVars.includes(code)) {
      nextVars = currentVars.filter(v => v !== code);
    } else {
      nextVars = [...currentVars, code];
    }
    setSelectedCategory(cat);
    setSelectedSubcategory(sub);
    onQueryChange({
      ...currentQuery,
      category: cat,
      subcategory: sub,
      variables: nextVars,
      variable: nextVars[0],
    });
  };

  const toggleCategory = (cat: VDemCategory) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setExpandedCategories(next);
  };

  const toggleSubcat = (cat: VDemCategory, sub: string) => {
    const key = `${cat}::${sub}`;
    const next = new Set(expandedSubcats);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedSubcats(next);
  };

  // Deterministic expand/collapse used by keyboard handlers
  const expandCategory = (cat: VDemCategory) => {
    if (!expandedCategories.has(cat)) {
      const next = new Set(expandedCategories);
      next.add(cat);
      setExpandedCategories(next);
    }
  };
  const collapseCategory = (cat: VDemCategory) => {
    if (expandedCategories.has(cat)) {
      const next = new Set(expandedCategories);
      next.delete(cat);
      setExpandedCategories(next);
    }
  };
  const expandSubcategory = (cat: VDemCategory, sub: string) => {
    const key = `${cat}::${sub}`;
    if (!expandedSubcats.has(key)) {
      const next = new Set(expandedSubcats);
      next.add(key);
      setExpandedSubcats(next);
    }
  };
  const collapseSubcategory = (cat: VDemCategory, sub: string) => {
    const key = `${cat}::${sub}`;
    if (expandedSubcats.has(key)) {
      const next = new Set(expandedSubcats);
      next.delete(key);
      setExpandedSubcats(next);
    }
  };

  type VisibleItem =
    | { key: string; type: 'dataset'; level: 1; dataset: string }
    | { key: string; type: 'category'; level: 2; cat: VDemCategory }
    | { key: string; type: 'subcategory'; level: 3; cat: VDemCategory; sub: string }
    | { key: string; type: 'variable'; level: 4; cat: VDemCategory; sub: string; code: string }
    | { key: string; type: 'imfCategory'; level: 2; dataset: 'IMF Dataset'; catKey: string; label: string }
    | { key: string; type: 'imfGroup'; level: 3; dataset: 'IMF Dataset'; catKey: string; groupKey: string; groupLabel: string }
    | { key: string; type: 'imfVariable'; level: 3 | 4; dataset: 'IMF Dataset'; catKey: string; code: string; label: string; parentGroupKey?: string };

  const visibleItems: VisibleItem[] = useMemo(() => {
  const items: VisibleItem[] = [];
    // Dataset node (V-Dem Dataset)
    items.push({ key: VDEM_DATASET_KEY, type: 'dataset', level: 1, dataset: 'V-Dem Dataset' });
    const datasetExpanded = expandedDatasets.has(VDEM_DATASET_KEY);
    if (datasetExpanded) {
      for (const cat of CATEGORIES) {
        const catKey = `cat::${cat}`;
        items.push({ key: catKey, type: 'category', level: 2, cat });
        if (expandedCategories.has(cat)) {
          const subs = getSubcategoriesForCategory(cat);
          for (const sub of subs) {
            const subKey = `${cat}::${sub}`;
            const nodeKey = `sub::${subKey}`;
            items.push({ key: nodeKey, type: 'subcategory', level: 3, cat, sub });
            if (expandedSubcats.has(subKey)) {
              const vars = getVariables(cat, sub);
              for (const v of vars) {
                const code = getVariableCode(v) ?? v;
                if (code && HIDDEN_VARIABLE_CODES.has(code)) continue;
                const varKey = `var::${code}`;
                items.push({ key: varKey, type: 'variable', level: 4, cat, sub, code });
              }
            }
          }
        }
      }
    }
    // IMF Dataset
    items.push({ key: IMF_DATASET_KEY, type: 'dataset', level: 1, dataset: 'IMF Dataset' });
    const imfExpanded = expandedDatasets.has(IMF_DATASET_KEY);
    if (imfExpanded) {
      // NEA: grouped with submenus (label -> codes[])
      {
        const catKey = 'imf-nea';
        const catKeyFull = `imfcat::${catKey}`;
        items.push({ key: catKeyFull, type: 'imfCategory', level: 2, dataset: 'IMF Dataset', catKey, label: 'National Economic Accounts (NEA)' });
        if (expandedImfCategories.has(catKey)) {
          const groups = NEA_GROUPS as Record<string, string[]>;
          for (const [groupLabel, codes] of Object.entries(groups)) {
            const groupKey = `${catKey}::${groupLabel}`;
            items.push({ key: `imfgroup::${groupKey}`, type: 'imfGroup', level: 3, dataset: 'IMF Dataset', catKey, groupKey, groupLabel });
            if (expandedSubcats.has(groupKey)) {
              for (const code of codes) {
                const desc = IMF_NEA_CODE_TO_DESC[code] || code;
                items.push({ key: `imfvar::${code}`, type: 'imfVariable', level: 4, dataset: 'IMF Dataset', catKey, code, label: desc, parentGroupKey: groupKey });
              }
            }
          }
        }
      }
      // WEO: flat list
      {
        const catKey = 'imf-weo';
        const catKeyFull = `imfcat::${catKey}`;
        items.push({ key: catKeyFull, type: 'imfCategory', level: 2, dataset: 'IMF Dataset', catKey, label: 'World Economic Outlook (WEO)' });
        if (expandedImfCategories.has(catKey)) {
          for (const [label, code] of WEO_FLAT_LIST) {
            const desc = IMF_WEO_CODE_TO_DESC[code] || label;
            items.push({ key: `imfvar::${code}`, type: 'imfVariable', level: 3, dataset: 'IMF Dataset', catKey, code, label: desc });
          }
        }
      }
    }
    return items;
  }, [expandedCategories, expandedSubcats, expandedDatasets, expandedImfCategories, WEO_FLAT_LIST]);

  const getIndexByKey = (key: string) => visibleItems.findIndex(i => i.key === key);
  const moveFocusToIndex = (idx: number) => {
    const i = Math.max(0, Math.min(visibleItems.length - 1, idx));
    const item = visibleItems[i];
    if (!item) return;
    setFocusedKey(item.key);
    // Defer to allow DOM/render to commit
    setTimeout(() => {
      const el = rowRefs.current[item.key];
      if (el) {
        el.focus({ preventScroll: true });
        const container =
          document.getElementById('desktop-sidebar-scroll') ||
          document.getElementById('mobile-sidebar-scroll') ||
          document.getElementById('sidebar-scroll-container') ||
          document.getElementById('mobile-sidebar-scroll-container');
        if (container) {
          (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, 0);
  };
  const moveFocusToKey = (key: string) => moveFocusToIndex(getIndexByKey(key));

  // Keep focusedKey valid as tree changes
  useEffect(() => {
    if (!visibleItems.some(i => i.key === focusedKey)) {
      setFocusedKey(VDEM_DATASET_KEY);
    }
  }, [visibleItems, focusedKey]);

  const handleTreeKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const { key } = e;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Space'].includes(key)) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = getIndexByKey(focusedKey);
    const current = visibleItems[idx];
    if (!current) return;
    if (key === 'ArrowUp') {
      moveFocusToIndex(idx - 1);
      return;
    }
    if (key === 'ArrowDown') {
      moveFocusToIndex(idx + 1);
      return;
    }
    if (key === 'ArrowRight') {
      if (current.type === 'dataset') {
        if (!expandedDatasets.has(current.key)) {
          const next = new Set(expandedDatasets); next.add(current.key); setExpandedDatasets(next);
        } else {
          const nextItem = visibleItems[idx + 1];
          if (nextItem && nextItem.level > current.level) moveFocusToIndex(idx + 1);
        }
      } else if (current.type === 'imfCategory') {
        if (!expandedImfCategories.has(current.catKey)) {
          const next = new Set(expandedImfCategories); next.add(current.catKey); setExpandedImfCategories(next);
        } else {
          const nextItem = visibleItems[idx + 1];
          if (nextItem && nextItem.level > current.level) moveFocusToIndex(idx + 1);
        }
      } else if (current.type === 'imfGroup') {
        const groupKey = current.groupKey;
        if (!expandedSubcats.has(groupKey)) {
          const next = new Set(expandedSubcats); next.add(groupKey); setExpandedSubcats(next);
        } else {
          const nextItem = visibleItems[idx + 1];
          if (nextItem && nextItem.level > current.level) moveFocusToIndex(idx + 1);
        }
      } else if (current.type === 'category') {
        if (!expandedCategories.has(current.cat)) {
          expandCategory(current.cat);
        } else {
          const next = visibleItems[idx + 1];
          if (next && next.level > current.level) moveFocusToIndex(idx + 1);
        }
      } else if (current.type === 'subcategory') {
        const keyStr = `${current.cat}::${current.sub}`;
        if (!expandedSubcats.has(keyStr)) {
          expandSubcategory(current.cat, current.sub);
        } else {
          const next = visibleItems[idx + 1];
          if (next && next.level > current.level) moveFocusToIndex(idx + 1);
        }
      }
      return;
    }
    if (key === 'ArrowLeft') {
    if (current.type === 'dataset') {
        if (expandedDatasets.has(current.key)) {
          const next = new Set(expandedDatasets); next.delete(current.key); setExpandedDatasets(next);
        } else {
      // Move focus to the first item in the list (V-Dem dataset header)
      moveFocusToIndex(0);
        }
      } else if (current.type === 'imfCategory') {
        if (expandedImfCategories.has(current.catKey)) {
          const next = new Set(expandedImfCategories); next.delete(current.catKey); setExpandedImfCategories(next);
        } else {
          moveFocusToKey(IMF_DATASET_KEY);
        }
      } else if (current.type === 'imfGroup') {
        const groupKey = current.groupKey;
        if (expandedSubcats.has(groupKey)) {
          const next = new Set(expandedSubcats); next.delete(groupKey); setExpandedSubcats(next);
        } else {
          moveFocusToKey(`imfcat::${current.catKey}`);
        }
      } else if (current.type === 'category') {
        if (expandedCategories.has(current.cat)) {
          collapseCategory(current.cat);
        } else {
          moveFocusToKey(VDEM_DATASET_KEY);
        }
      } else if (current.type === 'subcategory') {
        const keyStr = `${current.cat}::${current.sub}`;
        if (expandedSubcats.has(keyStr)) {
          collapseSubcategory(current.cat, current.sub);
        } else {
          moveFocusToKey(`cat::${current.cat}`);
        }
      } else if (current.type === 'variable') {
        moveFocusToKey(`sub::${current.cat}::${current.sub}`);
      } else if (current.type === 'imfVariable') {
        if (current.catKey === 'imf-weo' && current.parentGroupKey) {
          moveFocusToKey(`imfgroup::${current.parentGroupKey}`);
        } else {
          moveFocusToKey(`imfcat::${current.catKey}`);
        }
      }
      return;
    }
    if (key === 'Enter' || key === ' ' || key === 'Space') {
      if (current.type === 'dataset') {
        const next = new Set(expandedDatasets);
        if (next.has(current.key)) next.delete(current.key); else next.add(current.key);
        setExpandedDatasets(next);
      } else if (current.type === 'variable') {
        selectVariable(current.cat, current.sub, current.code);
      } else if (current.type === 'imfCategory') {
        const next = new Set(expandedImfCategories);
        if (next.has(current.catKey)) next.delete(current.catKey); else next.add(current.catKey);
        setExpandedImfCategories(next);
      } else if (current.type === 'imfGroup') {
        const groupKey = current.groupKey;
        const next = new Set(expandedSubcats);
        if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
        setExpandedSubcats(next);
      } else if (current.type === 'imfVariable') {
        // IMF selection: mimic selectVariable but without category/subcategory changes
        const currentVars = currentQuery.variables ?? [];
        const code = current.code;
        const already = currentVars.includes(code);
        const nextVars = already
          ? currentVars.filter(v => v !== code)
          : [...currentVars, code];
        if (nextVars !== currentVars) {
          onQueryChange({
            ...currentQuery,
            variables: nextVars,
            variable: nextVars[0]
          });
          // Track origin for isNea routing
          setImfOrigin(code, current.catKey === 'imf-nea' ? 'nea' : 'weo');
        }
      } else if (current.type === 'category') {
        toggleCategory(current.cat);
      } else if (current.type === 'subcategory') {
        toggleSubcat(current.cat, current.sub);
      }
      return;
    }
  };

  const selectSuggestion = (s: MeasureSuggestion) => {
    if (s.dataset === 'vdem') {
      selectVariable(s.cat, s.sub, s.code);
      revealMeasure(s.code, s.label);
    } else {
      const currentVars = currentQuery.variables ?? [];
      const code = s.code;
      const already = currentVars.includes(code);
      const nextVars = already ? currentVars.filter(v => v !== code) : [...currentVars, code];
      if (nextVars !== currentVars) {
        onQueryChange({ ...currentQuery, variables: nextVars, variable: nextVars[0] });
        setImfOrigin(code, s.imfCat === 'imf-nea' ? 'nea' : 'weo');
      }
      revealMeasure(code, s.label);
    }
    setShowSuggestions(false);
    setMeasureSearch('');
  };

  const onMeasureSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      selectSuggestion(filteredSuggestions[0]);
    }
  };
  // Reveal a measure in the tree (expand and schedule scroll)
  const revealMeasure = useCallback((code: string, displayLabel?: string) => {
    // IMF variable?
    if (IMF_WEO_CODE_TO_DESC[code] || IMF_NEA_CODE_TO_DESC[code]) {
      // Expand IMF dataset
      setExpandedDatasets(prev => {
        if (prev.has(IMF_DATASET_KEY)) return prev;
        const next = new Set(prev); next.add(IMF_DATASET_KEY); return next;
      });
      // Expand correct IMF category
      const catKey = IMF_WEO_CODE_TO_DESC[code] ? 'imf-weo' : 'imf-nea';
      setExpandedImfCategories(prev => {
        if (prev.has(catKey)) return prev;
        const next = new Set(prev); next.add(catKey); return next;
      });
      // If NEA grouped, also expand the group containing this code
      if (catKey === 'imf-nea') {
        for (const [groupLabel, codes] of Object.entries(NEA_GROUPS as Record<string, string[]>)) {
          if (codes.includes(code)) {
            const groupKey = `${catKey}::${groupLabel}`;
            setExpandedSubcats(prev => {
              if (prev.has(groupKey)) return prev;
              const next = new Set(prev); next.add(groupKey); return next;
            });
            break;
          }
        }
      }
      setFocusedKey(`imfvar::${code}`);
      setPendingScrollCode(code);
      // Schedule a few retries to scroll into view
      const tryScroll = () => {
        const c = pendingScrollCode;
        if (!c) return;
        const el = measureRefs.current[c];
        if (el) {
          (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          setPendingScrollCode(null);
          scrollRetry.current = 0;
        } else if (scrollRetry.current < 20) {
          scrollRetry.current += 1;
          requestAnimationFrame(tryScroll);
        } else {
          setPendingScrollCode(null);
          scrollRetry.current = 0;
        }
      };
      requestAnimationFrame(tryScroll);
      return;
    }
    // V-Dem variable
    const path =
      getMeasurePathByCode(code) ||
      (displayLabel ? getMeasurePathByLabel(displayLabel) : undefined) ||
      getMeasurePathByLabel(getVariableName(code) ?? code);
    const meta = getVariableById(code);
    if (!path && !meta) return;
    const cat = path?.category ?? meta!.category as VDemCategory;
    const sub = path?.subcategoryLabel ?? (getSubcategoryById(meta!.subcategory)?.label ?? meta!.subcategory);
    const subKey = `${cat}::${sub}`;
    setExpandedDatasets(prev => { if (prev.has(VDEM_DATASET_KEY)) return prev; const next = new Set(prev); next.add(VDEM_DATASET_KEY); return next; });
    setExpandedCategories(prev => { if (prev.has(cat)) return prev; const next = new Set(prev); next.add(cat); return next; });
    setExpandedSubcats(prev => { if (prev.has(subKey)) return prev; const next = new Set(prev); next.add(subKey); return next; });
    setFocusedKey(`var::${code}`);
    setPendingScrollCode(code);
    const tryScroll = () => {
      const c = pendingScrollCode;
      if (!c) return;
      const el = measureRefs.current[c];
      if (el) {
        (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setPendingScrollCode(null);
        scrollRetry.current = 0;
      } else if (scrollRetry.current < 20) {
        scrollRetry.current += 1;
        requestAnimationFrame(tryScroll);
      } else {
        setPendingScrollCode(null);
        scrollRetry.current = 0;
      }
    };
    requestAnimationFrame(tryScroll);
  }, [pendingScrollCode]);

  // Selected measures helper for chips and active checks
  const selectedMeasures: string[] = useMemo(() => (
    currentQuery.variables ?? (currentQuery.variable ? [currentQuery.variable] : [])
  ), [currentQuery.variables, currentQuery.variable]);
  // Helper to annotate IMF codes with readable suffixes (currency / frequency)
  const formatImfSuffix = (code: string) => {
    if (!code) return '';
  // WEO codes follow a dot-separated pattern. Examples:
  // B1GQ.V.XDC.A  -> parts: [B1GQ, V, XDC, A]
  // We specifically map the common suffix combinations used in WEO groups:
  // V.XDC -> "Current prices in domestic currency"
  // V.USD -> "Current prices in US dollar"
  // Q.XDC -> "Constant prices in domestic currency"
  // Q.USD -> "Constant prices in US dollar"
  // PD / IX -> price-deflator / index
  const parts = code.split('.').map(p => p.toUpperCase());

  // Look for the pair of frequency + currency tokens anywhere in the parts
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

  return (
    <div className="h-full bg-card p-4" id="sidebar-scroll-container">

  {/* Correlations Section */}
  <div className="mb-4 p-3 border border-border rounded-lg bg-card">
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-medium">Correlations</h3>
      <UiTooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium">Find correlations between indicators</p>
            <p className="text-xs">
              Select two datasets and a country to discover the strongest relationships between indicators.
              Choose correlation pairs to add them as charts.
            </p>
          </div>
        </TooltipContent>
      </UiTooltip>
    </div>

    {/* Dataset Selection */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Datasets (select 2)</Label>
      <div className="flex gap-2">
        {(['VDEM', 'WEO', 'NEA'] as DatasetType[]).map((dataset) => {
          const datasetNames = {
            VDEM: 'V-Dem',
            WEO: 'IMF WEO',
            NEA: 'IMF NEA'
          };
          const selectedDatasets = currentQuery.correlationDatasets || [];
          const isSelected = selectedDatasets.includes(dataset);
          const canSelect = selectedDatasets.length < 2 || isSelected;

          return (
            <button
              key={dataset}
              onClick={() => {
                const newDatasets = isSelected
                  ? selectedDatasets.filter(d => d !== dataset)
                  : [...selectedDatasets, dataset];
                onQueryChange({ ...currentQuery, correlationDatasets: newDatasets });
              }}
              disabled={!canSelect}
              className={cn(
                'px-3 py-1 text-xs border rounded transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted',
                !canSelect && 'opacity-50 cursor-not-allowed'
              )}
            >
              {datasetNames[dataset]}
            </button>
          );
        })}
      </div>
    </div>

    {/* Country Selection */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Country</Label>
      <Select
        value={currentQuery.correlationCountry || ''}
        onValueChange={(value) => onQueryChange({ ...currentQuery, correlationCountry: value })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          {currentQuery.countries.map((countryId) => {
            const country = COUNTRIES.find(c => c.id === countryId);
            return country ? (
              <SelectItem key={countryId} value={country.name} className="text-xs">
                {country.name}
              </SelectItem>
            ) : null;
          })}
        </SelectContent>
      </Select>
    </div>

    {/* Query Type Selection */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Sort by</Label>
      <Select
        value={currentQuery.correlationType || 'strongest'}
        onValueChange={(value: CorrelationType) => onQueryChange({ ...currentQuery, correlationType: value })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="strongest" className="text-xs">Strongest correlations</SelectItem>
          <SelectItem value="highest" className="text-xs">Highest positive</SelectItem>
          <SelectItem value="lowest" className="text-xs">Highest negative</SelectItem>
          <SelectItem value="most_significant" className="text-xs">Most significant</SelectItem>
          <SelectItem value="weakest" className="text-xs">Weakest correlations</SelectItem>
          <SelectItem value="least_significant" className="text-xs">Least significant</SelectItem>
          <SelectItem value="most_observations" className="text-xs">Most observations</SelectItem>
          <SelectItem value="fewest_observations" className="text-xs">Fewest observations</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Results */}
    {showCorrelationsResults && correlationsResults.length > 0 && (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Results</Label>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {correlationsResults.map((pair, index) => {
            const selectedPairs = currentQuery.correlationPairs || [];
            const isSelected = selectedPairs.some(
              p => p.indexA === pair.indexA && p.indexB === pair.indexB
            );

            // Extract variable names from codes
            const getDisplayName = (code: string) => {
              if (code.startsWith('VDEM:')) {
                const vdemCode = code.replace('VDEM:', '');
                return getVariableName(vdemCode) || vdemCode;
              } else if (code.startsWith('WEO:')) {
                const imfCode = code.replace('WEO:', '');
                return IMF_WEO_CODE_TO_DESC[imfCode] || imfCode;
              } else if (code.startsWith('NEA:')) {
                const imfCode = code.replace('NEA:', '');
                return IMF_NEA_CODE_TO_DESC[imfCode] || imfCode;
              }
              return code;
            };

            return (
              <button
                key={index}
                onClick={() => {
                  const newPairs = isSelected
                    ? selectedPairs.filter(p => !(p.indexA === pair.indexA && p.indexB === pair.indexB))
                    : [...selectedPairs, pair];
                  
                  // Extract variables from all correlation pairs
                  const correlationVars: string[] = [];
                  newPairs.forEach(p => {
                    const var1 = p.indexA.split(':')[1] || p.indexA;
                    const var2 = p.indexB.split(':')[1] || p.indexB;
                    correlationVars.push(var1, var2);
                  });
                  
                  // Get variables that were added by previous correlation pairs
                  const oldCorrelationVars: string[] = [];
                  selectedPairs.forEach(p => {
                    const var1 = p.indexA.split(':')[1] || p.indexA;
                    const var2 = p.indexB.split(':')[1] || p.indexB;
                    oldCorrelationVars.push(var1, var2);
                  });
                  
                  // Remove old correlation variables and add new ones
                  const currentVars = currentQuery.variables || [];
                  const cleanedVars = currentVars.filter(v => !oldCorrelationVars.includes(v));
                  const newVars = [...new Set([...cleanedVars, ...correlationVars])];
                  
                  onQueryChange({ 
                    ...currentQuery, 
                    correlationPairs: newPairs,
                    variables: newVars
                  });
                }}
                className={cn(
                  'w-full text-left p-2 text-xs border rounded transition-colors',
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                <div className="font-medium truncate">
                  {getDisplayName(pair.indexA)}
                </div>
                <div className="text-muted-foreground truncate">
                  vs {getDisplayName(pair.indexB)}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs">
                    r = {pair.r.toFixed(3)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    n = {pair.n}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>


  {/* Measures Section */}
  <div className="mb-4 p-3 border border-border rounded-lg bg-card">
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-medium">Measures</h3>
    </div>

    {/* Measurement search */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Search</Label>
      <div className="relative">
          <Input
            placeholder="Search by name..."
            value={measureSearch}
            onChange={(e) => { setMeasureSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={onMeasureSearchKeyDown}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md bg-popover shadow">
              <ul className="divide-y divide-border">
                {filteredSuggestions.map((s, idx) => (
                  <li key={`${s.dataset}-${s.code}-${idx}`}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2"
                      onClick={() => selectSuggestion(s)}
                    >
                      <span className="text-xs rounded px-1 py-0.5">
                        {s.dataset === 'vdem' ? 'V-Dem' : 'IMF'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{s.label}</div>
                        {s.dataset === 'vdem' && (
                          <div className="text-[10px] text-muted-foreground truncate">{s.cat} • {s.sub}</div>
                        )}
                        {s.dataset === 'imf' && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {s.imfCat === 'imf-weo' ? 'World Economic Outlook (WEO)' : 'National Economic Accounts (NEA)'}
                            <div className="text-[10px] text-muted-foreground truncate">{formatImfSuffix(s.code)}</div>
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

    {/* Browse by category */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Browse by category</Label>
      <div
        className="rounded-md p-1"
        role="tree"
        aria-label="Measures"
        onKeyDownCapture={handleTreeKeyDown}
      >
          {/* Dataset: V-Dem */}
          <button
            onClick={() => {
              const next = new Set(expandedDatasets);
              if (next.has(VDEM_DATASET_KEY)) next.delete(VDEM_DATASET_KEY); else next.add(VDEM_DATASET_KEY);
              setExpandedDatasets(next);
            }}
            className="w-full flex items-center gap-2 text-left px-3 py-2 text-base font-semibold hover:bg-muted rounded mt-2"
            ref={(el) => { rowRefs.current[VDEM_DATASET_KEY] = el; }}
            tabIndex={focusedKey === VDEM_DATASET_KEY ? 0 : -1}
            role="treeitem"
            aria-level={1}
            aria-expanded={expandedDatasets.has(VDEM_DATASET_KEY)}
            onFocus={() => setFocusedKey(VDEM_DATASET_KEY)}
          >
            {expandedDatasets.has(VDEM_DATASET_KEY) ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
            <span>V-Dem Dataset</span>
          </button>

          {expandedDatasets.has(VDEM_DATASET_KEY) && (
            <div className="py-1">
              {CATEGORIES.map((cat) => {
                const expanded = expandedCategories.has(cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-2 text-left pr-3 pl-6 py-2 text-sm hover:bg-muted"
                      ref={(el) => { rowRefs.current[`cat::${cat}`] = el; }}
                      tabIndex={focusedKey === `cat::${cat}` ? 0 : -1}
                      role="treeitem"
                      aria-level={2}
                      aria-expanded={expanded}
                      onFocus={() => setFocusedKey(`cat::${cat}`)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <span>{cat}</span>
                    </button>
                    {expanded && (
                      <div className="py-1">
                        {getSubcategoriesForCategory(cat).map((sub) => {
                          const subKey = `${cat}::${sub}`;
                          const subExpanded = expandedSubcats.has(subKey);
                          return (
                            <div key={subKey}>
                              <button
                                onClick={() => {
                                  toggleSubcat(cat, sub);
                                  changeCategory(cat);
                                  changeSubcategory(sub);
                                }}
                                className="w-full flex items-center gap-2 text-left pr-3 pl-10 py-2 text-sm hover:bg-muted"
                                ref={(el) => { rowRefs.current[`sub::${subKey}`] = el; }}
                                tabIndex={focusedKey === `sub::${subKey}` ? 0 : -1}
                                role="treeitem"
                                aria-level={3}
                                aria-expanded={subExpanded}
                                onFocus={() => setFocusedKey(`sub::${subKey}`)}
                              >
                                {subExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                                <span>{sub}</span>
                              </button>
                              {subExpanded && (
                                <div className="py-1">
                                  {getVariables(cat, sub).map((v) => {
                                    const code = getVariableCode(v) ?? v;
                                    if (code && HIDDEN_VARIABLE_CODES.has(code)) return null;
                                    const isActive = selectedMeasures.includes(code);
                                    const inputId = `var-${cat}-${sub}-${code}`.replace(/\s+/g, '_');
                                    return (
                                      <label
                                        id={`measure-${code}`}
                                        ref={(node) => { measureRefs.current[code] = node; rowRefs.current[`var::${code}`] = node; }}
                                        key={`${subKey}::${v}`}
                                        htmlFor={inputId}
                                        className="flex items-center gap-2 pr-3 pl-14 py-1.5 text-sm cursor-pointer hover:bg-muted rounded"
                                        tabIndex={focusedKey === `var::${code}` ? 0 : -1}
                                        role="treeitem"
                                        aria-level={4}
                                        onFocus={() => setFocusedKey(`var::${code}`)}
                                      >
                                        <Checkbox
                                          id={inputId}
                                          checked={isActive}
                                          onCheckedChange={() => selectVariable(cat, sub, v)}
                                        />
                                        <span>{v}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dataset: IMF */}
          <button
            onClick={() => {
              const next = new Set(expandedDatasets);
              if (next.has(IMF_DATASET_KEY)) next.delete(IMF_DATASET_KEY); else next.add(IMF_DATASET_KEY);
              setExpandedDatasets(next);
            }}
            className="w-full flex items-center gap-2 text-left px-3 py-2 text-base font-semibold hover:bg-muted rounded mt-4"
            ref={(el) => { rowRefs.current[IMF_DATASET_KEY] = el; }}
            tabIndex={focusedKey === IMF_DATASET_KEY ? 0 : -1}
            role="treeitem"
            aria-level={1}
            aria-expanded={expandedDatasets.has(IMF_DATASET_KEY)}
            onFocus={() => setFocusedKey(IMF_DATASET_KEY)}
          >
            {expandedDatasets.has(IMF_DATASET_KEY) ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
            <span>IMF Dataset</span>
          </button>

          {expandedDatasets.has(IMF_DATASET_KEY) && (
            <div className="py-1">
              {/* NEA: grouped with submenus */}
              {(() => {
                const catKey = 'imf-nea';
                const expanded = expandedImfCategories.has(catKey);
                const catRowKey = `imfcat::${catKey}`;
                const groups = NEA_GROUPS as Record<string, string[]>;
                return (
                  <div key={catKey}>
                    <button
                      onClick={() => {
                        const next = new Set(expandedImfCategories);
                        if (next.has(catKey)) next.delete(catKey); else next.add(catKey);
                        setExpandedImfCategories(next);
                      }}
                      className="w-full flex items-center gap-2 text-left pr-3 pl-6 py-2 text-sm hover:bg-muted"
                      ref={(el) => { rowRefs.current[catRowKey] = el; }}
                      tabIndex={focusedKey === catRowKey ? 0 : -1}
                      role="treeitem"
                      aria-level={2}
                      aria-expanded={expanded}
                      onFocus={() => setFocusedKey(catRowKey)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <span>National Economic Accounts (NEA)</span>
                    </button>
                    {expanded && (
                      <div className="py-1">
                        {Object.entries(groups).map(([groupLabel, codes]) => {
                          const groupKey = `${catKey}::${groupLabel}`;
                          const groupExpanded = expandedSubcats.has(groupKey);
                          return (
                            <div key={groupKey}>
                              <button
                                onClick={() => {
                                  const next = new Set(expandedSubcats);
                                  if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
                                  setExpandedSubcats(next);
                                }}
                                className="w-full flex items-center gap-2 text-left pr-3 pl-10 py-2 text-sm hover:bg-muted"
                                ref={(el) => { rowRefs.current[`imfgroup::${groupKey}`] = el; }}
                                tabIndex={focusedKey === `imfgroup::${groupKey}` ? 0 : -1}
                                role="treeitem"
                                aria-level={3}
                                aria-expanded={groupExpanded}
                                onFocus={() => setFocusedKey(`imfgroup::${groupKey}`)}
                              >
                                {groupExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                                <span>{groupLabel}</span>
                              </button>
                              {groupExpanded && (
                                <div className="py-1">
                                  {codes.map((code) => {
                                    const isActive = selectedMeasures.includes(code);
                                    const inputId = `imf-nea-${code}`;
                                    const desc = IMF_NEA_CODE_TO_DESC[code] || code;
                                    return (
                                      <label
                                        key={code}
                                        id={`measure-${code}`}
                                        ref={(node) => { measureRefs.current[code] = node; rowRefs.current[`imfvar::${code}`] = node; }}
                                        htmlFor={inputId}
                                        className="flex items-center gap-2 pr-3 pl-14 py-1.5 text-sm cursor-pointer hover:bg-muted rounded"
                                        tabIndex={focusedKey === `imfvar::${code}` ? 0 : -1}
                                        role="treeitem"
                                        aria-level={4}
                                        onFocus={() => setFocusedKey(`imfvar::${code}`)}
                                      >
                                        <Checkbox
                                          id={inputId}
                                          checked={isActive}
                                          onCheckedChange={() => {
                                            const currentVars = currentQuery.variables ?? [];
                                            const already = currentVars.includes(code);
                                            const nextVars = already ? currentVars.filter(v => v !== code) : [...currentVars, code];
                                            if (nextVars !== currentVars) {
                                              onQueryChange({ ...currentQuery, variables: nextVars, variable: nextVars[0] });
                                              setImfOrigin(code, 'nea');
                                            }
                                          }}
                                        />
                                        <span>{desc}{formatImfSuffix(code)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* WEO: flat list (no submenus) */}
              {(() => {
                const catKey = 'imf-weo';
                const expanded = expandedImfCategories.has(catKey);
                const catRowKey = `imfcat::${catKey}`;
                const entries = WEO_FLAT_LIST;
                return (
                  <div key={catKey}>
                    <button
                      onClick={() => {
                        const next = new Set(expandedImfCategories);
                        if (next.has(catKey)) next.delete(catKey); else next.add(catKey);
                        setExpandedImfCategories(next);
                      }}
                      className="w-full flex items-center gap-2 text-left pr-3 pl-6 py-2 text-sm hover:bg-muted"
                      ref={(el) => { rowRefs.current[catRowKey] = el; }}
                      tabIndex={focusedKey === catRowKey ? 0 : -1}
                      role="treeitem"
                      aria-level={2}
                      aria-expanded={expanded}
                      onFocus={() => setFocusedKey(catRowKey)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <span>World Economic Outlook (WEO)</span>
                    </button>
                    {expanded && (
                      <div className="py-1">
                        {entries.map(([label, code]) => {
                          const isActive = selectedMeasures.includes(code);
                          const inputId = `imf-weo-${code}`;
                          const desc = IMF_WEO_CODE_TO_DESC[code] || label;
                          return (
                            <label
                              key={code}
                              id={`measure-${code}`}
                              ref={(node) => { measureRefs.current[code] = node; rowRefs.current[`imfvar::${code}`] = node; }}
                              htmlFor={inputId}
                              className="flex items-center gap-2 pr-3 pl-10 py-1.5 text-sm cursor-pointer hover:bg-muted rounded"
                              tabIndex={focusedKey === `imfvar::${code}` ? 0 : -1}
                              role="treeitem"
                              aria-level={3}
                              onFocus={() => setFocusedKey(`imfvar::${code}`)}
                            >
                              <Checkbox
                                id={inputId}
                                checked={isActive}
                                onCheckedChange={() => {
                                  const currentVars = currentQuery.variables ?? [];
                                  const already = currentVars.includes(code);
                                  const nextVars = already ? currentVars.filter(v => v !== code) : [...currentVars, code];
                                  if (nextVars !== currentVars) {
                                    onQueryChange({ ...currentQuery, variables: nextVars, variable: nextVars[0] });
                                    setImfOrigin(code, 'weo');
                                  }
                                }}
                              />
                              <span>{desc}{formatImfSuffix(code)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  
  {/* Countries Section */}
  <div className="mb-4 p-3 border border-border rounded-lg bg-card">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium">Countries</h3>
      <button
        type="button"
        aria-expanded={!countriesCollapsed}
        onClick={() => setCountriesCollapsed((s) => !s)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {countriesCollapsed ? 'Show Countries' : 'Hide Countries'}
      </button>
    </div>

    {/* Selected countries display */}
    <div className="space-y-2 mb-3">
      <Label className="text-xs font-medium">Selected</Label>
        <div className="flex flex-wrap gap-1.5">
          {currentQuery.countries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No countries selected</div>
          ) : (
            currentQuery.countries.map((id) => {
              const c = COUNTRIES.find(c => c.id === id);
              return (
                <div key={id} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs bg-muted/50 hover:bg-muted">
                  <span>{c?.name || id}</span>
                  <button
                    type="button"
                    onClick={() => removeCountry(id)}
                    aria-label={`Remove ${c?.name || id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

  {/* Countries (label removed) */}
        {!countriesCollapsed && (
          <>
            <Input
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
            />
            <div className="mt-2 max-h-40 overflow-auto">
              {filteredCountries.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-1">
                  <Checkbox
                    id={`country-${c.id}`}
                    checked={currentQuery.countries.includes(c.id)}
                    onCheckedChange={() => toggleCountry(c.id)}
                  />
                  <label htmlFor={`country-${c.id}`} className="text-sm cursor-pointer flex-1">
                    {c.name}
                  </label>
                </div>
              ))}
            </div>
          </>
        )}
    </div>

    {/* Years Section */}
    <div className="mb-4 p-3 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Years</h3>
        <button
          type="button"
          aria-expanded={!yearsCollapsed}
          onClick={() => setYearsCollapsed((s) => !s)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {yearsCollapsed ? 'Show Years' : 'Hide Years'}
        </button>
      </div>

      {/* Selected years display */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">Range</Label>
        <div className="text-xs text-muted-foreground">
          {currentQuery.startYear} - {currentQuery.endYear}
        </div>
      </div>

      {/* Year inputs (only when not collapsed) */}
      {!yearsCollapsed && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-year" className="text-xs text-muted-foreground">
                Start Year
              </Label>
              <Input
                id="start-year"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={fromYearInput}
                onChange={(e) => setFromYearInput(e.target.value)}
                onBlur={() => commitYear('startYear', fromYearInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitYear('startYear', fromYearInput);
                  }
                }}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-year" className="text-xs text-muted-foreground">
                End Year
              </Label>
              <Input
                id="end-year"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={toYearInput}
                onChange={(e) => setToYearInput(e.target.value)}
                onBlur={() => commitYear('endYear', toYearInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitYear('endYear', toYearInput);
                  }
                }}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}

export default ChartSidebar;
