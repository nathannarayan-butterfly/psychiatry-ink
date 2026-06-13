import {
  getSectionKind,
  type CypEnzymeInvolvement,
  type CypInteraction,
  type CypProfile,
  type CypRole,
  type DepotOption,
  type DrugSection,
  type GlanceData,
  type PharmacokineticData,
  type SideEffectEntry,
  type SideEffectFrequency,
  type SideEffectSeverity,
  type TitrationSchedule,
  type TitrationStep,
} from '../../../types/knowledgeBase'
import { kbT } from './kbStrings'
import { PkCurve } from './charts/PkCurve'
import { TitrationChart } from './charts/TitrationChart'
import { DepotTimeline } from './charts/DepotTimeline'

type StructuredPatch = Partial<
  Pick<DrugSection, 'pk' | 'titration' | 'depotOptions' | 'sideEffects' | 'cyp' | 'glance'>
>

interface KbStructuredEditorProps {
  section: DrugSection
  language: string
  onChange: (patch: StructuredPatch) => void
}

function parseNum(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
}) {
  return (
    <label className="kb-edit__field">
      <span className="kb-edit__label">{label}</span>
      <input
        type="number"
        className="kbp-field__input kb-edit__input"
        value={value ?? ''}
        onChange={(e) => onChange(parseNum(e.target.value))}
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="kb-edit__field">
      <span className="kb-edit__label">{label}</span>
      <input
        type="text"
        className="kbp-field__input kb-edit__input"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

// ── PK editor ─────────────────────────────────────────────────────────────────

function PkEditor({ section, language, onChange }: KbStructuredEditorProps) {
  const pk: PharmacokineticData = section.pk ?? {}
  const patch = (p: Partial<PharmacokineticData>) => onChange({ pk: { ...pk, ...p } })
  const tdm = pk.tdm ?? {}
  const patchTdm = (p: Partial<NonNullable<PharmacokineticData['tdm']>>) =>
    patch({ tdm: { ...tdm, ...p } })
  return (
    <div className="kb-edit">
      <div className="kb-edit__grid">
        <NumField label={`${kbT(language, 'pkHalfLife')} (h)`} value={pk.halfLifeHours} onChange={(v) => patch({ halfLifeHours: v })} />
        <NumField label={`${kbT(language, 'pkTmax')} (h)`} value={pk.tmaxHours} onChange={(v) => patch({ tmaxHours: v })} />
        <NumField label={`${kbT(language, 'pkSteadyState')} (${kbT(language, 'days')})`} value={pk.timeToSteadyStateDays} onChange={(v) => patch({ timeToSteadyStateDays: v })} />
        <NumField label={`${kbT(language, 'pkBioavailability')} (%)`} value={pk.bioavailabilityPercent} onChange={(v) => patch({ bioavailabilityPercent: v })} />
        <NumField label={`${kbT(language, 'pkProteinBinding')} (%)`} value={pk.proteinBindingPercent} onChange={(v) => patch({ proteinBindingPercent: v })} />
      </div>
      <TextField label={kbT(language, 'glanceHalfLife')} value={pk.halfLifeNote} onChange={(v) => patch({ halfLifeNote: v })} placeholder="aktiver Metabolit …" />
      <div className="kb-edit__grid">
        <NumField label={`${kbT(language, 'pkTdm')} (low)`} value={tdm.lowNgMl} onChange={(v) => patchTdm({ lowNgMl: v })} />
        <NumField label={`${kbT(language, 'pkTdm')} (high)`} value={tdm.highNgMl} onChange={(v) => patchTdm({ highNgMl: v })} />
        <TextField label="Unit" value={tdm.unit} onChange={(v) => patchTdm({ unit: v })} placeholder="ng/ml" />
      </div>
      <label className="kb-edit__check">
        <input type="checkbox" checked={!!pk.isEstimated} onChange={(e) => patch({ isEstimated: e.target.checked })} />
        {kbT(language, 'editMarkEstimated')}
      </label>
      <div className="kb-edit__preview">
        <span className="kb-edit__preview-label">{kbT(language, 'editPreview')}</span>
        <PkCurve pk={pk} language={language} />
      </div>
    </div>
  )
}

// ── Titration / taper editor ───────────────────────────────────────────────────

function TitrationEditor({ section, language, onChange, isTaper }: KbStructuredEditorProps & { isTaper: boolean }) {
  const schedule: TitrationSchedule = section.titration ?? { steps: [] }
  const patch = (p: Partial<TitrationSchedule>) => onChange({ titration: { ...schedule, ...p } })
  const setStep = (i: number, p: Partial<TitrationStep>) => {
    const steps = schedule.steps.map((s, idx) => (idx === i ? { ...s, ...p } : s))
    patch({ steps })
  }
  const addStep = () => {
    const last = schedule.steps[schedule.steps.length - 1]
    patch({ steps: [...schedule.steps, { startDay: last ? last.startDay + 7 : 0, doseMg: last?.doseMg ?? 0 }] })
  }
  const removeStep = (i: number) => patch({ steps: schedule.steps.filter((_, idx) => idx !== i) })
  return (
    <div className="kb-edit">
      <div className="kb-edit__grid">
        <TextField label="Unit" value={schedule.unit} onChange={(v) => patch({ unit: v })} placeholder="mg" />
        <NumField label={kbT(language, 'titrationTarget')} value={schedule.targetDoseMg} onChange={(v) => patch({ targetDoseMg: v })} />
        <NumField label={kbT(language, 'titrationMax')} value={schedule.maxDoseMg} onChange={(v) => patch({ maxDoseMg: v })} />
      </div>
      <table className="kb-edit__rows">
        <thead>
          <tr>
            <th>{kbT(language, 'colDay')}</th>
            <th>{kbT(language, 'colStep')}</th>
            <th>{kbT(language, 'colDose')}</th>
            <th>{kbT(language, 'colNote')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {schedule.steps.map((s, i) => (
            <tr key={i}>
              <td><input type="number" className="kbp-field__input kb-edit__input kb-edit__input--xs" value={s.startDay} onChange={(e) => setStep(i, { startDay: parseNum(e.target.value) ?? 0 })} /></td>
              <td><input type="text" className="kbp-field__input kb-edit__input" value={s.label ?? ''} onChange={(e) => setStep(i, { label: e.target.value })} /></td>
              <td><input type="number" className="kbp-field__input kb-edit__input kb-edit__input--xs" value={s.doseMg ?? ''} onChange={(e) => setStep(i, { doseMg: parseNum(e.target.value) })} /></td>
              <td><input type="text" className="kbp-field__input kb-edit__input" value={s.note ?? ''} onChange={(e) => setStep(i, { note: e.target.value })} /></td>
              <td><button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeStep(i)} title={kbT(language, 'editRemove')}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="kbp-btn kbp-btn--sm" onClick={addStep}>{kbT(language, 'editAddStep')}</button>
      <label className="kb-edit__check">
        <input type="checkbox" checked={!!schedule.isEstimated} onChange={(e) => patch({ isEstimated: e.target.checked })} />
        {kbT(language, 'editMarkEstimated')}
      </label>
      {schedule.steps.length > 0 ? (
        <div className="kb-edit__preview">
          <span className="kb-edit__preview-label">{kbT(language, 'editPreview')}</span>
          <TitrationChart schedule={schedule} isTaper={isTaper} language={language} />
        </div>
      ) : null}
    </div>
  )
}

// ── Depot editor ────────────────────────────────────────────────────────────────

function DepotEditor({ section, language, onChange }: KbStructuredEditorProps) {
  const options = section.depotOptions ?? []
  const setOpt = (i: number, p: Partial<DepotOption>) =>
    onChange({ depotOptions: options.map((o, idx) => (idx === i ? { ...o, ...p } : o)) })
  const addOpt = () =>
    onChange({
      depotOptions: [
        ...options,
        { name: '', injectionIntervalDays: 28, loadingRegimen: [], oralOverlapDays: 0 },
      ],
    })
  const removeOpt = (i: number) => onChange({ depotOptions: options.filter((_, idx) => idx !== i) })

  return (
    <div className="kb-edit">
      {options.map((opt, i) => {
        const setLoading = (li: number, p: Partial<DepotOption['loadingRegimen'][number]>) =>
          setOpt(i, { loadingRegimen: opt.loadingRegimen.map((d, idx) => (idx === li ? { ...d, ...p } : d)) })
        const addLoading = () =>
          setOpt(i, { loadingRegimen: [...opt.loadingRegimen, { day: 0, doseLabel: '' }] })
        const removeLoading = (li: number) =>
          setOpt(i, { loadingRegimen: opt.loadingRegimen.filter((_, idx) => idx !== li) })
        return (
          <div key={i} className="kb-edit__card">
            <div className="kb-edit__card-head">
              <span className="kb-edit__card-title">{opt.name || `Depot ${i + 1}`}</span>
              <button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeOpt(i)} title={kbT(language, 'editRemove')}>×</button>
            </div>
            <div className="kb-edit__grid">
              <TextField label={kbT(language, 'editName')} value={opt.name} onChange={(v) => setOpt(i, { name: v })} />
              <TextField label={kbT(language, 'editBrand')} value={opt.brandName} onChange={(v) => setOpt(i, { brandName: v })} />
              <NumField label={`${kbT(language, 'depotInterval')} (${kbT(language, 'days')})`} value={opt.injectionIntervalDays} onChange={(v) => setOpt(i, { injectionIntervalDays: v ?? 1 })} />
              <NumField label={`${kbT(language, 'depotOverlap')} (${kbT(language, 'days')})`} value={opt.oralOverlapDays} onChange={(v) => setOpt(i, { oralOverlapDays: v ?? 0 })} />
              <NumField label={kbT(language, 'depotFirstMaintenance')} value={opt.firstMaintenanceDay} onChange={(v) => setOpt(i, { firstMaintenanceDay: v })} />
              <NumField label={`${kbT(language, 'depotSteadyState')} (${kbT(language, 'weeks')})`} value={opt.timeToSteadyStateWeeks} onChange={(v) => setOpt(i, { timeToSteadyStateWeeks: v })} />
              <NumField label={kbT(language, 'depotFlexWindow')} value={opt.flexWindowDays} onChange={(v) => setOpt(i, { flexWindowDays: v })} />
            </div>
            <TextField label={kbT(language, 'depotEquivalence')} value={opt.doseEquivalence} onChange={(v) => setOpt(i, { doseEquivalence: v })} />
            <TextField label={kbT(language, 'depotMonitoring')} value={opt.postInjectionMonitoring} onChange={(v) => setOpt(i, { postInjectionMonitoring: v })} />
            <TextField label="Quelle" value={opt.sourceNote} onChange={(v) => setOpt(i, { sourceNote: v })} />
            <div className="kb-edit__loading">
              <span className="kb-edit__label">{kbT(language, 'depotLoading')}</span>
              {opt.loadingRegimen.map((d, li) => (
                <div key={li} className="kb-edit__loading-row">
                  <input type="number" className="kbp-field__input kb-edit__input kb-edit__input--xs" value={d.day} placeholder="Tag" onChange={(e) => setLoading(li, { day: parseNum(e.target.value) ?? 0 })} />
                  <input type="text" className="kbp-field__input kb-edit__input" value={d.doseLabel} placeholder="150 mg eq." onChange={(e) => setLoading(li, { doseLabel: e.target.value })} />
                  <input type="text" className="kbp-field__input kb-edit__input kb-edit__input--sm" value={d.route ?? ''} placeholder="deltoid" onChange={(e) => setLoading(li, { route: e.target.value })} />
                  <button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeLoading(li)}>×</button>
                </div>
              ))}
              <button type="button" className="kbp-btn kbp-btn--sm" onClick={addLoading}>{kbT(language, 'editAddLoading')}</button>
            </div>
            <div className="kb-edit__checks">
              <label className="kb-edit__check">
                <input type="checkbox" checked={!!opt.isShortActingNotDepot} onChange={(e) => setOpt(i, { isShortActingNotDepot: e.target.checked })} />
                {kbT(language, 'depotShortActing')}
              </label>
              <label className="kb-edit__check">
                <input type="checkbox" checked={!!opt.isEstimated} onChange={(e) => setOpt(i, { isEstimated: e.target.checked })} />
                {kbT(language, 'editMarkEstimated')}
              </label>
            </div>
            {opt.name && opt.injectionIntervalDays ? (
              <div className="kb-edit__preview">
                <span className="kb-edit__preview-label">{kbT(language, 'editPreview')}</span>
                <DepotTimeline option={opt} language={language} />
              </div>
            ) : null}
          </div>
        )
      })}
      <button type="button" className="kbp-btn kbp-btn--sm" onClick={addOpt}>{kbT(language, 'editAddDepot')}</button>
    </div>
  )
}

// ── Side-effect editor ──────────────────────────────────────────────────────────

const FREQUENCIES: SideEffectFrequency[] = ['veryCommon', 'common', 'uncommon', 'rare', 'unknown']
const SEVERITIES: SideEffectSeverity[] = ['mild', 'moderate', 'severe', 'dangerous']
const FREQ_KEY: Record<SideEffectFrequency, Parameters<typeof kbT>[1]> = {
  veryCommon: 'freqVeryCommon',
  common: 'freqCommon',
  uncommon: 'freqUncommon',
  rare: 'freqRare',
  unknown: 'freqUnknown',
}
const SEV_KEY: Record<SideEffectSeverity, Parameters<typeof kbT>[1]> = {
  mild: 'sevMild',
  moderate: 'sevModerate',
  severe: 'sevSevere',
  dangerous: 'sevDangerous',
}

function SideEffectsEditor({ section, language, onChange }: KbStructuredEditorProps) {
  const entries = section.sideEffects ?? []
  const setRow = (i: number, p: Partial<SideEffectEntry>) =>
    onChange({ sideEffects: entries.map((e, idx) => (idx === i ? { ...e, ...p } : e)) })
  const addRow = () =>
    onChange({ sideEffects: [...entries, { effect: '', frequency: 'common', severity: 'mild' }] })
  const removeRow = (i: number) => onChange({ sideEffects: entries.filter((_, idx) => idx !== i) })
  return (
    <div className="kb-edit">
      <table className="kb-edit__rows">
        <thead>
          <tr>
            <th>{kbT(language, 'seEffect')}</th>
            <th>{kbT(language, 'seSystem')}</th>
            <th>{kbT(language, 'seFrequency')}</th>
            <th>{kbT(language, 'seSeverity')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td><input type="text" className="kbp-field__input kb-edit__input" value={e.effect} onChange={(ev) => setRow(i, { effect: ev.target.value })} /></td>
              <td><input type="text" className="kbp-field__input kb-edit__input kb-edit__input--sm" value={e.system ?? ''} onChange={(ev) => setRow(i, { system: ev.target.value })} /></td>
              <td>
                <select className="kbp-field__select kb-edit__input" value={e.frequency} onChange={(ev) => setRow(i, { frequency: ev.target.value as SideEffectFrequency })}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{kbT(language, FREQ_KEY[f])}</option>)}
                </select>
              </td>
              <td>
                <select className="kbp-field__select kb-edit__input" value={e.severity} onChange={(ev) => setRow(i, { severity: ev.target.value as SideEffectSeverity })}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{kbT(language, SEV_KEY[s])}</option>)}
                </select>
              </td>
              <td><button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeRow(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="kbp-btn kbp-btn--sm" onClick={addRow}>{kbT(language, 'editAddRow')}</button>
    </div>
  )
}

// ── CYP editor ────────────────────────────────────────────────────────────────

const ROLES: CypRole[] = ['substrate', 'inhibitor', 'inducer']
const INTERACTION_SEVERITIES: CypInteraction['severity'][] = ['major', 'moderate', 'minor']

function CypEditor({ section, language, onChange }: KbStructuredEditorProps) {
  const cyp: CypProfile = section.cyp ?? { enzymes: [] }
  const patch = (p: Partial<CypProfile>) => onChange({ cyp: { ...cyp, ...p } })
  const setEnzyme = (i: number, p: Partial<CypEnzymeInvolvement>) =>
    patch({ enzymes: cyp.enzymes.map((en, idx) => (idx === i ? { ...en, ...p } : en)) })
  const addEnzyme = () => patch({ enzymes: [...cyp.enzymes, { enzyme: '', role: 'substrate' }] })
  const removeEnzyme = (i: number) => patch({ enzymes: cyp.enzymes.filter((_, idx) => idx !== i) })
  const interactions = cyp.interactions ?? []
  const setIx = (i: number, p: Partial<CypInteraction>) =>
    patch({ interactions: interactions.map((ix, idx) => (idx === i ? { ...ix, ...p } : ix)) })
  const addIx = () =>
    patch({ interactions: [...interactions, { withDrugOrClass: '', severity: 'moderate', effect: '' }] })
  const removeIx = (i: number) => patch({ interactions: interactions.filter((_, idx) => idx !== i) })

  const roleLabel = (r: CypRole) =>
    r === 'substrate' ? kbT(language, 'cypSubstrate') : r === 'inhibitor' ? kbT(language, 'cypInhibitor') : kbT(language, 'cypInducer')

  return (
    <div className="kb-edit">
      <span className="kb-edit__label">{kbT(language, 'cypEnzymes')}</span>
      <table className="kb-edit__rows">
        <tbody>
          {cyp.enzymes.map((en, i) => (
            <tr key={i}>
              <td><input type="text" className="kbp-field__input kb-edit__input kb-edit__input--sm" value={en.enzyme} placeholder="CYP2D6" onChange={(e) => setEnzyme(i, { enzyme: e.target.value })} /></td>
              <td>
                <select className="kbp-field__select kb-edit__input" value={en.role} onChange={(e) => setEnzyme(i, { role: e.target.value as CypRole })}>
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </td>
              <td><input type="text" className="kbp-field__input kb-edit__input kb-edit__input--sm" value={en.strength ?? ''} placeholder="stark" onChange={(e) => setEnzyme(i, { strength: e.target.value })} /></td>
              <td><button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeEnzyme(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="kbp-btn kbp-btn--sm" onClick={addEnzyme}>{kbT(language, 'editAddEnzyme')}</button>

      <span className="kb-edit__label">{kbT(language, 'cypInteractions')}</span>
      <table className="kb-edit__rows">
        <tbody>
          {interactions.map((ix, i) => (
            <tr key={i}>
              <td><input type="text" className="kbp-field__input kb-edit__input" value={ix.withDrugOrClass} onChange={(e) => setIx(i, { withDrugOrClass: e.target.value })} /></td>
              <td>
                <select className="kbp-field__select kb-edit__input" value={ix.severity} onChange={(e) => setIx(i, { severity: e.target.value as CypInteraction['severity'] })}>
                  {INTERACTION_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td><input type="text" className="kbp-field__input kb-edit__input" value={ix.effect} onChange={(e) => setIx(i, { effect: e.target.value })} /></td>
              <td><button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => removeIx(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="kbp-btn kbp-btn--sm" onClick={addIx}>{kbT(language, 'editAddInteraction')}</button>

      <label className="kb-edit__field kb-edit__field--inline">
        <span className="kb-edit__label">{kbT(language, 'qtcRisk')}</span>
        <select
          className="kbp-field__select kb-edit__input"
          value={cyp.qtcRisk ?? ''}
          onChange={(e) => patch({ qtcRisk: (e.target.value || undefined) as CypProfile['qtcRisk'] })}
        >
          <option value="">—</option>
          <option value="low">{kbT(language, 'qtcLow')}</option>
          <option value="moderate">{kbT(language, 'qtcModerate')}</option>
          <option value="high">{kbT(language, 'qtcHigh')}</option>
        </select>
      </label>
    </div>
  )
}

// ── Glance editor ───────────────────────────────────────────────────────────────

function GlanceEditor({ section, language, onChange }: KbStructuredEditorProps) {
  const glance: GlanceData = section.glance ?? {}
  const patch = (p: Partial<GlanceData>) => onChange({ glance: { ...glance, ...p } })
  return (
    <div className="kb-edit">
      <div className="kb-edit__grid">
        <TextField label={kbT(language, 'glanceClass')} value={glance.drugClass} onChange={(v) => patch({ drugClass: v })} />
        <TextField label={kbT(language, 'glanceHalfLife')} value={glance.halfLifeSummary} onChange={(v) => patch({ halfLifeSummary: v })} />
        <TextField label={kbT(language, 'glancePregnancy')} value={glance.pregnancy} onChange={(v) => patch({ pregnancy: v })} />
        <TextField label={kbT(language, 'glanceLactation')} value={glance.lactation} onChange={(v) => patch({ lactation: v })} />
      </div>
      <TextField
        label={kbT(language, 'glanceTargets')}
        value={(glance.primaryTargets ?? []).join(', ')}
        onChange={(v) => patch({ primaryTargets: v.split(',').map((s) => s.trim()).filter(Boolean) })}
        placeholder="D2, 5-HT2A, H1"
      />
      <label className="kb-edit__field kb-edit__field--inline">
        <span className="kb-edit__label">{kbT(language, 'glanceQtc')}</span>
        <select
          className="kbp-field__select kb-edit__input"
          value={glance.qtcRisk ?? ''}
          onChange={(e) => patch({ qtcRisk: (e.target.value || undefined) as GlanceData['qtcRisk'] })}
        >
          <option value="">—</option>
          <option value="low">{kbT(language, 'qtcLow')}</option>
          <option value="moderate">{kbT(language, 'qtcModerate')}</option>
          <option value="high">{kbT(language, 'qtcHigh')}</option>
        </select>
      </label>
      <label className="kb-edit__check">
        <input type="checkbox" checked={!!glance.depotAvailable} onChange={(e) => patch({ depotAvailable: e.target.checked })} />
        {kbT(language, 'glanceDepot')}
      </label>
    </div>
  )
}

/** Edit-mode structured payload editor; returns null for plain-text sections. */
export function KbStructuredEditor(props: KbStructuredEditorProps) {
  const kind = getSectionKind(props.section)
  switch (kind) {
    case 'pk':
      return <PkEditor {...props} />
    case 'titration':
      return <TitrationEditor {...props} isTaper={false} />
    case 'taper':
      return <TitrationEditor {...props} isTaper />
    case 'depot':
      return <DepotEditor {...props} />
    case 'sideEffects':
      return <SideEffectsEditor {...props} />
    case 'cyp':
      return <CypEditor {...props} />
    case 'glance':
      return <GlanceEditor {...props} />
    default:
      return null
  }
}
