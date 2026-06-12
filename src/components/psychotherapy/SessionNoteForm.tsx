import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  translatePsychotherapyUi as tp,
  translateSessionSetting,
} from '../../data/psychotherapyUiTranslations'
import { SESSION_SETTINGS, type SessionNote, type SessionSetting } from '../../types/psychotherapy'
import { buildSessionImprintMeta, generateSessionParagraph } from '../../utils/psychotherapy/sessionNote'

interface SessionNoteFormProps {
  editing?: SessionNote | null
  onSave: (note: SessionNote) => void
  onCancel: () => void
}

function emptyDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    setting: 'individual' as SessionSetting,
    duration: '50 min',
    topic: '',
    intervention: '',
    patientReaction: '',
    progress: '',
    riskAspects: '',
    nextFocus: '',
  }
}

export function SessionNoteForm({ editing, onSave, onCancel }: SessionNoteFormProps) {
  const { language } = useTranslation()
  const [draft, setDraft] = useState(() =>
    editing
      ? {
          date: editing.date,
          setting: editing.setting,
          duration: editing.duration,
          topic: editing.topic,
          intervention: editing.intervention,
          patientReaction: editing.patientReaction,
          progress: editing.progress,
          riskAspects: editing.riskAspects,
          nextFocus: editing.nextFocus,
        }
      : emptyDraft(),
  )

  const preview = generateSessionParagraph(draft, language)
  const canSave = draft.topic.trim() !== '' || draft.intervention.trim() !== ''

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const handleSave = () => {
    if (!canSave) return
    const generatedParagraph = generateSessionParagraph(draft, language)
    const note: SessionNote = {
      id: editing?.id ?? crypto.randomUUID(),
      ...draft,
      generatedParagraph,
      clinicalImprintMeta: buildSessionImprintMeta(draft, generatedParagraph),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    }
    onSave(note)
  }

  return (
    <div className="pt-session-form">
      <div className="pt-form-grid">
        <label className="pt-field">
          <span className="pt-field__label">{tp(language, 'ptDate')}</span>
          <input
            type="date"
            className="pt-input"
            value={draft.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </label>
        <label className="pt-field">
          <span className="pt-field__label">{tp(language, 'ptSetting')}</span>
          <select
            className="pt-input"
            value={draft.setting}
            onChange={(e) => set('setting', e.target.value as SessionSetting)}
          >
            {SESSION_SETTINGS.map((s) => (
              <option key={s} value={s}>
                {translateSessionSetting(language, s)}
              </option>
            ))}
          </select>
        </label>
        <label className="pt-field">
          <span className="pt-field__label">{tp(language, 'ptDuration')}</span>
          <input
            type="text"
            className="pt-input"
            value={draft.duration}
            onChange={(e) => set('duration', e.target.value)}
          />
        </label>
      </div>

      <label className="pt-field">
        <span className="pt-field__label">{tp(language, 'ptTopic')}</span>
        <input
          type="text"
          className="pt-input"
          value={draft.topic}
          onChange={(e) => set('topic', e.target.value)}
          autoFocus
        />
      </label>

      <label className="pt-field">
        <span className="pt-field__label">{tp(language, 'ptIntervention')}</span>
        <textarea
          className="pt-textarea"
          rows={2}
          value={draft.intervention}
          onChange={(e) => set('intervention', e.target.value)}
        />
      </label>

      <label className="pt-field">
        <span className="pt-field__label">{tp(language, 'ptPatientReaction')}</span>
        <textarea
          className="pt-textarea"
          rows={2}
          value={draft.patientReaction}
          onChange={(e) => set('patientReaction', e.target.value)}
        />
      </label>

      <div className="pt-form-grid">
        <label className="pt-field">
          <span className="pt-field__label">{tp(language, 'ptProgress')}</span>
          <textarea
            className="pt-textarea"
            rows={2}
            value={draft.progress}
            onChange={(e) => set('progress', e.target.value)}
          />
        </label>
        <label className="pt-field">
          <span className="pt-field__label">{tp(language, 'ptRiskAspects')}</span>
          <textarea
            className="pt-textarea"
            rows={2}
            value={draft.riskAspects}
            onChange={(e) => set('riskAspects', e.target.value)}
          />
        </label>
      </div>

      <label className="pt-field">
        <span className="pt-field__label">{tp(language, 'ptNextFocus')}</span>
        <input
          type="text"
          className="pt-input"
          value={draft.nextFocus}
          onChange={(e) => set('nextFocus', e.target.value)}
        />
      </label>

      {preview.trim() && (
        <div className="pt-paragraph-preview">
          <span className="pt-field__label">{tp(language, 'ptGeneratedParagraph')}</span>
          <p className="pt-paragraph-preview__text">{preview}</p>
        </div>
      )}

      <div className="pt-form-actions">
        <button type="button" className="pt-btn pt-btn--ghost" onClick={onCancel}>
          {tp(language, 'ptCancel')}
        </button>
        <button type="button" className="pt-btn pt-btn--primary" onClick={handleSave} disabled={!canSave}>
          {tp(language, 'ptSaveSession')}
        </button>
      </div>
    </div>
  )
}
