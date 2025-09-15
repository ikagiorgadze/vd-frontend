import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { QueryState } from '@/lib/url-state';
import { Menu, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

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
          <div className="flex items-center justify-between h-auto py-5 md:py-4">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.svg" alt="Democracy Dashboard mark" className="h-10 md:h-12 w-auto align-middle" />
              <span className="font-bold text-lg md:text-xl align-middle">Democracy Dashboard</span>
            </button>

            {/* Right-side actions (desktop) */}
            <div className="hidden md:flex items-center gap-2">
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
                className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Explore Data
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button
                    aria-label="Open menu"
                    className="p-2 rounded-lg hover:bg-muted border border-transparent hover:border-border"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40" />
                  <Dialog.Content className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-card border-l border-border shadow-lg focus:outline-none">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <span className="font-semibold">Menu</span>
                      <Dialog.Close asChild>
                        <button aria-label="Close menu" className="p-2 rounded hover:bg-muted">
                          <X className="h-5 w-5" />
                        </button>
                      </Dialog.Close>
                    </div>
                    <nav className="p-2">
                      <Dialog.Close asChild>
                        <button
                          onClick={() => navigate('/info/v-dem')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted text-base"
                        >
                          V‑Dem Info
                        </button>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <button
                          onClick={() => navigate('/info/imf')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted text-base"
                        >
                          IMF Info
                        </button>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <button
                          onClick={goToChart}
                          className="w-full text-left px-4 py-3 rounded-lg bg-primary text-primary-foreground mt-2 text-base"
                        >
                          Explore Data
                        </button>
                      </Dialog.Close>
                    </nav>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </div>
      </header>
  {/* QueryBuilder removed; Explore Data navigates directly to /chart */}
    </>
  );
}