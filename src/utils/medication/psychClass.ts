/**
 * Default psychopharmacology classification: localized class labels + a
 * substance → class lookup used to DERIVE a sensible default class for new or
 * blank KB medication profiles (so they no longer fall back to "Auto"/empty).
 *
 * Taxonomy rationale: the app is German-first, so the primary classification
 * follows the traditional German clinical psychopharmaka class system at a
 * clinically useful granularity (antidepressant subclasses SSRI/SNRI/TZA/MAOI/
 * NaSSA, typical/atypical antipsychotics, mood stabilizer vs anticonvulsant,
 * benzodiazepine vs other anxiolytic, hypnotic, psychostimulant, antidementia,
 * addiction). The modern Neuroscience-based Nomenclature (NbN) and the WHO ATC
 * code are kept as COMPLEMENTARY fields (`nbn`, `atcCode`), not as the default.
 */

import {
  normalizePsychClass,
  type PsychopharmacaClass,
} from '../../types/knowledgeBase'
import type { UiLanguage } from '../../types/settings'

type LocaleMap = Record<UiLanguage, string>

/** Localized labels (DE primary) for every {@link PsychopharmacaClass}. */
export const PSYCH_CLASS_LABELS: Record<PsychopharmacaClass, LocaleMap> = {
  antipsychotic_typical: {
    de: 'Typisches Antipsychotikum (FGA)',
    en: 'Typical antipsychotic (FGA)',
    fr: 'Antipsychotique typique (APG)',
    es: 'Antipsicótico típico (APG)',
  },
  antipsychotic_atypical: {
    de: 'Atypisches Antipsychotikum (SGA)',
    en: 'Atypical antipsychotic (SGA)',
    fr: 'Antipsychotique atypique (ASG)',
    es: 'Antipsicótico atípico (ASG)',
  },
  antidepressant_ssri: {
    de: 'Antidepressivum – SSRI',
    en: 'Antidepressant – SSRI',
    fr: 'Antidépresseur – ISRS',
    es: 'Antidepresivo – ISRS',
  },
  antidepressant_snri: {
    de: 'Antidepressivum – SNRI',
    en: 'Antidepressant – SNRI',
    fr: 'Antidépresseur – IRSN',
    es: 'Antidepresivo – IRSN',
  },
  antidepressant_tricyclic: {
    de: 'Trizyklisches Antidepressivum (TZA)',
    en: 'Tricyclic antidepressant (TCA)',
    fr: 'Antidépresseur tricyclique (ATC)',
    es: 'Antidepresivo tricíclico (ATC)',
  },
  antidepressant_maoi: {
    de: 'Antidepressivum – MAO-Hemmer',
    en: 'Antidepressant – MAOI',
    fr: 'Antidépresseur – IMAO',
    es: 'Antidepresivo – IMAO',
  },
  antidepressant_nassa: {
    de: 'Antidepressivum – NaSSA / tetrazyklisch',
    en: 'Antidepressant – NaSSA / tetracyclic',
    fr: 'Antidépresseur – NaSSA / tétracyclique',
    es: 'Antidepresivo – NaSSA / tetracíclico',
  },
  antidepressant_other: {
    de: 'Antidepressivum – sonstige',
    en: 'Antidepressant – other',
    fr: 'Antidépresseur – autre',
    es: 'Antidepresivo – otro',
  },
  mood_stabilizer: {
    de: 'Stimmungsstabilisierer (Lithium)',
    en: 'Mood stabilizer (lithium)',
    fr: 'Thymorégulateur (lithium)',
    es: 'Estabilizador del ánimo (litio)',
  },
  anticonvulsant: {
    de: 'Antiepileptikum / Phasenprophylaktikum',
    en: 'Anticonvulsant / mood prophylactic',
    fr: 'Anticonvulsivant / thymorégulateur',
    es: 'Anticonvulsivo / profiláctico del ánimo',
  },
  anxiolytic_benzodiazepine: {
    de: 'Benzodiazepin (Anxiolytikum)',
    en: 'Benzodiazepine (anxiolytic)',
    fr: 'Benzodiazépine (anxiolytique)',
    es: 'Benzodiazepina (ansiolítico)',
  },
  anxiolytic_other: {
    de: 'Anxiolytikum – sonstige',
    en: 'Anxiolytic – other',
    fr: 'Anxiolytique – autre',
    es: 'Ansiolítico – otro',
  },
  hypnotic: {
    de: 'Hypnotikum / Sedativum',
    en: 'Hypnotic / sedative',
    fr: 'Hypnotique / sédatif',
    es: 'Hipnótico / sedante',
  },
  psychostimulant: {
    de: 'Psychostimulans / ADHS-Medikation',
    en: 'Psychostimulant / ADHD medication',
    fr: 'Psychostimulant / médication TDAH',
    es: 'Psicoestimulante / medicación TDAH',
  },
  antidementia: {
    de: 'Antidementivum',
    en: 'Antidementia agent',
    fr: 'Antidémentiel',
    es: 'Antidemencia',
  },
  addiction: {
    de: 'Suchtmedizin / Substitution',
    en: 'Addiction medicine / substitution',
    fr: 'Addictologie / substitution',
    es: 'Medicina de adicciones / sustitución',
  },
  other: {
    de: 'Sonstiges Psychopharmakon',
    en: 'Other psychotropic',
    fr: 'Autre psychotrope',
    es: 'Otro psicofármaco',
  },
  unspecified: {
    de: 'Nicht klassifiziert',
    en: 'Unclassified',
    fr: 'Non classé',
    es: 'Sin clasificar',
  },
}

/** Resolve a class label in the active UI language (defaults to German). */
export function getPsychClassLabel(value: unknown, language: string): string {
  const lang: UiLanguage =
    language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
  return PSYCH_CLASS_LABELS[normalizePsychClass(value)][lang]
}

// ── Substance → class lookup ─────────────────────────────────────────────────
// Keys are normalized generic names (lowercase, no diacritics, no ® / salts).
// Not exhaustive — a pragmatic set of common psychopharmaka. Unknown substances
// fall back to category-based inference and finally 'unspecified'.

const SUBSTANCE_CLASS_LOOKUP: Record<string, PsychopharmacaClass> = {
  // ── Typical antipsychotics (FGA) ──
  haloperidol: 'antipsychotic_typical',
  benperidol: 'antipsychotic_typical',
  fluphenazin: 'antipsychotic_typical',
  flupentixol: 'antipsychotic_typical',
  zuclopenthixol: 'antipsychotic_typical',
  perphenazin: 'antipsychotic_typical',
  perazin: 'antipsychotic_typical',
  levomepromazin: 'antipsychotic_typical',
  chlorprothixen: 'antipsychotic_typical',
  chlorpromazin: 'antipsychotic_typical',
  pipamperon: 'antipsychotic_typical',
  melperon: 'antipsychotic_typical',
  prothipendyl: 'antipsychotic_typical',
  promazin: 'antipsychotic_typical',
  pimozid: 'antipsychotic_typical',
  // ── Atypical antipsychotics (SGA) ──
  risperidon: 'antipsychotic_atypical',
  paliperidon: 'antipsychotic_atypical',
  paliperidonpalmitat: 'antipsychotic_atypical',
  olanzapin: 'antipsychotic_atypical',
  quetiapin: 'antipsychotic_atypical',
  clozapin: 'antipsychotic_atypical',
  aripiprazol: 'antipsychotic_atypical',
  brexpiprazol: 'antipsychotic_atypical',
  cariprazin: 'antipsychotic_atypical',
  amisulprid: 'antipsychotic_atypical',
  sulpirid: 'antipsychotic_atypical',
  ziprasidon: 'antipsychotic_atypical',
  sertindol: 'antipsychotic_atypical',
  asenapin: 'antipsychotic_atypical',
  lurasidon: 'antipsychotic_atypical',
  // ── SSRI ──
  sertralin: 'antidepressant_ssri',
  citalopram: 'antidepressant_ssri',
  escitalopram: 'antidepressant_ssri',
  fluoxetin: 'antidepressant_ssri',
  paroxetin: 'antidepressant_ssri',
  fluvoxamin: 'antidepressant_ssri',
  // ── SNRI / SSNRI ──
  venlafaxin: 'antidepressant_snri',
  desvenlafaxin: 'antidepressant_snri',
  duloxetin: 'antidepressant_snri',
  milnacipran: 'antidepressant_snri',
  // ── Tricyclic / non-selective AD ──
  amitriptylin: 'antidepressant_tricyclic',
  clomipramin: 'antidepressant_tricyclic',
  imipramin: 'antidepressant_tricyclic',
  doxepin: 'antidepressant_tricyclic',
  trimipramin: 'antidepressant_tricyclic',
  nortriptylin: 'antidepressant_tricyclic',
  desipramin: 'antidepressant_tricyclic',
  // ── MAO inhibitors ──
  tranylcypromin: 'antidepressant_maoi',
  moclobemid: 'antidepressant_maoi',
  // ── NaSSA / tetracyclic ──
  mirtazapin: 'antidepressant_nassa',
  mianserin: 'antidepressant_nassa',
  maprotilin: 'antidepressant_nassa',
  // ── Other antidepressants ──
  bupropion: 'antidepressant_other',
  agomelatin: 'antidepressant_other',
  trazodon: 'antidepressant_other',
  vortioxetin: 'antidepressant_other',
  reboxetin: 'antidepressant_other',
  tianeptin: 'antidepressant_other',
  opipramol: 'antidepressant_other',
  johanniskraut: 'antidepressant_other',
  hypericum: 'antidepressant_other',
  // ── Mood stabilizer ──
  lithium: 'mood_stabilizer',
  // ── Anticonvulsant mood prophylactics ──
  valproat: 'anticonvulsant',
  valproinsaure: 'anticonvulsant',
  valproinsäure: 'anticonvulsant',
  lamotrigin: 'anticonvulsant',
  carbamazepin: 'anticonvulsant',
  oxcarbazepin: 'anticonvulsant',
  topiramat: 'anticonvulsant',
  // ── Benzodiazepines ──
  diazepam: 'anxiolytic_benzodiazepine',
  lorazepam: 'anxiolytic_benzodiazepine',
  alprazolam: 'anxiolytic_benzodiazepine',
  oxazepam: 'anxiolytic_benzodiazepine',
  clonazepam: 'anxiolytic_benzodiazepine',
  bromazepam: 'anxiolytic_benzodiazepine',
  clobazam: 'anxiolytic_benzodiazepine',
  chlordiazepoxid: 'anxiolytic_benzodiazepine',
  midazolam: 'anxiolytic_benzodiazepine',
  // ── Other anxiolytics ──
  buspiron: 'anxiolytic_other',
  pregabalin: 'anxiolytic_other',
  gabapentin: 'anxiolytic_other',
  hydroxyzin: 'anxiolytic_other',
  // ── Hypnotics / sedatives ──
  zolpidem: 'hypnotic',
  zopiclon: 'hypnotic',
  zaleplon: 'hypnotic',
  melatonin: 'hypnotic',
  ramelteon: 'hypnotic',
  doxylamin: 'hypnotic',
  diphenhydramin: 'hypnotic',
  chloralhydrat: 'hypnotic',
  nitrazepam: 'hypnotic',
  flunitrazepam: 'hypnotic',
  lormetazepam: 'hypnotic',
  temazepam: 'hypnotic',
  triazolam: 'hypnotic',
  promethazin: 'hypnotic',
  estazolam: 'hypnotic',
  quazepam: 'hypnotic',
  meprobamate: 'hypnotic',
  dexmedetomidine: 'hypnotic',
  prazosin: 'anxiolytic_other',
  // ── Psychostimulants / ADHD ──
  methylphenidat: 'psychostimulant',
  dexamfetamin: 'psychostimulant',
  lisdexamfetamin: 'psychostimulant',
  amfetamin: 'psychostimulant',
  atomoxetin: 'psychostimulant',
  guanfacin: 'psychostimulant',
  modafinil: 'psychostimulant',
  viloxazine: 'psychostimulant',
  pitolisant: 'psychostimulant',
  solriamfetol: 'psychostimulant',
  // ── Antidementia ──
  donepezil: 'antidementia',
  rivastigmin: 'antidementia',
  galantamin: 'antidementia',
  memantin: 'antidementia',
  tacrine: 'antidementia',
  // ── Addiction / substitution ──
  methadon: 'addiction',
  levomethadon: 'addiction',
  buprenorphin: 'addiction',
  naltrexon: 'addiction',
  naloxon: 'addiction',
  nalmefen: 'addiction',
  acamprosat: 'addiction',
  disulfiram: 'addiction',
  clomethiazol: 'addiction',
  lofexidine: 'addiction',
  nicotine: 'addiction',
  baclofen: 'addiction',
  // ── Other / augmentation / biologics ──
  xanomeline: 'antipsychotic_atypical',
  bromperidol: 'antipsychotic_typical',
  fluspirilene: 'antipsychotic_typical',
  clotiapine: 'antipsychotic_typical',
  periciazine: 'antipsychotic_typical',
  trimeprazine: 'antipsychotic_typical',
  alimemazine: 'antipsychotic_typical',
  dibenzepin: 'antidepressant_tricyclic',
  melitracen: 'antidepressant_tricyclic',
  butriptyline: 'antidepressant_tricyclic',
  quinupramine: 'antidepressant_tricyclic',
  iprindole: 'antidepressant_other',
  'imipramine oxide': 'antidepressant_tricyclic',
  amantadine: 'other',
  cyproheptadine: 'other',
  liothyronine: 'antidepressant_other',
  aducanumab: 'other',
  lecanemab: 'other',
  donanemab: 'other',
}

/** Normalize a generic name for lookup: lowercase, strip diacritics/®/salts. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Map a coarse legacy `category` to a class when the name is unknown. */
function classFromCategory(category: string | undefined): PsychopharmacaClass | null {
  switch ((category ?? '').toLowerCase()) {
    case 'antipsychotika':
    case 'antipsychotics':
      return 'antipsychotic_atypical'
    case 'antidepressiva':
    case 'antidepressants':
      return 'antidepressant_other'
    case 'phasenprophylaktika':
    case 'mood stabilizers':
      return 'mood_stabilizer'
    case 'benzodiazepine':
      return 'anxiolytic_benzodiazepine'
    case 'hypnotika':
    case 'anxiolytics/hypnotics':
      return 'hypnotic'
    case 'adhs':
      return 'psychostimulant'
    case 'antidemenz':
    case 'anti-dementia':
      return 'antidementia'
    case 'suchtmedizin':
    case 'addiction':
      return 'addiction'
    case 'eps management':
      return 'other'
    case 'additional':
      return 'other'
    default:
      return null
  }
}

/**
 * Derive a sensible default {@link PsychopharmacaClass} for a substance.
 * Resolution order: exact substance lookup → token match within the generic
 * name (handles "Risperidon-Depot", salts) → coarse legacy `category` → free
 * text drugClass keyword → 'unspecified'.
 */
export function derivePsychClass(
  genericName: string,
  category?: string,
  drugClassText?: string,
): PsychopharmacaClass {
  const normalized = normalizeName(genericName)
  if (!normalized) return classFromCategory(category) ?? 'unspecified'

  const direct = SUBSTANCE_CLASS_LOOKUP[normalized]
  if (direct) return direct

  // First token (e.g. "risperidon depot" → "risperidon").
  const firstToken = normalized.split(' ')[0]
  if (SUBSTANCE_CLASS_LOOKUP[firstToken]) return SUBSTANCE_CLASS_LOOKUP[firstToken]

  // Substring match for compound / suffixed names (palmitat, decanoat, …).
  for (const key of Object.keys(SUBSTANCE_CLASS_LOOKUP)) {
    if (normalized.includes(key)) return SUBSTANCE_CLASS_LOOKUP[key]
  }

  const byCategory = classFromCategory(category)
  if (byCategory) return byCategory

  const dc = (drugClassText ?? '').toLowerCase()
  if (dc) {
    if (/ssri/.test(dc)) return 'antidepressant_ssri'
    if (/snri|ssnri/.test(dc)) return 'antidepressant_snri'
    if (/trizykl|tza|tricyclic/.test(dc)) return 'antidepressant_tricyclic'
    if (/mao/.test(dc)) return 'antidepressant_maoi'
    if (/nassa|tetrazykl/.test(dc)) return 'antidepressant_nassa'
    if (/antidepress/.test(dc)) return 'antidepressant_other'
    if (/atypisch|sga|partialagonist/.test(dc)) return 'antipsychotic_atypical'
    if (/typisch|fga|neurolept/.test(dc)) return 'antipsychotic_typical'
    if (/antipsychot/.test(dc)) return 'antipsychotic_atypical'
    if (/benzodiazepin/.test(dc)) return 'anxiolytic_benzodiazepine'
    if (/hypnot|sedativ/.test(dc)) return 'hypnotic'
    if (/lithium|stimmungsstab|phasenpro/.test(dc)) return 'mood_stabilizer'
    if (/antiepilept|antikonvuls/.test(dc)) return 'anticonvulsant'
    if (/stimulan|adhs/.test(dc)) return 'psychostimulant'
    if (/antidement/.test(dc)) return 'antidementia'
    if (/sucht|substitut/.test(dc)) return 'addiction'
  }

  return 'unspecified'
}
