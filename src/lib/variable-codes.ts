// Variable name to code mappings for the V-Dem API
// 1) Start with the existing curated base mapping (kept for stability)
import { IMF_WEO_CODE_TO_DESC, IMF_NEA_CODE_TO_DESC } from './imf-codes';
import { VDEM_VARIABLES } from './variables';
const BASE_MAPPING: Record<string, string> = {
  // V-Dem High-Level Democracy Indices
  "Electoral democracy index": "v2x_polyarchy",
  "Liberal democracy index": "v2x_libdem",
  "Participatory democracy index": "v2x_partipdem",
  "Deliberative democracy index": "v2x_delibdem",
  "Egalitarian democracy index": "v2x_egaldem",

  // V-Dem Mid-Level Indices: Components of the Democracy Indices
  "Additive polyarchy index": "v2x_api",
  "Multiplicative polyarchy index": "v2x_mpi",
  "Freedom of Expression and Alternative Sources of Information index": "v2x_freexp_altinf",
  "Freedom of association thick index": "v2x_frassoc_thick",
  "Share of population with suffrage": "v2x_suffr",
  "Clean elections index": "v2xel_frefair",
  "Elected officials index": "v2x_elecoff",
  "Liberal component index": "v2x_liberal",
  "Equality before the law and individual liberty index": "v2xcl_rol",
  "Judicial constraints on the executive index": "v2x_jucon",
  "Legislative constraints on the executive index": "v2xlg_legcon",
  "Participatory component index": "v2x_partip",
  "Civil society participation index": "v2x_cspart",
  "Direct popular vote index": "v2xdd_dd",
  "Local government index": "v2xel_locelec",
  "Regional government index": "v2xel_regelec",
  "Deliberative component index": "v2xdl_delib",
  "Egalitarian component index": "v2x_egal",
  "Equal protection index": "v2xeg_eqprotec",
  "Equal access index": "v2xeg_eqaccess",
  "Equal distribution of resources index": "v2xeg_eqdr",

  // Elections - General
  "Election type": "v2eltype_1",

  // Elections - Suffrage
  "Suffrage": "v2asuffrage",
  "Minimum voting age": "v2elage",
  "Compulsory voting": "v2elcomvot",
  "Female suffrage restricted": "v2elfemrst",
  "Suffrage level": "v2elgvsuflvl",
  "Percentage of population with suffrage": "v2elsuffrage",
  "Fraud allegations by Western monitors": "v2elwestmon",
  "Female suffrage": "v2fsuffrage",
  "Male suffrage": "v2msuffrage",

  // Elections - Election Qualities
  "Disclosure of campaign donations": "v2eldonate",
  "Public campaign finance": "v2elpubfin",
  "EMB autonomy": "v2elembaut",
  "EMB capacity": "v2elembcap",
  "Elections multiparty": "v2elmulpar",
  "Election voter registry": "v2elrgstry",
  "Election vote buying": "v2elvotbuy",
  "Election other voting irregularities": "v2elirreg",
  "Election government intimidation": "v2elintim",
  "Election other electoral violence": "v2elpeace",
  "Election boycotts": "v2elboycot",
  "Election free campaign media": "v2elfrcamp",
  "Election paid campaign advertisements": "v2elpdcamp",
  "Election paid interest group media": "v2elpaidig",
  "Election free and fair": "v2elfrfair",
  "Election domestic election monitors": "v2eldommon",
  "Election international monitors": "v2elintmon",
  "Election international monitors denied": "v2elmonden",
  "Monitors refuse to be present": "v2elmonref",
  "Candidate restriction by ethnicity, race, religion, or language": "v2elrstrct",

  // Elections - Election Outcomes
  "Election losers accept results": "v2elaccept",
  "Election assume office": "v2elasmoff",
  "Election turnout": "v2eltrnout",
  "Election VAP turnout": "v2elvaptrn",
  "Name of largest party": "v2lpname",
  "Name of second largest party": "v2slpname",
  "Name of third largest party": "v2tlpname",

  // Elections - Executive Elections Specifics
  "Presidential elections consecutive": "v2elprescons",
  "Presidential elections cumulative": "v2elprescumul",
  "HOG restriction by ethnicity, race, religion, or language": "v2elrsthog",
  "HOS restriction by ethnicity, race, religion, or language": "v2elrsthos",
  "Election HOG turnover ordinal": "v2elturnhog",
  "Election HOS turnover ordinal": "v2elturnhos",
  "Election executive turnover ordinal": "v2eltvrexo",
  "Presidential election vote share of largest vote-getter": "v2elvotlrg",
  "Presidential election vote share of second-largest vote-getter": "v2elvotsml",

  // Elections - Lower Chamber Specifics
  "Lower chamber 'base' tier electoral districts": "v2ellobadis",
  "Lower chamber 'base' or 'nominal' tier seats": "v2ellobaseat",
  "Lower chamber election consecutive": "v2ellocons",
  "Lower chamber election cumulative": "v2ellocumul",
  "Lower chamber election district effective magnitude": "v2ellodiseff",
  "Lower chamber election district magnitude": "v2elloeldm",
  "Lower chamber electoral system — 13 categories": "v2elloelsy",
  "Lower chamber hybrid system reserved seats": "v2elloreseat",
  "Lower chamber election seats": "v2elloseat",
  "Lower chamber election seats won by largest party": "v2ellostlg",
  "Lower chamber election seat share won by largest party": "v2ellostsl",
  "Lower chamber election seats won by second largest party": "v2ellostsm",
  "Lower chamber election seat share won by second largest party": "v2ellostss",
  "Lower chamber election seats won by third largest party": "v2ellosttm",
  "Lower chamber election seat share won by third largest party": "v2ellostts",
  "Lower chamber 'upper' tier electoral districts ": "v2elloupdis",
  "Lower chamber election vote share of largest vote-getter": "v2ellovtlg",
  "Lower chamber election vote share of second-largest vote-getter": "v2ellovtsm",
  "Lower chamber election vote share of third-largest vote-getter": "v2ellovttm",
  "Lower chamber electoral system": "v2elparlel",
  "Lower chamber election statutory threshold": "v2elthresh",
  "Lower chamber election turnover": "v2eltvrig",

  // Elections - Subnational
  "Regional government exists (A,C)": "v2elreggov",
  "Regional government name (A,C)": "v2elregnam",
  "Regional government elected (A,C)": "v2elsrgel",
  "Regional offices relative power": "v2elrgpwr",
  "Local government exists (A,C)": "v2ellocgov",
  "Local government name (A,C)": "v2ellocnam",
  "Local government elected (A,C)": "v2ellocelc",
  "Local offices relative power": "v2ellocpwr",
  "Subnational elections free and fair": "v2elffelr",
  "Subnational elections held": "v2elffelrbin",
  "Subnational election unevenness": "v2elsnlsff",
  "Subnational election area less free and fair name": "v2elsnless",
  "Subnational election area less free and fair characteristics": "v2elsnlfc",
  "Subnational election area more free and fair name": "v2elsnmore",
  "Subnational election area more free and fair characteristics": "v2elsnmrfc",

  // Political Parties - General
  "Barriers to parties": "v2psbars",
  "Party ban": "v2psparban",
  "Party ban target": "v2psbantar",
  "Opposition parties autonomy": "v2psoppaut",
  "Party organizations": "v2psorgs",
  "Party branches": "v2psprbrch",
  "Party linkages": "v2psprlnks",
  "Distinct party platforms": "v2psplats",
  "Candidate selection-national/local": "v2pscnslnl",
  "Legislative party cohesion": "v2pscohesv",
  "Party competition across regions": "v2pscomprg",
  "National party control": "v2psnatpar",
  "Subnational party control": "v2pssunpar",

  // Direct Democracy - Initiatives
  "Initiatives permitted": "v2ddlexci",
  "Initiatives signatures": "v2ddsignci",
  "Initiatives signatures %": "v2ddsigpci",
  "Initiatives signature-gathering period": "v2ddsigdci",
  "Initiatives signature-gathering time limit": "v2ddsiglci",
  "Initiatives participation threshold": "v2ddpartci",
  "Initiatives approval threshold": "v2ddapprci",
  "Initiatives administrative threshold": "v2ddadmci",
  "Initiatives super majority": "v2ddspmci",
  "Popular initiative credible threat": "v2ddthreci",

  // Direct Democracy - Referendums
  "Referendums permitted": "v2ddlexrf",
  "Referendums signatures": "v2ddsignrf",
  "Referendums signatures %": "v2ddsigprf",
  "Referendums signature-gathering period": "v2ddsigdrf",
  "Referendums signature-gathering limit": "v2ddsiglrf",
  "Referendums participation threshold": "v2ddpartrf",
  "Referendums approval threshold": "v2ddapprrf",
  "Referendums administrative threshold": "v2ddadmrf",
  "Referendums super majority": "v2ddspmrf",
  "Popular referendum credible threat": "v2ddthrerf",

  // Direct Democracy - Obligatory referendums
  "Enforcement of Constitutional changes through popular vote": "v2ddlexor",
  "Obligatory referendum participation threshold": "v2ddpartor",
  "Obligatory referendum approval threshold": "v2ddappor",
  "Obligatory referendum administrative threshold": "v2ddadmor",
  "Obligatory referendum super majority": "v2ddspmor",
  "Obligatory referendum credible threat": "v2ddthreor",

  // Direct Democracy - Plebiscites
  "Plebiscites permitted": "v2ddlexpl",
  "Plebiscites participation threshold": "v2ddpartpl",
  "Plebiscites approval threshold": "v2ddapprpl",
  "Plebiscites administrative threshold": "v2ddadmpl",
  "Plebiscites super majority": "v2ddspmpl",
  "Plebiscites credible threat": "v2ddthrepl",

  // Direct Democracy - Occurrences
  "Occurrence of citizen-initiatives this year": "v2ddyrci",
  "Occurrence of referendum this year": "v2ddyrrf",
  "Occurrence of obligatory referendum this year": "v2ddyror",
  "Occurrence of plebiscite this year": "v2ddyrpl",
  "Number of popular votes this year": "v2ddyrall",
  "Occurrence of any type of popular vote this year credible": "v2ddcredal",

  // The Executive - General
  "Executive respects constitution": "v2exrescon",
  "Executive bribery and corrupt exchanges": "v2exbribe",
  "Executive embezzlement and theft": "v2exembez",
  "Public sector corrupt exchanges": "v2excrptps",
  "Public sector theft": "v2exthftps",
  "Chief executive appointment by upper chamber": "v2exapup",
  "Chief executive appointment by upper chamber implicit approval": "v2exapupap",

  // The Executive - Head of State
  "HOS name": "v2exnamhos",
  "HOS title": "v2extithos",
  "HOS removal by legislature in practice": "v2exremhsp",
  "HOS removal by other in practice": "v2exrmhsol",
  "HOS other body remove HOS in practice": "v2exrmhsnl",
  "HOS control over": "v2exctlhs",
  "HOS other body controls": "v2exctlhos",
  "HOS dissolution in practice": "v2exdfdshs",
  "HOS appoints cabinet in practice": "v2exdfcbhs",
  "HOS veto power in practice": "v2exdfvths",
  "HOS dismisses ministers in practice": "v2exdfdmhs",
  "HOS proposes legislation in practice": "v2exdfpphs",
  "HOS = HOG": "v2exhoshog",
  "HOS age": "v2exagehos",
  "HOS selection by legislature in practice": "v2exaphos",
  "HOS directly elected": "v2ex_elechos",
  "HOS female": "v2exfemhos",
  "HOS term length by law": "v2exfxtmhs",
  "HOS appointment in practice": "v2expathhs",
  "HOS year of death": "v2exdeathos",
  "HOS party affiliation": "v2exparhos",

  // The Executive - Head of Government
  "HOG name": "v2exnamhog",
  "HOG title": "v2extithog",
  "HOG removal by legislature in practice": "v2exremhog",
  "HOG removal by other in practice": "v2exrmhgnp",
  "HOG other body remove HOG in practice": "v2exrmhgop",
  "HOG control over": "v2exctlhg",
  "HOG other body controls": "v2exctlhog",
  "HOG dissolution in practice": "v2exdjdshg",
  "HOG appoints cabinet in practice": "v2exdjcbhg",
  "HOG dismisses ministers in practice": "v2exdfdshg",
  "HOG veto power in practice": "v2exdfvthg",
  "HOG proposes legislation in practice": "v2exdfpphg",
  "HOG age": "v2exagehog",
  "HOG selection by legislature in practice": "v2exaphogp",
  "HOG directly elected": "v2ex_elechog",
  "HOG female": "v2exfemhog",
  "HOG term length by law": "v2exfxtmhg",
  "Relative power of the HOG": "v2ex_hogw",
  "HOG appointed by HOS": "v2ex_hosconhog",
  "HOG appointment in practice": "v2expathhg",
  "HOG year of death": "v2exdeathog",
  "HOG party affiliation": "v2expothog",

  // Regime - General
  "Regime information": "v2reginfo",
  "Regime end type": "v2regendtype",
  "Regime end type, multiple selection version": "v2regendtypems",
  "Regime interregnum": "v2regint",
  "Regime ID": "v2regidnr",
  "Regime duration": "v2regdur",
  "Regime support groups": "v2regsupgroups",
  "Regime most important support group": "v2regimpgroup",
  "Regime support groups size": "v2regsupgroupssize",
  "Regime support location": "v2regsuploc",
  "Regime opposition groups": "v2regoppgroups",
  "Explicit and active regime opposition groups": "v2regoppgroupsact",
  "Regime most important opposition group": "v2regimpoppgroup",
  "Regime opposition groups size": "v2regoppgroupssize",
  "Regime opposition location": "v2regopploc",
  "Strongest pro-regime preferences": "v2regproreg",
  "Strongest anti-regime preferences": "v2regantireg",
  "Most powerful group in affecting regime duration and change": "v2regpower",

  // Access to justice for men
  "Access to justice for men": "v2clacjstm",
  // Access to state jobs by urban-rural location
  "Access to state jobs by urban-rural location": "v2peasjgeo"
};

// 2) Augment with translations.json (authoritative list from the user)
// Note: translations.json contains duplicate top-level keys (e.g., "Elections").
// Import the raw file content and regex-extract all leaf "label": "code" pairs to avoid losing earlier sections.
// Vite provides ?raw imports that return the file as a string.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite's ?raw is supported at build time
import translationsRaw from '../translations.json?raw';

function buildMapFromTranslationsRaw(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  const pairRe = /"([^"]+)"\s*:\s*"([A-Za-z0-9_]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(raw)) !== null) {
    const label = m[1];
    const code = m[2];
    // Only keep plausible codes (v2*, v3*, e_*)
    if (/^(v\d|e_)/i.test(code)) {
      map[label] = code;
    }
  }
  return map;
}

const TRANSLATION_NAME_TO_CODE = buildMapFromTranslationsRaw(String(translationsRaw || ''));

// 3) Manual overrides for items the user flagged as having potentially false codes.
// These take precedence and are easy to edit by hand.
const MANUAL_OVERRIDES: Record<string, string> = {
  // Elections & Voting -> Subnational (user flagged: "false code?")
  // FIXME: verify these codes in the backend; some may be non-numeric or use different fields.
  "Subnational election area less free and fair name": "v2elsnless",
  "Subnational election area less free and fair characteristics": "v2elsnlfc",
  "Subnational election area more free and fair name": "v2elsnmore",
  "Subnational election area more free and fair characteristics": "v2elsnmrfc",

  // Political Parties & Competition -> General
  // FIXME: verify mapping for target classification
  "Party ban target": "v2psbantar",

  // Executive Power -> Head of State (user flagged: verify these four)
  // FIXME: double-check HOS/HOG "other" vs "other body" variants
  "HOS removal by other in practice": "v2exrmhsol",
  "HOS other body remove HOS in practice": "v2exrmhsnl",
  "HOS control over": "v2exctlhs",
  "HOS other body controls": "v2exctlhos",

  // Executive Power -> Head of Government (user flagged: verify these four)
  "HOG removal by other in practice": "v2exrmhgnp",
  "HOG other body remove HOG in practice": "v2exrmhgop",
  "HOG control over": "v2exctlhg",
  "HOG other body controls": "v2exctlhog"
};

// Final name->code map: base, then translations, then manual overrides.
export const VARIABLE_NAME_TO_CODE: Record<string, string> = {
  ...BASE_MAPPING,
  ...TRANSLATION_NAME_TO_CODE,
  ...MANUAL_OVERRIDES
};

// Reverse mapping: code to name (built after merges)
export const VARIABLE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(VARIABLE_NAME_TO_CODE).map(([name, code]) => [code, name])
);

export function getVariableCode(variableName: string): string | undefined {
  // 1) If a normalized name is passed
  const byName = VARIABLE_NAME_TO_CODE[variableName];
  if (byName) return byName;

  // 2) If a code is passed and we know it
  if (VARIABLE_CODE_TO_NAME[variableName]) return variableName;

  // 3) Heuristic: treat v*-style and e_*-style as codes
  if (/^(v\d|e_)/i.test(variableName)) return variableName;

  return undefined;
}

// Function to get variable name from code
export function getVariableName(code: string): string | undefined {
  if (VARIABLE_CODE_TO_NAME[code]) return VARIABLE_CODE_TO_NAME[code];
  if (VARIABLE_NAME_TO_CODE[code]) return code;
  if (IMF_WEO_CODE_TO_DESC[code]) return IMF_WEO_CODE_TO_DESC[code];
  if (IMF_NEA_CODE_TO_DESC[code]) return IMF_NEA_CODE_TO_DESC[code];
  return undefined;
}

// Utility function to get display name for any variable (V-Dem or IMF)
export function getVariableDisplayName(code: string): string {
  // First try V-Dem variables
  const vdemVar = VDEM_VARIABLES.find(v => v.id === code);
  if (vdemVar) return vdemVar.label;

  // Then try IMF mappings
  if (IMF_WEO_CODE_TO_DESC[code]) return IMF_WEO_CODE_TO_DESC[code];
  if (IMF_NEA_CODE_TO_DESC[code]) return IMF_NEA_CODE_TO_DESC[code];

  // Finally try the variable name mapping
  const name = getVariableName(code);
  if (name) return name;

  // Fallback to the code itself
  return code;
}