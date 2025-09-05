import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, Globe, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { VDemCategory, getSubcategoriesByCategory, getVariablesBySubcategory, VDEM_VARIABLES, CATEGORIES, getVariableById } from '@/lib/variables';
import { getSubcategoriesForCategory, getVariablesForSubcategory } from '@/lib/variable-mappings';
import { getVariableCode } from '@/lib/variable-codes';
import { COUNTRIES, searchCountries, Country } from '@/lib/countries';
import { QueryState } from '@/lib/url-state';

interface QueryBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: VDemCategory | null;
  currentQuery: QueryState;
  onQueryChange: (query: QueryState) => void;
}

export function QueryBuilder({ 
  isOpen, 
  onClose, 
  initialCategory, 
  currentQuery, 
  onQueryChange 
}: QueryBuilderProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(currentQuery.countries);
  const [yearRange, setYearRange] = useState<number[]>([currentQuery.startYear, currentQuery.endYear]);
  const [selectedCategory, setSelectedCategory] = useState<VDemCategory | null>(
    initialCategory || currentQuery.category || null
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(currentQuery.subcategory || '');
  const [selectedVariable, setSelectedVariable] = useState<string>(currentQuery.variable || '');
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setSelectedSubcategory('');
      setSelectedVariable('');
    }
  }, [initialCategory]);

  const filteredCountries = countrySearch 
    ? searchCountries(countrySearch) 
    : COUNTRIES;

  const availableSubcategories = selectedCategory 
    ? getSubcategoriesForCategory(selectedCategory)
    : [];

  const availableVariables = selectedCategory && selectedSubcategory
    ? getVariablesForSubcategory(selectedCategory, selectedSubcategory)
    : [];

  // Group all variables by category for the dropdown
  const variablesByCategory = CATEGORIES.reduce((acc, category) => {
    const categoryVariables = VDEM_VARIABLES.filter(v => v.category === category);
    if (categoryVariables.length > 0) {
      acc[category] = categoryVariables;
    }
    return acc;
  }, {} as Record<VDemCategory, typeof VDEM_VARIABLES>);

  const selectedVariableData = selectedVariable ? getVariableById(selectedVariable) : null;

  const handleCountryToggle = (countryId: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryId)
        ? prev.filter(id => id !== countryId)
        : [...prev, countryId]
    );
  };

  const handleGenerate = () => {
    // Convert variable name to variable ID for the API
    const variableId = selectedVariable ? getVariableCode(selectedVariable) : undefined;
    
    const newQuery: QueryState = {
      ...currentQuery,
      countries: selectedCountries,
      startYear: yearRange[0],
      endYear: yearRange[1],
      category: selectedCategory || undefined,
      subcategory: selectedSubcategory || undefined,
      variable: variableId
    };
    
    onQueryChange(newQuery);
    onClose();
  };

  const handleReset = () => {
    setSelectedCountries(['MDA', 'DEU', 'UKR']);
    setYearRange([2010, 2024]);
    setSelectedCategory(null);
    setSelectedSubcategory('');
    setSelectedVariable('');
    setCountrySearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-bold">Build Your Query</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Countries Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">Select Countries</Label>
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

              <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <div key={country.id} className="flex items-center space-x-3 p-3 border-b border-border last:border-b-0 hover:bg-muted/50">
                    <Checkbox
                      id={country.id}
                      checked={selectedCountries.includes(country.id)}
                      onCheckedChange={() => handleCountryToggle(country.id)}
                    />
                    <label htmlFor={country.id} className="flex items-center gap-2 cursor-pointer flex-1">
                      <span>{country.name}</span>
                      <span className="text-xs text-muted-foreground">{country.id}</span>
                    </label>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {selectedCountries.length} countries selected
              </p>
            </div>

            {/* Time Period & Measure Selection */}
            <div className="space-y-6">
              
              {/* Time Period */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Time Period</Label>
                </div>
                
                <div className="space-y-4">
                  <div className="px-3">
                    <Slider
                      value={yearRange}
                      onValueChange={setYearRange}
                      min={1990}
                      max={2024}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{yearRange[0]}</span>
                    <span>{yearRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Measure Selection */}
              {selectedCategory && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <Label className="text-lg font-semibold">Measure</Label>
                  </div>

                  {/* Subcategory Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Choose Subcategory</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableSubcategories.map((subcategory) => (
                        <button
                          key={subcategory}
                          onClick={() => {
                            setSelectedSubcategory(subcategory);
                            setSelectedVariable('');
                          }}
                          className={`
                            px-3 py-2 text-xs rounded-full border transition-[var(--animation-card)]
                            ${selectedSubcategory === subcategory 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'border-border hover:bg-muted'
                            }
                          `}
                        >
                          {subcategory}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variable Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Variable</Label>
                    
                    <Select value={selectedVariable} onValueChange={setSelectedVariable}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a variable to analyze...">
                          {selectedVariable && (
                            <span className="font-medium">{selectedVariable}</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {availableVariables.map((variable) => (
                          <SelectItem key={variable} value={variable}>
                            <span className="font-medium">{variable}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={selectedCountries.length === 0 || !selectedVariable}
              className="button-primary"
            >
              Generate Charts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}