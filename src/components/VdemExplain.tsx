import React, { useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  // Current selection from charts page for prefill
  selectedVdemVars: string[]; // codes for indices (use first two for now)
  selectedCountries: string[]; // country ids (use first for now)
};

export default function VdemExplain({ selectedVdemVars, selectedCountries }: Props) {
  // Prefill with the first two V-Dem variables, and the first country if available
  const [indexA, setIndexA] = useState<string>(selectedVdemVars[0] || '');
  const [indexB, setIndexB] = useState<string>(selectedVdemVars[1] || '');
  // TODO: support more than two indices in future backend versions.
  const [country, setCountry] = useState<string>(selectedCountries[0] || '');

  // Optional execute flag (currently request body supports it but backend constructs prompts)
  const [execute, setExecute] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<Record<string, unknown> | null>(null);

  // Disable submission if required fields missing
  const canSubmit = useMemo(() => {
    return Boolean(indexA && indexB && country) && !loading;
  }, [indexA, indexB, country, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResultText(null);
    setRawJson(null);

    try {
      const payload: { indexA: string; indexB: string; country: string; execute?: boolean } = {
        indexA: indexA.trim(),
        indexB: indexB.trim(),
        country: country.trim(),
      };
      if (execute) payload.execute = true;

      const data = await apiService.explainRelationships(payload);
      setRawJson(data);

      // Expecting JSON with { explanation: string }
      const explanation = typeof data?.explanation === 'string' ? data.explanation : '';
      if (!explanation) {
        // Friendly fallback if backend returns no explanation field
        setResultText('No explanation was returned by the model.');
        // TODO: refine error vs. empty-state UX if backend adds richer signals
      } else {
        setResultText(explanation);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch explanation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-xl font-semibold">Explain Relationship</h3>
        <p className="text-muted-foreground text-sm">Explore how two V-Dem indices relate for a selected country.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Index A</label>
            <Input
              value={indexA}
              onChange={(e) => setIndexA(e.target.value)}
              placeholder="e.g., v2x_polyarchy"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Index B</label>
            <Input
              value={indexB}
              onChange={(e) => setIndexB(e.target.value)}
              placeholder="e.g., v2x_libdem"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., USA"
              disabled={loading}
            />
          </div>
          {/* Year range intentionally omitted as per instructions. */}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="execute" checked={execute} onCheckedChange={(v) => setExecute(Boolean(v))} disabled={loading} />
            <label htmlFor="execute" className="text-sm">Execute (call model)</label>
          </div>
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
      {(resultText || rawJson) && (
        <div className="mt-4 space-y-3">
          {resultText && (
            <div className="bg-muted text-sm rounded-md p-4 whitespace-pre-wrap max-h-80 overflow-auto">
              {resultText}
            </div>
          )}
          {/* Keep the last JSON visible for debugging/inspection */}
          {rawJson && (
            <details className="bg-card border rounded-lg p-3">
              <summary className="cursor-pointer text-sm font-medium mb-2">Show raw JSON</summary>
              <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* TODO: consider persisting last explanation to localStorage if UX requires persistence across navigation. */}
    </section>
  );
}
