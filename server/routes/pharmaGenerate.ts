import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { llmResultModel } from '../services/safeLlmEgress'
import { runAiFeature } from '../ai/runAiFeature'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import {
  PRESCRIBING_COUNTRY_CODES,
  type PrescribingCountryCode,
} from '../../src/types/knowledgeBase'

/**
 * Canonical drug-monograph section keys. Mirrors `DrugSectionKey` on the client
 * (minus the `custom` sentinel) so the AI fills exactly the fields the UI knows.
 */
const SECTION_KEYS = [
  'kurzprofil',
  'steckbrief',
  'wirkmechanismus',
  'rezeptorprofil',
  'pharmakokinetik',
  'indikationen',
  'dosierung',
  'nebenwirkungen',
  'kontraindikationen',
  'wechselwirkungen',
  'qtc',
  'kontrollen',
  'besonderheiten',
  'umstellung',
  'schwangerschaft',
  'niereLeber',
  'ueberdosierung',
  'absetzen',
  'merksaetze',
  'quellen',
] as const

type SectionKey = (typeof SECTION_KEYS)[number]

/**
 * Default psychopharmacology classification enum. MUST mirror
 * `PsychopharmacaClass` in `src/types/knowledgeBase.ts` so the AI returns a
 * value the client recognises.
 */
const PSYCH_CLASSES = [
  'antipsychotic_typical',
  'antipsychotic_atypical',
  'antidepressant_ssri',
  'antidepressant_snri',
  'antidepressant_tricyclic',
  'antidepressant_maoi',
  'antidepressant_nassa',
  'antidepressant_other',
  'mood_stabilizer',
  'anticonvulsant',
  'anxiolytic_benzodiazepine',
  'anxiolytic_other',
  'hypnotic',
  'psychostimulant',
  'antidementia',
  'addiction',
  'other',
  'unspecified',
] as const
type PsychClass = (typeof PSYCH_CLASSES)[number]

type SectionGuideLanguage = 'de' | 'en'

/**
 * Human-readable hints used to steer the model per section. Keyed by section
 * and UI language so the LLM produces the right sections and clinical
 * register in either German or English. Faithful clinical translations: the
 * EN variant must yield the same structure, headings and depth as the DE
 * baseline. Note that for non-DE/EN UI languages we fall back to English (the
 * model is then told to translate output via the language directive in the
 * prompt) — German remains the source of truth for the original wording.
 */
const SECTION_GUIDE: Record<SectionKey, Record<SectionGuideLanguage, string>> = {
  kurzprofil: {
    de: 'Kurzprofil/Overview: 1 kompakter Einordnungsabsatz plus 3–5 klinische Kernpunkte (Nutzenprofil, Hauptindikation, Differenzierung zu Alternativen, wichtigste Sicherheits-/Monitoring-Ampel).',
    en: 'Brief profile / overview: one compact framing paragraph plus 3–5 clinical key points (benefit profile, main indication, differentiation from alternatives, most important safety/monitoring traffic-light).',
  },
  steckbrief: {
    de: 'Steckbrief/At-a-glance: dichtes Snapshot-Format mit Klasse, primären Targets, Halbwertszeit/aktiven Metaboliten, Dosisrahmen, QTc-/metabolischem/EPS-/Sedierungsrisiko und Depotstatus, aber ohne lange Prosa.',
    en: 'At-a-glance summary: dense snapshot covering class, primary targets, half-life and active metabolites, dose range, QTc / metabolic / EPS / sedation risk and depot status — keep it tight, no long prose.',
  },
  wirkmechanismus: {
    de: 'Wirkmechanismus: 2–4 substantielle Absätze zum primären Mechanismus, relevanten Downstream-Effekten, Zeitverlauf der Wirkung und klinischer Übersetzung; nicht nur Wirkstoffklasse wiederholen.',
    en: 'Mechanism of action: 2–4 substantive paragraphs on the primary mechanism, relevant downstream effects, time course of action and clinical translation — do not simply restate the drug class.',
  },
  rezeptorprofil: {
    de: 'Rezeptorprofil: Interpretationsabsatz plus target-by-target Implikationen (Wirksamkeit, EPS/Prolaktin, Sedierung/Gewicht, Orthostase, anticholinerge Last, serotonerge/noradrenerge Effekte). Keine 1–5 Scores.',
    en: 'Receptor profile: an interpretive paragraph plus target-by-target clinical implications (efficacy, EPS/prolactin, sedation/weight, orthostasis, anticholinergic burden, serotonergic/noradrenergic effects). Do NOT use 1–5 scores.',
  },
  pharmakokinetik: {
    de: 'Pharmakokinetik: 2–5 Absätze/Bullet-Cluster zu Resorption, Tmax, Halbwertszeit, Steady State, aktiven Metaboliten, Proteinbindung, CYP/Transportern, TDM und klinischen Konsequenzen; präzise Zahlen zusätzlich im strukturierten "pk"-Block.',
    en: 'Pharmacokinetics: 2–5 paragraphs or bullet clusters covering absorption, Tmax, half-life, steady state, active metabolites, protein binding, CYP enzymes/transporters, therapeutic drug monitoring and clinical consequences; precise numbers go additionally into the structured "pk" block.',
  },
  indikationen: {
    de: 'Indikationen: zugelassene Indikationen, relevante Off-Label-Kontexte, Patientenselektion, Symptomdimensionen, Wirklatenz und Grenzen der Evidenz in klinisch brauchbaren Bullet-Clustern.',
    en: 'Indications: licensed indications, relevant off-label contexts, patient selection, symptom dimensions, latency to effect and limits of the evidence — in clinically useful bullet clusters.',
  },
  dosierung: {
    de: 'Dosierung: Startdosis, üblicher Ziel-/Erhaltungsbereich, Maximaldosis, Titrationstempo, Einnahmezeitpunkt, Formulierungen sowie ältere Patient:innen, somatische Komorbidität und Nieren-/Leberhinweise; Schema im strukturierten "titration"-Block.',
    en: 'Dosing: starting dose, usual target/maintenance range, maximum dose, titration speed, time of administration and formulations, plus considerations for older patients, somatic comorbidity and renal/hepatic adjustments; the schedule belongs in the structured "titration" block.',
  },
  nebenwirkungen: {
    de: 'Nebenwirkungen: häufige vs. schwerwiegende UAW, frühe vs. späte Risiken, Warnzeichen, Risikofaktoren, Prävention/Mitigation und Monitoring; strukturiert priorisiert im "sideEffects"-Block.',
    en: 'Adverse effects: common versus serious adverse drug reactions, early versus late risks, warning signs, risk factors, prevention/mitigation and monitoring; prioritised in structured form in the "sideEffects" block.',
  },
  kontraindikationen: {
    de: 'Kontraindikationen: absolute und relative Kontraindikationen mit klinischer Nuance, Risikokonstellationen, Vorsichtssituationen und praktischen Alternativ-/Monitoring-Hinweisen.',
    en: 'Contraindications: absolute and relative contraindications with clinical nuance, risk constellations, situations requiring caution and practical alternative or monitoring guidance.',
  },
  wechselwirkungen: {
    de: 'Wechselwirkungen & CYP450: CYP-Substrat/Inhibition/Induktion, relevante Wirkstoffklassen, QTc-/Sedierungs-/EPS-/Serotonin-/Blutungs-/Krampfschwellen-Additionen, Rauchen/Alkohol und Management; strukturiert im "cyp"-Block.',
    en: 'Drug interactions & CYP450: CYP substrate/inhibitor/inducer status, relevant drug classes, additive QTc, sedation, EPS, serotonergic, bleeding and seizure-threshold effects, smoking and alcohol and how to manage them; structured detail belongs in the "cyp" block.',
  },
  qtc: {
    de: 'QTc/EKG: Risikostufe, Dosis-/Spiegelbezug, typische EKG-Situationen (Baseline/Folgekontrollen), Elektrolyte, additive QTc-Arzneien, Schwellen für Vorsicht und Handlungsprinzipien.',
    en: 'QTc / ECG: risk level, dose- and level-relationship, typical ECG situations (baseline and follow-up monitoring), electrolytes, additive QTc-prolonging agents, thresholds requiring caution and management principles.',
  },
  kontrollen: {
    de: 'Kontrollen: Baseline- und Verlaufsmonitoring mit konkreten Intervallen soweit etabliert (Labor, Gewicht/BMI/Taille, Blutdruck/Puls, EKG, Spiegel, Bewegungsstörungen, Skalen, Adhärenz, Substanzkonsum).',
    en: 'Monitoring: baseline and follow-up monitoring with concrete intervals where established (laboratory tests, weight/BMI/waist circumference, blood pressure/pulse, ECG, drug levels, movement disorders, rating scales, adherence and substance use).',
  },
  besonderheiten: {
    de: 'Besonderheiten: praxisnahe klinische Fallstricke, Differenzialindikationen, Komorbiditäten, Formulierungsdetails, Adhärenz-/Depotfragen, Patientenedukation und Entscheidungsperlen.',
    en: 'Special considerations: practical clinical pitfalls, differential indications, comorbidities, formulation details, adherence and depot questions, patient education and decision pearls.',
  },
  umstellung: {
    de: 'Umstellung & Depot: praktische Switch-Prinzipien, Cross-Taper, Washout-/Überlappungslogik, Depot/LAI-Optionen, Loading/Oral-Overlap, Äquivalenz-Unsicherheit und typische Fehler; Depot-Details im strukturierten "depotOptions"-Block.',
    en: 'Switching & depot: practical switching principles, cross-tapering, washout and overlap logic, depot/LAI options, loading and oral-overlap, equivalence uncertainty and common mistakes; depot detail belongs in the structured "depotOptions" block.',
  },
  schwangerschaft: {
    de: 'Schwangerschaft/Stillzeit: Nutzen-Risiko-Abwägung, Trimester-/peripartale Aspekte, neonatale Anpassungssymptome, Stillen, Monitoring und wann Spezialberatung/Fachinformation nötig ist.',
    en: 'Pregnancy & breastfeeding: benefit–risk balance, trimester-specific and peripartum aspects, neonatal adaptation symptoms, breastfeeding, monitoring and when to seek specialist input or consult the SmPC.',
  },
  niereLeber: {
    de: 'Niere/Leber: Elimination, Dosisanpassung/Vorsicht nach Schweregrad, Dialyse-/Zirrhose-Aspekte sofern bekannt, relevante Monitoringparameter und qualitative Empfehlung, wenn Zahlen unsicher sind.',
    en: 'Renal & hepatic impairment: route of elimination, dose adjustment or caution by severity, dialysis and cirrhosis considerations where known, relevant monitoring parameters and qualitative guidance when precise figures are uncertain.',
  },
  ueberdosierung: {
    de: 'Überdosierung/Toxizität: Leitsymptome, zeitlicher Verlauf, gefährliche Komplikationen, Basismaßnahmen, Monitoring (EKG/Vitalparameter/Labor), Antidot/Supportivtherapie und Intoxikationsfallen.',
    en: 'Overdose & toxicity: cardinal symptoms, time course, dangerous complications, basic management, monitoring (ECG/vital signs/laboratory), antidotes and supportive therapy, and common toxicology pitfalls.',
  },
  absetzen: {
    de: 'Absetzen/Taper: Absetzsyndrom-/Relapse-Risiko, Tempo nach Expositionsdauer/Dosis, Hochrisikogruppen, Rebound-Phänomene, Switching-Caveats und Stufenplan im strukturierten "taper"-Block.',
    en: 'Discontinuation & taper: discontinuation-syndrome and relapse risk, taper speed by exposure duration and dose, high-risk groups, rebound phenomena, switching caveats and the step plan in the structured "taper" block.',
  },
  merksaetze: {
    de: 'Merksätze/Clinical Pearls: 4–7 prägnante, klinisch verwertbare Pearls mit konkretem Handlungsbezug; keine generischen Merksätze.',
    en: 'Clinical pearls: 4–7 concise, clinically actionable pearls with concrete management implications — no generic textbook lines.',
  },
  quellen: {
    de: 'Quellen/References: source-aware Kurzabschnitt mit Fachinformation/SmPC, Leitlinien und Standardwerken; keine erfundenen exakten Zitate, DOI, Seitenzahlen oder Jahreszahlen, wenn unsicher.',
    en: 'References: a source-aware short section citing the SmPC (Fachinformation), clinical guidelines and standard psychopharmacology references; do not invent precise quotations, DOIs, page numbers or years when uncertain.',
  },
}

function sectionGuideLanguage(language: PharmaGenerateRequestBody['language']): SectionGuideLanguage {
  // Default to German for legacy callers that omit `language`; only switch to
  // English when the request explicitly asks for a non-German language.
  if (language === 'en' || language === 'fr' || language === 'es') return 'en'
  return 'de'
}

function getSectionGuide(key: SectionKey, language: PharmaGenerateRequestBody['language']): string {
  return SECTION_GUIDE[key][sectionGuideLanguage(language)]
}

const WHOLE_DRUG_MAX_TOKENS = 16_000
const SINGLE_SECTION_MAX_TOKENS = 7_000

/**
 * Default receptor / transporter / enzyme targets for the v2 relative
 * receptor-affinity model. The model only emits the targets that are relevant
 * for a given drug — it is NOT required to fill every axis.
 */
const RECEPTOR_TARGETS = [
  'D2',
  'D3',
  'D1',
  '5-HT2A',
  '5-HT2C',
  '5-HT1A',
  'H1',
  'M1',
  'α1',
  'α2',
  'SERT',
  'NET',
  'DAT',
] as const

const RECEPTOR_ACTIONS = [
  'antagonist',
  'partial_agonist',
  'agonist',
  'inverse_agonist',
  'reuptake_inhibitor',
  'enzyme_inhibitor',
  'mixed',
  'unknown',
] as const
type ReceptorActionV2 = (typeof RECEPTOR_ACTIONS)[number]

const EVIDENCE_QUALITIES = ['high', 'moderate', 'low', 'estimated', 'unknown'] as const
type EvidenceQualityV2 = (typeof EVIDENCE_QUALITIES)[number]

const CLINICAL_RELEVANCES = ['high', 'moderate', 'low', 'uncertain'] as const
type ClinicalRelevanceV2 = (typeof CLINICAL_RELEVANCES)[number]

const RECEPTOR_PROFILE_VERSION = 2 as const
const AFFINITY_SCALE = 'relative_log_ki_percent' as const

/** A single validated v2 receptor-affinity entry. */
interface ReceptorAffinityEntryV2 {
  target: string
  affinityPercent: number | null
  rawKiNm?: number | null
  rawIc50Nm?: number | null
  pKi?: number | null
  action: ReceptorActionV2
  clinicalRelevance?: ClinicalRelevanceV2
  evidenceQuality: EvidenceQualityV2
  sourceNote?: string
  isEstimated?: boolean
}

const STRONG_KI_NM = 0.1
const WEAK_KI_NM = 10000
const LOG_WEAK = Math.log10(WEAK_KI_NM)
const LOG_RANGE = LOG_WEAK - Math.log10(STRONG_KI_NM)

function kiToAffinityPercent(rawKiNm: number): number {
  if (!Number.isFinite(rawKiNm) || rawKiNm <= 0) return 0
  const pct = ((LOG_WEAK - Math.log10(rawKiNm)) / LOG_RANGE) * 100
  return Math.round(Math.max(0, Math.min(100, pct)))
}

export interface PharmaGenerateRequestBody {
  genericName: string
  brandNames?: string[]
  drugClass?: string
  category?: string
  /** Subset of section keys to fill; omit / empty → all sections. */
  sections?: string[]
  /** Optional model tier; defaults to `thorough` (OpenAI primary). */
  tier?: AiModelTier
  /** UI language for the generated content (from Settings). */
  language?: 'de' | 'en' | 'fr' | 'es'
  /** Also ask for country-specific preparation availability. */
  includeMarketAvailability?: boolean
  /** Generate only country-specific preparation availability, no text sections. */
  marketAvailabilityOnly?: boolean
  caseId?: string
}

export interface PharmaGenerateResponseBody {
  sections: Partial<Record<SectionKey, string>>
  /** AI-suggested common brand / trade names; empty when uncertain. */
  brandNames: string[]
  /** Alias for clients that use trade-name terminology. */
  tradeNames: string[]
  /** AI-suggested default psychopharmacology classification (validated enum). */
  classification: PsychClass
  /** Optional Neuroscience-based Nomenclature (NbN) descriptor; '' if unknown. */
  nbn: string
  /** v2 relative receptor-affinity profile (validated). */
  receptorProfileVersion: typeof RECEPTOR_PROFILE_VERSION
  affinityScale: typeof AFFINITY_SCALE
  receptorAffinityProfile: ReceptorAffinityEntryV2[]
  /**
   * True when the model returned a deprecated 1–5 score map; the legacy data is
   * NOT used as a scientific profile and the entry should be regenerated.
   */
  legacyScoreProfileDetected?: boolean
  /** Structured section payloads (PK / titration / taper / depot / side-effects / CYP). */
  structured?: {
    pk?: Record<string, unknown>
    titration?: Record<string, unknown>
    taper?: Record<string, unknown>
    depotOptions?: unknown[]
    sideEffects?: unknown[]
    cyp?: Record<string, unknown>
  }
  references: string[]
  marketAvailability?: MarketAvailabilityEntryV2[]
  model: { provider: string; modelId: string; label: string }
}

export const pharmaGenerateRouter: Router = createRouter()

const MAX_NAME_CHARS = 400
const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']

function sanitizeStringList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

function coercePsychClass(value: unknown): PsychClass {
  return typeof value === 'string' && (PSYCH_CLASSES as readonly string[]).includes(value)
    ? (value as PsychClass)
    : 'unspecified'
}

function resolveLanguageName(lang: string | undefined): string {
  switch (lang) {
    case 'en':
      return 'English'
    case 'fr':
      return 'French'
    case 'es':
      return 'Spanish'
    default:
      return 'German'
  }
}

function buildSystemPrompt(language: PharmaGenerateRequestBody['language']): string {
  const isGerman = sectionGuideLanguage(language) === 'de'
  const uncertaintyExample = isGerman
    ? '"unsicher" / "ggf. prüfen"'
    : '"uncertain" / "verify against SmPC"'
  return [
    'You are a clinical pharmacology expert assistant. You generate accurate psychiatric drug monographs for clinician reference.',
    'Audience: psychiatrists and clinical staff. Output should read like a dense clinical pharmacology textbook chapter: clinically useful, section-specific, source-aware, and practical at the point of care.',
    'Write in concise paragraphs and structured bullet clusters, but do not be short. Avoid one-line generic statements. Each requested section must contain enough depth to be useful on its own.',
    `Be accurate and conservative. If you are uncertain about a fact, explicitly mark it as uncertain (e.g. ${uncertaintyExample}) rather than inventing specifics.`,
    'Never invent precise numeric values (doses, levels, Ki/IC50) you are not confident about; prefer estimates clearly flagged as such.',
    'When numeric evidence is uncertain, set structured numeric fields to null or mark isEstimated/sourceNote, while still giving qualitative clinical explanation in prose.',
    'Receptor data uses a RELATIVE AFFINITY INDEX (0–100), NOT a 1–5 score, NOT receptor occupancy, NOT clinical blockade. Never output a 1–5 receptor scale.',
    'ALWAYS provide a "quellen" (references) section and a structured "references" array citing standard sources such as the Fachinformation (SmPC), S3-Leitlinien, AMDP, and recognised psychopharmacology references. These references are AI-suggested and MUST be verified against official sources by the clinician.',
    'Output STRICT JSON only — no markdown, no commentary, no code fences.',
  ].join(' ')
}

function buildUserPrompt(
  body: PharmaGenerateRequestBody,
  targetSections: SectionKey[],
  includeMarketAvailability: boolean,
): string {
  const languageName = resolveLanguageName(body.language)
  // Default to German when no explicit language is supplied (legacy callers).
  const isGerman = sectionGuideLanguage(body.language) === 'de'
  const brands = (body.brandNames ?? []).join(', ')
  const noSectionsLine = isGerman
    ? '- Keine Textabschnitte angefordert; fülle "sections": {}.'
    : '- No text sections requested; return "sections": {}.'
  const sectionLines = targetSections.length
    ? targetSections.map((key) => `- "${key}": ${getSectionGuide(key, body.language)}`).join('\n')
    : noSectionsLine
  // dosageForm guidance: when generating in German, ask for German textbook
  // wording; when generating in English (or another non-DE language) ask for
  // human-readable wording in the target language so the preparation list
  // matches the rest of the monograph.
  const dosageFormGuidance = isGerman
    ? 'dosageForm must be human-readable German text suitable for a textbook list (Tabletten, Filmtabletten, Lösung zum Einnehmen, Depot-Injektion) — not English enum codes like "tablet".'
    : `dosageForm must be human-readable ${languageName} text suitable for a textbook list (e.g. "tablets", "film-coated tablets", "oral solution", "depot injection") — not English enum codes like "tablet" alone.`
  const sourceCheckPhrase = isGerman ? 'Fachinformation/AMIce prüfen' : 'Verify against SmPC / national medicine directory'
  const marketAvailabilityInstructions = includeMarketAvailability
    ? [
        '',
        '── COUNTRY-SPECIFIC PREPARATIONS / MARKET AVAILABILITY ──',
        'ALSO return a "marketAvailability" array with known country-specific preparations where reasonably possible.',
        'Scope: Germany (DE), Switzerland (CH), Austria (AT), United Kingdom (UK). Only include entries you can state plausibly from standard medicine directories / SmPC knowledge. It is better to return a short incomplete list than to invent availability.',
        'This array is separate from the pharmacology profile and will be stored as unverified KB preparation data linked to this substance.',
        'Every entry MUST be marked verificationStatus "ai_draft" or "unverified" — NEVER "manually_verified" or "imported_verified".',
        'Keep entries COMPACT — one display line per preparation: strengthValue + strengthUnit + dosageForm (e.g. "50 mg Tabletten").',
        dosageFormGuidance,
        'tradeName is optional; omit or leave empty when the line is generic-only. Include tradeName only for distinct branded products (e.g. "Risperdal Consta").',
        'We only need identity and route/form fields: countryCode, tradeName, genericName, strengthValue, strengthUnit, dosageForm, route, verificationStatus, plus sourceName/sourceReference if known.',
        'Do NOT write long source prose, package descriptions, clinical notes, dosing narratives, or availability essays. sourceReference and notes must be short labels only (max one short phrase).',
        `If market precision is uncertain, set marketStatus:"needs_verification" and use a short sourceName/sourceReference such as "${sourceCheckPhrase}".`,
        'Required entry fields: countryCode, tradeName, genericName, strengthValue, strengthUnit, dosageForm, route, verificationStatus.',
        'Optional compact fields only: marketStatus, sourceName, sourceReference, notes. Avoid packageSize/product identifiers unless confidently known and very short.',
      ].join('\n')
    : ''

  return [
    `Generate a psychiatric drug monograph in ${languageName} for the following drug.`,
    '',
    `Generic name: ${body.genericName}`,
    brands ? `Brand names: ${brands}` : 'Brand names: (unknown)',
    body.drugClass ? `Drug class: ${body.drugClass}` : 'Drug class: (unknown)',
    body.category ? `Category: ${body.category}` : 'Category: (unknown)',
    '',
    'Canonical chapter structure is stable: do NOT add new sections or keys. Fill only the requested keys below; these map into the existing 13 textbook chapter sections in the UI.',
    '',
    'Depth contract for every requested section:',
    '- Return a single content string per key, but make the string clinically dense and section-specific.',
    '- Whole-drug generation: most sections should be 2–5 concise but substantive paragraphs or bullet clusters; short sections still need concrete clinical details.',
    '- Single-section regeneration: generate the same depth for that one section; do not answer with only a short paragraph.',
    '- Use line breaks and "•" bullets where helpful for readability. Avoid filler, disclaimers, and generic textbook boilerplate.',
    '- Include concrete clinical details where known: dosing ranges, titration caveats, half-life/active metabolite, monitoring intervals, contraindication nuance, CYP/QTc risks, depot/oral overlap, adverse-effect prioritization, switching/taper caveats, evidence/source notes.',
    isGerman
      ? '- If a precise value is uncertain, do not invent it. Use qualitative phrasing such as "je nach Fachinformation prüfen" and keep structured numeric fields null or estimated.'
      : '- If a precise value is uncertain, do not invent it. Use qualitative phrasing such as "verify against the SmPC" and keep structured numeric fields null or estimated.',
    '',
    'Fill the following sections:',
    sectionLines,
    '',
    '── RECEPTOR AFFINITY (v2 model) ──',
    'ALSO return a "receptorAffinityProfile" array describing the drug\'s relative receptor / transporter / enzyme binding.',
    'CRITICAL DEFINITION: "affinityPercent" is a RELATIVE RECEPTOR AFFINITY INDEX (0–100) — a normalized comparison of binding strength.',
    'It is NOT receptor occupancy, NOT dose-dependent clinical blockade, and NOT clinical effect strength. Do NOT use a 1–5 score.',
    'Do NOT invent precise Ki values. If a binding constant is not confidently known, set rawKiNm:null, rawIc50Nm:null, pKi:null and provide an estimated affinityPercent with isEstimated:true and evidenceQuality "estimated" or "low".',
    'When a Ki/IC50/pKi IS well established from standard pharmacology references, include it (rawKiNm/rawIc50Nm in nanomolar, pKi as −log10 Ki[M]) and set isEstimated:false with a higher evidenceQuality.',
    'Only include targets that are clinically relevant for this drug. Suggested target symbols: ' + RECEPTOR_TARGETS.join(', ') + ' (others allowed, e.g. 5-HT7, D4, M3).',
    'Each entry fields: target (string), action (one of: ' + RECEPTOR_ACTIONS.join(', ') + '), affinityPercent (0–100 or null), rawKiNm (number|null), rawIc50Nm (number|null), pKi (number|null), evidenceQuality (one of: ' + EVIDENCE_QUALITIES.join(', ') + '), clinicalRelevance (one of: ' + CLINICAL_RELEVANCES.join(', ') + '), isEstimated (boolean), sourceNote (short string).',
    '',
    '── STRUCTURED CLINICAL DATA (v2) ──',
    'ALSO return a "structured" object with the machine-readable payloads that power the reading-mode graphs.',
    'SAME DISCIPLINE AS RECEPTORS: do NOT invent precise half-life / Ki / dose / loading numbers. If a number is not confidently known, set it to null and set isEstimated:true, and put the qualitative statement in the matching text section. Always provide a sourceNote where applicable.',
    'For depot/LAI loading regimens and oral-overlap days: mark isEstimated:true unless taken from the SmPC (Fachinformation) or a guideline. Set "oralOverlapDays": 0 when no oral overlap is required.',
    'For short-acting acetate forms (e.g. Zuclopenthixolacetat / Acuphase) set "isShortActingNotDepot": true (these are NOT maintenance depots).',
    'Only include the structured keys that are clinically relevant for THIS drug; omit the rest. "titration" = uptitration schedule (dosierung section); "taper" = discontinuation/tapering schedule (absetzen section) — include "taper" whenever the drug carries significant discontinuation risk (e.g. SSRIs, SNRIs, benzodiazepines, antipsychotics with discontinuation syndrome). A taper step with doseMg:null marks the final stop. Numbers are in: half-life/Tmax = hours, steady state = days, doses = mg, depot intervals/days = days, timeToSteadyStateWeeks = weeks.',
    'For richer graph/table payloads, include enough structured rows when relevant: typically 4–8 titration/taper steps, all clinically important LAI options, 8–14 prioritized side-effect rows, and the major CYP/pharmacodynamic interactions.',
    '',
    '',
    '── DEFAULT CLASSIFICATION ──',
    'ALSO return "classification": the single best-fitting psychopharmacology class for THIS drug, chosen from EXACTLY this enum (German clinical taxonomy):',
    PSYCH_CLASSES.join(', ') + '.',
    'Guidance: antipsychotic_typical = FGA/typische Antipsychotika; antipsychotic_atypical = SGA/atypische inkl. Partialagonisten; antidepressant_ssri/_snri/_tricyclic/_maoi/_nassa for the matching antidepressant subclass, antidepressant_other for the rest (Bupropion, Agomelatin, Trazodon, Vortioxetin, …); mood_stabilizer = Lithium; anticonvulsant = Antiepileptika als Phasenprophylaktika (Valproat, Lamotrigin, Carbamazepin); anxiolytic_benzodiazepine = Benzodiazepine; anxiolytic_other = sonstige Anxiolytika (Buspiron, Pregabalin); hypnotic = Hypnotika/Sedativa (Z-Substanzen, Melatonin); psychostimulant = ADHS/Stimulanzien; antidementia = Antidementiva; addiction = Suchtmedizin/Substitution. Use "other" only for a clearly psychotropic drug that fits none, and "unspecified" only if genuinely unsure.',
    'ALSO return "nbn": a short Neuroscience-based Nomenclature descriptor (pharmacological domain + mode of action), e.g. "Serotonin – Reuptake inhibitor (SERT)" or "Dopamine, Serotonin – Receptor antagonist". Return "" if unsure. Do NOT fabricate.',
    '',
    'Also return a "references" array of short citation strings (these are AI-suggested and must be verified).',
    'Also return "brandNames": 1–2 common available brand/trade names if known. Be country-aware where possible for DE/CH/AT/UK, but do NOT fabricate; return [] if uncertain. "tradeNames" may mirror the same array.',
    marketAvailabilityInstructions,
    '',
    'Respond with STRICT JSON of exactly this shape (no extra keys, no markdown, NO 1–5 scores):',
    '{',
    '  "brandNames": ["<1–2 common brand/trade names, or empty>"],',
    '  "tradeNames": ["<same as brandNames or empty>"],',
    '  "classification": "<one enum value, e.g. antidepressant_ssri>",',
    '  "nbn": "<NbN domain – mode of action, or empty>",',
    '  "sections": { "<sectionKey>": "<content string>", ... },',
    '  "receptorAffinityProfile": [',
    '    { "target": "D2", "action": "antagonist", "affinityPercent": 92, "rawKiNm": 1.2, "rawIc50Nm": null, "pKi": 8.9, "evidenceQuality": "high", "clinicalRelevance": "high", "isEstimated": false, "sourceNote": "…" }',
    '  ],',
    '  "structured": {',
    isGerman
      ? '    "pk": { "halfLifeHours": 24, "halfLifeNote": "aktiver Metabolit …", "tmaxHours": 4, "timeToSteadyStateDays": 7, "bioavailabilityPercent": 70, "proteinBindingPercent": 90, "tdm": { "lowNgMl": 20, "highNgMl": 60, "unit": "ng/ml", "note": "…" }, "isEstimated": false, "sourceNote": "Fachinformation" },'
      : '    "pk": { "halfLifeHours": 24, "halfLifeNote": "active metabolite …", "tmaxHours": 4, "timeToSteadyStateDays": 7, "bioavailabilityPercent": 70, "proteinBindingPercent": 90, "tdm": { "lowNgMl": 20, "highNgMl": 60, "unit": "ng/ml", "note": "…" }, "isEstimated": false, "sourceNote": "SmPC" },',
    '    "titration": { "unit": "mg", "steps": [ { "label": "Start", "startDay": 0, "doseMg": 2, "note": "…" } ], "targetDoseMg": 6, "maxDoseMg": 16, "isEstimated": false },',
    isGerman
      ? '    "taper": { "unit": "mg", "steps": [ { "label": "Ausgangsdosis", "startDay": 0, "doseMg": 100 }, { "startDay": 14, "doseMg": 50 }, { "startDay": 28, "doseMg": 25 }, { "label": "Absetzen", "startDay": 42, "doseMg": null } ], "isEstimated": true },'
      : '    "taper": { "unit": "mg", "steps": [ { "label": "Starting dose", "startDay": 0, "doseMg": 100 }, { "startDay": 14, "doseMg": 50 }, { "startDay": 28, "doseMg": 25 }, { "label": "Stop", "startDay": 42, "doseMg": null } ], "isEstimated": true },',
    '    "depotOptions": [ { "name": "…", "brandName": "…", "injectionIntervalDays": 28, "loadingRegimen": [ { "day": 1, "doseLabel": "150 mg eq.", "route": "deltoid" } ], "oralOverlapDays": 0, "doseEquivalence": "…", "timeToSteadyStateWeeks": 26, "firstMaintenanceDay": 35, "flexWindowDays": 7, "postInjectionMonitoring": "…", "isShortActingNotDepot": false, "isEstimated": false, "sourceNote": "SmPC" } ],',
    isGerman
      ? '    "sideEffects": [ { "effect": "…", "system": "metabolisch", "frequency": "common", "severity": "moderate", "note": "…" } ],'
      : '    "sideEffects": [ { "effect": "…", "system": "metabolic", "frequency": "common", "severity": "moderate", "note": "…" } ],',
    '    "cyp": { "enzymes": [ { "enzyme": "CYP2D6", "role": "substrate", "strength": "major", "note": "…" } ], "interactions": [ { "withDrugOrClass": "…", "severity": "major", "effect": "…" } ], "qtcRisk": "moderate", "isEstimated": false }',
    '  },',
    '  "references": ["<citation>", ...],',
    '  "marketAvailability": [',
    '    { "countryCode": "DE", "tradeName": "…", "genericName": "…", "strengthValue": "10", "strengthUnit": "mg", "dosageForm": "Tablette", "route": "oral", "marketStatus": "needs_verification", "sourceName": "Fachinformation/AMIce prüfen", "sourceReference": "Kurz prüfen", "verificationStatus": "ai_draft", "notes": "" }',
    '  ]',
    '}',
    'frequency ∈ {veryCommon, common, uncommon, rare, unknown}; severity ∈ {mild, moderate, severe, dangerous}; cyp role ∈ {substrate, inhibitor, inducer}; interaction severity ∈ {major, moderate, minor}; qtcRisk ∈ {low, moderate, high}.',
  ].join('\n')
}

/** Strip optional ```json fences and parse, tolerating minor wrapping. */
function parseModelJson(raw: string): {
  brandNames?: unknown
  tradeNames?: unknown
  classification?: unknown
  nbn?: unknown
  sections?: Record<string, unknown>
  receptorAffinityProfile?: unknown
  /** Deprecated 1–5 map; detected only to flag legacy output. */
  receptorProfile?: Record<string, unknown>
  structured?: unknown
  marketAvailability?: unknown
  references?: unknown
} | null {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  }
  // Fall back to the outermost JSON object if the model added prose.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
  }
  try {
    return JSON.parse(text)
  } catch {
    // The response may be truncated (DeepSeek JSON mode + max_tokens length cut).
    // Attempt a best-effort repair so completed leading fields (e.g. brandNames
    // and the earliest sections) are still recovered instead of failing wholesale.
    const repaired = repairTruncatedJson(text)
    if (repaired) {
      try {
        return JSON.parse(repaired)
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Best-effort repair of a truncated JSON object: drop any dangling partial
 * key/value after the last complete property, terminate an unterminated string,
 * and append the closing brackets implied by the bracket/brace stack. Returns
 * `null` if nothing salvageable is found. This is intentionally conservative —
 * malformed parts are dropped later by the field-level coercers.
 */
function repairTruncatedJson(input: string): string | null {
  if (!input.startsWith('{')) return null
  const stack: string[] = []
  let inString = false
  let escaped = false
  // Index just past the last position where the object was structurally valid
  // to close (i.e. right after a completed value at depth ≥ 1).
  let lastSafe = -1

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']')
    } else if (ch === '}' || ch === ']') {
      stack.pop()
    }
    // A comma or closing bracket at depth ≥ 1 marks a clean cut point.
    if (ch === ',' || ch === '}' || ch === ']') {
      if (stack.length >= 1) lastSafe = i
    }
  }

  if (lastSafe < 0) return null
  // Cut at the last completed property; if it ended with a comma, drop it.
  let truncated = input.slice(0, lastSafe + 1)
  if (truncated.trimEnd().endsWith(',')) {
    truncated = truncated.slice(0, truncated.lastIndexOf(','))
  }

  // Recompute the open-bracket stack for the cut string and close it.
  const closers: string[] = []
  let s = false
  let esc = false
  for (let i = 0; i < truncated.length; i += 1) {
    const ch = truncated[i]
    if (s) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') s = false
      continue
    }
    if (ch === '"') s = true
    else if (ch === '{') closers.push('}')
    else if (ch === '[') closers.push(']')
    else if (ch === '}' || ch === ']') closers.pop()
  }
  return truncated + closers.reverse().join('')
}

function coerceSections(
  rawSections: Record<string, unknown> | undefined,
  targetSections: SectionKey[],
): Partial<Record<SectionKey, string>> {
  const out: Partial<Record<SectionKey, string>> = {}
  if (!rawSections) return out
  for (const key of targetSections) {
    const value = rawSections[key]
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim()
    } else if (Array.isArray(value)) {
      const joined = value.filter((v) => typeof v === 'string').join('\n')
      if (joined.trim()) out[key] = joined.trim()
    }
  }
  return out
}

function toPercentOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return null
  return Math.round(Math.max(0, Math.min(100, num)))
}

function toPositiveOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num > 0 ? num : null
}

function toFiniteOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Strictly validate the model's v2 receptor-affinity array. Invalid entries are
 * dropped (logged in dev); out-of-range numerics are coerced to null so
 * malformed data is never returned to the client.
 */
function coerceAffinityProfile(raw: unknown): ReceptorAffinityEntryV2[] {
  if (!Array.isArray(raw)) return []
  const out: ReceptorAffinityEntryV2[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const target = typeof r.target === 'string' ? r.target.trim() : ''
    if (!target) continue

    const action: ReceptorActionV2 = RECEPTOR_ACTIONS.includes(r.action as ReceptorActionV2)
      ? (r.action as ReceptorActionV2)
      : 'unknown'
    const evidenceQuality: EvidenceQualityV2 = EVIDENCE_QUALITIES.includes(
      r.evidenceQuality as EvidenceQualityV2,
    )
      ? (r.evidenceQuality as EvidenceQualityV2)
      : 'unknown'

    const rawKiNm = toPositiveOrNull(r.rawKiNm)
    const rawIc50Nm = toPositiveOrNull(r.rawIc50Nm)
    const pKi = toFiniteOrNull(r.pKi)
    let affinityPercent = toPercentOrNull(r.affinityPercent)
    if (affinityPercent == null && rawKiNm != null) affinityPercent = kiToAffinityPercent(rawKiNm)

    const isEstimated =
      typeof r.isEstimated === 'boolean'
        ? r.isEstimated
        : evidenceQuality === 'estimated' || (rawKiNm == null && rawIc50Nm == null && pKi == null)

    const entry: ReceptorAffinityEntryV2 = {
      target,
      affinityPercent,
      rawKiNm,
      rawIc50Nm,
      pKi,
      action,
      evidenceQuality,
      isEstimated,
    }
    if (CLINICAL_RELEVANCES.includes(r.clinicalRelevance as ClinicalRelevanceV2)) {
      entry.clinicalRelevance = r.clinicalRelevance as ClinicalRelevanceV2
    }
    if (typeof r.sourceNote === 'string' && r.sourceNote.trim()) {
      entry.sourceNote = r.sourceNote.trim().slice(0, 600)
    }
    out.push(entry)
  }
  return out
}

// ── Structured section payloads (v2) ─────────────────────────────────────────

const SIDE_EFFECT_FREQUENCIES = ['veryCommon', 'common', 'uncommon', 'rare', 'unknown'] as const
type SideEffectFrequencyV2 = (typeof SIDE_EFFECT_FREQUENCIES)[number]
const SIDE_EFFECT_SEVERITIES = ['mild', 'moderate', 'severe', 'dangerous'] as const
type SideEffectSeverityV2 = (typeof SIDE_EFFECT_SEVERITIES)[number]
const CYP_ROLES = ['substrate', 'inhibitor', 'inducer'] as const
type CypRoleV2 = (typeof CYP_ROLES)[number]
const CYP_IX_SEVERITIES = ['major', 'moderate', 'minor'] as const
type CypIxSeverityV2 = (typeof CYP_IX_SEVERITIES)[number]
const QTC_RISKS = ['low', 'moderate', 'high'] as const
type QtcRiskV2 = (typeof QTC_RISKS)[number]

interface StructuredBundleV2 {
  pk?: Record<string, unknown>
  titration?: Record<string, unknown>
  taper?: Record<string, unknown>
  depotOptions?: unknown[]
  sideEffects?: unknown[]
  cyp?: Record<string, unknown>
}

const COUNTRY_CODES = PRESCRIBING_COUNTRY_CODES
type PrescribingCountryCodeV2 = PrescribingCountryCode

interface MarketAvailabilityEntryV2 {
  countryCode: PrescribingCountryCodeV2
  tradeName: string
  genericName: string
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  route: string
  packageSize?: string
  productIdentifierType?: string
  productIdentifier?: string
  prescriptionStatus?: string
  marketStatus?: string
  sourceName?: string
  sourceUrl?: string
  sourceReference?: string
  verificationStatus: 'ai_draft' | 'unverified'
  notes?: string
}

function str(value: unknown, max = 900): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function coercePk(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const tdmRaw = r.tdm && typeof r.tdm === 'object' ? (r.tdm as Record<string, unknown>) : null
  const tdm = tdmRaw
    ? {
        lowNgMl: toPositiveOrNull(tdmRaw.lowNgMl),
        highNgMl: toPositiveOrNull(tdmRaw.highNgMl),
        unit: str(tdmRaw.unit, 20),
        note: str(tdmRaw.note),
      }
    : undefined
  const out: Record<string, unknown> = {
    halfLifeHours: toPositiveOrNull(r.halfLifeHours),
    halfLifeNote: str(r.halfLifeNote),
    tmaxHours: toPositiveOrNull(r.tmaxHours),
    timeToSteadyStateDays: toPositiveOrNull(r.timeToSteadyStateDays),
    bioavailabilityPercent: toPercentOrNull(r.bioavailabilityPercent),
    proteinBindingPercent: toPercentOrNull(r.proteinBindingPercent),
    isEstimated: boolOr(r.isEstimated, true),
    sourceNote: str(r.sourceNote, 600),
  }
  if (tdm && (tdm.lowNgMl != null || tdm.highNgMl != null || tdm.note)) out.tdm = tdm
  const hasAny =
    out.halfLifeHours != null ||
    out.tmaxHours != null ||
    out.timeToSteadyStateDays != null ||
    out.bioavailabilityPercent != null ||
    out.proteinBindingPercent != null ||
    out.halfLifeNote != null ||
    out.tdm != null
  return hasAny ? out : undefined
}

function coerceTitration(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.steps)) return undefined
  const steps = r.steps
    .map((s) => {
      if (!s || typeof s !== 'object') return null
      const st = s as Record<string, unknown>
      const startDay = toFiniteOrNull(st.startDay)
      if (startDay == null) return null
      return {
        label: str(st.label, 120),
        startDay,
        doseMg: toFiniteOrNull(st.doseMg),
        note: str(st.note, 600),
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
  if (steps.length === 0) return undefined
  return {
    unit: str(r.unit, 20) ?? 'mg',
    steps,
    targetDoseMg: toPositiveOrNull(r.targetDoseMg),
    maxDoseMg: toPositiveOrNull(r.maxDoseMg),
    isEstimated: boolOr(r.isEstimated, true),
  }
}

function coerceDepotOptions(raw: unknown, acetateGuard: boolean): unknown[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((o) => {
      if (!o || typeof o !== 'object') return null
      const r = o as Record<string, unknown>
      const name = str(r.name, 120)
      if (!name) return null
      const interval = toPositiveOrNull(r.injectionIntervalDays)
      const loadingRegimen = Array.isArray(r.loadingRegimen)
        ? r.loadingRegimen
            .map((d) => {
              if (!d || typeof d !== 'object') return null
              const dr = d as Record<string, unknown>
              const day = toFiniteOrNull(dr.day)
              const doseLabel = str(dr.doseLabel, 80)
              if (day == null || !doseLabel) return null
              return { day, doseLabel, route: str(dr.route, 40), note: str(dr.note, 600) }
            })
            .filter((d): d is NonNullable<typeof d> => d !== null)
        : []
      const nameLc = `${name} ${str(r.brandName, 120) ?? ''}`.toLowerCase()
      const isAcetate = /acetat|acuphase/.test(nameLc)
      return {
        name,
        brandName: str(r.brandName, 120),
        injectionIntervalDays: interval ?? 28,
        loadingRegimen,
        oralOverlapDays: Math.max(0, toFiniteOrNull(r.oralOverlapDays) ?? 0),
        doseEquivalence: str(r.doseEquivalence, 500),
        timeToSteadyStateWeeks: toPositiveOrNull(r.timeToSteadyStateWeeks),
        firstMaintenanceDay: toFiniteOrNull(r.firstMaintenanceDay),
        flexWindowDays: toPositiveOrNull(r.flexWindowDays),
        postInjectionMonitoring: str(r.postInjectionMonitoring, 700),
        isShortActingNotDepot: boolOr(r.isShortActingNotDepot, acetateGuard && isAcetate),
        isEstimated: boolOr(r.isEstimated, true),
        sourceNote: str(r.sourceNote, 600),
      }
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)
  return out.length > 0 ? out : undefined
}

function coerceSideEffects(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((e) => {
      if (!e || typeof e !== 'object') return null
      const r = e as Record<string, unknown>
      const effect = str(r.effect, 160)
      if (!effect) return null
      const frequency: SideEffectFrequencyV2 = SIDE_EFFECT_FREQUENCIES.includes(
        r.frequency as SideEffectFrequencyV2,
      )
        ? (r.frequency as SideEffectFrequencyV2)
        : 'unknown'
      const severity: SideEffectSeverityV2 = SIDE_EFFECT_SEVERITIES.includes(
        r.severity as SideEffectSeverityV2,
      )
        ? (r.severity as SideEffectSeverityV2)
        : 'mild'
      return { effect, system: str(r.system, 60), frequency, severity, note: str(r.note, 700) }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
  return out.length > 0 ? out : undefined
}

function coerceCyp(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const enzymes = Array.isArray(r.enzymes)
    ? r.enzymes
        .map((en) => {
          if (!en || typeof en !== 'object') return null
          const e = en as Record<string, unknown>
          const enzyme = str(e.enzyme, 40)
          if (!enzyme) return null
          const role: CypRoleV2 = CYP_ROLES.includes(e.role as CypRoleV2)
            ? (e.role as CypRoleV2)
            : 'substrate'
          return { enzyme, role, strength: str(e.strength, 40), note: str(e.note, 600) }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
    : []
  const interactions = Array.isArray(r.interactions)
    ? r.interactions
        .map((ix) => {
          if (!ix || typeof ix !== 'object') return null
          const i = ix as Record<string, unknown>
          const withDrugOrClass = str(i.withDrugOrClass, 160)
          const effect = str(i.effect, 700)
          if (!withDrugOrClass || !effect) return null
          const severity: CypIxSeverityV2 = CYP_IX_SEVERITIES.includes(i.severity as CypIxSeverityV2)
            ? (i.severity as CypIxSeverityV2)
            : 'moderate'
          return { withDrugOrClass, severity, effect }
        })
        .filter((i): i is NonNullable<typeof i> => i !== null)
    : []
  const qtcRisk: QtcRiskV2 | undefined = QTC_RISKS.includes(r.qtcRisk as QtcRiskV2)
    ? (r.qtcRisk as QtcRiskV2)
    : undefined
  if (enzymes.length === 0 && interactions.length === 0 && !qtcRisk) return undefined
  return {
    enzymes,
    ...(interactions.length > 0 ? { interactions } : {}),
    ...(qtcRisk ? { qtcRisk } : {}),
    isEstimated: boolOr(r.isEstimated, true),
  }
}

/** Coerce the model's structured bundle; drops malformed parts. */
function coerceStructured(raw: unknown, acetateGuard: boolean): StructuredBundleV2 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const bundle: StructuredBundleV2 = {}
  const pk = coercePk(r.pk)
  if (pk) bundle.pk = pk
  const titration = coerceTitration(r.titration)
  if (titration) bundle.titration = titration
  const taper = coerceTitration(r.taper)
  if (taper) bundle.taper = taper
  const depotOptions = coerceDepotOptions(r.depotOptions, acetateGuard)
  if (depotOptions) bundle.depotOptions = depotOptions
  const sideEffects = coerceSideEffects(r.sideEffects)
  if (sideEffects) bundle.sideEffects = sideEffects
  const cyp = coerceCyp(r.cyp)
  if (cyp) bundle.cyp = cyp
  return Object.keys(bundle).length > 0 ? bundle : undefined
}

function isCountryCode(value: unknown): value is PrescribingCountryCodeV2 {
  return COUNTRY_CODES.includes(value as PrescribingCountryCodeV2)
}

function coerceMarketAvailability(raw: unknown): MarketAvailabilityEntryV2[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((item): MarketAvailabilityEntryV2 | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      if (!isCountryCode(r.countryCode)) return null
      const tradeName = str(r.tradeName, 160)
      const genericName = str(r.genericName, 160)
      const strengthValue = str(r.strengthValue, 60)
      const strengthUnit = str(r.strengthUnit, 40)
      const dosageForm = str(r.dosageForm, 120)
      const route = str(r.route, 80)
      if (!tradeName || !genericName || !strengthValue || !strengthUnit || !dosageForm || !route) return null
      return {
        countryCode: r.countryCode,
        tradeName,
        genericName,
        strengthValue,
        strengthUnit,
        dosageForm,
        route,
        packageSize: str(r.packageSize, 80),
        productIdentifierType: str(r.productIdentifierType, 60),
        productIdentifier: str(r.productIdentifier, 120),
        prescriptionStatus: str(r.prescriptionStatus, 120),
        marketStatus: str(r.marketStatus, 120) ?? 'needs_verification',
        sourceName: str(r.sourceName, 80) ?? 'KI-Entwurf',
        sourceUrl: str(r.sourceUrl, 300),
        sourceReference: str(r.sourceReference, 120),
        verificationStatus: r.verificationStatus === 'unverified' ? 'unverified' : 'ai_draft',
        notes: str(r.notes, 120),
      } satisfies MarketAvailabilityEntryV2
    })
    .filter((entry): entry is MarketAvailabilityEntryV2 => entry !== null)
    .slice(0, 80)
  return out.length > 0 ? out : undefined
}

pharmaGenerateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PharmaGenerateRequestBody

    const genericName = typeof body.genericName === 'string' ? body.genericName.trim() : ''
    if (!genericName) {
      res.status(400).json({ error: 'Missing genericName' })
      return
    }
    if (genericName.length > MAX_NAME_CHARS) {
      res.status(413).json({ error: 'genericName too large' })
      return
    }

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'thorough'

    const includeMarketAvailability =
      typeof body.includeMarketAvailability === 'boolean'
        ? body.includeMarketAvailability
        : !Array.isArray(body.sections) || body.sections.length === 0
    const marketAvailabilityOnly = body.marketAvailabilityOnly === true

    const requested = sanitizeStringList(body.sections)
    const targetSections: SectionKey[] = marketAvailabilityOnly
      ? []
      : requested.length
      ? SECTION_KEYS.filter((k) => requested.includes(k))
      : [...SECTION_KEYS]
    const effectiveSections = marketAvailabilityOnly
      ? []
      : targetSections.length
        ? targetSections
        : [...SECTION_KEYS]

    const normalizedBody: PharmaGenerateRequestBody = {
      genericName,
      brandNames: sanitizeStringList(body.brandNames),
      drugClass: typeof body.drugClass === 'string' ? body.drugClass.trim().slice(0, MAX_NAME_CHARS) : '',
      category: typeof body.category === 'string' ? body.category.trim().slice(0, MAX_NAME_CHARS) : '',
      language: body.language,
    }

    if (!(await assertAiGenerationAllowed(req, res, body.caseId))) return

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
            featureKey: 'pharma_generate',
            metadata: {
              route: 'pharma-generate',
              tier,
              genericName: normalizedBody.genericName,
              sections: effectiveSections.length,
            },
          })
        : undefined

    const result = await runAiFeature({
      featureKey: 'pharma_generate',
      tier,
      systemPrompt: buildSystemPrompt(normalizedBody.language),
      userPrompt: buildUserPrompt(normalizedBody, effectiveSections, includeMarketAvailability || marketAvailabilityOnly),
      maxTokens: effectiveSections.length === 1 || marketAvailabilityOnly ? SINGLE_SECTION_MAX_TOKENS : WHOLE_DRUG_MAX_TOKENS,
      jsonResponse: true,
      usageContext,
    })

    const parsed = parseModelJson(result.text)
    if (!parsed) {
      // Model returned non-JSON (e.g. mock mode without an API key).
      res.status(502).json({ error: 'AI returned an unparseable response' })
      return
    }

    const userIdAfter = resolveAccountId(req)
    if (userIdAfter && userIdAfter !== 'default') {
      void recordAiGenerationUsed(req, userIdAfter, {
        caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
        metadata: {
          route: 'pharma-generate',
          tier,
          genericName: normalizedBody.genericName,
          sections: effectiveSections.length,
        },
      })
    }

    const sections = coerceSections(parsed.sections, effectiveSections)
    const receptorAffinityProfile = coerceAffinityProfile(parsed.receptorAffinityProfile)
    // Acetate name guard: depot timelines must never be drawn for short-acting
    // acetate forms even if the model forgets the flag.
    const acetateGuard = /acetat|acuphase|zuclopenthixolacetat/i.test(
      `${normalizedBody.genericName} ${(normalizedBody.brandNames ?? []).join(' ')}`,
    )
    const structured = coerceStructured(parsed.structured, acetateGuard)
    const marketAvailability = includeMarketAvailability || marketAvailabilityOnly
      ? coerceMarketAvailability(parsed.marketAvailability)
      : undefined
    // Detect deprecated 1–5 score output: flag it but never use it as a profile.
    const legacyScoreProfileDetected =
      parsed.receptorProfile != null &&
      typeof parsed.receptorProfile === 'object' &&
      Object.keys(parsed.receptorProfile).length > 0
    if (legacyScoreProfileDetected) {
      console.warn('[pharma-generate] model returned deprecated 1–5 receptorProfile; ignored')
    }
    const references = sanitizeStringList(parsed.references, 30)
    const brandNames = [
      ...sanitizeStringList(parsed.brandNames, 2),
      ...sanitizeStringList(parsed.tradeNames, 2),
    ].filter((name, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index).slice(0, 2)

    // Mirror references into the quellen section if the model left it empty.
    if (!sections.quellen && references.length && effectiveSections.includes('quellen')) {
      sections.quellen = references.map((r) => `• ${r}`).join('\n')
    }

    const classification = coercePsychClass(parsed.classification)
    const nbn = str(parsed.nbn, 200) ?? ''

    const responseBody: PharmaGenerateResponseBody = {
      sections,
      brandNames,
      tradeNames: brandNames,
      classification,
      nbn,
      receptorProfileVersion: RECEPTOR_PROFILE_VERSION,
      affinityScale: AFFINITY_SCALE,
      receptorAffinityProfile,
      legacyScoreProfileDetected,
      ...(structured ? { structured } : {}),
      references,
      ...(marketAvailability ? { marketAvailability } : {}),
      model: llmResultModel(result),
    }
    res.json(responseBody)
  } catch (error) {
    console.error('[pharma-generate] failed:', error)
    res.status(500).json({ error: 'Generation failed' })
  }
})
