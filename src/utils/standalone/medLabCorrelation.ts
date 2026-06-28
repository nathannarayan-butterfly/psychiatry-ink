import type { MedicationEntry } from '../../types/medicationPlan'
import { computeMedicationInsights } from '../medication/medicationInsights'

/**
 * Ad-hoc medication ↔ laboratory correlation (patient-less tool).
 *
 * Pure, deterministic engine: given an ad-hoc drug list (KB-resolved entries
 * plus free-text / off-database names) and a small set of clinician-entered lab
 * values, it surfaces the clinically established drug ⇄ lab interactions that
 * matter for monitoring — additive QT risk vs. electrolytes, level/renal context
 * for lithium, hepatotoxic / haematologic / hyponatraemia monitoring for the
 * mood stabilisers, and clozapine neutrophil safety. It NEVER reads or writes a
 * patient case; callers pass in-memory ad-hoc data only.
 *
 * Findings are returned as stable codes + the triggering values so the UI can
 * localise the wording (de/en/fr/es) and the unit tests can assert behaviour
 * without depending on translated strings.
 */

/** Clinician-entered ad-hoc lab values (standard German lab units). */
export interface AdHocLabValues {
  /** Kalium, mmol/L. */
  potassium?: number | null
  /** Magnesium, mmol/L. */
  magnesium?: number | null
  /** Calcium (gesamt), mmol/L. */
  calcium?: number | null
  /** Natrium, mmol/L. */
  sodium?: number | null
  /** eGFR, mL/min/1.73m². */
  egfr?: number | null
  /** QTc, ms. */
  qtc?: number | null
  /** Leukozyten, /nL (×10⁹/L). */
  leukocytes?: number | null
  /** Neutrophile (absolut), /nL (×10⁹/L). */
  neutrophils?: number | null
  /** Lithium-Spiegel, mmol/L. */
  lithiumLevel?: number | null
  /** Valproat-Spiegel, µg/mL. */
  valproateLevel?: number | null
  /** Carbamazepin-Spiegel, µg/mL. */
  carbamazepineLevel?: number | null
}

export const AD_HOC_LAB_FIELDS = [
  'potassium',
  'magnesium',
  'calcium',
  'sodium',
  'egfr',
  'qtc',
  'leukocytes',
  'neutrophils',
  'lithiumLevel',
  'valproateLevel',
  'carbamazepineLevel',
] as const

export type AdHocLabField = (typeof AD_HOC_LAB_FIELDS)[number]

/** Short, language-neutral symbol + unit used in finding value chips / notes. */
export const LAB_FIELD_SYMBOL: Record<AdHocLabField, { symbol: string; unit: string }> = {
  potassium: { symbol: 'K⁺', unit: 'mmol/L' },
  magnesium: { symbol: 'Mg²⁺', unit: 'mmol/L' },
  calcium: { symbol: 'Ca²⁺', unit: 'mmol/L' },
  sodium: { symbol: 'Na⁺', unit: 'mmol/L' },
  egfr: { symbol: 'eGFR', unit: 'mL/min' },
  qtc: { symbol: 'QTc', unit: 'ms' },
  leukocytes: { symbol: 'Leuko', unit: '/nL' },
  neutrophils: { symbol: 'Neutro', unit: '/nL' },
  lithiumLevel: { symbol: 'Li⁺', unit: 'mmol/L' },
  valproateLevel: { symbol: 'VPA', unit: 'µg/mL' },
  carbamazepineLevel: { symbol: 'CBZ', unit: 'µg/mL' },
}

export type MedLabFindingCode =
  | 'qtTorsades'
  | 'qtProlonged'
  | 'lithiumToxic'
  | 'lithiumSubtherapeutic'
  | 'lithiumRenal'
  | 'valproateToxic'
  | 'valproateSubtherapeutic'
  | 'valproateMonitor'
  | 'carbamazepineToxic'
  | 'carbamazepineSubtherapeutic'
  | 'carbamazepineHyponatremia'
  | 'clozapineAgranulocytosis'
  | 'clozapineLeukopenia'
  | 'ssriHyponatremia'

export interface MedLabFinding {
  code: MedLabFindingCode
  level: 'high' | 'info'
  /** Drug names implicated in this finding. */
  drugs: string[]
  /** Formatted triggering values, e.g. `["K⁺ 3.1 mmol/L", "QTc 495 ms"]`. */
  values: string[]
}

export interface MedLabCorrelationResult {
  findings: MedLabFinding[]
  /** Reference-derived monitoring parameters (parameter → drugs) for the KB drugs. */
  monitoring: { parameter: string; drugs: string[] }[]
  /** True when at least one KB-resolved drug contributed reference data. */
  hasDrugReference: boolean
}

// ── Drug-class detection (INN patterns; covers KB + off-database typed names) ──
const QT_PROLONGERS =
  /citalopram|escitalopram|haloperidol|ziprasidon|pimozid|sertindol|amisulprid|sulpirid|quetiapin|olanzapin|risperidon|paliperidon|aripiprazol|chlorprothixen|melperon|pipamperon|thioridazin|levomepromazin|fluphenazin|flupentixol|zuclopenthixol|amitriptylin|clomipramin|doxepin|imipramin|nortriptylin|trimipramin|maprotilin|methadon|levomethadon|hydroxyzin/i
const LITHIUM = /lithium/i
const VALPROATE = /valpro/i
const CARBAMAZEPINE = /carbamazepin/i
const CLOZAPINE = /clozapin/i
const SSRI_SNRI =
  /citalopram|escitalopram|sertralin|paroxetin|fluoxetin|fluvoxamin|venlafaxin|duloxetin|desvenlafaxin|milnacipran|vortioxetin/i

function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function fmt(field: AdHocLabField, value: number): string {
  const meta = LAB_FIELD_SYMBOL[field]
  return `${meta.symbol} ${value} ${meta.unit}`
}

export function computeMedLabCorrelation(
  medications: MedicationEntry[],
  names: string[],
  labs: AdHocLabValues,
): MedLabCorrelationResult {
  const findings: MedLabFinding[] = []
  const all = names.map((n) => n.trim()).filter(Boolean)
  const match = (re: RegExp) => all.filter((n) => re.test(n))

  const qtDrugs = match(QT_PROLONGERS)
  const lithiumDrugs = match(LITHIUM)
  const valproateDrugs = match(VALPROATE)
  const carbamazepineDrugs = match(CARBAMAZEPINE)
  const clozapineDrugs = match(CLOZAPINE)
  const ssriDrugs = match(SSRI_SNRI)

  const k = num(labs.potassium)
  const mg = num(labs.magnesium)
  const na = num(labs.sodium)
  const egfr = num(labs.egfr)
  const qtc = num(labs.qtc)
  const leuko = num(labs.leukocytes)
  const neutro = num(labs.neutrophils)
  const liLevel = num(labs.lithiumLevel)
  const vpaLevel = num(labs.valproateLevel)
  const cbzLevel = num(labs.carbamazepineLevel)

  // ── 1. QT prolongation vs. electrolytes / measured QTc ──────────────────
  if (qtDrugs.length > 0) {
    const values: string[] = []
    let highRisk = false
    if (k !== null && k < 3.5) {
      values.push(fmt('potassium', k))
      highRisk = true
    }
    if (mg !== null && mg < 0.7) {
      values.push(fmt('magnesium', mg))
      highRisk = true
    }
    if (qtc !== null && qtc >= 500) {
      values.push(fmt('qtc', qtc))
      highRisk = true
    }
    if (highRisk) {
      findings.push({ code: 'qtTorsades', level: 'high', drugs: qtDrugs, values })
    } else if (qtc !== null && qtc >= 480) {
      findings.push({ code: 'qtProlonged', level: 'high', drugs: qtDrugs, values: [fmt('qtc', qtc)] })
    } else if (qtDrugs.length >= 2 && (k !== null || mg !== null || qtc !== null)) {
      // Two+ QT-active drugs with electrolytes/QTc in range → monitoring context.
      const v: string[] = []
      if (k !== null) v.push(fmt('potassium', k))
      if (mg !== null) v.push(fmt('magnesium', mg))
      if (qtc !== null) v.push(fmt('qtc', qtc))
      findings.push({ code: 'qtProlonged', level: 'info', drugs: qtDrugs, values: v })
    }
  }

  // ── 2. Lithium: level + renal context ───────────────────────────────────
  if (lithiumDrugs.length > 0) {
    if (liLevel !== null) {
      if (liLevel > 1.2) {
        findings.push({ code: 'lithiumToxic', level: 'high', drugs: lithiumDrugs, values: [fmt('lithiumLevel', liLevel)] })
      } else if (liLevel < 0.5) {
        findings.push({ code: 'lithiumSubtherapeutic', level: 'info', drugs: lithiumDrugs, values: [fmt('lithiumLevel', liLevel)] })
      }
    }
    if (egfr !== null && egfr < 60) {
      findings.push({ code: 'lithiumRenal', level: 'high', drugs: lithiumDrugs, values: [fmt('egfr', egfr)] })
    }
  }

  // ── 3. Valproate: level + generic monitoring ────────────────────────────
  if (valproateDrugs.length > 0) {
    if (vpaLevel !== null) {
      if (vpaLevel > 100) {
        findings.push({ code: 'valproateToxic', level: 'high', drugs: valproateDrugs, values: [fmt('valproateLevel', vpaLevel)] })
      } else if (vpaLevel < 50) {
        findings.push({ code: 'valproateSubtherapeutic', level: 'info', drugs: valproateDrugs, values: [fmt('valproateLevel', vpaLevel)] })
      }
    } else {
      findings.push({ code: 'valproateMonitor', level: 'info', drugs: valproateDrugs, values: [] })
    }
  }

  // ── 4. Carbamazepine: hyponatraemia + level ─────────────────────────────
  if (carbamazepineDrugs.length > 0) {
    if (na !== null && na < 135) {
      findings.push({ code: 'carbamazepineHyponatremia', level: na < 130 ? 'high' : 'info', drugs: carbamazepineDrugs, values: [fmt('sodium', na)] })
    }
    if (cbzLevel !== null) {
      if (cbzLevel > 12) {
        findings.push({ code: 'carbamazepineToxic', level: 'high', drugs: carbamazepineDrugs, values: [fmt('carbamazepineLevel', cbzLevel)] })
      } else if (cbzLevel < 4) {
        findings.push({ code: 'carbamazepineSubtherapeutic', level: 'info', drugs: carbamazepineDrugs, values: [fmt('carbamazepineLevel', cbzLevel)] })
      }
    }
  }

  // ── 5. Clozapine: neutrophil / leukocyte safety ─────────────────────────
  if (clozapineDrugs.length > 0) {
    if (neutro !== null && neutro < 1.5) {
      findings.push({ code: 'clozapineAgranulocytosis', level: 'high', drugs: clozapineDrugs, values: [fmt('neutrophils', neutro)] })
    } else if (leuko !== null && leuko < 3.5) {
      findings.push({ code: 'clozapineLeukopenia', level: 'high', drugs: clozapineDrugs, values: [fmt('leukocytes', leuko)] })
    }
  }

  // ── 6. SSRI / SNRI: hyponatraemia (SIADH) ───────────────────────────────
  if (ssriDrugs.length > 0 && na !== null && na < 135) {
    findings.push({ code: 'ssriHyponatremia', level: na < 130 ? 'high' : 'info', drugs: ssriDrugs, values: [fmt('sodium', na)] })
  }

  const insights = computeMedicationInsights(medications, 'de')
  const monitoring = insights.monitoringBurden.map((item) => ({
    parameter: item.parameter,
    drugs: item.drugs,
  }))

  return { findings, monitoring, hasDrugReference: insights.hasReferenceData }
}

/** Free-text lab parameter row (parameter name + numeric value). */
export interface LabParameterRow {
  id: string
  parameter: string
  value: string
}

/** Normalise a clinician-entered parameter label for alias lookup. */
function normalizeParameterLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]/g, '')
}

/** Map free-text parameter names to known {@link AdHocLabField} keys. */
const PARAMETER_ALIASES: Record<string, AdHocLabField> = {
  k: 'potassium',
  kplus: 'potassium',
  kalium: 'potassium',
  potassium: 'potassium',
  mg: 'magnesium',
  mg2: 'magnesium',
  magnesium: 'magnesium',
  ca: 'calcium',
  ca2: 'calcium',
  calcium: 'calcium',
  kalzium: 'calcium',
  na: 'sodium',
  natrium: 'sodium',
  sodium: 'sodium',
  egfr: 'egfr',
  gfr: 'egfr',
  qtc: 'qtc',
  qt: 'qtc',
  qtzeit: 'qtc',
  leuko: 'leukocytes',
  leukocytes: 'leukocytes',
  leukozyten: 'leukocytes',
  wbc: 'leukocytes',
  neutro: 'neutrophils',
  neutrophils: 'neutrophils',
  neutrophile: 'neutrophils',
  anc: 'neutrophils',
  li: 'lithiumLevel',
  lithium: 'lithiumLevel',
  lithiumlevel: 'lithiumLevel',
  lithiumspiegel: 'lithiumLevel',
  vpa: 'valproateLevel',
  valproat: 'valproateLevel',
  valproate: 'valproateLevel',
  valproatelevel: 'valproateLevel',
  cbz: 'carbamazepineLevel',
  carbamazepin: 'carbamazepineLevel',
  carbamazepine: 'carbamazepineLevel',
  carbamazepinelevel: 'carbamazepineLevel',
}

export function resolveLabParameterName(label: string): AdHocLabField | null {
  const norm = normalizeParameterLabel(label)
  if (!norm) return null
  return PARAMETER_ALIASES[norm] ?? null
}

/** Convert dynamic parameter/value rows into {@link AdHocLabValues} for the engine. */
export function buildLabValuesFromParameterRows(
  rows: Pick<LabParameterRow, 'parameter' | 'value'>[],
): AdHocLabValues {
  const out: AdHocLabValues = {}
  for (const row of rows) {
    const field = resolveLabParameterName(row.parameter)
    if (!field) continue
    const raw = row.value.trim().replace(',', '.')
    const parsed = raw ? Number(raw) : NaN
    if (Number.isFinite(parsed)) out[field] = parsed
  }
  return out
}

/** Format all parameter rows (including unmapped) for AI / note output. */
export function formatLabParameterRows(
  rows: Pick<LabParameterRow, 'parameter' | 'value'>[],
): string[] {
  return rows
    .filter((r) => r.parameter.trim() && r.value.trim())
    .map((r) => `${r.parameter.trim()}: ${r.value.trim()}`)
}
