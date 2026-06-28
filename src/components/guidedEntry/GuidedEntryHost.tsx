import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type {
  GuidedEntryFieldValues,
  GuidedEntryInstance,
  GuidedEntryItemType,
  GuidedEntryMode,
} from '../../types/guidedEntry'
import { getGuidedEntrySchema } from '../../data/guidedEntry/schemas'
import { applyGuidedOutput } from '../../utils/guidedEntry/applyGuidedOutput'
import {
  abandonGuidedEntryInstance,
  findInProgressGuidedEntry,
  saveGuidedEntryInstance,
} from '../../utils/guidedEntry/guidedEntryVault'
import { buildPrefilledValues } from '../../utils/guidedEntry/prefillResolver'
import { answersToFieldValues, fieldValuesToAnswers } from '../../utils/guidedEntry/stepEngine'
import { EntryModeChooser } from './EntryModeChooser'
import { GuidedEntryWizard } from './GuidedEntryWizard'

export interface GuidedEntryCompletionResult {
  itemType: GuidedEntryItemType
  text: string
  navigate?: {
    pageId: string
    variantId?: string
    sectionId?: string
  }
  workspaceContent?: string
  workspaceSectionContents?: Record<string, string>
}

export interface GuidedEntryHostProps {
  caseId: string
  userId?: string
  /**
   * Whether the generated output may be written into the (patient) case via
   * `applyGuidedOutput`. Defaults to `true`. In the patient-less workspace this
   * is `false`, so a stray patient-bound guided type (verlauf, psychopath
   * finding, ECG befund-record) can never write a verlauf entry / befund record
   * / section onto the default case — standalone needs are handled by the
   * StandaloneBefundWidget / standalone notes instead.
   */
  canApplyToCase?: boolean
  /** When set, shows entry mode chooser / wizard for this item type. */
  activeItemType: GuidedEntryItemType | null
  onClose: () => void
  onDirectEntry: (itemType: GuidedEntryItemType) => void
  onComplete: (result: GuidedEntryCompletionResult) => void
}

export function GuidedEntryHost({
  caseId,
  userId,
  canApplyToCase = true,
  activeItemType,
  onClose,
  onDirectEntry,
  onComplete,
}: GuidedEntryHostProps) {
  const { language } = useTranslation()
  const [phase, setPhase] = useState<'chooser' | 'wizard' | null>(null)
  const [instance, setInstance] = useState<GuidedEntryInstance | null>(null)
  const [initialValues, setInitialValues] = useState<GuidedEntryFieldValues>({})
  const [prefillSources, setPrefillSources] = useState<Record<string, 'prefill'>>({})

  const schema = useMemo(
    () => (activeItemType ? getGuidedEntrySchema(activeItemType) : null),
    [activeItemType],
  )

  useEffect(() => {
    if (!activeItemType || !schema) {
      setPhase(null)
      return
    }
    setPhase('chooser')
  }, [activeItemType, schema])

  const openWizard = useCallback(
    async (itemType: GuidedEntryItemType, entrySchema: NonNullable<typeof schema>) => {
      const draft = await findInProgressGuidedEntry(caseId, itemType)
      if (draft) {
        setInstance(draft)
        setInitialValues(answersToFieldValues(draft.answers))
        setPrefillSources({})
        return
      }

      const { values, sources } = buildPrefilledValues(
        entrySchema.fields.map((f) => ({ fieldId: f.id, prefillPath: f.prefillPath })),
        { caseId, language },
      )
      setInitialValues(values)
      setPrefillSources(sources)

      const now = new Date().toISOString()
      setInstance({
        id: crypto.randomUUID(),
        itemType,
        caseId,
        status: 'draft',
        currentStepIndex: 0,
        answers: fieldValuesToAnswers(entrySchema, values, sources),
        auditTrail: [{ at: now, action: 'open' }],
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      })
    },
    [caseId, language, userId],
  )

  const handleModeChoose = useCallback(
    async (mode: GuidedEntryMode) => {
      if (!activeItemType || !schema) return
      if (mode === 'direct') {
        onDirectEntry(activeItemType)
        onClose()
        return
      }
      await openWizard(activeItemType, schema)
      setPhase('wizard')
    },
    [activeItemType, onClose, onDirectEntry, openWizard, schema],
  )

  const handleSaveDraft = useCallback(
    async (payload: {
      values: GuidedEntryFieldValues
      stepIndex: number
      generatedText?: string
    }) => {
      if (!instance || !schema) return
      const answers = fieldValuesToAnswers(schema, payload.values, prefillSources)
      const updated: GuidedEntryInstance = {
        ...instance,
        currentStepIndex: payload.stepIndex,
        answers,
        generatedText: payload.generatedText,
        updatedAt: new Date().toISOString(),
        auditTrail: [
          ...instance.auditTrail,
          { at: new Date().toISOString(), action: 'draft_saved', stepIndex: payload.stepIndex },
        ],
      }
      await saveGuidedEntryInstance(caseId, updated)
      setInstance(updated)
    },
    [caseId, instance, prefillSources, schema],
  )

  const handleGenerate = useCallback(
    async (payload: {
      text: string
      answers: GuidedEntryInstance['answers']
      values: GuidedEntryFieldValues
    }) => {
      if (!instance || !schema || !activeItemType) return

      const completed: GuidedEntryInstance = {
        ...instance,
        status: 'completed',
        answers: payload.answers,
        reviewedText: payload.text,
        generatedText: payload.text,
        updatedAt: new Date().toISOString(),
        auditTrail: [
          ...instance.auditTrail,
          { at: new Date().toISOString(), action: 'completed' },
        ],
      }
      await saveGuidedEntryInstance(caseId, completed)

      // Patient-less workspace: never write the output into a case. The vault
      // draft above is per-device scratch only; the case-mutating
      // `applyGuidedOutput` (verlauf feed / befund record / section) is skipped.
      if (!canApplyToCase) {
        onComplete({ itemType: activeItemType, text: payload.text })
        onClose()
        return
      }

      const result = applyGuidedOutput({
        caseId,
        schema,
        text: payload.text,
        answers: payload.answers,
        instanceId: instance.id,
        mode: 'guided',
        userId,
        language,
      })

      onComplete({
        itemType: activeItemType,
        text: payload.text,
        navigate: result.navigate,
        workspaceContent: result.workspaceContent,
        workspaceSectionContents: result.workspaceSectionContents,
      })
      onClose()
    },
    [activeItemType, canApplyToCase, caseId, instance, language, onClose, onComplete, schema, userId],
  )

  const handleCancel = useCallback(() => {
    if (instance?.id) {
      void abandonGuidedEntryInstance(caseId, instance.id)
    }
    onClose()
  }, [caseId, instance?.id, onClose])

  if (!activeItemType || !schema) return null

  return (
    <>
      <EntryModeChooser
        open={phase === 'chooser'}
        itemType={activeItemType}
        onChoose={handleModeChoose}
        onCancel={onClose}
      />
      <GuidedEntryWizard
        open={phase === 'wizard'}
        schema={schema}
        caseId={caseId}
        userId={userId}
        initialValues={initialValues}
        initialStepIndex={instance?.currentStepIndex ?? 0}
        initialGeneratedText={instance?.generatedText ?? ''}
        onSaveDraft={handleSaveDraft}
        onGenerate={handleGenerate}
        onCancel={handleCancel}
      />
    </>
  )
}
