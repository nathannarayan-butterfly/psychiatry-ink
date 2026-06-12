import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import {
  COMPLEMENTARY_THERAPY_STATUSES,
  DEFAULT_COMPLEMENTARY_THERAPY_TYPES,
  type ComplementaryTherapy,
  type ComplementaryTherapyStatus,
  type DefaultComplementaryTherapyType,
} from '../../types/complementaryTherapy'
import { useComplementaryTherapies } from '../../hooks/useComplementaryTherapies'

interface ComplementaryTherapiesSectionProps {
  caseId: string
}

const DEFAULT_TYPE_LABEL_KEYS: Record<DefaultComplementaryTherapyType, UiTranslationKey> = {
  ergotherapie: 'ctTypeErgotherapie',
  sporttherapie: 'ctTypeSporttherapie',
  musiktherapie: 'ctTypeMusiktherapie',
  kunsttherapie: 'ctTypeKunsttherapie',
  skillgruppe: 'ctTypeSkillgruppe',
  fokusgruppe: 'ctTypeFokusgruppe',
  psychoedukation: 'ctTypePsychoedukation',
  suchtgruppe: 'ctTypeSuchtgruppe',
  entspannungstraining: 'ctTypeEntspannungstraining',
  arbeitstherapie: 'ctTypeArbeitstherapie',
  gruppentherapien: 'ctTypeGruppentherapien',
}

const STATUS_LABEL_KEYS: Record<ComplementaryTherapyStatus, UiTranslationKey> = {
  active: 'ctStatusActive',
  planned: 'ctStatusPlanned',
  paused: 'ctStatusPaused',
  completed: 'ctStatusCompleted',
}

/** Maps complementary-therapy status onto the shared therapy status-pill palette. */
const STATUS_TONE: Record<ComplementaryTherapyStatus, string> = {
  active: 'green',
  planned: 'blue',
  paused: 'amber',
  completed: 'gray',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${d.getFullYear()}`
  } catch {
    return iso
  }
}

export function ComplementaryTherapiesSection({ caseId }: ComplementaryTherapiesSectionProps) {
  const { t } = useTranslation()
  const { therapies, addTherapy, updateTherapy, removeTherapy, addSession, removeSession } =
    useComplementaryTherapies(caseId)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sessionNote, setSessionNote] = useState('')

  const selected = useMemo(
    () => therapies.find((tp) => tp.id === selectedId) ?? null,
    [therapies, selectedId],
  )

  useEffect(() => {
    if (!selectedId) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedId])

  const handleAdd = (name: string) => {
    const created = addTherapy(name)
    setPickerOpen(false)
    setCustomName('')
    if (created) setSelectedId(created.id)
  }

  const handleAddSession = () => {
    if (!selected || !sessionNote.trim()) return
    addSession(selected.id, {
      date: sessionDate || new Date().toISOString().slice(0, 10),
      note: sessionNote.trim(),
    })
    setSessionNote('')
    setSessionDate(new Date().toISOString().slice(0, 10))
  }

  const handleDelete = (therapy: ComplementaryTherapy) => {
    if (!window.confirm(t('ctDeleteConfirm'))) return
    removeTherapy(therapy.id)
    if (selectedId === therapy.id) setSelectedId(null)
  }

  return (
    <section className="therapy-section">
      <header className="therapy-section__header">
        <div className="therapy-section__heading">
          <h3 className="therapy-section__title">{t('complementaryTherapiesTitle')}</h3>
        </div>
        <div className="therapy-section__actions">
          <button
            type="button"
            className="therapy-add-btn"
            onClick={() => setPickerOpen(true)}
          >
            ＋ {t('ctAddTherapy')}
          </button>
        </div>
      </header>

      <div className="therapy-section__body">
        {therapies.length === 0 ? (
          <p className="therapy-empty">{t('ctEmpty')}</p>
        ) : (
          <div className="therapy-card-grid">
            {therapies.map((tp) => (
              <button
                key={tp.id}
                type="button"
                className={`therapy-card${selectedId === tp.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(tp.id)}
              >
                <div className="therapy-card__head">
                  <span className="therapy-card__title">{tp.name}</span>
                  <span className={`therapy-status therapy-status--${STATUS_TONE[tp.status]}`}>
                    {t(STATUS_LABEL_KEYS[tp.status])}
                  </span>
                </div>
                <div className="therapy-card__meta">
                  {tp.frequency ? (
                    <div className="therapy-card__row">
                      <span className="therapy-meta-label">{t('ctFieldFrequency')}</span>
                      <span className="therapy-meta-value">{tp.frequency}</span>
                    </div>
                  ) : null}
                  {tp.mainGoal ? (
                    <div className="therapy-card__row">
                      <span className="therapy-meta-label">{t('ctFieldMainGoal')}</span>
                      <span className="therapy-meta-value">{tp.mainGoal}</span>
                    </div>
                  ) : null}
                  {tp.participationStatus ? (
                    <div className="therapy-card__row">
                      <span className="therapy-meta-label">{t('ctFieldParticipation')}</span>
                      <span className="therapy-meta-value">{tp.participationStatus}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="therapy-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div className="therapy-modal therapy-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="therapy-detail-panel">
              <div className="therapy-detail-panel__head">
                <div className="therapy-detail-panel__heading">
                  <h4 className="therapy-detail-panel__title">{selected.name}</h4>
                  <span className={`therapy-status therapy-status--${STATUS_TONE[selected.status]}`}>
                    {t(STATUS_LABEL_KEYS[selected.status])}
                  </span>
                </div>
                <button
                  type="button"
                  className="therapy-detail-panel__close"
                  onClick={() => setSelectedId(null)}
                  aria-label={t('ctClose')}
                >
                  ×
                </button>
              </div>

              <div className="therapy-detail-panel__body">
                <div className="therapy-field-grid">
                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldName')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.name}
                      onChange={(e) => updateTherapy(selected.id, { name: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldStatus')}</span>
                    <select
                      className="therapy-select"
                      value={selected.status}
                      onChange={(e) =>
                        updateTherapy(selected.id, {
                          status: e.target.value as ComplementaryTherapyStatus,
                        })
                      }
                    >
                      {COMPLEMENTARY_THERAPY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(STATUS_LABEL_KEYS[status])}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldFrequency')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.frequency ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { frequency: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldSetting')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.setting ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { setting: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldStartDate')}</span>
                    <input
                      type="date"
                      className="therapy-input"
                      value={selected.startDate ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { startDate: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field">
                    <span className="therapy-field__label">{t('ctFieldParticipation')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.participationStatus ?? ''}
                      onChange={(e) =>
                        updateTherapy(selected.id, { participationStatus: e.target.value })
                      }
                    />
                  </label>

                  <label className="therapy-field therapy-field--wide">
                    <span className="therapy-field__label">{t('ctFieldMainGoal')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.mainGoal ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { mainGoal: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field therapy-field--wide">
                    <span className="therapy-field__label">{t('ctFieldAdditionalGoals')}</span>
                    <textarea
                      className="therapy-textarea"
                      rows={2}
                      value={selected.additionalGoals ?? ''}
                      onChange={(e) =>
                        updateTherapy(selected.id, { additionalGoals: e.target.value })
                      }
                    />
                  </label>

                  <label className="therapy-field therapy-field--wide">
                    <span className="therapy-field__label">{t('ctFieldNextFocus')}</span>
                    <input
                      type="text"
                      className="therapy-input"
                      value={selected.nextFocus ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { nextFocus: e.target.value })}
                    />
                  </label>

                  <label className="therapy-field therapy-field--wide">
                    <span className="therapy-field__label">{t('ctFieldNotes')}</span>
                    <textarea
                      className="therapy-textarea"
                      rows={3}
                      value={selected.notes ?? ''}
                      onChange={(e) => updateTherapy(selected.id, { notes: e.target.value })}
                    />
                  </label>
                </div>

                <div className="therapy-log">
                  <h5 className="therapy-log__title">{t('ctSessionLog')}</h5>
                  <div className="therapy-log__composer">
                    <input
                      type="date"
                      className="therapy-input therapy-log__date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                    <input
                      type="text"
                      className="therapy-input"
                      value={sessionNote}
                      onChange={(e) => setSessionNote(e.target.value)}
                      placeholder={t('ctSessionNote')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSession()
                      }}
                    />
                    <button
                      type="button"
                      className="therapy-btn therapy-btn--primary"
                      onClick={handleAddSession}
                      disabled={!sessionNote.trim()}
                    >
                      {t('ctSessionAdd')}
                    </button>
                  </div>

                  {(selected.sessions ?? []).length === 0 ? (
                    <p className="therapy-log__empty">{t('ctSessionEmpty')}</p>
                  ) : (
                    <ul className="therapy-log__list">
                      {(selected.sessions ?? []).map((s) => (
                        <li key={s.id} className="therapy-log__item">
                          <time className="therapy-log__item-date">{formatDate(s.date)}</time>
                          <span className="therapy-log__item-note">{s.note}</span>
                          <button
                            type="button"
                            className="therapy-log__item-delete"
                            onClick={() => removeSession(selected.id, s.id)}
                            aria-label={t('ctClose')}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="therapy-detail-panel__footer">
                <button
                  type="button"
                  className="therapy-btn therapy-btn--danger"
                  onClick={() => handleDelete(selected)}
                >
                  {t('ctDelete')}
                </button>
                <button
                  type="button"
                  className="therapy-btn therapy-btn--primary"
                  onClick={() => setSelectedId(null)}
                >
                  {t('ctClose')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div
          className="therapy-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="therapy-modal therapy-modal--narrow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="therapy-modal__head">
              <div className="therapy-modal__heading">
                <h4 className="therapy-modal__title">{t('ctPickerTitle')}</h4>
              </div>
              <button
                type="button"
                className="therapy-modal__close"
                onClick={() => setPickerOpen(false)}
                aria-label={t('ctClose')}
              >
                ×
              </button>
            </div>

            <div className="therapy-modal__body">
              <div className="therapy-picker">
                <div className="therapy-picker__chips">
                  {DEFAULT_COMPLEMENTARY_THERAPY_TYPES.map((typeId) => (
                    <button
                      key={typeId}
                      type="button"
                      className="therapy-chip"
                      onClick={() => handleAdd(t(DEFAULT_TYPE_LABEL_KEYS[typeId]))}
                    >
                      {t(DEFAULT_TYPE_LABEL_KEYS[typeId])}
                    </button>
                  ))}
                </div>
                <div className="therapy-picker__custom">
                  <input
                    type="text"
                    className="therapy-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={t('ctPickerCustomPlaceholder')}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customName.trim()) handleAdd(customName)
                    }}
                  />
                  <button
                    type="button"
                    className="therapy-btn therapy-btn--primary"
                    onClick={() => handleAdd(customName)}
                    disabled={!customName.trim()}
                  >
                    {t('ctPickerAdd')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
