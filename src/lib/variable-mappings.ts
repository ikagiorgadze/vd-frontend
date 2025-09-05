// Variable mappings from the comprehensive JSON structure
export const CATEGORY_SUBCATEGORIES = {
  "Elections & Voting": [
    "General",
    "Suffrage", 
    "Election Qualities",
    "Election Outcomes",
    "Executive Elections Specifics",
    "Lower Chamber Specifics",
    "Subnational",
    "Elections Overview"
  ],
  "Political Parties & Competition": [
    "General",
    "Historical",
    "Party Institutionalization"
  ],
  "Executive Power": [
    "General",
    "Head of State",
    "Head of Government",
    "Overview"
  ],
  "Legislatures & Representation": [
    "General",
    "Upper Chamber",
    "Unicameral or Lower Chamber"
  ],
  "Judiciary & Rule of Law": [
    "General",
    "Rule of Law"
  ],
  "Civil Liberties & Rights": [
    "Personal Integrity Rights",
    "Impartial Enforcement", 
    "Private and Political Liberties",
    "Property Rights",
    "Civil liberties (indices)"
  ],
  "Civil Society & Media": [
  "General",
    "Digital Media Freedom",
    "State Internet Regulation Capacity and Approach",
    "Online Media Polarization",
    "Social Cleavages"
  ],
  "Equality & Inclusion": [
    "General",
    "Exclusion (indices)",
    "Exclusion by Socio-Economic Group",
    "Exclusion by Gender",
    "Exclusion by Urban-Rural Location", 
    "Exclusion by Political Group",
    "Exclusion by Social Group",
    "Women's Empowerment"
  ],
  "Democracy Indices & Regimes": [
    "V-Dem High-Level Democracy Indices",
    "V-Dem Mid-Level Indices: Components of the Democracy Indices",
    "Accountability",
    "Executive Bases of Power",
    "Neopatrimonialism",
    "Corruption (indices)",
    "Party Institutionalization",
    "Direct Democracy (indices)",
    "Academic Freedom",
    "Regimes of the World"
  ],
  "Context & Background Factors": [
    "Economics",
    "Demography",
    "Geography", 
    "Education",
    "Natural Resource Wealth",
    "Infrastructure",
    "Conflict",
    "Freedom House",
    "World Bank Governance Indicators",
    "Polity 5",
    "Unified Democracy Score",
    "Others"
  ]
};

export const SUBCATEGORY_VARIABLES = {
  "Elections & Voting": {
    "General": ["Election type"],
    "Suffrage": [
      "Suffrage",
      "Minimum voting age", 
      "Compulsory voting",
      "Female suffrage restricted",
      "Suffrage level",
      "Percentage of population with suffrage",
      "Fraud allegations by Western monitors",
      "Female suffrage",
      "Male suffrage"
    ],
    "Election Qualities": [
      "Disclosure of campaign donations",
      "Public campaign finance",
      "EMB autonomy",
      "EMB capacity",
      "Elections multiparty",
      "Election voter registry",
      "Election vote buying",
      "Election other voting irregularities",
      "Election government intimidation",
      "Election other electoral violence",
      "Election boycotts",
      "Election free campaign media",
      "Election paid campaign advertisements",
      "Election paid interest group media",
      "Election free and fair",
      "Election domestic election monitors",
      "Election international monitors", 
      "Election international monitors denied",
      "Monitors refuse to be present",
      "Candidate restriction by ethnicity, race, religion, or language"
    ],
    "Election Outcomes": [
      "Election losers accept results",
      "Election assume office",
      "Election turnout",
      "Election VAP turnout",
      "Name of largest party",
      "Name of second largest party",
      "Name of third largest party"
    ],
    "Executive Elections Specifics": [
      "Presidential elections consecutive",
      "Presidential elections cumulative",
      "HOG restriction by ethnicity, race, religion, or language",
      "HOS restriction by ethnicity, race, religion, or language",
      "Election HOG turnover ordinal",
      "Election HOS turnover ordinal",
      "Election executive turnover ordinal",
      "Presidential election vote share of largest vote-getter",
      "Presidential election vote share of second-largest vote-getter"
    ],
    "Lower Chamber Specifics": [
      "Lower chamber 'base' tier electoral districts",
      "Lower chamber 'base' or 'nominal' tier seats",
      "Lower chamber election consecutive",
      "Lower chamber election cumulative",
      "Lower chamber election district effective magnitude",
      "Lower chamber election district magnitude",
      "Lower chamber electoral system — 13 categories",
      "Lower chamber hybrid system reserved seats",
      "Lower chamber election seats",
      "Lower chamber election seats won by largest party",
      "Lower chamber election seat share won by largest party",
      "Lower chamber election seats won by second largest party",
      "Lower chamber election seat share won by second largest party",
      "Lower chamber election seats won by third largest party",
      "Lower chamber election seat share won by third largest party",
      "Lower chamber 'upper' tier electoral districts ",
      "Lower chamber election vote share of largest vote-getter",
      "Lower chamber election vote share of second-largest vote-getter",
      "Lower chamber election vote share of third-largest vote-getter",
      "Lower chamber electoral system",
      "Lower chamber election statutory threshold",
      "Lower chamber election turnover"
    ],
    "Subnational": [
      "Regional government exists (A,C)",
      "Regional government name (A,C)",
      "Regional government elected (A,C)",
      "Regional offices relative power",
      "Local government exists (A,C)",
      "Local government name (A,C)",
      "Local government elected (A,C)",
      "Local offices relative power",
      "Subnational elections free and fair",
      "Subnational elections held",
      "Subnational election unevenness",
      "Subnational election area less free and fair name",
      "Subnational election area less free and fair characteristics",
      "Subnational election area more free and fair name",
      "Subnational election area more free and fair characteristics"
    ],
    "Elections Overview": [
      "Electoral regime index",
      "Executive electoral regime index", 
      "Legislative electoral regime index",
      "Electoral component index",
      "Freedom of expression index",
      "Alternative sources of information index"
    ]
  },
  "Political Parties & Competition": {
    "General": [
      "Barriers to parties",
      "Party ban",
      "Party ban target",
      "Opposition parties autonomy",
      "Party organizations",
      "Party branches",
      "Party linkages",
      "Distinct party platforms",
      "Candidate selection-national/local",
      "Legislative party cohesion",
      "Party competition across regions",
      "National party control",
      "Subnational party control"
    ],
    "Historical": [
      "Party identification",
      "Party age largest",
      "Party age executive", 
      "Party age second largest",
      "Party age third largest"
    ],
    "Party Institutionalization": ["Party institutionalization index"]
  },
  "Executive Power": {
    "General": [
      "Executive respects constitution",
      "Executive bribery and corrupt exchanges",
      "Executive embezzlement and theft",
      "Public sector corrupt exchanges",
      "Public sector theft",
      "Chief executive appointment by upper chamber",
      "Chief executive appointment by upper chamber implicit approval"
    ],
    "Head of State": [
      "HOS name",
      "HOS title",
      "HOS removal by legislature in practice",
      "HOS removal by other in practice",
      "HOS other body remove HOS in practice",
      "HOS control over",
      "HOS other body controls",
      "HOS dissolution in practice",
      "HOS appoints cabinet in practice",
      "HOS veto power in practice",
      "HOS dismisses ministers in practice",
      "HOS proposes legislation in practice",
      "HOS = HOG",
      "HOS age",
      "HOS selection by legislature in practice",
      "HOS directly elected",
      "HOS female",
      "HOS term length by law",
      "HOS appointment in practice",
      "HOS year of death",
      "HOS party affiliation"
    ],
    "Head of Government": [
      "HOG name",
      "HOG title",
      "HOG removal by legislature in practice",
      "HOG removal by other in practice",
      "HOG other body remove HOG in practice",
      "HOG control over",
      "HOG other body controls",
      "HOG dissolution in practice",
      "HOG appoints cabinet in practice",
      "HOG dismisses ministers in practice",
      "HOG veto power in practice",
      "HOG proposes legislation in practice",
      "HOG age",
      "HOG selection by legislature in practice",
      "HOG directly elected",
      "HOG female",
      "HOG term length by law",
      "Relative power of the HOG",
      "HOG appointed by HOS",
      "HOG appointment in practice",
      "HOG year of death",
      "HOG party affiliation"
    ],
    "Overview": ["Executive corruption index"]
  },
  "Legislatures & Representation": {
    "General": [
      "Legislature bicameral",
      "Legislature dominant chamber",
      "Legislature questions officials in practice",
      "Legislature investigates in practice",
      "Executive oversight",
      "Legislature corrupt activities",
      "Legislature opposition parties",
      "Legislature controls resources",
      "Representation of disadvantaged social groups",
      "Representation of disadvantaged social groups binary",
      "Relative power of the HOS",
      "HOG appointed by legislature",
      "HOS appointed by legislature",
      "Legislature approval of treaties by law",
      "Legislature declares war by law"
    ],
    "Upper Chamber": [
      "Upper chamber name",
      "Upper chamber legislates in practice",
      "Upper chamber elected",
      "Percentage of indirectly elected legislators upper chamber",
      "Upper chamber introduces bills"
    ],
    "Unicameral or Lower Chamber": [
      "Lower chamber legislature name",
      "Lower chamber legislates in practice",
      "Lower chamber committees",
      "Lower chamber members serve in government",
      "Lower chamber staff",
      "Lower chamber elected",
      "Lower chamber female legislators",
      "Percentage of indirectly elected legislators lower chamber",
      "Lower chamber introduces bills",
      "Lower chamber gender quota",
      "Lower chamber gender quota placement mandate",
      "Lower chamber gender quota threshold"
    ]
  },
  "Judiciary & Rule of Law": {
    "General": [
      "Judicial reform",
      "Judicial purges",
      "Government attacks on judiciary",
      "Court packing",
      "Judicial accountability",
      "Judicial corruption decision",
      "High court name",
      "High court independence",
      "Lower court independence",
      "Compliance with high court",
      "Compliance with judiciary",
      "Judicial review",
      "Codeable",
      "Corresponding flowchart",
      "Language",
      "Team translated"
    ],
    "Rule of Law": ["Rule of law index", "Access to justice", "Property rights"]
  },
  "Civil Liberties & Rights": {
    "Personal Integrity Rights": [
      "Freedom from torture",
      "Freedom from political killings",
      "Freedom from forced labor for men",
      "Freedom from forced labor for women"
    ],
    "Impartial Enforcement": [
      "Transparent laws with predictable enforcement",
      "Rigorous and impartial public administration",
      "Access to justice for men",
      "Access to justice for women",
      "Social class equality in respect for civil liberty",
      "Social group equality in respect for civil liberties",
      "Subnational civil liberties unevenness",
      "Stronger civil liberties characteristics",
      "Weaker civil liberties population",
      "Weaker civil liberties characteristics"
    ],
    "Private and Political Liberties": [
      "Freedom of discussion for men",
      "Freedom of discussion for women",
      "Freedom of academic and cultural expression",
      "Freedom of religion",
      "Freedom of foreign movement",
      "Freedom of domestic movement for men",
      "Freedom of domestic movement for women"
    ],
    "Property Rights": [
      "State ownership of economy",
      "Property rights for men",
      "Property rights for women"
    ],
    "Civil liberties (indices)": [
      "Civil liberties index",
      "Physical violence index",
      "Political civil liberties index",
      "Private civil liberties index"
    ]
  },
  "Civil Society & Media": {
    "General": [
      "CSO entry and exit",
      "CSO repression",
      "CSO consultation",
      "CSO structure",
      "CSO participatory environment",
      "CSO women's participation",
      "CSO anti-system movements",
      "CSO anti-system movement character",
      "Religious organization repression",
      "Religious organization consultation"
    ],
    "Digital Media Freedom": [
      "Government Internet filtering capacity",
      "Government Internet filtering in practice",
      "Government Internet shut down capacity",
      "Government Internet shut down in practice",
      "Government social media shut down in practice",
      "Government social media alternatives",
      "Government social media monitoring",
      "Government social media censorship in practice",
      "Government cyber security capacity",
      "Political parties cyber security capacity"
    ],
    "State Internet Regulation Capacity and Approach": [
      "Internet legal regulation content",
      "Privacy protection by law exists",
      "Privacy protection by law content",
      "Government capacity to regulate online content",
      "Government online content regulation approach",
      "Defamation protection",
      "Abuse of defamation and copyright law by elites"
    ],
    "Online Media Polarization": [
      "Online media existence",
      "Online media perspectives",
      "Online media fractionalization"
    ],
    "Social Cleavages": [
      "Online harassment groups",
      "Other online harassment groups",
      "Use of social media to organize offline violence",
      "Average people's use of social media to organize offline action",
      "Elites' use of social media to organize offline action",
      "Types of organization through social media",
      "Other types of organization through social media",
      "Party/candidate use of social media in campaigns",
      "Arrests for political content",
      "Polarization of society",
      "Political parties hate speech"
    ]
  },
  "Equality & Inclusion": {
    "General": [
      "Power distributed by socioeconomic position",
      "Power distributed by social group",
      "Power distributed by gender",
      "Power distributed by sexual orientation",
      "Educational equality",
      "Health equality",
      "Primary school enrolment",
      "Secondary school enrolment",
      "Tertiary school enrolment"
    ],
    "Exclusion (indices)": [
      "Exclusion by Socio-Economic Group",
      "Exclusion by Gender index",
      "Exclusion by Urban-Rural Location index",
      "Exclusion by Political Group index",
      "Exclusion by Social Group index"
    ],
    "Exclusion by Socio-Economic Group": [
      "Access to public services distributed by socio-economic position",
      "Access to state jobs by socio-economic position",
      "Access to state business opportunities by socio-economic position"
    ],
    "Exclusion by Gender": [
      "Gender equality in respect for civil liberties",
      "Access to public services distributed by gender",
      "Access to state jobs by gender",
      "Access to state business opportunities by gender"
    ],
    "Exclusion by Urban-Rural Location": [
      "Power distributed by urban-rural location",
      "Urban-rural location equality in respect for civil liberties",
      "Access to public services distributed by urban-rural location",
      "Access to state jobs by urban-rural location",
      "Access to state business opportunities by urban-rural location"
    ],
    "Exclusion by Political Group": [
      "Political group equality in respect for civil liberties",
      "Access to public services distributed by political group",
      "Access to state jobs by political group",
      "Access to state business opportunities by political group"
    ],
    "Exclusion by Social Group": [
      "Access to public services distributed by social group",
      "Access to state jobs by social group",
      "Access to state business opportunities by social group"
    ],
    "Women's Empowerment": [
      "Women political empowerment index",
      "Women civil liberties index",
      "Women civil society participation index",
      "Women political participation index"
    ]
  },
  "Democracy Indices & Regimes": {
    "V-Dem High-Level Democracy Indices": [
      "Electoral democracy index",
      "Liberal democracy index",
      "Participatory democracy index",
      "Deliberative democracy index",
      "Egalitarian democracy index"
    ],
    "V-Dem Mid-Level Indices: Components of the Democracy Indices": [
      "Additive polyarchy index",
      "Multiplicative polyarchy index",
      "Freedom of Expression and Alternative Sources of Information index",
      "Freedom of association thick index",
      "Share of population with suffrage",
      "Clean elections index",
      "Elected officials index",
      "Liberal component index",
      "Equality before the law and individual liberty index",
      "Judicial constraints on the executive index",
      "Legislative constraints on the executive index",
      "Participatory component index",
      "Civil society participation index",
      "Direct popular vote index",
      "Local government index",
      "Regional government index",
      "Deliberative component index",
      "Egalitarian component index",
      "Equal protection index",
      "Equal access index",
      "Equal distribution of resources index"
    ],
    "Accountability": [
      "Accountability index",
      "Vertical accountability index",
      "Diagonal accountability index",
      "Horizontal accountability index"
    ],
    "Executive Bases of Power": [
      "Confidence dimension index",
      "Direct election dimension index",
      "Hereditary dimension index",
      "Military dimension index",
      "Ruling party dimension index"
    ],
    "Neopatrimonialism": [
      "Neopatrimonial Rule Index",
      "Clientelism Index",
      "Presidentialism Index",
      "Regime corruption"
    ],
    "Corruption (indices)": [
      "Political corruption index",
      "Executive corruption index",
      "Public sector corruption index"
    ],
    "Party Institutionalization": ["Party institutionalization index"],
    "Direct Democracy (indices)": [
      "Popular initiative index",
      "Popular referendum index",
      "Obligatory referendum index",
      "Plebiscite index",
      "Citizen-initiated component of direct popular vote index",
      "Top-Down component of direct popular vote index"
    ],
    "Academic Freedom": ["Academic Freedom Index"],
    "Regimes of the World": [
      "Regimes of the world – the RoW measure",
      "Regimes of the world – the RoW measure with categories for ambiguous cases"
    ]
  },
  "Context & Background Factors": {
    "Economics": [
      "Exports",
      "Imports",
      "GDP",
      "GDP per capita",
      "Inflation",
      "Population"
    ],
    "Demography": [
      "Fertility rate",
      "Population total",
      "Urbanization",
      "Urban population",
      "Child mortality rate",
      "Life expectancy, female",
      "Life expectancy",
      "Maternal mortality rate",
      "Population"
    ],
    "Geography": [
      "Land area",
      "Region (geographic)",
      "Region (politico-geographic)",
      "Region (politico-geographic 6-category)",
      "Region (politico-geographic 7-category)"
    ],
    "Education": ["Education 15+", "Educational inequality, Gini"],
    "Natural Resource Wealth": [
      "Petroleum, coal, and natural gas production per capita",
      "Petroleum production per capita",
      "Petroleum, coal, natural gas, and metals production per capita"
    ],
    "Infrastructure": ["Radios"],
    "Conflict": [
      "Civil war",
      "Armed conflict, international",
      "Armed conflict, internal",
      "Number of successful coup attempts in a year",
      "Number of coups attempts in a year"
    ],
    "Freedom House": [
      "Civil liberties",
      "Political rights",
      "Rule of law",
      "Status"
    ],
    "World Bank Governance Indicators": [
      "Control of corruption — estimate",
      "Government effectiveness",
      "Political stability — estimate",
      "Rule of law — estimate",
      "Regulatory quality — estimate",
      "Voice and accountability — estimate"
    ],
    "Polity 5": [
      "Institutionalized autocracy",
      "Institutionalized democracy",
      "Polity combined score",
      "Political competition",
      "Polity revised combined score"
    ],
    "Unified Democracy Score": ["Unified democracy score posterior"],
    "Others": [
      "Democratic breakdown",
      "Democracy",
      "Corruption perception index",
      "Index of Democratization"
    ]
  }
};

// Helper functions
export function getSubcategoriesForCategory(category: string): string[] {
  return CATEGORY_SUBCATEGORIES[category] || [];
}

export function getVariablesForSubcategory(category: string, subcategory: string): string[] {
  return SUBCATEGORY_VARIABLES[category]?.[subcategory] || [];
}