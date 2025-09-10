import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Dashboard } from "@/pages/Dashboard";
import VDemDatasetInfo from "@/pages/VDemDatasetInfo";
import IMFDatasetInfo from "@/pages/IMFDatasetInfo";
import { ChartExplorer } from "@/pages/ChartExplorer";
import NotFound from "./pages/NotFound";
import { QueryState, DEFAULT_STATE, urlParamsToState, stateToUrlParams } from "@/lib/url-state";

const queryClient = new QueryClient();

function AppContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentQuery, setCurrentQuery] = useState<QueryState>(DEFAULT_STATE);

  // Sync URL params with state
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const stateFromUrl = urlParamsToState(params);
    setCurrentQuery(stateFromUrl);
  }, [searchParams]);

  const handleQueryChange = (newQuery: QueryState) => {
    setCurrentQuery(newQuery);
    
    // If we have a variable selected, navigate to chart page
    if (newQuery.variable && window.location.pathname === '/') {
      const params = stateToUrlParams(newQuery);
      navigate(`/chart?${params.toString()}`);
    } else if (newQuery.variable && window.location.pathname.startsWith('/chart')) {
      const params = stateToUrlParams(newQuery);
      setSearchParams(params);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader 
        currentQuery={currentQuery}
        onQueryChange={handleQueryChange}
      />
      
      <Routes>
        <Route 
          path="/" 
          element={
            <Dashboard 
              currentQuery={currentQuery}
              onQueryChange={handleQueryChange}
            />
          } 
        />
        <Route 
          path="/chart" 
          element={
            <ChartExplorer 
              currentQuery={currentQuery}
              onQueryChange={handleQueryChange}
            />
          } 
        />
  <Route path="/info/v-dem" element={<VDemDatasetInfo />} />
  <Route path="/info/imf" element={<IMFDatasetInfo />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
