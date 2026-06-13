import type {
  CypProfile,
  CypRole,
  DepotOption,
  PharmacokineticData,
  SideEffectEntry,
  SideEffectFrequency,
  SideEffectSeverity,
  TitrationSchedule,
} from '../../types/knowledgeBase'

/**
 * Client-side re-validation of the AI "structured" bundle, mirroring
 * `sanitizeAffinityProfile`. The server already coerces, but we never trust the
 * wire: drop malformed parts, clamp ranges, coerce out-of-range numbers to null.
 */
export interface StructuredAiBundle {
  pk?: PharmacokineticData
  titration?: TitrationSchedule
  /** Taper/discontinuation schedule for the `absetzen` section (kind: 'taper'). */
  taper?: TitrationSchedule
  depotOptions?: DepotOption[]
  sideEffects?: SideEffectEntry[]
  cyp?: CypProfile
}

const FREQUENCIES: SideEffectFrequency[] = ['veryCommon', 'common', 'uncommon', 'rare', 'unknown']
const SEVERITIES: SideEffectSeverity[] = ['mild', 'moderate', 'severe', 'dangerous']
const CYP_ROLES: CypRole[] = ['substrate', 'inhibitor', 'inducer']
const IX_SEVERITIES = ['major', 'moderate', 'minor'] as const
const QTC_RISKS = ['low', 'moderate', 'high'] as const

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pos(value: unknown): number | null {
  const n = num(value)
  return n != null && n > 0 ? n : null
}

function pct(value: unknown): number | null {
  const n = num(value)
  if (n == null) return null
  return Math.min(100, Math.max(0, n))
}

function text(value: unknown, max = 400): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function sanitizePk(raw: unknown): PharmacokineticData | undefined {
  const r = obj(raw)
  if (!r) return undefined
  const tdmRaw = obj(r.tdm)
  const tdm = tdmRaw
    ? {
        lowNgMl: pos(tdmRaw.lowNgMl),
        highNgMl: pos(tdmRaw.highNgMl),
        unit: text(tdmRaw.unit, 20),
        note: text(tdmRaw.note),
      }
    : undefined
  const pk: PharmacokineticData = {
    halfLifeHours: pos(r.halfLifeHours),
    halfLifeNote: text(r.halfLifeNote),
    tmaxHours: pos(r.tmaxHours),
    timeToSteadyStateDays: pos(r.timeToSteadyStateDays),
    bioavailabilityPercent: pct(r.bioavailabilityPercent),
    proteinBindingPercent: pct(r.proteinBindingPercent),
    isEstimated: typeof r.isEstimated === 'boolean' ? r.isEstimated : true,
    sourceNote: text(r.sourceNote),
  }
  if (tdm && (tdm.lowNgMl != null || tdm.highNgMl != null || tdm.note)) pk.tdm = tdm
  const hasAny =
    pk.halfLifeHours != null ||
    pk.tmaxHours != null ||
    pk.timeToSteadyStateDays != null ||
    pk.bioavailabilityPercent != null ||
    pk.proteinBindingPercent != null ||
    pk.halfLifeNote != null ||
    pk.tdm != null
  return hasAny ? pk : undefined
}

function sanitizeTitration(raw: unknown): TitrationSchedule | undefined {
  const r = obj(raw)
  if (!r || !Array.isArray(r.steps)) return undefined
  const steps = r.steps
    .map((s) => {
      const st = obj(s)
      if (!st) return null
      const startDay = num(st.startDay)
      if (startDay == null) return null
      return {
        label: text(st.label, 120),
        startDay,
        doseMg: num(st.doseMg),
        note: text(st.note),
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
  if (steps.length === 0) return undefined
  return {
    unit: text(r.unit, 20) ?? 'mg',
    steps,
    targetDoseMg: pos(r.targetDoseMg),
    maxDoseMg: pos(r.maxDoseMg),
    isEstimated: typeof r.isEstimated === 'boolean' ? r.isEstimated : true,
  }
}

function sanitizeDepotOptions(raw: unknown): DepotOption[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((o) => {
      const r = obj(o)
      if (!r) return null
      const name = text(r.name, 120)
      if (!name) return null
      const loadingRegimen = Array.isArray(r.loadingRegimen)
        ? r.loadingRegimen
            .map((d) => {
              const dr = obj(d)
              if (!dr) return null
              const day = num(dr.day)
              const doseLabel = text(dr.doseLabel, 80)
              if (day == null || !doseLabel) return null
              return { day, doseLabel, route: text(dr.route, 40), note: text(dr.note) }
            })
            .filter((d): d is NonNullable<typeof d> => d !== null)
        : []
      const option: DepotOption = {
        name,
        brandName: text(r.brandName, 120),
        injectionIntervalDays: pos(r.injectionIntervalDays) ?? 28,
        loadingRegimen,
        oralOverlapDays: Math.max(0, num(r.oralOverlapDays) ?? 0),
        doseEquivalence: text(r.doseEquivalence, 200),
        timeToSteadyStateWeeks: pos(r.timeToSteadyStateWeeks),
        firstMaintenanceDay: num(r.firstMaintenanceDay),
        flexWindowDays: pos(r.flexWindowDays),
        postInjectionMonitoring: text(r.postInjectionMonitoring, 300),
        isShortActingNotDepot: r.isShortActingNotDepot === true,
        isEstimated: typeof r.isEstimated === 'boolean' ? r.isEstimated : true,
        sourceNote: text(r.sourceNote),
      }
      return option
    })
    .filter((o): o is DepotOption => o !== null)
  return out.length > 0 ? out : undefined
}

function sanitizeSideEffects(raw: unknown): SideEffectEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((e) => {
      const r = obj(e)
      if (!r) return null
      const effect = text(r.effect, 160)
      if (!effect) return null
      const frequency = FREQUENCIES.includes(r.frequency as SideEffectFrequency)
        ? (r.frequency as SideEffectFrequency)
        : 'unknown'
      const severity = SEVERITIES.includes(r.severity as SideEffectSeverity)
        ? (r.severity as SideEffectSeverity)
        : 'mild'
      return { effect, system: text(r.system, 60), frequency, severity, note: text(r.note) }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
  return out.length > 0 ? out : undefined
}

function sanitizeCyp(raw: unknown): CypProfile | undefined {
  const r = obj(raw)
  if (!r) return undefined
  const enzymes = Array.isArray(r.enzymes)
    ? r.enzymes
        .map((en) => {
          const e = obj(en)
          if (!e) return null
          const enzyme = text(e.enzyme, 40)
          if (!enzyme) return null
          const role = CYP_ROLES.includes(e.role as CypRole) ? (e.role as CypRole) : 'substrate'
          return { enzyme, role, strength: text(e.strength, 40), note: text(e.note) }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
    : []
  const interactions = Array.isArray(r.interactions)
    ? r.interactions
        .map((ix) => {
          const i = obj(ix)
          if (!i) return null
          const withDrugOrClass = text(i.withDrugOrClass, 160)
          const effect = text(i.effect, 240)
          if (!withDrugOrClass || !effect) return null
          const severity = (IX_SEVERITIES as readonly string[]).includes(i.severity as string)
            ? (i.severity as 'major' | 'moderate' | 'minor')
            : 'moderate'
          return { withDrugOrClass, severity, effect }
        })
        .filter((i): i is NonNullable<typeof i> => i !== null)
    : []
  const qtcRisk = (QTC_RISKS as readonly string[]).includes(r.qtcRisk as string)
    ? (r.qtcRisk as 'low' | 'moderate' | 'high')
    : undefined
  if (enzymes.length === 0 && interactions.length === 0 && !qtcRisk) return undefined
  return {
    enzymes,
    ...(interactions.length > 0 ? { interactions } : {}),
    ...(qtcRisk ? { qtcRisk } : {}),
    isEstimated: typeof r.isEstimated === 'boolean' ? r.isEstimated : true,
  }
}

/** Sanitize the full structured bundle returned by the AI. */
export function sanitizeStructuredBundle(raw: unknown): StructuredAiBundle {
  const r = obj(raw)
  if (!r) return {}
  const bundle: StructuredAiBundle = {}
  const pk = sanitizePk(r.pk)
  if (pk) bundle.pk = pk
  const titration = sanitizeTitration(r.titration)
  if (titration) bundle.titration = titration
  const taper = sanitizeTitration(r.taper)
  if (taper) bundle.taper = taper
  const depotOptions = sanitizeDepotOptions(r.depotOptions)
  if (depotOptions) bundle.depotOptions = depotOptions
  const sideEffects = sanitizeSideEffects(r.sideEffects)
  if (sideEffects) bundle.sideEffects = sideEffects
  const cyp = sanitizeCyp(r.cyp)
  if (cyp) bundle.cyp = cyp
  return bundle
}
