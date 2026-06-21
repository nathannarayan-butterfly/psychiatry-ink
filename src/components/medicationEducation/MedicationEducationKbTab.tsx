import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Save } from 'lucide-react'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import type { MedicationEducationTemplate, MedicationEducationKbApprovalStatus } from '../../types/medicationEducation'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import {
  createEmptyKbTemplate,
  getMedicationEducationKbTemplate,
  saveMedicationEducationKbTemplate,
  MEDICATION_EDUCATION_KB_CHANGED_EVENT,
} from '../../utils/medicationEducation/kbTemplateStorage'
import { assessKbTemplateCompleteness, deriveKbTemplateFromDrug } from '../../utils/medicationEducation/kbCompleteness'

const TEXT_FIELDS: Array<{ key: keyof MedicationEducationTemplate; labelKey: string }> = [
  { key: 'shortPatientSummary', labelKey: 'medEducationKbShortSummary' },
  { key: 'mechanismSimple', labelKey: 'medEducationKbMechanism' },
  { key: 'whyPrescribed', labelKey: 'medEducationKbWhy' },
  { key: 'whenEffect', labelKey: 'medEducationKbWhenEffect' },
  { key: 'howToTake', labelKey: 'medEducationKbHowToTake' },
  { key: 'commonSideEffects', labelKey: 'medEducationKbSideEffects' },
  { key: 'seriousWarnings', labelKey: 'medEducationKbWarnings' },
  { key: 'monitoringRequirements', labelKey: 'medEducationKbMonitoring' },
  { key: 'interactions', labelKey: 'medEducationKbInteractions' },
  { key: 'dailyLife', labelKey: 'medEducationKbDailyLife' },
  { key: 'pregnancyLactation', labelKey: 'medEducationKbPregnancy' },
  { key: 'ifSideEffects', labelKey: 'medEducationKbIfSideEffects' },
  { key: 'missedDose', labelKey: 'medEducationKbMissedDose' },
  { key: 'drivingWork', labelKey: 'medEducationKbDriving' },
  { key: 'fullLeafletText', labelKey: 'medEducationKbFullLeaflet' },
]

interface MedicationEducationKbTabProps {
  drug: KnowledgeBaseDrug
  canEdit: boolean
}

export function MedicationEducationKbTab({ drug, canEdit }: MedicationEducationKbTabProps) {
  const { language } = useTranslation()
  const docLanguage = language === 'en' ? 'en' : 'de'
  const [template, setTemplate] = useState<MedicationEducationTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let t = await getMedicationEducationKbTemplate(drug.id, docLanguage)
      if (!t) {
        const derived = deriveKbTemplateFromDrug(drug)
        t = {
          ...createEmptyKbTemplate({
            medicationId: drug.id,
            substanceName: drug.genericName,
            brandNames: drug.brandNames,
            language: docLanguage,
          }),
          ...derived,
        }
      }
      setTemplate(t)
    } finally {
      setLoading(false)
    }
  }, [docLanguage, drug])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const handler = () => void load()
    window.addEventListener(MEDICATION_EDUCATION_KB_CHANGED_EVENT, handler)
    return () => window.removeEventListener(MEDICATION_EDUCATION_KB_CHANGED_EVENT, handler)
  }, [load])

  const assessment = template ? assessKbTemplateCompleteness(template) : null

  const updateField = (key: keyof MedicationEducationTemplate, value: string) => {
    if (!template) return
    setTemplate({ ...template, [key]: value, updatedAt: new Date().toISOString() })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    try {
      await saveMedicationEducationKbTemplate({ ...template, version: template.version + 1 })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (status: MedicationEducationKbApprovalStatus) => {
    if (!template) return
    const now = new Date().toISOString()
    await saveMedicationEducationKbTemplate({
      ...template,
      approvalStatus: status,
      reviewedAt: now,
      updatedAt: now,
    })
    await load()
  }

  if (loading) {
    return (
      <p className="medication-education-kb-tab__loading">
        <Loader2 size={16} className="spin" aria-hidden />
      </p>
    )
  }

  if (!template) return null

  return (
    <section className="medication-education-kb-tab kbp-section" id="medication-education-kb">
      <header className="medication-education-kb-tab__header">
        <h2>{translateMedicationUi(language, 'medEducationKbTabTitle')}</h2>
        <p>{translateMedicationUi(language, 'medEducationKbTabDesc')}</p>
        {assessment ? (
          <p className="medication-education-kb-tab__coverage">
            {translateMedicationUi(language, 'medEducationKbCoverage')}: {assessment.coveragePercent}%
            {assessment.missingFields.length > 0
              ? ` — ${translateMedicationUi(language, 'medEducationKbMissing')}: ${assessment.missingFields.join(', ')}`
              : ''}
          </p>
        ) : null}
        <p className="medication-education-kb-tab__status">
          {translateMedicationUi(language, 'medEducationKbApproval')}: {template.approvalStatus}
        </p>
      </header>

      <div className="medication-education-kb-tab__fields">
        {TEXT_FIELDS.map(({ key, labelKey }) => (
          <label key={key} className="medication-education-kb-tab__field">
            <span>{translateMedicationUi(language, labelKey as never)}</span>
            <textarea
              value={String(template[key] ?? '')}
              disabled={!canEdit}
              rows={key === 'fullLeafletText' ? 8 : 4}
              onChange={(e) => updateField(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      {canEdit ? (
        <div className="medication-education-kb-tab__actions">
          <button type="button" className="kbp-btn kbp-btn--primary" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {translateMedicationUi(language, 'medEducationKbSave')}
          </button>
          <button type="button" className="kbp-btn" onClick={() => void handleApprove('clinician_reviewed')}>
            <Check size={14} />
            {translateMedicationUi(language, 'medEducationKbMarkReviewed')}
          </button>
          <button type="button" className="kbp-btn" onClick={() => void handleApprove('approved')}>
            {translateMedicationUi(language, 'medEducationKbApprove')}
          </button>
          {saved ? <span className="medication-education-kb-tab__saved">{translateMedicationUi(language, 'medEducationKbSaved')}</span> : null}
        </div>
      ) : null}
    </section>
  )
}
