import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
import { useCanAccessModule } from '../../hooks/permissions/useCanAccessModule'
import { usePermissions } from '../../hooks/permissions'
import { TherapyAttributionBadge } from '../therapy/TherapyAttributionBadge'
import { buildTherapyAttribution } from '../../types/therapy'
import { PsychotherapieOverviewCard } from '../psychotherapy/PsychotherapieOverviewCard'
import { ComplementaryTherapiesSection } from './ComplementaryTherapiesSection'
import { WeitereTherapieSection } from './WeitereTherapieSection'
import { SozialtherapieSection } from '../sozialtherapie/SozialtherapieSection'
import {
  appendTherapieEintrag,
  deleteTherapieEintrag,
  loadTherapieEintraege,
  type TherapieEintrag,
} from '../../utils/therapieArchive'
import { therapyPageSectionDomId } from '../../data/therapyPageSections'
import { formatClinicalDate } from '../../utils/clinicalDate'

interface TherapiePageProps {
  caseId: string
}

function formatDate(iso: string): string {
  return formatClinicalDate(iso) || iso.slice(0, 10)
}

export function TherapiePage({ caseId }: TherapiePageProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { member, role } = usePermissionContext()
  const { canCreateTherapyEntry: canCreateEntry } = usePermissions()
  const canAccessTherapyModule = useCanAccessModule(caseId, 'therapy')
  const canAddTherapyNote = canAccessTherapyModule && canCreateEntry(caseId)
  const [entries, setEntries] = useState<TherapieEintrag[]>(() => loadTherapieEintraege(caseId))
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerDate, setComposerDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setEntries(loadTherapieEintraege(caseId))
  }, [caseId])

  const handleSave = useCallback(() => {
    if (!composerText.trim()) return
    const attribution = buildTherapyAttribution(
      user?.id ?? member?.userId ?? '',
      role,
      member?.therapyDiscipline,
      member?.therapyDisciplineCustom,
    )
    appendTherapieEintrag(caseId, {
      date: composerDate || new Date().toISOString().slice(0, 10),
      text: composerText.trim(),
      ...(attribution ? { attribution } : {}),
    })
    setEntries(loadTherapieEintraege(caseId))
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerOpen(false)
  }, [caseId, composerDate, composerText, member, role, user?.id])

  const handleCancel = useCallback(() => {
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerOpen(false)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('Eintrag löschen?')) return
      deleteTherapieEintrag(caseId, id)
      setEntries(loadTherapieEintraege(caseId))
    },
    [caseId],
  )

  return (
    <div className="therapy-page cm-workspace">
      <WeitereTherapieSection caseId={caseId} />
      <PsychotherapieOverviewCard caseId={caseId} />
      <ComplementaryTherapiesSection caseId={caseId} />
      <SozialtherapieSection caseId={caseId} />

      {/* Therapie-Notizen (existing journal) */}
      <section className="therapy-section" id={therapyPageSectionDomId('notizen')}>
        <header className="therapy-section__header">
          <div className="therapy-section__heading">
            <h3 className="therapy-section__title">{t('therapieSectionNotizen')}</h3>
          </div>
          <div className="therapy-section__actions">
            {!composerOpen && canAddTherapyNote && (
              <button
                type="button"
                className="therapy-add-btn"
                onClick={() => setComposerOpen(true)}
              >
                ＋ {t('therapieNewEntry')}
              </button>
            )}
          </div>
        </header>

        <div className="therapy-section__body">
          {entries.length === 0 ? (
            <p className="therapy-empty">{t('therapieEmpty')}</p>
          ) : (
            <div className="therapy-entry-list">
              {entries.map((entry) => (
                <article key={entry.id} className="therapy-entry">
                  <header className="therapy-entry__header">
                    <time className="therapy-entry__date" dateTime={entry.date}>
                      {formatDate(entry.date)}
                    </time>
                    {entry.attribution ? (
                      <TherapyAttributionBadge attribution={entry.attribution} />
                    ) : null}
                    <button
                      type="button"
                      className="therapy-entry__delete"
                      onClick={() => handleDelete(entry.id)}
                      title="Eintrag löschen"
                      aria-label="Eintrag löschen"
                    >
                      ×
                    </button>
                  </header>
                  <p className="therapy-entry__text">{entry.text}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        {composerOpen && (
          <div
            className="therapy-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={handleCancel}
          >
            <div
              className="therapy-modal therapy-modal--narrow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="therapy-modal__head">
                <div className="therapy-modal__heading">
                  <h4 className="therapy-modal__title">{t('therapieNewEntry')}</h4>
                </div>
                <button
                  type="button"
                  className="therapy-modal__close"
                  onClick={handleCancel}
                  aria-label={t('verlaufEntryCancel')}
                >
                  ×
                </button>
              </div>

              <div className="therapy-modal__body">
                <div className="therapy-composer">
                  <label className="therapy-composer__date-label">
                    Datum
                    <input
                      type="date"
                      className="therapy-input"
                      value={composerDate}
                      onChange={(e) => setComposerDate(e.target.value)}
                    />
                  </label>
                  <textarea
                    className="therapy-textarea therapy-composer__textarea"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder={t('therapieNewEntry') + '…'}
                    rows={5}
                    autoFocus
                  />
                </div>
              </div>

              <div className="therapy-modal__footer">
                <button
                  type="button"
                  className="therapy-btn therapy-btn--ghost"
                  onClick={handleCancel}
                >
                  {t('verlaufEntryCancel')}
                </button>
                <button
                  type="button"
                  className="therapy-btn therapy-btn--primary"
                  onClick={handleSave}
                  disabled={!composerText.trim()}
                >
                  {t('verlaufEntrySave')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
