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

interface ChartSidebarProps {
  currentQuery: QueryState;
  onQueryChange: (q: QueryState) => void;
}

export function ChartSidebar({ currentQuery, onQueryChange }: ChartSidebarProps) {
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VDemCategory | 'all'>(currentQuery.category || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(currentQuery.subcategory || '');
  const [expandedCategories, setExpandedCategories] = useState<Set<VDemCategory>>(new Set());
  const [expandedSubcats, setExpandedSubcats] = useState<Set<string>>(new Set());
  const [pendingScrollCode, setPendingScrollCode] = useState<string | null>(null);
  const scrollRetry = useRef(0);
  const measureRefs = useRef<Record<string, HTMLElement | null>>({});
  // Roving focus for keyboard navigation in the measures tree
  const [focusedKey, setFocusedKey] = useState<string>('all');
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const filteredCountries = useMemo(() => {
    return countrySearch ? searchCountries(countrySearch) : COUNTRIES;
  }, [countrySearch]);

  const subcategories = useMemo(() => {
    return selectedCategory !== 'all' ? getSubcategoriesForCategory(selectedCategory) : [];
  }, [selectedCategory]);

  const getVariables = (category: VDemCategory, subcat: string) =>
    getVariablesForSubcategory(category, subcat);

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
    | { key: string; type: 'all'; level: 1 }
    | { key: string; type: 'category'; level: 1; cat: VDemCategory }
    | { key: string; type: 'subcategory'; level: 2; cat: VDemCategory; sub: string }
    | { key: string; type: 'variable'; level: 3; cat: VDemCategory; sub: string; code: string };

  const visibleItems: VisibleItem[] = useMemo(() => {
    const items: VisibleItem[] = [];
    items.push({ key: 'all', type: 'all', level: 1 });
    for (const cat of CATEGORIES) {
      const catKey = `cat::${cat}`;
      items.push({ key: catKey, type: 'category', level: 1, cat });
      if (expandedCategories.has(cat)) {
        const subs = getSubcategoriesForCategory(cat);
        for (const sub of subs) {
          const subKey = `${cat}::${sub}`;
          const nodeKey = `sub::${subKey}`;
          items.push({ key: nodeKey, type: 'subcategory', level: 2, cat, sub });
          if (expandedSubcats.has(subKey)) {
            const vars = getVariables(cat, sub);
            for (const v of vars) {
              const code = getVariableCode(v) ?? v;
              if (code && HIDDEN_VARIABLE_CODES.has(code)) continue;
              const varKey = `var::${code}`;
              items.push({ key: varKey, type: 'variable', level: 3, cat, sub, code });
            }
          }
        }
      }
    }
    return items;
  }, [expandedCategories, expandedSubcats]);

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
        const container = document.getElementById('sidebar-scroll-container');
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
      setFocusedKey('all');
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
      if (current.type === 'category') {
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
      if (current.type === 'category') {
        if (expandedCategories.has(current.cat)) {
          collapseCategory(current.cat);
        } else {
          moveFocusToKey('all');
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
      }
      return;
    }
    if (key === 'Enter' || key === ' ' || key === 'Space') {
      if (current.type === 'variable') {
        selectVariable(current.cat, current.sub, current.code);
      } else if (current.type === 'category') {
        toggleCategory(current.cat);
      } else if (current.type === 'subcategory') {
        toggleSubcat(current.cat, current.sub);
      }
      return;
    }
  };

  const changeYear = (field: 'startYear' | 'endYear', value: string) => {
    const year = parseInt(value || '0', 10);
    if (!Number.isNaN(year)) {
      onQueryChange({ ...currentQuery, [field]: year });
    }
  };

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
  const container = document.getElementById('sidebar-scroll-container') as HTMLElement | null;
      const el = measureRefs.current[code] || document.getElementById(`measure-${code}`);
      if (container && el) {
        // Scroll the element into view within the sidebar container
        (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
        (el as HTMLElement).classList.add('ring-2', 'ring-primary/50', 'rounded');
        // Focus and set roving focus key
        setFocusedKey(`var::${code}`);
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

  return (
  <div className="h-full bg-card border-l border-border p-4">
      {/* Selected countries as removable buttons */}
      {currentQuery.countries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {currentQuery.countries.map((id) => {
            const c = COUNTRIES.find(c => c.id === id);
            return (
              <button
                key={id}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs hover:bg-primary/10 border border-border"
                onClick={() => removeCountry(id)}
                title={`Remove ${c?.name || id}`}
              >
                <span>{c?.name || id}</span>
                <X className="w-3 h-3" />
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
              min={1900}
              max={2100}
              value={currentQuery.startYear}
              onChange={(e) => changeYear('startYear', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input
              id="to"
              type="number"
              min={1900}
              max={2100}
              value={currentQuery.endYear}
              onChange={(e) => changeYear('endYear', e.target.value)}
            />
          </div>
        </div>
      </div>

  {/* Measures: selected pills and tree */}
  <div className="space-y-2">
        <Label className="text-xs">Measures</Label>
        {/* Selected measures as removable buttons */}
        {(currentQuery.variables && currentQuery.variables.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {currentQuery.variables.slice(0, 5).map(code => {
              const meta = getVariableById(code);
              const label = meta?.label ?? getVariableName(code) ?? code;
              return (
                <button
                  key={code}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs hover:bg-primary/10 border border-border"
                  onClick={() => revealMeasure(code, label)}
                  title={`Go to ${label}`}
                >
                  <span>{label}</span>
                  <X
                    className="w-3 h-3"
                    onClick={(e) => { e.stopPropagation(); removeMeasure(code); }}
                  />
                </button>
              );
            })}
          </div>
        )}
        <div
          className="rounded-md border border-border divide-y"
          role="tree"
          aria-label="Measures"
          onKeyDownCapture={handleTreeKeyDown}
        >
          <button
            onClick={() => changeCategory('all')}
            className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted`}
            ref={(el) => { rowRefs.current['all'] = el; }}
            tabIndex={focusedKey === 'all' ? 0 : -1}
            role="treeitem"
            aria-level={1}
            onFocus={() => setFocusedKey('all')}
          >
            <span>All Categories</span>
          </button>
          {CATEGORIES.map((cat) => {
            const expanded = expandedCategories.has(cat);
            return (
              <div key={cat} className="">
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-muted`}
                  ref={(el) => { rowRefs.current[`cat::${cat}`] = el; }}
                  tabIndex={focusedKey === `cat::${cat}` ? 0 : -1}
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={expanded}
                  onFocus={() => setFocusedKey(`cat::${cat}`)}
                >
                  {expanded ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
                  <span>{cat}</span>
                </button>
                {expanded && (
                  <div className="pl-4 border-t border-border">
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
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-muted`}
                            ref={(el) => { rowRefs.current[`sub::${subKey}`] = el; }}
                            tabIndex={focusedKey === `sub::${subKey}` ? 0 : -1}
                            role="treeitem"
                            aria-level={2}
                            aria-expanded={subExpanded}
                            onFocus={() => setFocusedKey(`sub::${subKey}`)}
                          >
                            {subExpanded ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
                            <span>{sub}</span>
                          </button>
                          {subExpanded && (
                            <div className="pl-6 py-1">
                              {getVariables(cat, sub).map((v) => {
                                const code = getVariableCode(v) ?? v;
                                if (code && HIDDEN_VARIABLE_CODES.has(code)) return null;
                                const isActive = (currentQuery.variables ?? (currentQuery.variable ? [currentQuery.variable] : [])).includes(code);
                                const inputId = `var-${cat}-${sub}-${code}`.replace(/\s+/g, '_');
                                return (
                                  <label
                                    id={`measure-${code}`}
                                    ref={(node) => { measureRefs.current[code] = node; rowRefs.current[`var::${code}`] = node; }}
                                    key={`${subKey}::${v}`}
                                    htmlFor={inputId}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted rounded"
                                    tabIndex={focusedKey === `var::${code}` ? 0 : -1}
                                    role="treeitem"
                                    aria-level={3}
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
      </div>
    </div>
  );
}

export default ChartSidebar;
