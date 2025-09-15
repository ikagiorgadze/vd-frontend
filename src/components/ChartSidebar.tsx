import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { COUNTRIES, searchCountries } from '@/lib/countries';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { QueryState } from '@/lib/url-state';
import { CATEGORIES, VDemCategory } from '@/lib/variables';
import { getSubcategoriesForCategory, getVariablesForSubcategory } from '@/lib/variable-mappings';
import { getVariableCode } from '@/lib/variable-codes';
import { HIDDEN_VARIABLE_CODES } from '@/lib/hidden-variables';
import { getVariableById, getSubcategoryById } from '@/lib/variables';
import { getMeasurePathByCode, getMeasurePathByLabel } from '@/lib/measure-index';
import { getVariableName } from '@/lib/variable-codes';
import { ChevronRight, ChevronDown, X } from 'lucide-react';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import WEO_GROUPS from '@/weo-indicator-series-codes.json';
import NEA_GROUPS from '@/nea-indicator-series-codes.json';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import { setImfOrigin } from '@/lib/imf-origin';
import { toast as notify } from '@/components/ui/sonner-toast';

interface ChartSidebarProps {
  currentQuery: QueryState;
  onQueryChange: (q: QueryState) => void;
  // Optional registration function: parent can receive the revealMeasure callback
  registerReveal?: (fn: ((code: string, displayLabel?: string) => void) | null) => void;
  // Optional controls rendered under the time period section (e.g., "Explain Correlations" button)
  explainControls?: React.ReactNode;
}

export function ChartSidebar({ currentQuery, onQueryChange, registerReveal, explainControls }: ChartSidebarProps) {
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
  // Measurement search
  const [measureSearch, setMeasureSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ensure datasets and submenus are collapsed on first mount
  useEffect(() => {
    setExpandedDatasets(new Set());
    setExpandedImfCategories(new Set());
    setExpandedSubcats(new Set());
  }, []);

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
  {/* Explain Correlations moved to top; full-width with tooltip on hover */}
  {explainControls && (
        <div className="mb-3">
          <UiTooltip>
            <TooltipTrigger asChild>
              {React.isValidElement(explainControls)
                ? (() => {
                    const el = explainControls as React.ReactElement<{ className?: string; disabled?: boolean }>;
                    const isDisabled = !!el.props?.disabled;
                    const cloned = React.cloneElement(el, {
                      className: cn('w-full justify-center', el.props?.className),
                    });
                    return (
                      <span className="block w-full" tabIndex={0} aria-disabled={isDisabled}>
                        {cloned}
                      </span>
                    );
                  })()
                : <span className="block w-full">{explainControls}</span>}
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="max-w-xs">
                Choose two charts by clicking their cards. Then click "Explain Correlations" to generate short explanations comparing their relationship for your selected countries.
              </div>
            </TooltipContent>
          </UiTooltip>
        </div>
      )}
  {/* Measures: dataset menus moved to top (labels removed) */}
  <div className="space-y-2 mb-4">

  {/* Measurement search (label removed) */}
  <div className="relative">
          <Input
            placeholder="Search by name..."
            value={measureSearch}
            onChange={(e) => { setMeasureSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={onMeasureSearchKeyDown}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-popover shadow">
              <ul className="divide-y divide-border">
                {filteredSuggestions.map((s, idx) => (
                  <li key={`${s.dataset}-${s.code}-${idx}`}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2"
                      onClick={() => selectSuggestion(s)}
                    >
                      <span className="text-xs rounded px-1 py-0.5 border border-border">
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

  {/* Selected measures: pills removed; removal now via chart remove buttons */}

        <div
          className="rounded-md border border-border p-1"
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
  {/* Selected countries as removable buttons */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium">Selected countries</div>
          <button
            type="button"
            aria-expanded={!countriesCollapsed}
            onClick={() => setCountriesCollapsed((s) => !s)}
            className="text-xs text-muted-foreground"
          >
            {countriesCollapsed ? 'Show Countries' : 'Hide Countries'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {currentQuery.countries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No countries selected</div>
          ) : (
            currentQuery.countries.map((id) => {
              const c = COUNTRIES.find(c => c.id === id);
              return (
                <div key={id} className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs bg-card">
                  <span>{c?.name || id}</span>
                  <button
                    type="button"
                    onClick={() => removeCountry(id)}
                    aria-label={`Remove ${c?.name || id}`}
                    className="ml-1 text-muted-foreground hover:text-foreground"
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
            <div className="mt-1 max-h-40 overflow-auto rounded-md border border-border p-2">
              {filteredCountries.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`country-${c.id}`}
                    checked={currentQuery.countries.includes(c.id)}
                    onCheckedChange={() => toggleCountry(c.id)}
                  />
                  <label htmlFor={`country-${c.id}`} className="text-sm cursor-pointer">
                    {c.name}
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

  {/* Time Period (label removed) */}
  <div className="space-y-2 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input
              id="from"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={fromYearInput}
              onChange={(e) => setFromYearInput(e.target.value)}
              onBlur={() => commitYear('startYear', fromYearInput)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitYear('startYear', fromYearInput); }}
            />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input
              id="to"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={toYearInput}
              onChange={(e) => setToYearInput(e.target.value)}
              onBlur={() => commitYear('endYear', toYearInput)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitYear('endYear', toYearInput); }}
            />
          </div>
        </div>
  {/* Explain controls moved to top */}
      </div>

      
    </div>
  );
}

export default ChartSidebar;
