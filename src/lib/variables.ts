export type VDemCategory = 
  | 'Elections & Voting'
  | 'Political Parties & Competition'
  | 'Executive Power'
  | 'Legislatures & Representation'
  | 'Judiciary & Rule of Law'
  | 'Civil Liberties & Rights'
  | 'Civil Society & Media'
  | 'Equality & Inclusion'
  | 'Democracy Indices & Regimes'
  | 'Context & Background Factors';

export interface VDemSubcategory {
  id: string;
  label: string;
  category: VDemCategory;
}

export interface VDemVariable {
  id: string;
  label: string;
  category: VDemCategory;
  subcategory: string;
  scale: string;
  direction: 'higher-better' | 'lower-better';
  definition: string;
  unit?: string;
}

export const SUBCATEGORIES: VDemSubcategory[] = [
  // Elections & Voting
  { id: 'elections-general', label: 'General', category: 'Elections & Voting' },
  { id: 'elections-suffrage', label: 'Suffrage', category: 'Elections & Voting' },
  { id: 'elections-qualities', label: 'Election Qualities', category: 'Elections & Voting' },
  { id: 'elections-outcomes', label: 'Election Outcomes', category: 'Elections & Voting' },
  { id: 'elections-executive-specifics', label: 'Executive Elections Specifics', category: 'Elections & Voting' },
  { id: 'elections-lower-chamber', label: 'Lower Chamber Specifics', category: 'Elections & Voting' },
  { id: 'elections-subnational', label: 'Subnational', category: 'Elections & Voting' },
  { id: 'elections-overview', label: 'Elections Overview', category: 'Elections & Voting' },

  // Political Parties & Competition
  { id: 'parties-general', label: 'General', category: 'Political Parties & Competition' },
  { id: 'parties-historical', label: 'Historical', category: 'Political Parties & Competition' },
  { id: 'parties-institutionalization', label: 'Party Institutionalization', category: 'Political Parties & Competition' },

  // Executive Power
  { id: 'executive-general', label: 'General', category: 'Executive Power' },
  { id: 'executive-head-of-state', label: 'Head of State', category: 'Executive Power' },
  { id: 'executive-head-of-government', label: 'Head of Government', category: 'Executive Power' },
  { id: 'executive-overview', label: 'Overview', category: 'Executive Power' },

  // Legislatures & Representation
  { id: 'legislature-general', label: 'General', category: 'Legislatures & Representation' },
  { id: 'legislature-upper-chamber', label: 'Upper Chamber', category: 'Legislatures & Representation' },
  { id: 'legislature-lower-chamber', label: 'Unicameral or Lower Chamber', category: 'Legislatures & Representation' },

  // Judiciary & Rule of Law
  { id: 'judiciary-general', label: 'General', category: 'Judiciary & Rule of Law' },
  { id: 'rule-of-law', label: 'Rule of Law', category: 'Judiciary & Rule of Law' },

  // Civil Liberties & Rights
  { id: 'civil-liberties-integrity', label: 'Personal Integrity Rights', category: 'Civil Liberties & Rights' },
  { id: 'civil-liberties-enforcement', label: 'Impartial Enforcement', category: 'Civil Liberties & Rights' },
  { id: 'civil-liberties-political', label: 'Private and Political Liberties', category: 'Civil Liberties & Rights' },
  { id: 'civil-liberties-property', label: 'Property Rights', category: 'Civil Liberties & Rights' },
  { id: 'civil-liberties-indices', label: 'Civil liberties (indices)', category: 'Civil Liberties & Rights' },

  // Civil Society & Media
  { id: 'civil-society-general', label: 'General', category: 'Civil Society & Media' },
  { id: 'digital-media-freedom', label: 'Digital Media Freedom', category: 'Civil Society & Media' },
  { id: 'internet-regulation', label: 'State Internet Regulation Capacity and Approach', category: 'Civil Society & Media' },
  { id: 'online-media-polarization', label: 'Online Media Polarization', category: 'Civil Society & Media' },
  { id: 'social-cleavages', label: 'Social Cleavages', category: 'Civil Society & Media' },

  // Equality & Inclusion
  { id: 'political-equality-general', label: 'General', category: 'Equality & Inclusion' },
  { id: 'exclusion-indices', label: 'Exclusion (indices)', category: 'Equality & Inclusion' },
  { id: 'exclusion-socioeconomic', label: 'Exclusion by Socio-Economic Group', category: 'Equality & Inclusion' },
  { id: 'exclusion-gender', label: 'Exclusion by Gender', category: 'Equality & Inclusion' },
  { id: 'exclusion-urban-rural', label: 'Exclusion by Urban-Rural Location', category: 'Equality & Inclusion' },
  { id: 'exclusion-political', label: 'Exclusion by Political Group', category: 'Equality & Inclusion' },
  { id: 'exclusion-social', label: 'Exclusion by Social Group', category: 'Equality & Inclusion' },
  { id: 'womens-empowerment', label: 'Women\'s Empowerment', category: 'Equality & Inclusion' },

  // Democracy Indices & Regimes
  { id: 'vdem-high-level', label: 'V-Dem High-Level Democracy Indices', category: 'Democracy Indices & Regimes' },
  { id: 'vdem-mid-level', label: 'V-Dem Mid-Level Indices: Components of the Democracy Indices', category: 'Democracy Indices & Regimes' },
  { id: 'accountability', label: 'Accountability', category: 'Democracy Indices & Regimes' },
  { id: 'executive-bases', label: 'Executive Bases of Power', category: 'Democracy Indices & Regimes' },
  { id: 'neopatrimonialism', label: 'Neopatrimonialism', category: 'Democracy Indices & Regimes' },
  { id: 'corruption-indices', label: 'Corruption (indices)', category: 'Democracy Indices & Regimes' },
  { id: 'party-institutionalization-indices', label: 'Party Institutionalization', category: 'Democracy Indices & Regimes' },
  { id: 'direct-democracy-indices', label: 'Direct Democracy (indices)', category: 'Democracy Indices & Regimes' },
  { id: 'academic-freedom', label: 'Academic Freedom', category: 'Democracy Indices & Regimes' },
  { id: 'regimes-world', label: 'Regimes of the World', category: 'Democracy Indices & Regimes' },

  // Context & Background Factors
  { id: 'economics', label: 'Economics', category: 'Context & Background Factors' },
  { id: 'demography', label: 'Demography', category: 'Context & Background Factors' },
  { id: 'geography', label: 'Geography', category: 'Context & Background Factors' },
  { id: 'education', label: 'Education', category: 'Context & Background Factors' },
  { id: 'natural-resources', label: 'Natural Resource Wealth', category: 'Context & Background Factors' },
  { id: 'infrastructure', label: 'Infrastructure', category: 'Context & Background Factors' },
  { id: 'conflict', label: 'Conflict', category: 'Context & Background Factors' },
  { id: 'freedom-house', label: 'Freedom House', category: 'Context & Background Factors' },
  { id: 'world-bank', label: 'World Bank Governance Indicators', category: 'Context & Background Factors' },
  { id: 'polity5', label: 'Polity 5', category: 'Context & Background Factors' },
  { id: 'unified-democracy', label: 'Unified Democracy Score', category: 'Context & Background Factors' },
  { id: 'others', label: 'Others', category: 'Context & Background Factors' },
];

export const VDEM_VARIABLES: VDemVariable[] = [
  // Democracy Indices & Regimes - V-Dem High-Level Democracy Indices
  {
    id: 'v2x_polyarchy',
    label: 'Electoral democracy index',
    category: 'Democracy Indices & Regimes',
    subcategory: 'vdem-high-level',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent is the ideal of electoral democracy in its fullest sense achieved?'
  },
  {
    id: 'v2x_libdem',
    label: 'Liberal democracy index',
    category: 'Democracy Indices & Regimes',
    subcategory: 'vdem-high-level',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent is the ideal of liberal democracy achieved?'
  },
  {
    id: 'v2x_partipdem',
    label: 'Participatory democracy index',
    category: 'Democracy Indices & Regimes',
    subcategory: 'vdem-high-level',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent is the ideal of participatory democracy achieved?'
  },
  {
    id: 'v2x_delibdem',
    label: 'Deliberative democracy index',
    category: 'Democracy Indices & Regimes',
    subcategory: 'vdem-high-level',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent is the ideal of deliberative democracy achieved?'
  },
  {
    id: 'v2x_egaldem',
    label: 'Egalitarian democracy index',
    category: 'Democracy Indices & Regimes',
    subcategory: 'vdem-high-level',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent is the ideal of egalitarian democracy achieved?'
  },

  // Elections & Voting - Clean Elections Index
  {
    id: 'v2xel_frefair',
    label: 'Clean elections index',
    category: 'Elections & Voting',
    subcategory: 'elections-overview',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent are elections free and fair?'
  },
  {
    id: 'v2elsuffrage',
    label: 'Percentage of population with suffrage',
    category: 'Elections & Voting',
    subcategory: 'elections-suffrage',
    scale: '0-100%',
    direction: 'higher-better',
    definition: 'What percentage of adult citizens has the legal right to vote in national elections?',
    unit: '%'
  },

  // Judiciary & Rule of Law
  {
    id: 'v2x_jucon',
    label: 'Judicial constraints on the executive index',
    category: 'Judiciary & Rule of Law',
    subcategory: 'judiciary-general',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent does the executive respect the constitution and comply with court rulings?'
  },

  // Civil Liberties & Rights
  {
    id: 'v2x_freexp_altinf',
    label: 'Freedom of Expression and Alternative Sources of Information index',
    category: 'Civil Liberties & Rights',
    subcategory: 'civil-liberties-political',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'To what extent does government respect freedom of expression?'
  },

  // Civil Society & Media
  {
    id: 'v2merange',
    label: 'Print/broadcast media perspectives',
    category: 'Civil Society & Media',
    subcategory: 'media-general',
    scale: '0-4',
    direction: 'higher-better',
    definition: 'Do the major print and broadcast outlets represent a wide range of political perspectives?'
  },

  // Equality & Inclusion - Women's Empowerment
  {
    id: 'v2x_gender',
    label: 'Women political empowerment index',
    category: 'Equality & Inclusion',
    subcategory: 'womens-empowerment',
    scale: '0-1',
    direction: 'higher-better',
    definition: 'How politically empowered are women?'
  },

  // Context & Background Factors - Economics
  {
    id: 'e_gdppc',
    label: 'GDP per capita',
    category: 'Context & Background Factors',
    subcategory: 'economics',
    scale: 'USD',
    direction: 'higher-better',
    definition: 'Gross domestic product per capita in current US dollars'
  },
  {
    id: 'e_pop',
    label: 'Population',
    category: 'Context & Background Factors',
    subcategory: 'demography',
    scale: 'Number',
    direction: 'higher-better',
    definition: 'Total population of the country'
  }
];

export const CATEGORIES: VDemCategory[] = [
  'Elections & Voting',
  'Political Parties & Competition',
  'Executive Power',
  'Legislatures & Representation',
  'Judiciary & Rule of Law',
  'Civil Liberties & Rights',
  'Civil Society & Media',
  'Equality & Inclusion',
  'Democracy Indices & Regimes',
  'Context & Background Factors'
];

export function getSubcategoriesByCategory(category: VDemCategory): VDemSubcategory[] {
  return SUBCATEGORIES.filter(s => s.category === category);
}

export function getVariablesBySubcategory(subcategoryId: string): VDemVariable[] {
  return VDEM_VARIABLES.filter(v => v.subcategory === subcategoryId);
}

export function getVariablesByCategory(category: VDemCategory): VDemVariable[] {
  return VDEM_VARIABLES.filter(v => v.category === category);
}

export function getVariableById(id: string): VDemVariable | undefined {
  return VDEM_VARIABLES.find(v => v.id === id);
}

export function getSubcategoryById(id: string): VDemSubcategory | undefined {
  return SUBCATEGORIES.find(s => s.id === id);
}