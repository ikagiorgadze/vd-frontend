import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getVariableName } from '@/lib/variable-codes';
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from '@/lib/imf-codes';
import { getVariableById } from '@/lib/variables';
import { getCountryById } from '@/lib/countries';
import { apiService } from '@/lib/api';
import { Check, Clipboard, ChevronDown } from 'lucide-react';

type ExplainResponse = { explanation?: string } & Record<string, unknown>;

type Props = {
  // Current selection from charts page for prefill (any dataset)
  selectedVariables: string[]; // codes for variables/indices (use first two for now)
  selectedCountries: string[]; // country ids (use first for now)
};

export default function VdemExplain({ selectedVariables, selectedCountries }: Props) {
  // Helpers to normalize display names
  const normalizeVarName = (code: string): string => {
    if (!code) return '';
    return (
      getVariableById(code)?.label ||
      getVariableName(code) ||
      IMF_WEO_CODE_TO_DESC[code] ||
      IMF_NEA_CODE_TO_DESC[code] ||
      code
    );
  };
  const toTitleCase = (s: string): string => (
    s
      ? s
          .replace(/[_-]+/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : ''
  );

  // Codes used for API calls (kept in sync with props)
  const [indexA, setIndexA] = useState<string>(selectedVariables[0] || '');
  const [indexB, setIndexB] = useState<string>(selectedVariables[1] || '');
  const [countryId, setCountryId] = useState<string>(selectedCountries[0] || '');

  // Display names shown in inputs
  const [measurementAName, setMeasurementAName] = useState<string>(normalizeVarName(selectedVariables[0] || ''));
  const [measurementBName, setMeasurementBName] = useState<string>(normalizeVarName(selectedVariables[1] || ''));
  const initialCountryName = getCountryById(selectedCountries[0] || '')?.name || toTitleCase(selectedCountries[0] || '');
  const [countryName, setCountryName] = useState<string>(initialCountryName);

  // Keep state in sync if selections change upstream
  useEffect(() => {
    const first = selectedVariables[0] || '';
    let second = '';
    if (selectedVariables.length > 1) {
      // prefer the next different variable
      second = selectedVariables.find((c) => c !== first) || '';
    }
    setIndexA(first);
    setMeasurementAName(normalizeVarName(first));
    setIndexB(second);
    setMeasurementBName(normalizeVarName(second));
  }, [selectedVariables]);
  useEffect(() => {
    const nextId = selectedCountries[0] || '';
    setCountryId(nextId);
    setCountryName(getCountryById(nextId)?.name || toTitleCase(nextId));
  }, [selectedCountries]);

  // Prevent selecting the same measurement in both boxes
  useEffect(() => {
    if (indexA && indexB && indexA === indexB) {
      const alternative = selectedVariables.find((c) => c !== indexA);
      if (alternative) {
        setIndexB(alternative);
        setMeasurementBName(normalizeVarName(alternative));
      } else {
        setIndexB('');
        setMeasurementBName('');
      }
    }
  }, [indexA, indexB, selectedVariables]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Disable submission if required fields missing
  const canSubmit = useMemo(() => {
    return Boolean(indexA && indexB && countryId) && !loading;
  }, [indexA, indexB, countryId, loading]);

  // Options that exclude the other selection
  const optionsA = useMemo(() => selectedVariables.filter((c) => c !== indexB), [selectedVariables, indexB]);
  const optionsB = useMemo(() => selectedVariables.filter((c) => c !== indexA), [selectedVariables, indexA]);
  const countryOptions = useMemo(() => selectedCountries, [selectedCountries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResultText(null);
    try {
      const a = indexA.trim();
      const b = indexB.trim();
      const c = countryId.trim();
  const data: ExplainResponse = await apiService.explainRelationships({ indexA: a, indexB: b, country: c, execute: true });
  const explanation = typeof data?.explanation === 'string' ? data.explanation.trim() : '';
      setResultText(
        explanation ||
          `No explanation returned. Requested: ${measurementAName} (${a}) vs ${measurementBName} (${b}) for ${countryName} (${c}).`
      );
      setTimestamp(new Date());
      setExpanded(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="mb-3">
        <h3 className="text-xl font-semibold">Explain Relationship</h3>
        <p className="text-muted-foreground text-sm">Explore how any two indicators relate for a selected country.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Measurement A</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={indexA}
              onChange={(e) => {
                const code = e.target.value;
                setIndexA(code);
                setMeasurementAName(normalizeVarName(code));
              }}
              disabled={loading || optionsA.length === 0}
            >
              {optionsA.length === 0 ? (
                <option value="">No measurements selected</option>
              ) : (
                optionsA.map((code) => (
                  <option key={code} value={code}>{normalizeVarName(code)}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Measurement B</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={indexB}
              onChange={(e) => {
                const code = e.target.value;
                setIndexB(code);
                setMeasurementBName(normalizeVarName(code));
              }}
              disabled={loading || optionsB.length === 0}
            >
              {optionsB.length === 0 ? (
                <option value="">No measurements selected</option>
              ) : (
                optionsB.map((code) => (
                  <option key={code} value={code}>{normalizeVarName(code)}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={countryId}
              onChange={(e) => {
                const id = e.target.value;
                setCountryId(id);
                setCountryName(getCountryById(id)?.name || toTitleCase(id));
              }}
              disabled={loading || countryOptions.length === 0}
            >
              {countryOptions.length === 0 ? (
                <option value="">No countries selected</option>
              ) : (
                countryOptions.map((id) => (
                  <option key={id} value={id}>{getCountryById(id)?.name || toTitleCase(id)}</option>
                ))
              )}
            </select>
          </div>
          {/* Year range intentionally omitted as per instructions. */}
        </div>
  
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        <div>
          <Button type="submit" disabled={!canSubmit}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                Explaining...
              </span>
            ) : (
              'Explain relationship'
            )}
          </Button>
        </div>
      </form>

      {/* Results */}
      {resultText && (
        <div className="mt-4 space-y-3">
          <div className="bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Model explanation</span>
                {timestamp && (
                  <span className="text-xs text-muted-foreground">· {timestamp.toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`transition-all duration-300 active:scale-95 ${copied ? 'bg-green-600 text-white border-green-600 hover:bg-green-600' : ''}`}
                  onClick={async () => {
                    if (!resultText) return;
                    try {
                      await navigator.clipboard.writeText(resultText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    } catch (e) {
                      // noop; copy may be blocked
                    }
                  }}
                >
                  {copied ? (
                    <span className="inline-flex items-center">
                      <Check className="h-4 w-4 mr-2" /> Copied
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <Clipboard className="h-4 w-4 mr-2" /> Copy explanation
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={expanded}
                  className="transition-all duration-200 active:scale-95"
                  onClick={() => setExpanded((v) => !v)}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Collapse' : 'Expand'}
                  </span>
                </Button>
              </div>
            </div>
            <div className={
              `px-4 py-3 text-sm ${expanded ? '' : 'max-h-80 overflow-auto'}`
            }>
              {renderFormatted(resultText)}
            </div>
          </div>
        </div>
      )}

      {/* TODO: consider persisting last explanation to localStorage if UX requires persistence across navigation. */}
    </section>
  );
}

// Lightweight formatter: paragraphs, bullet lists, and **bold** spans
function renderFormatted(text: string): React.ReactNode {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const headingRegex = /^\s*\*\*(.+?):\*\*\s*$/; // **Heading:**

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw; // preserve spacing for inline renderer where needed

    // Section heading like **Summary:**
    const headingMatch = headingRegex.exec(line.trim());
    if (headingMatch) {
      const title = headingMatch[1];
      blocks.push(
        <h4 key={key++} className="text-base font-semibold mt-4 mb-2">{title}</h4>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      const listKey = key++;
      blocks.push(
        <ul key={listKey} className="list-disc ml-5 my-2 space-y-1">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank line -> spacer
    if (line.trim().length === 0) {
      blocks.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Default paragraph
    blocks.push(<p key={key++} className="mb-2 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return <article>{blocks}</article>;
}

function renderInline(s: string): React.ReactNode[] {
  // Supports **bold** and *italic*
  const parts: React.ReactNode[] = [];
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, wrap: (c: React.ReactNode) => <strong>{c}</strong> },
    { regex: /\*(.*?)\*/g, wrap: (c: React.ReactNode) => <em>{c}</em> },
  ];

  // Apply patterns sequentially using a simple parser
  let nodes: React.ReactNode[] = [s];
  for (const { regex, wrap } of patterns) {
    const next: React.ReactNode[] = [];
    nodes.forEach((node) => {
      if (typeof node !== 'string') {
        next.push(node);
        return;
      }
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(node)) !== null) {
        const [full, inner] = m;
        const start = m.index;
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
