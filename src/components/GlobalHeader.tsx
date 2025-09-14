import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { QueryState } from '@/lib/url-state';

interface GlobalHeaderProps {
  onQueryChange: (query: QueryState) => void;
  currentQuery: QueryState;
}

export function GlobalHeader({ onQueryChange, currentQuery }: GlobalHeaderProps) {
  const navigate = useNavigate();
  const goToChart = () => {
    // If a variable is already selected we keep it; otherwise we just navigate to /chart
    navigate('/chart');
  };

  return (
    <>
      <header className="bg-card border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-auto py-4">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.svg" alt="Democracy Dashboard mark" className="h-12 w-auto align-middle" />
              <span className="font-bold text-xl align-middle">Democracy Dashboard</span>
            </button>

            {/* Right-side actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/info/v-dem')}
                className="px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted"
              >
                V‑Dem Info
              </button>
              <button
                onClick={() => navigate('/info/imf')}
                className="px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted"
              >
                IMF Info
              </button>
              <button
                onClick={goToChart}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Explore Data
              </button>
            </div>
          </div>
        </div>
      </header>
  {/* QueryBuilder removed; Explore Data navigates directly to /chart */}
    </>
  );
}