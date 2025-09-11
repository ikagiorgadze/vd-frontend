import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { PlusSquare, MinusSquare, X } from 'lucide-react';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';

interface ChartSidebarProps {
  currentQuery: QueryState;
  onQueryChange: (q: QueryState) => void;
}

export function ChartSidebar({ currentQuery, onQueryChange }: ChartSidebarProps) {
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
  // Measurement search
  const [measureSearch, setMeasureSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const filteredSuggestions: MeasureSuggestion[] = useMemo(() => {
    const q = measureSearch.trim().toLowerCase();
    if (!q) return [];
    const max = 12;
    const out: MeasureSuggestion[] = [];
    for (const s of allSuggestions) {
      const hay = (s.label + ' ' + s.code).toLowerCase();
      if (hay.includes(q)) {
        out.push(s);
        if (out.length >= max) break;
      }
    }
    return out;
  }, [measureSearch, allSuggestions]);

  const toggleCountry = (countryId: string) => {
    const newCountries = currentQuery.countries.includes(countryId)
      ? currentQuery.countries.filter(id => id !== countryId)
      : [...currentQuery.countries, countryId];
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
      if (currentVars.length >= 5) return;
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
    | { key: string; type: 'imfVariable'; level: 3; dataset: 'IMF Dataset'; catKey: string; code: string; label: string };

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
      const imfCategories: { catKey: string; label: string; entries: [string, string][] }[] = [
        { catKey: 'imf-nea', label: 'National Economic Accounts (NEA)', entries: Object.entries(IMF_NEA_CODE_TO_DESC) },
        { catKey: 'imf-weo', label: 'World Economic Outlook (WEO)', entries: Object.entries(IMF_WEO_CODE_TO_DESC) }
      ];
      for (const cat of imfCategories) {
        const catKeyFull = `imfcat::${cat.catKey}`;
        items.push({ key: catKeyFull, type: 'imfCategory', level: 2, dataset: 'IMF Dataset', catKey: cat.catKey, label: cat.label });
        if (expandedImfCategories.has(cat.catKey)) {
          for (const [code, desc] of cat.entries) {
            items.push({ key: `imfvar::${code}`, type: 'imfVariable', level: 3, dataset: 'IMF Dataset', catKey: cat.catKey, code, label: desc });
          }
        }
      }
    }
    return items;
  }, [expandedCategories, expandedSubcats, expandedDatasets, expandedImfCategories]);

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
        moveFocusToKey(`imfcat::${current.catKey}`);
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
      } else if (current.type === 'imfVariable') {
        // IMF selection: mimic selectVariable but without category/subcategory changes
        const currentVars = currentQuery.variables ?? [];
        const code = current.code;
        const nextVars = currentVars.includes(code)
          ? currentVars.filter(v => v !== code)
          : (currentVars.length < 5 ? [...currentVars, code] : currentVars);
        if (nextVars !== currentVars) {
          onQueryChange({
            ...currentQuery,
            variables: nextVars,
            variable: nextVars[0]
          });
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
      // Reveal for better UX
      revealMeasure(s.code, s.label);
    } else {
      // IMF variable selection mirrors the keyboard branch for imfVariable
      const currentVars = currentQuery.variables ?? [];
      const code = s.code;
      const nextVars = currentVars.includes(code)
        ? currentVars.filter(v => v !== code)
        : (currentVars.length < 5 ? [...currentVars, code] : currentVars);
      if (nextVars !== currentVars) {
        onQueryChange({
          ...currentQuery,
          variables: nextVars,
          variable: nextVars[0]
        });
      }
      revealMeasure(code, s.label);
    }
    setShowSuggestions(false);
    setMeasureSearch('');
  };

  const onMeasureSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[0]);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const commitYear = (field: 'startYear' | 'endYear', value: string) => {
    const now = new Date().getFullYear();
    const parsed = parseInt(value, 10);
    const fallback = field === 'startYear' ? 1800 : now;
    const raw = Number.isFinite(parsed) ? parsed : fallback;
    const clamped = Math.max(1800, Math.min(raw, now));
    onQueryChange({ ...currentQuery, [field]: clamped });
    if (field === 'startYear') setFromYearInput(String(clamped));
    else setToYearInput(String(clamped));
  };

  // Keep local inputs in sync if query changes elsewhere
  useEffect(() => {
    setFromYearInput(String(currentQuery.startYear));
  }, [currentQuery.startYear]);
  useEffect(() => {
    setToYearInput(String(currentQuery.endYear));
  }, [currentQuery.endYear]);

  // Remove a selected measure by its code
  const removeMeasure = (code: string) => {
    const currentVars = currentQuery.variables ?? (currentQuery.variable ? [currentQuery.variable] : []);
    const nextVars = currentVars.filter(v => v !== code);
    onQueryChange({
      ...currentQuery,
      variables: nextVars.length > 0 ? nextVars : undefined,
      variable: nextVars.length > 0 ? nextVars[0] : undefined,
    });
  };

  // Reveal a measure in the tree (expand and schedule scroll)
  const revealMeasure = (code: string, displayLabel?: string) => {
    // First check if this is an IMF variable; if so expand IMF dataset + proper category
    if (IMF_WEO_CODE_TO_DESC[code] || IMF_NEA_CODE_TO_DESC[code]) {
      // Ensure IMF dataset expanded
      setExpandedDatasets(prev => {
        if (prev.has(IMF_DATASET_KEY)) return prev;
        const next = new Set(prev); next.add(IMF_DATASET_KEY); return next;
      });
      // Determine which IMF category contains the code
      const catKey = IMF_WEO_CODE_TO_DESC[code] ? 'imf-weo' : 'imf-nea';
      setExpandedImfCategories(prev => {
        if (prev.has(catKey)) return prev;
        const next = new Set(prev); next.add(catKey); return next;
      });
      // Focus key for IMF variable rows uses prefix imfvar::
      setFocusedKey(`imfvar::${code}`);
      setPendingScrollCode(code);
      return; // Done handling IMF variable
    }
    const path =
      getMeasurePathByCode(code) ||
      (displayLabel ? getMeasurePathByLabel(displayLabel) : undefined) ||
      getMeasurePathByLabel(getVariableName(code) ?? code);
    // Fallback to variables meta if index misses
    const meta = getVariableById(code);
    if (!path && !meta) return;
    const cat = path?.category ?? meta!.category;
    const sub = path?.subcategoryLabel ?? (getSubcategoryById(meta!.subcategory)?.label ?? meta!.subcategory);
  const subKey = `${cat}::${sub}`;
  // Collapse everything else and expand only the path to this measure
  setExpandedCategories(new Set<VDemCategory>([cat]));
  setExpandedSubcats(new Set<string>([subKey]));
  // Update local structural context
  setSelectedCategory(cat);
  setSelectedSubcategory(sub);
  // Set keyboard focus context to this variable row; no scrolling
  setFocusedKey(`var::${code}`);
  // Schedule a scroll so deep items become visible
  setPendingScrollCode(code);
  };

  // Perform the scroll to the exact checkbox row once it exists
  useEffect(() => {
    if (!pendingScrollCode) return;
    const code = pendingScrollCode;
    let attempts = 0;
    const maxAttempts = 60; // ~1 second at 60fps

    const tryScroll = () => {
  const container = (document.getElementById('sidebar-scroll-container') || document.getElementById('mobile-sidebar-scroll-container')) as HTMLElement | null;
      const el = measureRefs.current[code] || document.getElementById(`measure-${code}`);
      if (container && el) {
        // Scroll the element into view within the sidebar container
        (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
        (el as HTMLElement).classList.add('ring-2', 'ring-primary/50', 'rounded');
        // Focus and set roving focus key
  // Decide correct focus key based on whether this is a V-Dem or IMF variable row
  const focusKey = rowRefs.current[`var::${code}`] ? `var::${code}` : (rowRefs.current[`imfvar::${code}`] ? `imfvar::${code}` : `var::${code}`);
  setFocusedKey(focusKey);
        (el as HTMLElement).focus?.({ preventScroll: true });
        setTimeout(() => (el as HTMLElement).classList.remove('ring-2', 'ring-primary/50', 'rounded'), 1400);
        // reset
        setPendingScrollCode(null);
        scrollRetry.current = 0;
        return;
      }
      if (attempts < maxAttempts) {
        attempts += 1;
        requestAnimationFrame(tryScroll);
      } else {
        // Fallback: scroll to subcategory header if available
        const meta = getVariableById(code);
        if (meta) {
          const subKey = `sub::${meta.category}::${meta.subcategory}`;
          const subEl = rowRefs.current[subKey] as HTMLElement | null;
          if (subEl) {
            subEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            setFocusedKey(subKey);
            subEl.focus({ preventScroll: true });
          }
        }
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

  return (
    <div className="h-full bg-card p-4" id="sidebar-scroll-container">
      {/* Measurement search */}
      <div className="mb-4 relative">
        <Label className="text-xs">Search measurements</Label>
        <Input
          placeholder="Search by name or code..."
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
                      <div className="text-xs text-muted-foreground truncate">{s.code}</div>
                      {s.dataset === 'vdem' && (
                        <div className="text-[10px] text-muted-foreground truncate">{s.cat} • {s.sub}</div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Selected countries as removable buttons */}
      {currentQuery.countries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {currentQuery.countries.map((id) => {
            const c = COUNTRIES.find(c => c.id === id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => removeCountry(id)}
                title={`Remove ${c?.name || id}`}
                className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                <span>{c?.name || id}</span>
                <X className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* Countries */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Countries</Label>
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
      </div>

      {/* Time Period */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Time Period</Label>
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
      </div>

      {/* Measures: selected pills and tree */}
      <div className="space-y-2">
        <Label className="text-xs">Measures</Label>
        {/* Selected measures as removable buttons */}
        {selectedMeasures.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMeasures.map((code) => {
              const label = getVariableName(code) ?? IMF_WEO_CODE_TO_DESC[code] ?? IMF_NEA_CODE_TO_DESC[code] ?? code;
              return (
                <button
                  key={code}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  onClick={() => revealMeasure(code, label)}
                  title={label}
                >
                  <span>{label}</span>
                  <X className="h-3 w-3" onClick={(e) => { e.stopPropagation(); removeMeasure(code); }} />
                </button>
              );
            })}
          </div>
        )}

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
            {expandedDatasets.has(VDEM_DATASET_KEY) ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
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
                      {expanded ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
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
                                {subExpanded ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
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
            {expandedDatasets.has(IMF_DATASET_KEY) ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
            <span>IMF Dataset</span>
          </button>

          {expandedDatasets.has(IMF_DATASET_KEY) && (
            <div className="py-1">
              {[
                { catKey: 'imf-nea', label: 'National Economic Accounts (NEA)', entries: Object.entries(IMF_NEA_CODE_TO_DESC) },
                { catKey: 'imf-weo', label: 'World Economic Outlook (WEO)', entries: Object.entries(IMF_WEO_CODE_TO_DESC) }
              ].map(cat => {
                const expanded = expandedImfCategories.has(cat.catKey);
                const catRowKey = `imfcat::${cat.catKey}`;
                return (
                  <div key={cat.catKey}>
                    <button
                      onClick={() => {
                        const next = new Set(expandedImfCategories);
                        if (next.has(cat.catKey)) next.delete(cat.catKey); else next.add(cat.catKey);
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
                      {expanded ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
                      <span>{cat.label}</span>
                    </button>
                    {expanded && (
                      <div className="py-1">
                        {cat.entries.map(([code, desc]) => {
                          const isActive = selectedMeasures.includes(code);
                          const inputId = `imf-${cat.catKey}-${code}`;
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
                                  const nextVars = currentVars.includes(code)
                                    ? currentVars.filter(v => v !== code)
                                    : (currentVars.length < 5 ? [...currentVars, code] : currentVars);
                                  if (nextVars !== currentVars) {
                                    onQueryChange({ ...currentQuery, variables: nextVars, variable: nextVars[0] });
                                  }
                                }}
                              />
                              <span>{desc}</span>
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
      </div>
    </div>
  );
}

export default ChartSidebar;
