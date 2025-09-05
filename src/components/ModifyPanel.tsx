import React, { useState } from 'react';
import { Search, Settings, Globe, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, searchCountries, getCountryById } from '@/lib/countries';
import { VDEM_VARIABLES, VDemCategory, CATEGORIES, getVariablesByCategory } from '@/lib/variables';
import { getSubcategoriesForCategory, getVariablesForSubcategory } from '@/lib/variable-mappings';
import { QueryState } from '@/lib/url-state';

interface ModifyPanelProps {
  currentQuery: QueryState;
  onQueryChange: (query: QueryState) => void;
}

export function ModifyPanel({ currentQuery, onQueryChange }: ModifyPanelProps) {
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VDemCategory | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  const filteredCountries = countrySearch 
    ? searchCountries(countrySearch) 
    : COUNTRIES;

  // Get subcategories for selected category
  const availableSubcategories = selectedCategory !== 'all' 
    ? getSubcategoriesForCategory(selectedCategory)
    : [];

  // Get variables for selected category and subcategory
  const availableVariables = selectedCategory !== 'all' && selectedSubcategory
    ? getVariablesForSubcategory(selectedCategory, selectedSubcategory)
    : [];

  const handleCountryToggle = (countryId: string) => {
    const newCountries = currentQuery.countries.includes(countryId)
      ? currentQuery.countries.filter(id => id !== countryId)
      : [...currentQuery.countries, countryId];
    
    onQueryChange({ ...currentQuery, countries: newCountries });
  };

  const handleVariableChange = (variableName: string) => {
    onQueryChange({ ...currentQuery, variable: variableName });
  };

  const handleYearChange = (field: 'startYear' | 'endYear', value: string) => {
    const year = parseInt(value);
    onQueryChange({ ...currentQuery, [field]: year });
  };

  const handleChartTypeChange = (chartType: string) => {
    onQueryChange({ 
      ...currentQuery, 
      chartType: chartType as QueryState['chartType']
    });
  };

  return (
    <div className="w-80 bg-card border-l border-border p-6 overflow-y-auto max-h-screen">
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Modify Chart</h2>
        </div>

        {/* Countries */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="font-semibold">Countries</Label>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
            {filteredCountries.map((country) => (
              <div key={country.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50">
                <Checkbox
                  id={`modify-${country.id}`}
                  checked={currentQuery.countries.includes(country.id)}
                  onCheckedChange={() => handleCountryToggle(country.id)}
                />
                <label 
                  htmlFor={`modify-${country.id}`} 
                  className="flex items-center gap-2 cursor-pointer flex-1 text-sm"
                >
                  <span>{country.name}</span>
                </label>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {currentQuery.countries.length} selected
          </p>
        </div>

        {/* Time Period */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Label className="font-semibold">Time Period</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modify-startYear" className="text-xs">From</Label>
              <Input
                id="modify-startYear"
                type="number"
                min="1990"
                max="2024"
                value={currentQuery.startYear}
                onChange={(e) => handleYearChange('startYear', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="modify-endYear" className="text-xs">To</Label>
              <Input
                id="modify-endYear"
                type="number"
                min="1990"
                max="2024"
                value={currentQuery.endYear}
                onChange={(e) => handleYearChange('endYear', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Measure */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <Label className="font-semibold">Measure Category</Label>
          </div>
          
          {/* Category Selection */}
          <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('');
              }}
              className={`
                w-full p-3 text-left border-b border-border transition-colors hover:bg-muted/50
                ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : ''}
              `}
            >
              All Categories
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedSubcategory('');
                }}
                className={`
                  w-full p-3 text-left border-b border-border last:border-b-0 transition-colors hover:bg-muted/50
                  ${selectedCategory === category ? 'bg-primary text-primary-foreground' : ''}
                `}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Subcategory Selection */}
          {selectedCategory !== 'all' && availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Subcategories</Label>
              <div className="border border-border rounded-lg max-h-32 overflow-y-auto">
                {availableSubcategories.map((subcategory) => (
                  <button
                    key={subcategory}
                    onClick={() => setSelectedSubcategory(subcategory)}
                    className={`
                      w-full p-2 text-left border-b border-border last:border-b-0 transition-colors hover:bg-muted/50
                      ${selectedSubcategory === subcategory ? 'bg-primary text-primary-foreground' : ''}
                    `}
                  >
                    <div className="text-sm">{subcategory}</div>
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Variable List */}
          <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
            {availableVariables.map((variable) => (
              <button
                key={variable}
                onClick={() => handleVariableChange(variable)}
                className={`
                  w-full p-3 text-left border-b border-border last:border-b-0 
                  transition-colors hover:bg-muted/50
                  ${currentQuery.variable === variable 
                    ? 'bg-primary text-primary-foreground' 
                    : ''
                  }
                `}
              >
                <div className="font-medium text-sm">{variable}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}