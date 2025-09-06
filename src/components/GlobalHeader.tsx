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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-blue to-primary-purple rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">VD</span>
              </div>
              <span className="font-bold text-xl">V-Dem Explorer</span>
            </button>

            {/* Explore Data button (right) */}
            <button
              onClick={goToChart}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Explore Data
            </button>
          </div>
        </div>
      </header>
  {/* QueryBuilder removed; Explore Data navigates directly to /chart */}
    </>
  );
}