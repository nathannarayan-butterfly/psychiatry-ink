import { useEffect, useId, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import type { AiMode } from '../../types/aiUsage'
import type {
  GenericEducationAudience,
  GenericEducationDetailStyle,
  GenericEducationLanguage,
  GenericEducationReadingLevel,
  GenericEducationSubjectKind,
} from '../../types/patientEducationGeneric'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import { KB_DRUG_SEED_DATA } from '../../data/knowledgeBaseDrugSeedData'
import { KNOWLEDGE_BASE_SEED } from '../../data/knowledgeBaseSeedData'

interface PatientEducationGenericNewDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (params: {
    subject: string
    subjectKind: GenericEducationSubjectKind
    audience: GenericEducationAudience
    readingLevel: GenericEducationReadingLevel
    detailStyle: GenericEducationDetailStyle
    additionalContext?: string
    language: GenericEducationLanguage
    aiMode: AiMode
  }) => void
}

/** Reputable, free-text subject ideas sourced from the local knowledge base. */
function buildSubjectSuggestions(language: string): string[] {
  const set = new Set<string>()
  for (const drug of KB_DRUG_SEED_DATA) {
    if (drug.genericName?.trim()) set.add(drug.genericName.trim())
  }
  for (const entry of KNOWLEDGE_BASE_SEED) {
    const title = (language === 'en' ? entry.titleEn : entry.title)?.trim()
    if (title) set.add(title)
  }
  return [...set].sort((a, b) => a.localeCompare(b)).slice(0, 200)
}

export function PatientEducationGenericNewDialog({
  open,
  onClose,
  onCreate,
}: PatientEducationGenericNewDialogProps) {
  const { language } = useTranslation()
  const listId = useId()
  const [subject, setSubject] = useState('')
  const [subjectKind, setSubjectKind] = useState<GenericEducationSubjectKind>('medikament')
  const [audience, setAudience] = useState<GenericEducationAudience>('patient')
  const [readingLevel, setReadingLevel] = useState<GenericEducationReadingLevel>('standard')
  const [detailStyle, setDetailStyle] = useState<GenericEducationDetailStyle>('standard')
  const [docLanguage, setDocLanguage] = useState<GenericEducationLanguage>(language === 'en' ? 'en' : 'de')
  const [aiMode, setAiMode] = useState<AiMode>('standard')
  const [additionalContext, setAdditionalContext] = useState('')
  const [touched, setTouched] = useState(false)

  const suggestions = useMemo(() => buildSubjectSuggestions(language), [language])

  useEffect(() => {
    if (open) {
      setSubject('')
      setAdditionalContext('')
      setTouched(false)
      setDocLanguage(language === 'en' ? 'en' : 'de')
    }
  }, [open, language])

  if (!open) return null

  const canCreate = subject.trim().length > 0

  const handleCreate = () => {
    if (!canCreate) {
      setTouched(true)
      return
    }
    onCreate({
      subject: subject.trim(),
      subjectKind,
      audience,
      readingLevel,
      detailStyle,
      additionalContext: additionalContext.trim() || undefined,
      language: docLanguage,
      aiMode,
    })
    onClose()
  }

  return (
    <div className="arztbrief-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="arztbrief-dialog medication-education-dialog">
        <h2 className="arztbrief-dialog__title">
          {translateMedicationUi(language, 'pegenNewDialogTitle')}
        </h2>

        <p className="patient-education-generic-dialog__phi-hint">
          <Info size={14} aria-hidden />
          {translateMedicationUi(language, 'pegenNoPhiHint')}
        </p>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenSubjectLabel')}</span>
          <input
            type="text"
            value={subject}
            list={listId}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={translateMedicationUi(language, 'pegenSubjectPlaceholder')}
            autoFocus
          />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        {touched && !canCreate ? (
          <p className="patient-education-generic-dialog__error">
            {translateMedicationUi(language, 'pegenSubjectRequired')}
          </p>
        ) : null}

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenSubjectKind')}</span>
          <select
            value={subjectKind}
            onChange={(e) => setSubjectKind(e.target.value as GenericEducationSubjectKind)}
          >
            <option value="medikament">{translateMedicationUi(language, 'pegenSubjectKindMedikament')}</option>
            <option value="erkrankung">{translateMedicationUi(language, 'pegenSubjectKindErkrankung')}</option>
            <option value="therapie">{translateMedicationUi(language, 'pegenSubjectKindTherapie')}</option>
            <option value="thema">{translateMedicationUi(language, 'pegenSubjectKindThema')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenAudience')}</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as GenericEducationAudience)}
          >
            <option value="patient">{translateMedicationUi(language, 'pegenAudiencePatient')}</option>
            <option value="angehoerige">{translateMedicationUi(language, 'pegenAudienceAngehoerige')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenReadingLevel')}</span>
          <select
            value={readingLevel}
            onChange={(e) => setReadingLevel(e.target.value as GenericEducationReadingLevel)}
          >
            <option value="standard">{translateMedicationUi(language, 'pegenReadingLevelStandard')}</option>
            <option value="einfache_sprache">{translateMedicationUi(language, 'pegenReadingLevelEinfach')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenDetail')}</span>
          <select
            value={detailStyle}
            onChange={(e) => setDetailStyle(e.target.value as GenericEducationDetailStyle)}
          >
            <option value="kurz">{translateMedicationUi(language, 'pegenDetailKurz')}</option>
            <option value="standard">{translateMedicationUi(language, 'pegenDetailStandard')}</option>
            <option value="ausfuehrlich">{translateMedicationUi(language, 'pegenDetailAusfuehrlich')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenLanguage')}</span>
          <select
            value={docLanguage}
            onChange={(e) => setDocLanguage(e.target.value as GenericEducationLanguage)}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenAiMode')}</span>
          <select value={aiMode} onChange={(e) => setAiMode(e.target.value as AiMode)}>
            <option value="standard">{translateMedicationUi(language, 'pegenModeStandard')}</option>
            <option value="gruendlich">{translateMedicationUi(language, 'pegenModeGruendlich')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'pegenAdditionalContext')}</span>
          <textarea
            value={additionalContext}
            rows={3}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder={translateMedicationUi(language, 'pegenAdditionalContextPlaceholder')}
          />
        </label>

        <div className="arztbrief-dialog__actions">
          <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onClose}>
            {translateMedicationUi(language, 'pegenCancel')}
          </button>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            disabled={!canCreate}
            onClick={handleCreate}
          >
            {translateMedicationUi(language, 'pegenCreate')}
          </button>
        </div>
      </div>
    </div>
  )
}
