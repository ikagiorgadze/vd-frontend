import { CATEGORY_SUBCATEGORIES, SUBCATEGORY_VARIABLES } from './variable-mappings';
import { VARIABLE_NAME_TO_CODE } from './variable-codes';
import type { VDemCategory } from './variables';

export type MeasurePath = {
  category: VDemCategory;
  subcategoryLabel: string; // Human-facing subcategory label as used in the sidebar
  variableLabel: string; // Human-facing variable label as listed in the sidebar
  code: string; // API variable code
};

// Build a reverse index: code -> { category, subcategoryLabel, variableLabel }
const CODE_TO_PATH: Record<string, Omit<MeasurePath, 'code'>> = {};
const LABEL_TO_PATH: Record<string, Omit<MeasurePath, 'code' | 'variableLabel'>> = {};

(function buildIndex() {
  const categories = Object.keys(CATEGORY_SUBCATEGORIES) as VDemCategory[];
  for (const cat of categories) {
    const subcats = CATEGORY_SUBCATEGORIES[cat] || [];
    for (const sub of subcats) {
      const vars = SUBCATEGORY_VARIABLES[cat]?.[sub] || [];
      for (const vLabel of vars) {
        const code = VARIABLE_NAME_TO_CODE[vLabel];
        // Always record label location so we can resolve reveals even if code is unknown
        LABEL_TO_PATH[vLabel] = {
          category: cat,
          subcategoryLabel: sub,
        };
        if (code) {
          CODE_TO_PATH[code] = {
            category: cat,
            subcategoryLabel: sub,
            variableLabel: vLabel,
          };
        }
      }
    }
  }
})();

export function getMeasurePathByCode(code: string): { category: VDemCategory; subcategoryLabel: string; variableLabel: string } | undefined {
  const p = CODE_TO_PATH[code];
  if (!p) return undefined;
  return { category: p.category, subcategoryLabel: p.subcategoryLabel, variableLabel: p.variableLabel };
}

export function hasMeasureCode(code: string): boolean {
  return !!CODE_TO_PATH[code];
}

export function getMeasurePathByLabel(label: string): { category: VDemCategory; subcategoryLabel: string } | undefined {
  const p = LABEL_TO_PATH[label];
  if (!p) return undefined;
  return { category: p.category, subcategoryLabel: p.subcategoryLabel };
}
