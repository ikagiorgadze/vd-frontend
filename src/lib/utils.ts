import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getVariableName } from './variable-codes';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from './imf-codes';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the display name for any variable code, whether VDEM, WEO, or NEA
 * Handles both "dataset:code" format and plain "code" format
 */
export function getDisplayName(codeWithPrefix: string): string {
  // Handle "dataset:code" format
  if (codeWithPrefix.includes(':')) {
    const [dataset, code] = codeWithPrefix.split(':');

    if (dataset === 'VDEM') {
      return getVariableName(code) || code;
    } else if (dataset === 'WEO') {
      return IMF_WEO_CODE_TO_DESC[code] || code;
    } else if (dataset === 'NEA') {
      return IMF_NEA_CODE_TO_DESC[code] || code;
    }
  }

  // Handle plain code format (fallback for backward compatibility)
  const code = codeWithPrefix;
  return getVariableName(code) || IMF_WEO_CODE_TO_DESC[code] || IMF_NEA_CODE_TO_DESC[code] || code;
}
