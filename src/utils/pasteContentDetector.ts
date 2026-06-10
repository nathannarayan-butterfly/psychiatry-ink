/**
 * Auto-detects the clinical content category of pasted text.
 *
 * Primary signal: if a documentTypeId is provided (user is on a known page),
 * that context always wins and no heuristic detection is needed.
 *
 * Secondary signal: keyword and pattern heuristics for blank-page detection.
 *
 * Priority: Aufnahme headings > Verlauf timestamps
 *           > Labor (structured table-like) > Medikation
 */

export type ContentCategory =
  | 'aufnahme'
  | 'verlauf'
  | 'labor'
  | 'medikation'
  | 'note'

export interface DetectionResult {
  category: ContentCategory
  /** 0–1 confidence score; 1 = certain (from page context), < 0.5 = low-confidence heuristic */
  confidence: number
  /** True when the page context provided a definitive answer without heuristics */
  fromPageContext: boolean
}

// ---------------------------------------------------------------------------
// Page-context mapping
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_TO_CATEGORY: Record<string, ContentCategory> = {
  aufnahme: 'aufnahme',
  verlauf: 'verlauf',
  'therapie-verlauf': 'verlauf',
  labor: 'labor',
  medikation: 'medikation',
  therapieplanung: 'note',
  psychopath: 'note',
}

export function categoryFromDocumentType(documentTypeId: string): ContentCategory | null {
  return DOCUMENT_TYPE_TO_CATEGORY[documentTypeId] ?? null
}

// ---------------------------------------------------------------------------
// Heuristic rules
// ---------------------------------------------------------------------------

interface Rule {
  category: ContentCategory
  score: number
  /**
   * When true, this rule firing overrides Labor and Medikation in the final
   * winner selection — regardless of accumulated scores in those categories.
   */
  isDecisive?: boolean
  test: (text: string, lower: string) => boolean
}

const MEDICATION_NAMES = [
  'lithium',
  'sertralin',
  'escitalopram',
  'citalopram',
  'fluoxetin',
  'paroxetin',
  'venlafaxin',
  'duloxetin',
  'mirtazapin',
  'amitriptylin',
  'olanzapin',
  'quetiapin',
  'risperidon',
  'aripiprazol',
  'clozapin',
  'haloperidol',
  'amisulprid',
  'ziprasidon',
  'paliperidon',
  'valproat',
  'valproinsäure',
  'lamotrigin',
  'carbamazepin',
  'oxcarbazepin',
  'lorazepam',
  'diazepam',
  'clonazepam',
  'alprazolam',
  'zopiclon',
  'zolpidem',
  'bupropion',
  'clomipramin',
  'imipramin',
  'trazodon',
  'buspiron',
  'methylphenidat',
  'atomoxetin',
  'lisdexamfetamin',
  'naltrexon',
  'acamprosat',
  'disulfiram',
]

const LAB_NAMES = [
  'natrium',
  'kalium',
  'kreatinin',
  'harnstoff',
  'hämoglobin',
  'leukozyten',
  'thrombozyten',
  'erythrozyten',
  'tsh',
  't3',
  't4',
  'crp',
  'bsg',
  'ast',
  'alt',
  'ggt',
  'ap',
  'bilirubin',
  'albumin',
  'glukose',
  'hba1c',
  'cholesterin',
  'triglyzeride',
  'ferritin',
  'eisen',
  'transferrin',
  'vitamin',
  'folsäure',
  'lithiumspiegel',
  'lithium-spiegel',
  'valproatspiegel',
  'clozapinspiegel',
]

const RULES: Rule[] = [
  // ---- Medikation ----
  {
    category: 'medikation',
    score: 0.9,
    test: (_t, lower) =>
      /medikament\s*:|medikation\s*:|pharmakotherapie\s*:|aktuelle\s+medikation|medikamentenplan/i.test(
        lower,
      ),
  },
  {
    category: 'medikation',
    score: 0.75,
    test: (_t, lower) =>
      // dosing patterns: "1-0-0", "0-1-0", "2x täglich", "mg/d", "mg pro Tag"
      /\b\d-\d-\d(-\d)?\b/.test(lower) ||
      /\b\d+\s*(mg|µg)\s*(\/d|\/tag|pro\s*tag|retard)\b/i.test(lower) ||
      /\b\d+\s*x\s*(täglich|tgl|pro\s*tag|daily)\b/i.test(lower),
  },
  {
    // Drug names appearing in narrative text are a weak signal: a patient history
    // routinely lists medications without this being a Medikation document.
    category: 'medikation',
    score: 0.3,
    test: (_t, lower) => {
      const hitCount = MEDICATION_NAMES.filter((name) => lower.includes(name)).length
      return hitCount >= 2
    },
  },

  // ---- Labor ----
  {
    // Restrict to unambiguous lab-report headings. Generic "Befund:" is intentionally
    // excluded — it appears in Anamnese/Aufnahme documents (e.g. "Körperlicher Befund:",
    // "Psychopathologischer Befund:") and would cause false positives.
    category: 'labor',
    score: 0.9,
    test: (_t, lower) =>
      /labor\s*:|laborwerte\s*:|blutbild\s*:|blutlabor\s*:|laborbefund\s*:|laborergebnis/i.test(
        lower,
      ),
  },
  {
    // Require at least two distinct parameter–value–unit patterns to distinguish
    // structured lab tables from narrative text that mentions a single value.
    category: 'labor',
    score: 0.8,
    test: (_t, lower) => {
      const matches =
        lower.match(
          /\b\d+[.,]\d*\s*(mg\/l|mmol\/l|µg\/ml|ng\/ml|g\/dl|meq\/l|µmol\/l|iu\/l|u\/l|pg\/ml|pmol\/l|nmol\/l)\b/gi,
        ) ?? []
      return matches.length >= 2
    },
  },
  {
    category: 'labor',
    score: 0.6,
    test: (_t, lower) => {
      const hitCount = LAB_NAMES.filter((name) => lower.includes(name)).length
      return hitCount >= 2
    },
  },

  // ---- Verlauf ----
  {
    category: 'verlauf',
    score: 0.9,
    test: (_t, lower) =>
      /verlauf\s*:|verlaufseintrag\s*:|tagesdokumentation\s*:|verlaufsdokumentation\s*:/i.test(
        lower,
      ),
  },
  {
    category: 'verlauf',
    score: 0.75,
    test: (_t, lower) =>
      // starts with a date in the first 30 chars
      /^\s*\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/.test(lower) &&
      lower.length > 80,
  },
  {
    category: 'verlauf',
    score: 0.6,
    test: (_t, lower) =>
      // multiple date-like timestamps scattered through the text
      (lower.match(/\b\d{1,2}\.\d{1,2}\.(\d{2,4})\b/g) ?? []).length >= 3,
  },

  // ---- Aufnahme / Aufnahmebefund ----
  // These heading rules are marked decisive: if any fires, the result is Aufnahme
  // regardless of Labor/Medikation scores (see override logic below).
  {
    category: 'aufnahme',
    score: 0.9,
    isDecisive: true,
    test: (_t, lower) =>
      /\b(eigen|familien|sozial|biographische|vegetative|psychiatrische)\s*anamnese\s*[:\-]/i.test(
        lower,
      ) ||
      /\banamnese\s*[:\-]/i.test(lower),
  },
  {
    category: 'aufnahme',
    score: 0.9,
    isDecisive: true,
    test: (_t, lower) =>
      /aufnahmeanlass\s*:|aufnahmegrund\s*:|einweisungsgrund\s*:|aktuelle\s+beschwerden\s*:|aufnahmeuntersuchung\s*:|vorgeschichte\s*:/i.test(
        lower,
      ) ||
      /vorstellung\s+von\s+(herrn|frau|dem\s+patienten|der\s+patientin)/i.test(lower),
  },
  {
    category: 'aufnahme',
    score: 0.65,
    test: (_t, lower) =>
      /patient(in)?\s+(berichtet|klagt|gibt\s+an|schildert|stellt\s+sich)/i.test(lower),
  },
]

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

/**
 * Detects the clinical content category of pasted text.
 *
 * @param text - The pasted text to analyze.
 * @param documentTypeId - The current page's document type (empty string on the home/blank page).
 *   When set, the page context takes precedence and no heuristics are run.
 */
export function detectContentType(
  text: string,
  documentTypeId?: string,
): DetectionResult {
  // Primary signal: page context
  if (documentTypeId) {
    const cat = categoryFromDocumentType(documentTypeId)
    if (cat) {
      return { category: cat, confidence: 1, fromPageContext: true }
    }
  }

  // Secondary signal: heuristics on the text
  const lower = text.toLowerCase()
  const scores: Partial<Record<ContentCategory, number>> = {}
  let decisiveAufnahmeFired = false

  for (const rule of RULES) {
    if (rule.test(text, lower)) {
      const current = scores[rule.category] ?? 0
      // Accumulate but cap at 0.95
      scores[rule.category] = Math.min(0.95, current + rule.score * (1 - current))
      if (rule.isDecisive && rule.category === 'aufnahme') {
        decisiveAufnahmeFired = true
      }
    }
  }

  // Find the highest-scoring category
  let best: ContentCategory = 'note'
  let bestScore = 0
  for (const [cat, score] of Object.entries(scores) as [ContentCategory, number][]) {
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }

  // Override: an Aufnahme section heading always beats Labor and Medikation.
  // Medication names and lab values commonly appear inside Aufnahme text
  // (e.g. "Lithium 400 mg/d" in a medication history paragraph) and must not
  // re-route an otherwise-clear intake document.
  if (decisiveAufnahmeFired && (best === 'labor' || best === 'medikation')) {
    best = 'aufnahme'
    bestScore = scores['aufnahme'] ?? 0.85
  }

  // If no signal is strong enough, fall back to 'aufnahme' for long medical text
  // and 'note' for short / unrecognised snippets.
  if (bestScore < 0.45) {
    best = text.trim().length > 200 ? 'aufnahme' : 'note'
    bestScore = 0.3
  }

  return { category: best, confidence: bestScore, fromPageContext: false }
}
