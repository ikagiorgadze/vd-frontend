// Codes to hide from the sidebar menus (variables removed from UI)
export const HIDDEN_VARIABLE_CODES = new Set<string>([
  'v2ellocnam',
  'v2elregnam',
  'v2exnamhog',
  'v2exnamhos',
  'v2exparhos',
  'v2expothog',
  'v2extithog',
  'v2extithos',
  'v2juhcname',
  'v2lgnamelo',
  'v2lgnameup',
  'v2lpname',
  'v2reginfo',
  'v2slpname',
  'v2tlpname',
  'v3ellocnam',
  'v3elregnam',
  'v3exnamhog',
  'v3exnamhos',
  'v3extithog',
  'v3extithos',
  'v3juhcname',
  'v3lgcamoth',
  'v3lgnamelo',
  'v3lgnameup',

  // Added per user request (exclude these problematic/no-call variables)
  // Elections
  'v2eltype', // Election type (v2). Keep out of menu
  'v2eltype_1', // legacy base mapping variant (defensive)
  'v3eltype', // historical variant (defensive)
  'v2elsnless', // Subnational election area less free and fair name
  'v2elsnlfc', // Subnational election area less free and fair characteristics
  'v2elsnmore', // Subnational election area more free and fair name
  'v2elsnmrfc', // Subnational election area more free and fair characteristics

  // Political Parties & Competition
  'v2psbantar', // Party ban target

  // Executive Power - Head of State
  'v2exrmhsol', // HOS removal by other in practice
  'v2exrmhsnl', // HOS other body remove HOS in practice
  'v2exctlhs',  // HOS control over
  'v2exctlhos', // HOS other body controls

  // Executive Power - Head of Government
  'v2exrmhgnp', // HOG removal by other in practice
  'v2exrmhgop', // HOG other body remove HOG in practice
  'v2exctlhg',  // HOG control over
  'v2exctlhog', // HOG other body controls

  // Civil Liberties & Rights
  'v2clrgstch', // Stronger civil liberties characteristics
  'v2clrgwkch', // Weaker civil liberties characteristics

  // Civil Society & Media
  'v2csstruc',   // CSO structure
  'v2csanmvch',  // CSO anti-system movement character
  'v2smhargr',   // Online harassment groups
  'v2smhargrtxt',// Other online harassment groups
  'v2smorgtypes',    // Types of organization through social media
  'v2smorgtypestxt', // Other types of organization through social media
  'v2smorgavgact',   // Average people's use of social media to organize offline action
]);
