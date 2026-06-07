import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  appendTherapieEintrag,
  deleteTherapieEintrag,
  loadTherapieEintraege,
  type TherapieEintrag,
} from '../../utils/therapieArchive'

interface TherapiePageProps {
  caseId: string
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return iso.slice(0, 10)
  }
}

export function TherapiePage({ caseId }: TherapiePageProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<TherapieEintrag[]>(() => loadTherapieEintraege(caseId))
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerDate, setComposerDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setEntries(loadTherapieEintraege(caseId))
  }, [caseId])

  const handleSave = useCallback(() => {
    if (!composerText.trim()) return
    appendTherapieEintrag(caseId, {
      date: composerDate || new Date().toISOString().slice(0, 10),
      text: composerText.trim(),
    })
    setEntries(loadTherapieEintraege(caseId))
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerOpen(false)
  }, [caseId, composerDate, composerText])

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
    <div className="therapie-page">
      <header className="therapie-page__header">
        <h2 className="therapie-page__title">{t('topNavTherapie')}</h2>
        {!composerOpen && (
          <button
            type="button"
            className="therapie-page__new-btn"
            onClick={() => setComposerOpen(true)}
          >
            ＋ {t('therapieNewEntry')}
          </button>
        )}
      </header>

      {composerOpen && (
        <div className="therapie-composer">
          <div className="therapie-composer__date-row">
            <label className="therapie-composer__date-label">
              Datum
              <input
                type="date"
                className="therapie-composer__date-input"
                value={composerDate}
                onChange={(e) => setComposerDate(e.target.value)}
              />
            </label>
          </div>
          <textarea
            className="therapie-composer__textarea"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder={t('therapieNewEntry') + '…'}
            rows={5}
            autoFocus
          />
          <div className="therapie-composer__actions">
            <button
              type="button"
              className="therapie-composer__cancel-btn"
              onClick={handleCancel}
            >
              {t('verlaufEntryCancel')}
            </button>
            <button
              type="button"
              className="therapie-composer__save-btn"
              onClick={handleSave}
              disabled={!composerText.trim()}
            >
              {t('verlaufEntrySave')}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 && !composerOpen ? (
        <p className="therapie-page__empty">{t('therapieEmpty')}</p>
      ) : (
        <div className="therapie-page__list">
          {entries.map((entry) => (
            <article key={entry.id} className="therapie-entry">
              <header className="therapie-entry__header">
                <time className="therapie-entry__date" dateTime={entry.date}>
                  {formatDate(entry.date)}
                </time>
                <button
                  type="button"
                  className="therapie-entry__delete-btn"
                  onClick={() => handleDelete(entry.id)}
                  title="Eintrag löschen"
                  aria-label="Eintrag löschen"
                >
                  ×
                </button>
              </header>
              <p className="therapie-entry__text">{entry.text}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
