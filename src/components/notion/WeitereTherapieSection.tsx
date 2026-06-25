import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { therapyPageSectionDomId } from '../../data/therapyPageSections'
import { useWeitereTherapie } from '../../hooks/useWeitereTherapie'
import {
  translateWeitereTherapieStatus,
  translateWeitereTherapieType,
  translateWeitereTherapieUi as ts,
} from '../../data/weitereTherapieUiTranslations'
import {
  DEFAULT_WEITERE_THERAPIE_TYPES,
  WEITERE_THERAPIE_STATUSES,
  type WeitereTherapie,
  type WeitereTherapieEkt,
  type WeitereTherapieNeurofeedback,
  type WeitereTherapieRtms,
  type WeitereTherapieStatus,
} from '../../types/weitereTherapie'
import type { WeitereTherapiePatch } from '../../hooks/useWeitereTherapie'

interface WeitereTherapieSectionProps {
  caseId: string
  workspacePlanning?: boolean
  /** Inline workspace panel (no modal overlay). */
  inlineWorkspace?: boolean
  onWorkspacePlanningClose?: () => void
}

type Language = ReturnType<typeof useTranslation>['language']

/** Maps the six lifecycle statuses onto the shared 5-tone therapy status-pill palette. */
const STATUS_TONE: Record<WeitereTherapieStatus, string> = {
  planned: 'blue',
  ongoing: 'green',
  paused: 'amber',
  completed: 'violet',
  declined: 'gray',
  contraindicated: 'amber',
}

export function WeitereTherapieSection({
  caseId,
  workspacePlanning = false,
  inlineWorkspace = false,
  onWorkspacePlanningClose,
}: WeitereTherapieSectionProps) {
  const { language } = useTranslation()
  const { entries, addTherapie, updateTherapie, removeTherapie } = useWeitereTherapie(caseId)
  const [pickerOpen, setPickerOpen] = useState(workspacePlanning && !inlineWorkspace)
  const [customName, setCustomName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (workspacePlanning && !inlineWorkspace) setPickerOpen(true)
  }, [workspacePlanning, inlineWorkspace])

  const closeWorkspacePlanning = useCallback(() => {
    onWorkspacePlanningClose?.()
  }, [onWorkspacePlanningClose])

  const closePicker = useCallback(() => {
    setPickerOpen(false)
    if (workspacePlanning) closeWorkspacePlanning()
  }, [workspacePlanning, closeWorkspacePlanning])

  const closeDetail = useCallback(() => {
    setSelectedId(null)
    if (workspacePlanning) closeWorkspacePlanning()
  }, [workspacePlanning, closeWorkspacePlanning])

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  )

  useEffect(() => {
    if (!selectedId) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedId])

  const handleAdd = (type: string) => {
    const created = addTherapie(type)
    setPickerOpen(false)
    setCustomName('')
    if (created) setSelectedId(created.id)
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return
    handleAdd(customName.trim())
  }

  const pickerModal = pickerOpen ? (
    inlineWorkspace ? (
      <div className="workspace-therapy-inline__panel">
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 className="therapy-modal__title">{ts(language, 'wtPickerTitle')}</h4>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={closePicker}
            aria-label={ts(language, 'wtClose')}
          >
            ×
          </button>
        </div>
        <div className="therapy-modal__body">
          <div className="therapy-picker">
            <div className="therapy-picker__chips">
              {DEFAULT_WEITERE_THERAPIE_TYPES.map((typeId) => (
                <button
                  key={typeId}
                  type="button"
                  className="therapy-chip"
                  onClick={() => handleAdd(typeId)}
                >
                  {translateWeitereTherapieType(language, typeId)}
                </button>
              ))}
            </div>
            <div className="therapy-picker__custom">
              <input
                type="text"
                className="therapy-input"
                value={customName}
                placeholder={ts(language, 'wtCustomPlaceholder')}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustom()
                }}
              />
              <button
                type="button"
                className="therapy-btn therapy-btn--primary"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                {ts(language, 'wtAdd')}
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closePicker}
    >
      <div className="therapy-modal therapy-modal--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 className="therapy-modal__title">{ts(language, 'wtPickerTitle')}</h4>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={closePicker}
            aria-label={ts(language, 'wtClose')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body">
          <div className="therapy-picker">
            <div className="therapy-picker__chips">
              {DEFAULT_WEITERE_THERAPIE_TYPES.map((typeId) => (
                <button
                  key={typeId}
                  type="button"
                  className="therapy-chip"
                  onClick={() => handleAdd(typeId)}
                >
                  {translateWeitereTherapieType(language, typeId)}
                </button>
              ))}
            </div>
            <div className="therapy-picker__custom">
              <input
                type="text"
                className="therapy-input"
                value={customName}
                placeholder={ts(language, 'wtCustomPlaceholder')}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustom()
                }}
                autoFocus
              />
              <button
                type="button"
                className="therapy-btn therapy-btn--primary"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                {ts(language, 'wtAdd')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  ) : null

  const detailModal = selected ? (
    inlineWorkspace ? (
      <div className="workspace-therapy-inline__panel">
        <WeitereTherapieDetail
          entry={selected}
          language={language}
          onUpdate={(patch) => updateTherapie(selected.id, patch)}
          onClose={closeDetail}
          onDelete={() => {
            if (window.confirm(ts(language, 'wtConfirmDelete'))) {
              closeDetail()
              removeTherapie(selected.id)
            }
          }}
        />
      </div>
    ) : (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closeDetail}
    >
      <div className="therapy-modal therapy-modal--wide" onClick={(e) => e.stopPropagation()}>
        <WeitereTherapieDetail
          entry={selected}
          language={language}
          onUpdate={(patch) => updateTherapie(selected.id, patch)}
          onClose={closeDetail}
          onDelete={() => {
            if (window.confirm(ts(language, 'wtConfirmDelete'))) {
              closeDetail()
              removeTherapie(selected.id)
            }
          }}
        />
      </div>
    </div>
    )
  ) : null

  if (workspacePlanning && inlineWorkspace) {
    return (
      <div className="workspace-therapy-inline">
        <header className="workspace-therapy-inline__head">
          <h2 className="workspace-therapy-inline__title">{ts(language, 'wtSectionTitle')}</h2>
          <button type="button" className="pt-btn pt-btn--ghost" onClick={closeWorkspacePlanning}>
            {ts(language, 'wtClose')}
          </button>
        </header>
        {detailModal ?? pickerModal ?? (
          <>
            <div className="therapy-section__actions" style={{ marginBottom: '0.75rem' }}>
              <button type="button" className="therapy-add-btn" onClick={() => setPickerOpen(true)}>
                {ts(language, 'wtAddTherapy')}
              </button>
            </div>
            <div className="therapy-section__body">
              {entries.length === 0 ? (
                <p className="therapy-empty">{ts(language, 'wtEmpty')}</p>
              ) : (
                <div className="therapy-card-grid">
                  {entries.map((entry) => (
                    <WeitereTherapieCard
                      key={entry.id}
                      entry={entry}
                      language={language}
                      selected={selectedId === entry.id}
                      onOpen={() => setSelectedId(entry.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  if (workspacePlanning) {
    return (
      <>
        {detailModal}
        {pickerModal}
      </>
    )
  }

  return (
    <section className="therapy-section" id={therapyPageSectionDomId('weitere')}>
      <header className="therapy-section__header">
        <div className="therapy-section__heading">
          <h3 className="therapy-section__title">{ts(language, 'wtSectionTitle')}</h3>
        </div>
        <div className="therapy-section__actions">
          <button type="button" className="therapy-add-btn" onClick={() => setPickerOpen(true)}>
            {ts(language, 'wtAddTherapy')}
          </button>
        </div>
      </header>

      <div className="therapy-section__body">
        {entries.length === 0 ? (
          <p className="therapy-empty">{ts(language, 'wtEmpty')}</p>
        ) : (
          <div className="therapy-card-grid">
            {entries.map((entry) => (
              <WeitereTherapieCard
                key={entry.id}
                entry={entry}
                language={language}
                selected={selectedId === entry.id}
                onOpen={() => setSelectedId(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {detailModal}

      {pickerModal}
    </section>
  )
}

interface WeitereTherapieCardProps {
  entry: WeitereTherapie
  language: Language
  selected: boolean
  onOpen: () => void
}

function WeitereTherapieCard({ entry, language, selected, onOpen }: WeitereTherapieCardProps) {
  const typeLabel = translateWeitereTherapieType(language, entry.type)
  const detail =
    entry.clinicalGoal?.trim() ||
    entry.indication?.trim() ||
    entry.frequency?.trim() ||
    (entry.plannedSessions !== undefined ? String(entry.plannedSessions) : undefined)

  return (
    <button
      type="button"
      className={`therapy-card therapy-card--compact${selected ? ' is-selected' : ''}`}
      onClick={onOpen}
    >
      <div className="therapy-card__head">
        <span className="therapy-card__title">{typeLabel}</span>
        <span className={`therapy-status therapy-status--${STATUS_TONE[entry.status]}`}>
          {translateWeitereTherapieStatus(language, entry.status)}
        </span>
      </div>
      {detail ? <span className="therapy-card__detail">{detail}</span> : null}
    </button>
  )
}

interface WeitereTherapieDetailProps {
  entry: WeitereTherapie
  language: Language
  onUpdate: (patch: WeitereTherapiePatch) => void
  onClose: () => void
  onDelete: () => void
}

function WeitereTherapieDetail({
  entry,
  language,
  onUpdate,
  onClose,
  onDelete,
}: WeitereTherapieDetailProps) {
  const typeLabel = translateWeitereTherapieType(language, entry.type)

  const numberPatch = (value: string): number | undefined => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const updateEkt = (patch: Partial<WeitereTherapieEkt>) => {
    onUpdate({ ekt: { ...(entry.ekt ?? {}), ...patch } })
  }
  const updateRtms = (patch: Partial<WeitereTherapieRtms>) => {
    onUpdate({ rtms: { ...(entry.rtms ?? {}), ...patch } })
  }
  const updateNeurofeedback = (patch: Partial<WeitereTherapieNeurofeedback>) => {
    onUpdate({ neurofeedback: { ...(entry.neurofeedback ?? {}), ...patch } })
  }

  return (
    <div className="therapy-detail-panel">
      <div className="therapy-detail-panel__head">
        <div className="therapy-detail-panel__heading">
          <h4 className="therapy-detail-panel__title">{typeLabel}</h4>
          <span className={`therapy-status therapy-status--${STATUS_TONE[entry.status]}`}>
            {translateWeitereTherapieStatus(language, entry.status)}
          </span>
        </div>
        <button
          type="button"
          className="therapy-detail-panel__close"
          onClick={onClose}
          aria-label={ts(language, 'wtClose')}
        >
          ×
        </button>
      </div>

      <div className="therapy-detail-panel__body">
        <div className="therapy-field-grid">
          <Field label={ts(language, 'wtStatus')}>
            <select
              className="therapy-select"
              value={entry.status}
              onChange={(e) => onUpdate({ status: e.target.value as WeitereTherapieStatus })}
            >
              {WEITERE_THERAPIE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {translateWeitereTherapieStatus(language, status)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={ts(language, 'wtStartDate')}>
            <input
              type="date"
              className="therapy-input"
              value={entry.startDate ?? ''}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtIndication')} wide>
            <input
              type="text"
              className="therapy-input"
              value={entry.indication ?? ''}
              onChange={(e) => onUpdate({ indication: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtClinicalGoal')} wide>
            <textarea
              className="therapy-textarea"
              rows={2}
              value={entry.clinicalGoal ?? ''}
              onChange={(e) => onUpdate({ clinicalGoal: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtPlannedSessions')}>
            <input
              type="number"
              min={0}
              className="therapy-input"
              value={entry.plannedSessions ?? ''}
              onChange={(e) => onUpdate({ plannedSessions: numberPatch(e.target.value) })}
            />
          </Field>

          <Field label={ts(language, 'wtCompletedSessions')}>
            <input
              type="number"
              min={0}
              className="therapy-input"
              value={entry.completedSessions ?? ''}
              onChange={(e) => onUpdate({ completedSessions: numberPatch(e.target.value) })}
            />
          </Field>

          <Field label={ts(language, 'wtFrequency')}>
            <input
              type="text"
              className="therapy-input"
              value={entry.frequency ?? ''}
              onChange={(e) => onUpdate({ frequency: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtResponsible')}>
            <input
              type="text"
              className="therapy-input"
              value={entry.responsible ?? ''}
              onChange={(e) => onUpdate({ responsible: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtConsentDocumented')}>
            <select
              className="therapy-select"
              value={entry.consentDocumented ? 'yes' : 'no'}
              onChange={(e) => onUpdate({ consentDocumented: e.target.value === 'yes' })}
            >
              <option value="no">{ts(language, 'wtNo')}</option>
              <option value="yes">{ts(language, 'wtYes')}</option>
            </select>
          </Field>

          <Field label={ts(language, 'wtContraindicationsChecked')}>
            <select
              className="therapy-select"
              value={entry.contraindicationsChecked ? 'yes' : 'no'}
              onChange={(e) => onUpdate({ contraindicationsChecked: e.target.value === 'yes' })}
            >
              <option value="no">{ts(language, 'wtNo')}</option>
              <option value="yes">{ts(language, 'wtYes')}</option>
            </select>
          </Field>

          <Field label={ts(language, 'wtNextReviewDate')}>
            <input
              type="date"
              className="therapy-input"
              value={entry.nextReviewDate ?? ''}
              onChange={(e) => onUpdate({ nextReviewDate: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtMonitoring')} wide>
            <textarea
              className="therapy-textarea"
              rows={2}
              value={entry.monitoring ?? ''}
              onChange={(e) => onUpdate({ monitoring: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtResponse')} wide>
            <textarea
              className="therapy-textarea"
              rows={2}
              value={entry.response ?? ''}
              onChange={(e) => onUpdate({ response: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtSideEffects')} wide>
            <textarea
              className="therapy-textarea"
              rows={2}
              value={entry.sideEffects ?? ''}
              onChange={(e) => onUpdate({ sideEffects: e.target.value })}
            />
          </Field>

          <Field label={ts(language, 'wtNotes')} wide>
            <textarea
              className="therapy-textarea"
              rows={3}
              value={entry.notes ?? ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </Field>
        </div>

        {entry.type === 'ekt' && (
          <div className="therapy-log">
            <h5 className="therapy-log__title">{ts(language, 'wtEktSection')}</h5>
            <div className="therapy-field-grid">
              <Field label={ts(language, 'wtEktLegalConsentStatus')} wide>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.ekt?.legalConsentStatus ?? ''}
                  onChange={(e) => updateEkt({ legalConsentStatus: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktAnesthesiaClearance')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.ekt?.anesthesiaClearance ?? ''}
                  onChange={(e) => updateEkt({ anesthesiaClearance: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktElectrodePlacement')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.ekt?.electrodePlacement ?? ''}
                  onChange={(e) => updateEkt({ electrodePlacement: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktSeizureQuality')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.ekt?.seizureQuality ?? ''}
                  onChange={(e) => updateEkt({ seizureQuality: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktNumberOfSessions')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.ekt?.numberOfSessions ?? ''}
                  onChange={(e) => updateEkt({ numberOfSessions: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktCognitiveSideEffects')} wide>
                <textarea
                  className="therapy-textarea"
                  rows={2}
                  value={entry.ekt?.cognitiveSideEffects ?? ''}
                  onChange={(e) => updateEkt({ cognitiveSideEffects: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtEktMaintenancePlanning')} wide>
                <textarea
                  className="therapy-textarea"
                  rows={2}
                  value={entry.ekt?.maintenancePlanning ?? ''}
                  onChange={(e) => updateEkt({ maintenancePlanning: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {entry.type === 'rtms' && (
          <div className="therapy-log">
            <h5 className="therapy-log__title">{ts(language, 'wtRtmsSection')}</h5>
            <div className="therapy-field-grid">
              <Field label={ts(language, 'wtRtmsProtocol')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.protocol ?? ''}
                  onChange={(e) => updateRtms({ protocol: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsTargetArea')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.targetArea ?? ''}
                  onChange={(e) => updateRtms({ targetArea: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsStimulationFrequency')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.stimulationFrequency ?? ''}
                  onChange={(e) => updateRtms({ stimulationFrequency: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsIntensity')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.intensity ?? ''}
                  onChange={(e) => updateRtms({ intensity: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsNumberOfPulses')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.numberOfPulses ?? ''}
                  onChange={(e) => updateRtms({ numberOfPulses: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsPlannedSessions')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.plannedSessions ?? ''}
                  onChange={(e) => updateRtms({ plannedSessions: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsCompletedSessions')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.rtms?.completedSessions ?? ''}
                  onChange={(e) => updateRtms({ completedSessions: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtRtmsResponse')} wide>
                <textarea
                  className="therapy-textarea"
                  rows={2}
                  value={entry.rtms?.response ?? ''}
                  onChange={(e) => updateRtms({ response: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {entry.type === 'neurofeedback' && (
          <div className="therapy-log">
            <h5 className="therapy-log__title">{ts(language, 'wtNeurofeedbackSection')}</h5>
            <div className="therapy-field-grid">
              <Field label={ts(language, 'wtNfTargetDomain')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.neurofeedback?.targetDomain ?? ''}
                  onChange={(e) => updateNeurofeedback({ targetDomain: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtNfProtocol')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.neurofeedback?.protocol ?? ''}
                  onChange={(e) => updateNeurofeedback({ protocol: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtNfSessionCount')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.neurofeedback?.sessionCount ?? ''}
                  onChange={(e) => updateNeurofeedback({ sessionCount: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtNfAdherence')}>
                <input
                  type="text"
                  className="therapy-input"
                  value={entry.neurofeedback?.adherence ?? ''}
                  onChange={(e) => updateNeurofeedback({ adherence: e.target.value })}
                />
              </Field>
              <Field label={ts(language, 'wtNfTrainingResponse')} wide>
                <textarea
                  className="therapy-textarea"
                  rows={2}
                  value={entry.neurofeedback?.trainingResponse ?? ''}
                  onChange={(e) => updateNeurofeedback({ trainingResponse: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      <div className="therapy-detail-panel__footer">
        <button type="button" className="therapy-btn therapy-btn--danger" onClick={onDelete}>
          {ts(language, 'wtDelete')}
        </button>
        <button type="button" className="therapy-btn therapy-btn--primary" onClick={onClose}>
          {ts(language, 'wtClose')}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`therapy-field${wide ? ' therapy-field--wide' : ''}`}>
      <span className="therapy-field__label">{label}</span>
      {children}
    </label>
  )
}
