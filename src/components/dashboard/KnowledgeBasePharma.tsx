import {
  ArrowLeft,
  Bold,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Highlighter,
  MessageSquarePlus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Underline,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { useKnowledgeBaseAnnotations } from '../../hooks/useKnowledgeBaseAnnotations'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import { useKnowledgeBasePermissions } from '../../hooks/useKnowledgeBasePermissions'
import {
  useCountrySpecificPreparations,
  useMedicationMarketAvailability,
  formatPreparationStrength,
  isVerifiedPreparation,
} from '../../hooks/useMedicationMarketAvailability'
import {
  PRESCRIBING_COUNTRY_LABELS,
  PRESCRIBING_COUNTRY_NATIVE_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { formatPreparationLine } from '../../utils/kb/formatPreparationLine'
import { getStructureImageAttribution } from '../../utils/kb/wikimediaStructureImages'
import { KbPharmaClassifiedBrowse } from './KbPharmaClassifiedBrowse'
import { KbStructureImage, KbStructureImageAttributionFooter } from './KbStructureImage'
import { showNotionToast } from '../notion/NotionToast'
import { generatePharmaDetails, type AiGeneratedPreparation } from '../../services/pharmaAiApi'
import { useKnowledgeBaseAiTier, type KbAiTier } from '../../hooks/useKnowledgeBaseAiTier'
import { useKbCurrentRelease } from '../../hooks/useKbCurrentRelease'
import type { StructuredAiBundle } from '../../utils/medication/structuredAi'
import {
  createDefaultSections,
  DEFAULT_SECTION_TEMPLATES,
  getSectionKind,
  isPsychClassUnset,
  normalizePsychClass,
  PSYCH_CLASS_TO_CATEGORY,
  PSYCHOPHARMACA_CLASSES,
  sectionHasStructuredData,
  type DrugSection,
  type DrugSectionKey,
  type KnowledgeBaseDrug,
  type MedicationMarketAvailability,
  type PrescribingCountryCode,
  type PreparationVerificationStatus,
  type PsychopharmacaClass,
  type ReceptorAffinityEntry,
  type ReceptorProfileDetail,
} from '../../types/knowledgeBase'
import {
  CLINICAL_HINT_SECTION_KEYS,
  KB_CANONICAL_PLACEHOLDER,
  canonicalSectionNumber,
  sectionByKey,
  visibleCanonicalSections,
  type CanonicalKbSection,
} from '../../data/knowledgeBaseSectionRegistry'
import { getReceptorActionLabel, getReceptorDisplayLabel, getReceptorTitleLabel } from '../../data/receptorProfile'
import {
  HIGHLIGHT_COLORS,
  KB_RECEPTOR_SECTION_ID,
  type HighlightColor,
  type HighlightStyle,
  type UserHighlight,
} from '../../types/knowledgeBaseAnnotations'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { getDisplayReceptorProfile } from '../../utils/medication/receptorAffinity'
import { sectionToFullText } from '../../utils/medication/structuredSectionText'
import { HighlightedText, getTextSelectionOffsets } from './KnowledgeBaseHighlightedText'
import { KnowledgeBaseNotes } from './KnowledgeBaseNotes'
import { KnowledgeBaseReadingPanel, type ReadingPanelRequest } from './KnowledgeBaseReadingPanel'
import {
  KbSectionContributionDialog,
  type KbContributionSectionKey,
} from './KbSectionContributionDialog'
import { KnowledgeBaseReceptorEditor } from './KnowledgeBaseReceptorEditor'
import { MedicationExportMenu } from './MedicationExportMenu'
import { KeyFactsTable } from '../medication/kb/KeyFactsTable'
import { KbStructuredSection } from '../medication/kb/KbStructuredSection'
import { KbStructuredEditor } from '../medication/kb/KbStructuredEditor'
import { KbSectionNav, kbSectionDomId, type KbNavItem } from '../medication/kb/KbSectionNav'
import { ReceptorRadar } from '../medication/kb/charts/ReceptorRadar'
import { kbT } from '../medication/kb/kbStrings'
import { derivePsychClass, getPsychClassLabel } from '../../utils/medication/psychClass'
import { extractKbSubstanceId } from '../../utils/kbSubstanceId'
import { useKbContributors } from '../../hooks/useKbContributors'

interface KnowledgeBasePharmaProps {
  onClose: () => void
  onCloseAll?: () => void
  collectionId?: string
  collectionName?: string
}

type KnowledgeBaseMode = 'reading' | 'editing'
type CreateProfileAction = 'empty' | 'ai_draft' | 'source_import'
type PreparationDraft = Omit<MedicationMarketAvailability, 'id' | 'createdAt'> | MedicationMarketAvailability

function drugSnapshotsEqual(a: KnowledgeBaseDrug, b: KnowledgeBaseDrug): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function isNormalizedKbDrug(drug: KnowledgeBaseDrug): boolean {
  return drug.tags?.includes('normalized-kb') ?? false
}

function drugNeedsClinicalReview(drug: KnowledgeBaseDrug): boolean {
  if (drug.needsClinicalReview === true) return true
  if (drug.needsClinicalReview === false) return false
  return isNormalizedKbDrug(drug)
}

function clinicalReviewBadgeCopy(language: string): { label: string; title: string } {
  if (language === 'de') {
    return {
      label: 'Klinische Prüfung empfohlen',
      title:
        'Inhalt ist sichtbar und editierbar. Bitte vor klinischer Anwendung selbst prüfen und bei Bedarf personalisieren.',
    }
  }
  return {
    label: 'Review needed',
    title:
      'Content is visible and editable. Verify before clinical use and personalize as needed.',
  }
}

function communityEditableBadgeCopy(language: string): { label: string; title: string } {
  if (language === 'de') {
    return {
      label: 'Community editierbar',
      title: 'Aus normalisierter KB projiziert — klinisch editierbar.',
    }
  }
  return {
    label: 'Community editable',
    title: 'Projected from normalized KB — clinically editable.',
  }
}

function getSectionDataForAsk(
  drug: KnowledgeBaseDrug,
  sectionId: string,
  sections: DrugSection[],
): string {
  if (sectionId === KB_RECEPTOR_SECTION_ID) {
    const prose = sections.find((s) => s.key === 'rezeptorprofil')?.content ?? ''
    const profile = getDisplayReceptorProfile(drug)
    const summary = profile.entries
      .slice(0, 12)
      .map((e) => `${e.target}: ${e.affinityPercent ?? '—'}% (${e.action})`)
      .join('\n')
    return [prose, summary].filter(Boolean).join('\n\n')
  }
  if (sectionId === 'canonical-klinischeHinweise') {
    return CLINICAL_HINT_SECTION_KEYS
      .map((key) => sections.find((section) => section.key === key))
      .filter((section): section is DrugSection => Boolean(section))
      .map((section) => sectionToFullText(section))
      .filter(Boolean)
      .join('\n\n')
  }
  const section = sections.find((s) => s.id === sectionId) ?? sections.find((s) => s.key === sectionId)
  return section ? sectionToFullText(section) : ''
}

/**
 * Merge an AI structured bundle into the matching sections by `key`, also
 * stamping `kind` so the structured renderer/editor activates. Only the section
 * keys covered by the bundle are touched; everything else is returned as-is.
 */
function applyStructuredBundle(
  sections: DrugSection[],
  bundle: StructuredAiBundle,
  /** When set, restrict application to a single section key (per-section regen). */
  onlyKey?: DrugSectionKey,
): DrugSection[] {
  if (
    !bundle.pk &&
    !bundle.titration &&
    !bundle.taper &&
    !bundle.depotOptions &&
    !bundle.sideEffects &&
    !bundle.cyp
  ) {
    return sections
  }
  return sections.map((s) => {
    if (onlyKey && s.key !== onlyKey) return s
    switch (s.key) {
      case 'pharmakokinetik':
        return bundle.pk ? { ...s, kind: 'pk' as const, pk: bundle.pk } : s
      case 'dosierung':
        return bundle.titration ? { ...s, kind: 'titration' as const, titration: bundle.titration } : s
      case 'absetzen':
        return bundle.taper ? { ...s, kind: 'taper' as const, titration: bundle.taper } : s
      case 'umstellung':
        return bundle.depotOptions
          ? { ...s, kind: 'depot' as const, depotOptions: bundle.depotOptions }
          : s
      case 'nebenwirkungen':
        return bundle.sideEffects
          ? { ...s, kind: 'sideEffects' as const, sideEffects: bundle.sideEffects }
          : s
      case 'wechselwirkungen':
        return bundle.cyp ? { ...s, kind: 'cyp' as const, cyp: bundle.cyp } : s
      default:
        return s
    }
  })
}

/**
 * Build the partial update that upgrades a drug to a v2 relative-affinity
 * profile, preserving any pre-existing legacy 1–5 data in `legacyReceptorProfile`
 * (never silently discarded) and stamping the regeneration time.
 */
function buildReceptorUpgradePatch(
  drug: KnowledgeBaseDrug,
  receptorAffinityProfile: KnowledgeBaseDrug['receptorAffinityProfile'],
): Partial<KnowledgeBaseDrug> {
  const patch: Partial<KnowledgeBaseDrug> = {
    receptorProfileVersion: 2,
    affinityScale: 'relative_log_ki_percent',
    receptorAffinityProfile,
    lastReceptorProfileUpdatedAt: new Date().toISOString(),
  }
  // Snapshot legacy data once, the first time we upgrade.
  const hasLegacyData =
    (drug.receptorProfile && Object.keys(drug.receptorProfile).length > 0) ||
    (drug.receptorProfileDetails && Object.keys(drug.receptorProfileDetails).length > 0)
  if (drug.receptorProfileVersion !== 2 && hasLegacyData && !drug.legacyReceptorProfile) {
    patch.legacyReceptorProfile = {
      profile: drug.receptorProfile,
      details: drug.receptorProfileDetails,
      archivedAt: new Date().toISOString(),
    }
  }
  return patch
}

// ── Add Drug Dialog ──────────────────────────────────────────────────────────

interface AddDrugDialogProps {
  onSubmit: (drug: Omit<KnowledgeBaseDrug, 'id' | 'createdAt' | 'updatedAt'>, action: CreateProfileAction) => void
  onCancel: () => void
}

function AddDrugDialog({ onSubmit, onCancel }: AddDrugDialogProps) {
  const { t, language } = useTranslation()
  const [genericName, setGenericName] = useState('')
  const [brandNamesRaw, setBrandNamesRaw] = useState('')
  const [psychClass, setPsychClass] = useState<PsychopharmacaClass>('unspecified')
  const [classTouched, setClassTouched] = useState(false)
  const [creationAction, setCreationAction] = useState<CreateProfileAction>('empty')

  // Derive a sensible default class from the typed name until the user overrides
  // it, so new profiles get a real classification instead of "Auto"/empty.
  const handleGenericNameChange = (value: string) => {
    setGenericName(value)
    if (!classTouched) setPsychClass(derivePsychClass(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = genericName.trim()
    if (!trimmed) return
    const resolvedClass = classTouched ? psychClass : derivePsychClass(trimmed)
    const derivedCategory = PSYCH_CLASS_TO_CATEGORY[resolvedClass] ?? 'Auto'
    onSubmit({
      genericName: trimmed,
      brandNames: brandNamesRaw.split(',').map((s) => s.trim()).filter(Boolean),
      drugClass: '',
      category: derivedCategory,
      psychClass: resolvedClass,
      tags: [],
      status: 'active',
      dataModelVersion: 2,
      verificationStatus: creationAction === 'empty' ? 'draft' : 'ai_draft',
      sourceHierarchyLevel: creationAction === 'source_import' ? 'source-import-requested' : undefined,
      sections: createDefaultSections(),
    }, creationAction)
  }

  return (
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog">
        <div className="kbp-dialog__header">
          <h2 className="kbp-dialog__title">{t('kbPharmaNewDrugTitle')}</h2>
          <button type="button" className="kbp-icon-btn" onClick={onCancel} aria-label={t('kbPharmaCancel')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="kbp-dialog__form">
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-generic-name">
              {t('kbPharmaFieldGenericName')} *
            </label>
            <input
              id="kbp-generic-name"
              type="text"
              className="kbp-field__input"
              value={genericName}
              onChange={(e) => handleGenericNameChange(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-brand-names">
              {t('kbPharmaFieldBrandNames')}
            </label>
            <input
              id="kbp-brand-names"
              type="text"
              className="kbp-field__input"
              value={brandNamesRaw}
              onChange={(e) => setBrandNamesRaw(e.target.value)}
              placeholder="Haldol®, …"
            />
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label" htmlFor="kbp-classification">
              {t('kbPharmaFieldClassification')}
            </label>
            <select
              id="kbp-classification"
              className="kbp-field__select"
              value={psychClass}
              onChange={(e) => {
                setClassTouched(true)
                setPsychClass(e.target.value as PsychopharmacaClass)
              }}
            >
              {PSYCHOPHARMACA_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{getPsychClassLabel(cls, language)}</option>
              ))}
            </select>
          </div>
          <div className="kbp-field">
            <label className="kbp-field__label">Startaktion</label>
            <div className="kbp-field__radio-group">
              <label className="kbp-field__radio">
                <input type="radio" value="empty" checked={creationAction === 'empty'} onChange={() => setCreationAction('empty')} />
                Leeres Profil erstellen
              </label>
              <label className="kbp-field__radio">
                <input type="radio" value="ai_draft" checked={creationAction === 'ai_draft'} onChange={() => setCreationAction('ai_draft')} />
                Mit KI-Entwurf erstellen
              </label>
              <label className="kbp-field__radio">
                <input type="radio" value="source_import" checked={creationAction === 'source_import'} onChange={() => setCreationAction('source_import')} />
                Quelle importieren/anreichern (KI-Entwurf)
              </label>
            </div>
          </div>
          <div className="kbp-dialog__actions">
            <button type="submit" className="kbp-btn kbp-btn--primary">{t('kbPharmaCreateBtn')}</button>
            <button type="button" className="kbp-btn" onClick={onCancel}>{t('kbPharmaCancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Finalize Confirm Dialog ──────────────────────────────────────────────────

function FinalizeConfirmDialog({
  onConfirm,
  onDiscard,
  onCancel,
}: {
  onConfirm: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--sm">
        <h2 className="kbp-dialog__title">{t('kbFinalizeTitle')}</h2>
        <p className="kbp-dialog__delete-text">{t('kbFinalizeMessage')}</p>
        <div className="kbp-dialog__actions">
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onConfirm}>
            {t('kbFinalizeYes')}
          </button>
          <button type="button" className="kbp-btn" onClick={onDiscard}>
            {t('kbFinalizeNo')}
          </button>
          <button type="button" className="kbp-btn" onClick={onCancel}>
            {t('kbPharmaCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  drugName,
  onConfirm,
  onCancel,
}: {
  drugName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--sm">
        <p className="kbp-dialog__delete-text">
          {t('kbPharmaDeleteConfirm')}
          <br />
          <strong>{drugName}</strong>
        </p>
        <div className="kbp-dialog__actions">
          <button type="button" className="kbp-btn kbp-btn--danger" onClick={onConfirm}>
            {t('kbPharmaDelete')}
          </button>
          <button type="button" className="kbp-btn" onClick={onCancel}>
            {t('kbPharmaCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Item ─────────────────────────────────────────────────────────────

interface SectionItemProps {
  section: DrugSection
  drug: KnowledgeBaseDrug
  language: string
  isFirst: boolean
  isLast: boolean
  isCollapsed: boolean
  mode: KnowledgeBaseMode
  isActive?: boolean
  displayTitle?: string
  domId?: string
  isSubsection?: boolean
  emptyText?: string
  onActivate?: () => void
  onToggleCollapse: () => void
  onContentChange: (content: string) => void
  onStructuredChange?: (patch: Partial<DrugSection>) => void
  onLabelChange: (label: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleHidden: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRegenerate?: () => void
  regenerateLoading?: boolean
  regenerateError?: string | null
  highlights?: UserHighlight[]
  onAddAnnotation?: (
    startOffset: number,
    endOffset: number,
    text: string,
    style: HighlightStyle,
    color?: HighlightColor,
  ) => void
  onRemoveHighlight?: (highlightId: string) => void
  onCommentSelection?: (text: string) => void
  onAskAiSelection?: (text: string) => void
  /** Section-level comment trigger (graph sections, where in-text select N/A). */
  onSectionComment?: () => void
  onSectionAskAi?: () => void
}

function SectionItem({
  section,
  drug,
  language,
  isFirst,
  isLast,
  isCollapsed,
  mode,
  isActive = false,
  displayTitle,
  domId,
  isSubsection = false,
  emptyText,
  onActivate,
  onToggleCollapse,
  onContentChange,
  onStructuredChange,
  onLabelChange,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onDuplicate,
  onDelete,
  onRegenerate,
  regenerateLoading = false,
  regenerateError = null,
  highlights = [],
  onAddAnnotation,
  onRemoveHighlight,
  onCommentSelection,
  onAskAiSelection,
  onSectionComment,
  // onSectionAskAi is intentionally not used here: the section-level KI action
  // is edit-mode only, so it is omitted from the reading-mode section header.
}: SectionItemProps) {
  const { t } = useTranslation()
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(section.label)
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(null)
  const [pendingSelection, setPendingSelection] = useState<{ startOffset: number; endOffset: number; text: string } | null>(null)
  const [showHighlightColors, setShowHighlightColors] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const editMode = mode === 'editing'
  const sectionKind = getSectionKind(section)
  const isStructured = sectionKind !== 'text'
  const isEmptyReadingSection =
    !editMode && !section.content.trim() && !sectionHasStructuredData(section)

  const closeSelectionToolbar = useCallback(() => {
    setSelectionToolbar(null)
    setPendingSelection(null)
    setShowHighlightColors(false)
  }, [])

  // Dismiss the floating toolbar on click-away or when the selection clears.
  useEffect(() => {
    if (!selectionToolbar) return
    const handlePointerDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return
      closeSelectionToolbar()
    }
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) closeSelectionToolbar()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [selectionToolbar, closeSelectionToolbar])

  if (section.hidden && !editMode) return null

  const dimmed = section.hidden && editMode

  const commitLabel = () => {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== section.label) onLabelChange(trimmed)
    else setLabelDraft(section.label)
  }

  const handleReadingHeaderClick = () => {
    onActivate?.()
    onToggleCollapse()
  }

  const handleContentMouseUp = () => {
    if (editMode || !contentRef.current) return
    // Read the selection on the next frame so the browser has committed the
    // native selection first (keeps drag-selecting smooth, avoids stale reads).
    requestAnimationFrame(() => {
      const container = contentRef.current
      if (!container) return
      const offsets = getTextSelectionOffsets(container, section.content)
      if (!offsets) {
        closeSelectionToolbar()
        return
      }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (!rect) return
      onActivate?.()
      setPendingSelection(offsets)
      // The toolbar is `position: fixed` and rendered in a portal on document.body,
      // so use viewport coordinates directly (no offset-parent / scroll math). This
      // keeps it from being clipped by the scrolling, full-width reading layout.
      // Place it above the selection, flipping below when there is no room at the top.
      const TOOLBAR_GAP = 44
      const topCandidate = rect.top - TOOLBAR_GAP
      const top = topCandidate < 8 ? rect.bottom + 8 : topCandidate
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, 80),
        window.innerWidth - 80,
      )
      setSelectionToolbar({ top, left })
    })
  }

  const handleAnnotate = (style: HighlightStyle, color?: HighlightColor) => {
    if (!pendingSelection || !onAddAnnotation) return
    onAddAnnotation(pendingSelection.startOffset, pendingSelection.endOffset, pendingSelection.text, style, color)
    closeSelectionToolbar()
    window.getSelection()?.removeAllRanges()
  }

  const handleCopySelection = async () => {
    if (!pendingSelection) return
    try {
      await navigator.clipboard.writeText(pendingSelection.text)
      showNotionToast(t('kbReadingCopied'))
    } catch {
      showNotionToast(t('kbReadingCopyFailed'))
    }
    closeSelectionToolbar()
    window.getSelection()?.removeAllRanges()
  }

  const handleCommentClick = () => {
    if (!pendingSelection || !onCommentSelection) return
    onCommentSelection(pendingSelection.text)
    closeSelectionToolbar()
    window.getSelection()?.removeAllRanges()
  }

  const handleAskAiClick = () => {
    if (!pendingSelection || !onAskAiSelection) return
    onAskAiSelection(pendingSelection.text)
    closeSelectionToolbar()
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div
      id={domId ?? kbSectionDomId(section.id)}
      data-kb-section={section.key}
      className={`kbp-section${isSubsection ? ' kbp-section--subsection' : ''}${dimmed ? ' kbp-section--hidden' : ''}${isActive && !editMode ? ' kbp-section--active' : ''}`}
    >
      <div
        className="kbp-section__header"
        role={editMode ? undefined : 'button'}
        tabIndex={editMode ? undefined : 0}
        onClick={editMode ? undefined : handleReadingHeaderClick}
        onKeyDown={editMode ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleReadingHeaderClick() }
        }}
      >
        {editMode ? (
          <div className="kbp-section__header-edit">
            <div className="kbp-section__reorder-btns">
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onMoveUp}
                disabled={isFirst}
                aria-label="Nach oben"
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onMoveDown}
                disabled={isLast}
                aria-label="Nach unten"
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {editingLabel ? (
              <input
                ref={labelInputRef}
                className="kbp-section__label-input"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabel()
                  if (e.key === 'Escape') { setEditingLabel(false); setLabelDraft(section.label) }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="kbp-section__label-btn"
                onClick={() => { setLabelDraft(section.label); setEditingLabel(true) }}
                title="Label bearbeiten"
              >
                {section.label}
              </button>
            )}

            <div className="kbp-section__edit-actions">
              {onRegenerate && section.key !== 'custom' ? (
                <button
                  type="button"
                  className="kbp-btn kbp-btn--sm kbp-btn--ai"
                  onClick={onRegenerate}
                  disabled={regenerateLoading}
                  title={t('kbSectionRegenerate')}
                >
                  <Sparkles className={`h-3 w-3${regenerateLoading ? ' kbp-spin' : ''}`} strokeWidth={1.75} aria-hidden />
                  {regenerateLoading ? t('kbSectionRegenerating') : t('kbSectionRegenerate')}
                </button>
              ) : null}
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onToggleHidden}
                title={section.hidden ? t('kbPharmaSectionShow') : t('kbPharmaSectionHide')}
              >
                {section.hidden ? <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> : <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />}
              </button>
              <button
                type="button"
                className="kbp-icon-btn kbp-icon-btn--xs"
                onClick={onDuplicate}
                title={t('kbPharmaSectionDuplicate')}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              {!section.isDefault && (
                <button
                  type="button"
                  className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger"
                  onClick={onDelete}
                  title={t('kbPharmaSectionDelete')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="kbp-section__header-view">
            <span className="kbp-section__title-wrap">
              <span className="kbp-section__label">
                <span className="kbp-section__title">{displayTitle ?? section.label}</span>
              </span>
            </span>
            <div className="kbp-section__header-right">
              {/* Section-level AI ("KI restructure") action is edit-mode only;
                  reading mode keeps Comment affordance. */}
              {onSectionComment ? (
                <span
                  className="kbp-section__actions"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {isStructured && onSectionComment ? (
                    <button
                      type="button"
                      className="kbp-section__action-btn"
                      onClick={onSectionComment}
                      title={kbT(language, 'sectionComment')}
                      aria-label={kbT(language, 'sectionComment')}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  ) : null}
                </span>
              ) : null}
              <ChevronDown
                className={`kbp-section__chevron h-3.5 w-3.5${isCollapsed ? '' : ' kbp-section__chevron--open'}`}
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          </div>
        )}
      </div>

      {regenerateError ? <p className="kbp-ai-error" role="alert">{regenerateError}</p> : null}

      {(!isCollapsed || editMode) && (
        <div className="kbp-section__body">
          {editMode ? (
            <>
              <textarea
                className="kbp-section__textarea"
                value={section.content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={t('kbPharmaContentPlaceholder')}
                rows={4}
              />
              {isStructured && onStructuredChange ? (
                <KbStructuredEditor section={section} language={language} onChange={onStructuredChange} />
              ) : null}
            </>
          ) : isEmptyReadingSection ? (
            <p className="kbp-section__text kbp-section__text--empty">
              {emptyText ?? t('kbPharmaSectionEmpty')}
            </p>
          ) : isStructured ? (
            <div className="kbp-section__reading-content">
              <KbStructuredSection section={section} drug={drug} language={language} />
            </div>
          ) : (
            <div
              ref={contentRef}
              className="kbp-section__reading-content"
              onMouseUp={handleContentMouseUp}
            >
              {section.content ? (
                <HighlightedText
                  content={section.content}
                  highlights={highlights}
                  onRemoveHighlight={onRemoveHighlight}
                />
              ) : (
                <p className="kbp-section__text kbp-section__text--empty">{t('kbPharmaSectionEmpty')}</p>
              )}
              {selectionToolbar
                ? createPortal(
                    <div
                      ref={toolbarRef}
                      className="kbp-selection-toolbar"
                      style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
                      onMouseDown={(e) => e.preventDefault()}
                      role="toolbar"
                      aria-label={t('kbReadingSelectionToolbar')}
                    >
                  <button
                    type="button"
                    className="kbp-selection-toolbar__btn"
                    onClick={handleCommentClick}
                    title={t('kbReadingComment')}
                    aria-label={t('kbReadingComment')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                  <span className="kbp-selection-toolbar__hl">
                    <button
                      type="button"
                      className={`kbp-selection-toolbar__btn${showHighlightColors ? ' kbp-selection-toolbar__btn--active' : ''}`}
                      onClick={() => setShowHighlightColors((open) => !open)}
                      title={t('kbReadingHighlight')}
                      aria-label={t('kbReadingHighlight')}
                      aria-expanded={showHighlightColors}
                    >
                      <Highlighter className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                    {showHighlightColors ? (
                      <span className="kbp-swatches" role="group" aria-label={kbT(language, 'highlightColor')}>
                        {HIGHLIGHT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`kbp-swatch kbp-swatch--${color}`}
                            onClick={() => handleAnnotate('highlight', color)}
                            title={kbT(language, `highlightColor_${color}` as const)}
                            aria-label={kbT(language, `highlightColor_${color}` as const)}
                          />
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="kbp-selection-toolbar__btn"
                    onClick={() => handleAnnotate('underline')}
                    title={t('kbReadingUnderline')}
                    aria-label={t('kbReadingUnderline')}
                  >
                    <Underline className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="kbp-selection-toolbar__btn"
                    onClick={() => handleAnnotate('bold')}
                    title={t('kbReadingBold')}
                    aria-label={t('kbReadingBold')}
                  >
                    <Bold className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="kbp-selection-toolbar__btn"
                    onClick={() => void handleCopySelection()}
                    title={t('kbReadingCopy')}
                    aria-label={t('kbReadingCopy')}
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                  <span className="kbp-selection-toolbar__divider" aria-hidden />
                  <button
                    type="button"
                    className="kbp-selection-toolbar__btn kbp-selection-toolbar__btn--ai"
                    onClick={handleAskAiClick}
                    title={t('kbReadingAskAiAction')}
                    aria-label={t('kbReadingAskAiAction')}
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="kbp-selection-toolbar__label">{t('kbReadingAskAiAction')}</span>
                  </button>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CanonicalPlaceholderSection({
  id,
  title,
  isActive,
  onActivate,
}: {
  id: string
  title: string
  isActive: boolean
  onActivate: () => void
}) {
  return (
    <section
      id={kbSectionDomId(id)}
      data-kb-section={id}
      className={`kbp-section${isActive ? ' kbp-section--active' : ''}`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="kbp-section__header-view kbp-section__header-view--static">
        <span className="kbp-section__title-wrap">
          <span className="kbp-section__label">
            <span className="kbp-section__title">{title}</span>
          </span>
        </span>
      </div>
      <div className="kbp-section__body">
        <p className="kbp-section__text kbp-section__text--empty">{KB_CANONICAL_PLACEHOLDER}</p>
      </div>
    </section>
  )
}

function TextbookBox({
  tone,
  title,
  children,
}: {
  tone: 'clinical' | 'caution' | 'monitoring' | 'evidence'
  title: string
  children: React.ReactNode
}) {
  return (
    <aside className={`kb-textbook-box kb-textbook-box--${tone}`}>
      <p className="kb-textbook-box__title">{title}</p>
      <div className="kb-textbook-box__body">{children}</div>
    </aside>
  )
}

function formatKbDate(value: string | undefined, language: string): string {
  return value ? formatSiteLocaleDate(value, language as 'de' | 'en' | 'fr' | 'es') : '—'
}

function formatAuditName(name: string | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return 'Unbekannt'
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed.split('@')[0] || 'Benutzer'
  }
  return trimmed
}

function formatAuditLine(prefix: string, name: string | undefined, date: string | undefined, language: string): string {
  return `${prefix} ${formatAuditName(name)} · ${formatKbDate(date, language)}`
}

function getCountryLabel(country: PrescribingCountryCode): string {
  return `${country} · ${PRESCRIBING_COUNTRY_LABELS[country]}`
}

function compactText(value: string | undefined, max = 120): string | undefined {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

function shouldApplyAiBrandNames(drug: Pick<KnowledgeBaseDrug, 'brandNames'>): boolean {
  return drug.brandNames.filter((name) => name.trim()).length === 0
}

function applyAiBrandNamesIfEmpty<T extends KnowledgeBaseDrug>(drug: T, brandNames: string[]): T {
  if (!shouldApplyAiBrandNames(drug) || brandNames.length === 0) return drug
  return { ...drug, brandNames } as T
}

/**
 * Apply an AI-suggested classification (and NbN descriptor) only when the
 * clinician has not set one — never overwrite a curated entry. The `psychClass`
 * is taken when still 'unspecified'; `nbn` is taken when currently empty.
 */
function applyAiClassificationIfEmpty<T extends KnowledgeBaseDrug>(
  drug: T,
  classification: PsychopharmacaClass,
  nbn: string,
): T {
  const next: T = { ...drug }
  let changed = false
  if (isPsychClassUnset(drug.psychClass) && classification !== 'unspecified') {
    next.psychClass = classification
    if (PSYCH_CLASS_TO_CATEGORY[classification] && (!drug.category || drug.category === 'Auto')) {
      next.category = PSYCH_CLASS_TO_CATEGORY[classification] as string
    }
    changed = true
  }
  if (!drug.nbn?.trim() && nbn.trim()) {
    next.nbn = nbn.trim()
    changed = true
  }
  return changed ? next : drug
}

function emptyPreparationDraft(
  drug: KnowledgeBaseDrug,
  countryCode: PrescribingCountryCode,
): Omit<MedicationMarketAvailability, 'id' | 'createdAt'> {
  return {
    substanceId: drug.id,
    countryCode,
    tradeName: '',
    genericName: drug.genericName,
    strengthValue: '',
    strengthUnit: 'mg',
    dosageForm: 'tablet',
    route: 'oral',
    packageSize: '',
    productIdentifierType: 'PZN',
    productIdentifier: '',
    prescriptionStatus: 'verschreibungspflichtig',
    marketStatus: 'available',
    sourceName: '',
    sourceUrl: '',
    sourceReference: '',
    verificationStatus: 'unverified',
    notes: '',
  }
}

function aiPreparationToDraft(
  drug: KnowledgeBaseDrug,
  entry: AiGeneratedPreparation,
): Omit<MedicationMarketAvailability, 'id' | 'createdAt'> | null {
  if (!entry.tradeName.trim() || !entry.strengthValue.trim() || !entry.strengthUnit.trim()) {
    return null
  }
  return {
    substanceId: drug.id,
    countryCode: entry.countryCode,
    tradeName: entry.tradeName,
    genericName: entry.genericName || drug.genericName,
    strengthValue: entry.strengthValue,
    strengthUnit: entry.strengthUnit,
    dosageForm: entry.dosageForm || 'unbekannt',
    route: entry.route || 'unbekannt',
    packageSize: entry.packageSize,
    productIdentifierType: entry.productIdentifierType,
    productIdentifier: entry.productIdentifier,
    prescriptionStatus: entry.prescriptionStatus,
    marketStatus: entry.marketStatus || 'needs_verification',
    sourceName: compactText(entry.sourceName, 80) || 'KI-Entwurf',
    sourceUrl: compactText(entry.sourceUrl, 300),
    sourceReference: compactText(entry.sourceReference, 120),
    verificationStatus: entry.verificationStatus === 'unverified' ? 'unverified' : 'ai_draft',
    notes: compactText(entry.notes, 120),
    lastVerifiedAt: undefined,
  }
}

function generatedPreparationsToDrafts(
  targetDrug: KnowledgeBaseDrug,
  marketAvailability: AiGeneratedPreparation[],
): Omit<MedicationMarketAvailability, 'id' | 'createdAt'>[] {
  return marketAvailability
    .map((entry) => aiPreparationToDraft(targetDrug, entry))
    .filter((entry): entry is Omit<MedicationMarketAvailability, 'id' | 'createdAt'> => entry != null)
}

function PreparationForm({
  draft,
  disabled,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  draft: PreparationDraft
  disabled?: boolean
  onChange: (draft: PreparationDraft) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
}) {
  const setField = <K extends keyof PreparationDraft>(key: K, value: PreparationDraft[K]) => {
    onChange({ ...draft, [key]: value })
  }
  return (
    <div className="kb-prep-form">
      <div className="kb-prep-form__grid">
        <label className="kbp-field">
          <span className="kbp-field__label">Handelsname</span>
          <input className="kbp-field__input" value={draft.tradeName} disabled={disabled} onChange={(e) => setField('tradeName', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Stärke</span>
          <input className="kbp-field__input" value={draft.strengthValue} disabled={disabled} onChange={(e) => setField('strengthValue', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Einheit</span>
          <input className="kbp-field__input" value={draft.strengthUnit} disabled={disabled} onChange={(e) => setField('strengthUnit', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Darreichungsform</span>
          <input className="kbp-field__input" value={draft.dosageForm} disabled={disabled} onChange={(e) => setField('dosageForm', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Route</span>
          <input className="kbp-field__input" value={draft.route} disabled={disabled} onChange={(e) => setField('route', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Quelle</span>
          <input className="kbp-field__input" value={draft.sourceName ?? ''} disabled={disabled} onChange={(e) => setField('sourceName', e.target.value)} />
        </label>
        <label className="kbp-field">
          <span className="kbp-field__label">Verifikation</span>
          <select className="kbp-field__select" value={draft.verificationStatus} disabled={disabled} onChange={(e) => setField('verificationStatus', e.target.value as PreparationVerificationStatus)}>
            <option value="unverified">unverified</option>
            <option value="ai_draft">ai_draft</option>
            <option value="manually_verified">manually_verified</option>
            <option value="imported_verified">imported_verified</option>
          </select>
        </label>
      </div>
      <details className="kb-prep-form__details">
        <summary>Weitere Felder</summary>
        <div className="kb-prep-form__grid">
          <label className="kbp-field">
            <span className="kbp-field__label">Wirkstoff</span>
            <input className="kbp-field__input" value={draft.genericName} disabled={disabled} onChange={(e) => setField('genericName', e.target.value)} />
          </label>
          <label className="kbp-field">
            <span className="kbp-field__label">Quellenreferenz</span>
            <input className="kbp-field__input" value={draft.sourceReference ?? ''} disabled={disabled} onChange={(e) => setField('sourceReference', e.target.value)} />
          </label>
          <label className="kbp-field">
            <span className="kbp-field__label">Packung</span>
            <input className="kbp-field__input" value={draft.packageSize ?? ''} disabled={disabled} onChange={(e) => setField('packageSize', e.target.value)} />
          </label>
          <label className="kbp-field">
            <span className="kbp-field__label">Produkt-ID</span>
            <input className="kbp-field__input" value={draft.productIdentifier ?? ''} disabled={disabled} onChange={(e) => setField('productIdentifier', e.target.value)} />
          </label>
        </div>
        <label className="kbp-field">
          <span className="kbp-field__label">Kurze Notiz</span>
          <textarea className="kbp-section__textarea" rows={2} value={draft.notes ?? ''} disabled={disabled} onChange={(e) => setField('notes', e.target.value)} />
        </label>
      </details>
      <div className="kb-prep-form__actions">
        <button type="button" className="kbp-btn kbp-btn--primary" disabled={disabled || !draft.tradeName.trim() || !draft.strengthValue.trim()} onClick={onSubmit}>
          {submitLabel}
        </button>
        {onCancel ? <button type="button" className="kbp-btn" onClick={onCancel}>Abbrechen</button> : null}
      </div>
    </div>
  )
}

function PreparationDialog({
  title,
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  title: string
  draft: PreparationDraft
  onChange: (draft: PreparationDraft) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  return createPortal(
    <div className="kbp-overlay" role="dialog" aria-modal>
      <div className="kbp-dialog kbp-dialog--prep">
        <div className="kbp-dialog__header">
          <h2 className="kbp-dialog__title">{title}</h2>
          <button type="button" className="kbp-icon-btn" onClick={onCancel} aria-label="Schließen">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <PreparationForm
          draft={draft}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitLabel={submitLabel}
        />
      </div>
    </div>,
    document.body,
  )
}

function CountryPreparationsSection({
  drug,
  mode,
  language,
  onRegenerate,
  regenerateLoading = false,
  pendingGeneratedPreparations = [],
}: {
  drug: KnowledgeBaseDrug
  mode: KnowledgeBaseMode
  language: string
  onRegenerate?: () => void
  regenerateLoading?: boolean
  pendingGeneratedPreparations?: Omit<MedicationMarketAvailability, 'id' | 'createdAt'>[]
}) {
  // Single source of truth: the prescribing country comes from settings. The
  // section is read-only here; change the country on the Settings page.
  const { defaultPrescribingCountry } = usePrescribingCountry()
  const country = defaultPrescribingCountry
  const { byCountry, addPreparation, updatePreparation, deletePreparation } = useCountrySpecificPreparations(drug.id)
  const [showAdd, setShowAdd] = useState(false)
  const [newDraft, setNewDraft] = useState(() => emptyPreparationDraft(drug, defaultPrescribingCountry))
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    setNewDraft((current) => ({ ...current, substanceId: drug.id, genericName: drug.genericName, countryCode: country }))
  }, [country, drug.genericName, drug.id])

  const entries = byCountry(country, mode === 'reading')
  const allEntriesForCountry = byCountry(country, false)
  const pendingEntries = mode === 'editing'
    ? pendingGeneratedPreparations.filter((entry) => entry.countryCode === country)
    : []
  const hasVerified = allEntriesForCountry.some(isVerifiedPreparation)
  const editingEntry = editingId ? allEntriesForCountry.find((entry) => entry.id === editingId) : undefined

  const title = 'Verfügbare Präparate'

  return (
    <section data-kb-section="preparations" className="kbp-section kbp-preparations-section">
      <div className="kbp-section__header-view kbp-section__header-view--static">
        <span className="kbp-section__title-wrap">
          <span className="kbp-section__label">
            <span className="kbp-section__title">{title}</span>
          </span>
        </span>
        {mode === 'editing' ? (
          <span className="kb-prep-header-meta" onClick={(e) => e.stopPropagation()}>
            <span className="kb-prep-country-static">
              {kbT(language, 'prepCountryLabel')}: {getCountryLabel(country)}
            </span>
            {onRegenerate ? (
              <button
                type="button"
                className="kbp-btn kbp-btn--sm kbp-btn--ai"
                disabled={regenerateLoading}
                onClick={onRegenerate}
                title="Mit KI anreichern"
                aria-label="Verfügbare Präparate mit KI anreichern"
              >
                <Sparkles className={`h-3.5 w-3.5${regenerateLoading ? ' kbp-spin' : ''}`} strokeWidth={1.75} aria-hidden />
                {regenerateLoading ? 'KI läuft …' : 'Mit KI anreichern'}
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="kbp-section__body">
        {entries.length === 0 && pendingEntries.length === 0 ? (
          <p className="kbp-section__text kbp-section__text--empty">
            Keine verifizierten Präparate für {PRESCRIBING_COUNTRY_LABELS[country]} hinterlegt.
            {mode === 'editing' ? ' Manuell hinzufügen oder per KI als Entwurf anreichern.' : ''}
          </p>
        ) : mode === 'reading' ? (
          <div className="kb-prep-reading-list">
            <p className="kbp-section__text kbp-prep-list-intro">
              {drug.genericName} — verfügbare Zubereitungen in {PRESCRIBING_COUNTRY_NATIVE_LABELS[country]}:
            </p>
            <ul className="kb-prep-compact-list">
              {entries.map((entry) => (
                <li key={entry.id}>{formatPreparationLine(entry)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="kb-prep-table-wrap">
            <table className="kb-prep-table">
              <thead>
                <tr>
                  <th>Präparat</th>
                  <th>Stärke</th>
                  <th>Form</th>
                  <th>Quelle</th>
                  <th>Verifiziert</th>
                  {mode === 'editing' ? <th>Aktionen</th> : null}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.tradeName}</strong>
                      <span className="kb-prep-table__meta">{entry.genericName}</span>
                      {mode === 'editing' ? (
                        <span className="kb-prep-table__meta">
                          {formatAuditLine('Erstellt von', entry.createdByDisplayName, entry.createdAt, language)}
                          {' · '}
                          {formatAuditLine('Geändert von', entry.lastModifiedByDisplayName, entry.lastModifiedAt, language)}
                        </span>
                      ) : null}
                    </td>
                    <td>{formatPreparationStrength(entry)}</td>
                    <td>{entry.dosageForm} · {entry.route}</td>
                    <td>{compactText(entry.sourceName || entry.sourceReference, 80) || '—'}</td>
                    <td>{entry.verificationStatus} · {formatKbDate(entry.lastVerifiedAt, language)}</td>
                    {mode === 'editing' ? (
                      <td>
                        <div className="kb-prep-table__actions">
                          <button type="button" className="kbp-icon-btn kbp-icon-btn--xs" onClick={() => setEditingId(entry.id)} title="Bearbeiten" aria-label="Bearbeiten">
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                          <button type="button" className="kbp-icon-btn kbp-icon-btn--xs kbp-icon-btn--danger" onClick={() => deletePreparation(entry.id)} title="Löschen" aria-label="Löschen">
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {pendingEntries.map((entry, index) => (
                  <tr key={`pending-${entry.countryCode}-${entry.tradeName}-${entry.strengthValue}-${index}`} className="kb-prep-table__row--pending">
                    <td>
                      <strong>{entry.tradeName}</strong>
                      <span className="kb-prep-table__meta">{entry.genericName}</span>
                      <span className="kb-prep-table__meta">KI-Entwurf - noch nicht übernommen</span>
                    </td>
                    <td>{`${entry.strengthValue} ${entry.strengthUnit}`.trim()}</td>
                    <td>{entry.dosageForm} · {entry.route}</td>
                    <td>{compactText(entry.sourceName || entry.sourceReference, 80) || 'KI-Entwurf'}</td>
                    <td>{entry.verificationStatus} · —</td>
                    {mode === 'editing' ? (
                      <td>
                        <span className="kb-prep-table__pending-action">Übernehmen/Verwerfen oben</span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {mode === 'reading' && entries.length > 0 ? (
          <p className="kb-prep-source-note">
            Quellenstand: {entries.map((entry) => compactText(entry.sourceName || entry.sourceReference, 60)).filter(Boolean).slice(0, 2).join(', ') || '—'}
          </p>
        ) : null}
        {mode === 'editing' ? (
          <div className="kb-prep-edit-panel">
            {!hasVerified ? (
              <p className="kbp-section__text kbp-section__text--empty">
                Keine verifizierten Präparate für {PRESCRIBING_COUNTRY_LABELS[country]} hinterlegt. KI-Entwürfe müssen geprüft werden.
              </p>
            ) : null}
            <div className="kb-prep-edit-panel__actions">
              <button type="button" className="kbp-btn kbp-btn--sm" onClick={() => { setShowAdd((open) => !open); setNewDraft(emptyPreparationDraft(drug, country)) }}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                Präparat hinzufügen
              </button>
            </div>
          </div>
        ) : null}
        {mode === 'editing' && editingEntry ? (
          <PreparationDialog
            title="Präparat bearbeiten"
            draft={editingEntry}
            onChange={(next) => updatePreparation(next as MedicationMarketAvailability)}
            onSubmit={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
            submitLabel="Fertig"
          />
        ) : null}
        {mode === 'editing' && showAdd ? (
          <PreparationDialog
            title="Präparat hinzufügen"
            draft={newDraft}
            onChange={(next) => setNewDraft(next as Omit<MedicationMarketAvailability, 'id' | 'createdAt'>)}
            onSubmit={() => {
              addPreparation(newDraft)
              setNewDraft(emptyPreparationDraft(drug, country))
              setShowAdd(false)
            }}
            onCancel={() => setShowAdd(false)}
            submitLabel="Präparat speichern"
          />
        ) : null}
      </div>
    </section>
  )
}

function targetMatches(entry: ReceptorAffinityEntry, aliases: string[]): boolean {
  const normalized = getReceptorDisplayLabel(entry.target)
    .toLowerCase()
    .replace(/[α]/g, 'alpha')
    .replace(/[^a-z0-9]/g, '')
  return aliases.some((alias) => normalized.includes(alias))
}

function interpretationLine(entry: ReceptorAffinityEntry, text: string): string {
  const value = entry.affinityPercent == null ? 'unbekannter relativer Affinität' : `${entry.affinityPercent}% relativer Affinität`
  return `${getReceptorDisplayLabel(entry.target)} (${value}): ${text}`
}

function buildClinicalInterpretation(entries: ReceptorAffinityEntry[]): string[] {
  const items: string[] = []
  const d2 = entries.find((entry) => targetMatches(entry, ['d2']))
  if (d2) {
    items.push(interpretationLine(d2, 'stützt antipsychotische Wirksamkeit; hohe Werte erhöhen die Relevanz von EPS und Prolaktin.'))
  }
  const ht2a = entries.find((entry) => targetMatches(entry, ['5ht2a']))
  if (ht2a) {
    items.push(interpretationLine(ht2a, 'kann EPS-Risiko und Negativsymptomatik günstig modulieren.'))
  }
  const alpha1 = entries.find((entry) => targetMatches(entry, ['alpha1', 'a1']))
  if (alpha1) {
    items.push(interpretationLine(alpha1, 'spricht klinisch für Orthostase- und Sedierungsrisiko.'))
  }
  const h1 = entries.find((entry) => targetMatches(entry, ['h1']))
  if (h1) {
    items.push(interpretationLine(h1, 'ist vor allem für Sedierung, Appetitsteigerung und Gewicht relevant.'))
  }
  const alpha2 = entries.find((entry) => targetMatches(entry, ['alpha2', 'a2']))
  if (alpha2) {
    items.push(interpretationLine(alpha2, 'weist auf noradrenerge Modulation mit potenzieller Wirkung auf Vigilanz und Affekt hin.'))
  }
  return items
}

function ReceptorProfileChapterSection({
  drug,
  language,
  prose,
  isActive,
  onActivate,
  onSectionComment,
  // onSectionAskAi: edit-mode only; not rendered in the reading chapter header.
}: {
  drug: KnowledgeBaseDrug
  language: string
  prose: string
  isActive: boolean
  onActivate: () => void
  onSectionComment: () => void
  onSectionAskAi: () => void
}) {
  const { t } = useTranslation()
  const receptorDisplay = getDisplayReceptorProfile(drug)
  const lang = language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
  const ranked = [...receptorDisplay.entries]
    .sort((a, b) => (b.affinityPercent ?? -1) - (a.affinityPercent ?? -1))
    .slice(0, 8)
  const interpretation = buildClinicalInterpretation(ranked)
  const hasContent = prose.trim() || ranked.length > 0

  return (
    <section
      id={kbSectionDomId(KB_RECEPTOR_SECTION_ID)}
      data-kb-section={KB_RECEPTOR_SECTION_ID}
      className={`kbp-receptor-section${isActive ? ' kbp-section--active' : ''}`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="kbp-receptor-section__head">
        <div className="kbp-section__title-wrap">
          <h3 className="kbp-section__label kbp-section__label--heading">
            <span className="kbp-section__title">Rezeptorprofil</span>
          </h3>
        </div>
        <div className="kbp-receptor-section__head-meta">
          {drug.receptorProfileVersion === 2 ? (
            <span className="kbp-receptor-section__badge">{t('kbReceptorV2Badge')}</span>
          ) : receptorDisplay.isLegacy ? (
            <span className="kbp-receptor-section__badge kbp-receptor-section__badge--legacy">
              {t('kbReceptorLegacyBadge')}
            </span>
          ) : null}
          <span
            className="kbp-section__actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* KI restructure action is edit-mode only; reading keeps Comment. */}
            <button
              type="button"
              className="kbp-section__action-btn"
              onClick={onSectionComment}
              title={kbT(language, 'sectionComment')}
              aria-label={kbT(language, 'sectionComment')}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        </div>
      </div>
      {drug.lastReceptorProfileUpdatedAt ? (
        <p className="kbp-receptor-section__updated">
          {t('kbReceptorLastUpdated')}:{' '}
          {formatSiteLocaleDate(drug.lastReceptorProfileUpdatedAt, language as 'de' | 'en' | 'fr' | 'es')}
        </p>
      ) : null}
      {!hasContent ? (
        <p className="kbp-section__text kbp-section__text--empty">{KB_CANONICAL_PLACEHOLDER}</p>
      ) : (
        <>
          {prose.trim() ? <p className="kbp-receptor-section__prose">{prose}</p> : null}
          {ranked.length > 0 ? (
            <figure className="kb-receptor-figure" onClick={(e) => e.stopPropagation()}>
              <div className="kb-receptor-figure__grid">
                <ReceptorRadar entries={receptorDisplay.entries} language={language} compact>
                  <KnowledgeBaseReceptorEditor
                    editMode={false}
                    drug={drug}
                    onLegacyChange={() => undefined}
                  />
                </ReceptorRadar>
                <table className="kb-receptor-table">
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Affinity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((entry) => (
                      <tr key={entry.target}>
                        <th scope="row" title={getReceptorTitleLabel(entry.target)}>
                          {getReceptorDisplayLabel(entry.target)}
                        </th>
                        <td>{entry.affinityPercent == null ? '—' : `${entry.affinityPercent}%`}</td>
                        <td>{getReceptorActionLabel(entry.action, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <figcaption className="kb-receptor-figure__caption">
                Figure 12.1 Relative receptor affinity profile.
              </figcaption>
            </figure>
          ) : null}
          {interpretation.length > 0 ? (
            <TextbookBox tone="clinical" title="Clinical interpretation">
              <ul>
                {interpretation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </TextbookBox>
          ) : null}
        </>
      )}
    </section>
  )
}

function contributionKeyForDrugSection(section: DrugSection): KbContributionSectionKey {
  return section.key === 'custom' ? 'kurzprofil' : section.key
}

function contributionKeyForActiveSection(
  activeSectionId: string,
  drug: KnowledgeBaseDrug,
  canonicalSections: CanonicalKbSection[],
): KbContributionSectionKey {
  if (activeSectionId === KB_RECEPTOR_SECTION_ID) return 'rezeptorprofil'
  if (activeSectionId === 'country-preparations') return 'verfuegbare_praeparate'

  const activeDrugSection = drug.sections.find((section) => section.id === activeSectionId)
  if (activeDrugSection) return contributionKeyForDrugSection(activeDrugSection)

  const canonicalMatch = canonicalSections.find((section) => {
    if (section.id === 'rezeptorprofil') return activeSectionId === KB_RECEPTOR_SECTION_ID
    if (section.id === 'klinischeHinweise') return activeSectionId === 'canonical-klinischeHinweise'
    if (section.sectionKey) {
      const mapped = sectionByKey(drug, section.sectionKey)
      return mapped?.id === activeSectionId || activeSectionId === `canonical-${section.id}`
    }
    return activeSectionId === `canonical-${section.id}`
  })

  if (canonicalMatch) {
    if (canonicalMatch.id === 'rezeptorprofil') return 'rezeptorprofil'
    if (canonicalMatch.sectionKey) return canonicalMatch.sectionKey
    if (canonicalMatch.subsections?.[0]) return canonicalMatch.subsections[0].id
    return canonicalMatch.id as KbContributionSectionKey
  }

  return 'kurzprofil'
}

// ── Drug Detail View ─────────────────────────────────────────────────────────

interface DrugDetailViewProps {
  drug: KnowledgeBaseDrug
  onBack: () => void
  onUpdate: (drug: KnowledgeBaseDrug) => void
  onDuplicate: () => void
  onDelete: () => void
  language: string
}

function KbContributorsFooter({ substanceId, language }: { substanceId: string | null; language: string }) {
  const { contributors, loading } = useKbContributors(substanceId)
  if (!substanceId || loading || contributors.length === 0) return null

  const title = language === 'de' ? 'Mitwirkende' : 'Contributors'

  return (
    <section className="kbp-contributors-footer" aria-label={title}>
      <h3 className="kbp-contributors-footer__title">{title}</h3>
      <ul className="kbp-contributors-footer__list">
        {contributors.map((entry) => (
          <li key={entry.displayName}>{entry.displayName}</li>
        ))}
      </ul>
    </section>
  )
}

function DrugDetailView({ drug, onBack, onUpdate, onDuplicate, onDelete, language }: DrugDetailViewProps) {
  const { t } = useTranslation()
  const permissions = useKnowledgeBasePermissions()
  const annotations = useKnowledgeBaseAnnotations(drug.id)
  const { upsertGeneratedPreparations } = useMedicationMarketAvailability()
  const [mode, setMode] = useState<KnowledgeBaseMode>('reading')
  const [draft, setDraft] = useState<KnowledgeBaseDrug>(drug)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [finalizeAction, setFinalizeAction] = useState<'save' | 'exit'>('save')
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set())
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const first = [...drug.sections].sort((a, b) => a.order - b.order).find((s) => !s.hidden)
    return first?.id ?? KB_RECEPTOR_SECTION_ID
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiReferences, setAiReferences] = useState<string[]>([])
  const [aiNotice, setAiNotice] = useState(false)
  const [aiTier, setAiTier] = useKnowledgeBaseAiTier()
  const [aiModelLabel, setAiModelLabel] = useState<string | null>(null)
  const [sectionRegenKey, setSectionRegenKey] = useState<string | null>(null)
  const [sectionRegenError, setSectionRegenError] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [pendingGeneratedPreparations, setPendingGeneratedPreparations] = useState<
    Omit<MedicationMarketAvailability, 'id' | 'createdAt'>[]
  >([])
  const [panelRequest, setPanelRequest] = useState<ReadingPanelRequest | null>(null)
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false)
  const draftActionBarRef = useRef<HTMLDivElement>(null)

  const openContributionDialog = useCallback(() => {
    setContributionDialogOpen(true)
  }, [])

  const handleCommentSelection = useCallback((sectionId: string, text: string) => {
    setActiveSectionId(sectionId)
    setPanelCollapsed(false)
    setPanelRequest({ nonce: Date.now(), tab: 'comments', commentText: `„${text}“\n` })
  }, [])

  const handleAskAiSelection = useCallback((sectionId: string, text: string) => {
    setActiveSectionId(sectionId)
    setPanelCollapsed(false)
    setPanelRequest({ nonce: Date.now(), tab: 'askAi', question: text, autoSend: true })
  }, [])

  // Section-level panel triggers for graph (non-text) sections, where the
  // in-text selection toolbar does not apply.
  const handleSectionComment = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    setPanelCollapsed(false)
    setPanelRequest({ nonce: Date.now(), tab: 'comments' })
  }, [])

  const handleSectionAskAi = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    setPanelCollapsed(false)
    setPanelRequest({ nonce: Date.now(), tab: 'askAi' })
  }, [])

  useEffect(() => {
    if (mode === 'reading') {
      setDraft(drug)
      setPendingGeneratedPreparations([])
      setDraftNotice(null)
    }
  }, [drug, mode])

  const editMode = mode === 'editing'
  const hasDrugDraftChanges = !drugSnapshotsEqual(draft, drug)
  const hasPendingPreparationDrafts = pendingGeneratedPreparations.length > 0
  const isDraftDirty = editMode && (hasDrugDraftChanges || hasPendingPreparationDrafts)

  const announceDraftNotice = (message: string) => {
    setDraftNotice(message)
    window.requestAnimationFrame(() => {
      draftActionBarRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      draftActionBarRef.current?.focus()
    })
  }

  const enterEditMode = () => {
    if (!permissions.canEdit) {
      showNotionToast(t('kbModeEditDenied'))
      return
    }
    setDraft({ ...drug, sections: drug.sections.map((s) => ({ ...s })) })
    setPendingGeneratedPreparations([])
    setDraftNotice(null)
    setMode('editing')
  }

  const requestReadingMode = () => {
    if (isDraftDirty) {
      setFinalizeAction('exit')
      setShowFinalizeConfirm(true)
      return
    }
    setDraft(drug)
    setMode('reading')
  }

  const discardDraftAndExitEdit = () => {
    setDraft(drug)
    setPendingGeneratedPreparations([])
    setDraftNotice(null)
    setMode('reading')
    setShowFinalizeConfirm(false)
  }

  const finalizeDraft = () => {
    if (hasDrugDraftChanges) {
      onUpdate(draft)
    }
    if (hasPendingPreparationDrafts) {
      upsertGeneratedPreparations(pendingGeneratedPreparations)
      setPendingGeneratedPreparations([])
    }
    setDraftNotice(null)
    setMode('reading')
    setShowFinalizeConfirm(false)
    showNotionToast(t('kbFinalizeSaved'))
  }

  const requestSave = () => {
    if (!isDraftDirty) {
      setMode('reading')
      return
    }
    setFinalizeAction('save')
    setShowFinalizeConfirm(true)
  }

  const handleBack = () => {
    if (isDraftDirty) {
      setFinalizeAction('exit')
      setShowFinalizeConfirm(true)
      return
    }
    onBack()
  }

  const activeDrug = editMode ? draft : drug
  const structureImageAttribution = useMemo(
    () => getStructureImageAttribution(activeDrug.genericName),
    [activeDrug.genericName],
  )
  const sortedSections = [...activeDrug.sections].sort((a, b) => a.order - b.order)
  const visibleSections = sortedSections.filter((s) => !s.hidden || editMode)
  const renderedSections = editMode ? sortedSections : []
  const canonicalSections = visibleCanonicalSections(activeDrug)

  const receptorProse = activeDrug.sections.find((s) => s.key === 'rezeptorprofil')?.content ?? ''
  const receptorDisplay = getDisplayReceptorProfile(activeDrug)

  const canonicalAnchorId = (section: CanonicalKbSection): string => {
    if (section.id === 'rezeptorprofil') return KB_RECEPTOR_SECTION_ID
    if (section.id === 'klinischeHinweise') return 'canonical-klinischeHinweise'
    return section.sectionKey ? (sectionByKey(activeDrug, section.sectionKey)?.id ?? `canonical-${section.id}`) : `canonical-${section.id}`
  }

  const navItems: KbNavItem[] = canonicalSections.map((section) => ({
    id: canonicalAnchorId(section),
    label: section.title,
    number: canonicalSectionNumber(section),
    group: section.group,
  }))

  const activeSection =
    visibleSections.find((s) => s.id === activeSectionId) ??
    visibleSections[0] ??
    null
  const panelSectionId = activeSectionId === KB_RECEPTOR_SECTION_ID
      ? KB_RECEPTOR_SECTION_ID
      : (activeSection?.id ?? activeSectionId)
  const panelSectionLabel =
    panelSectionId === KB_RECEPTOR_SECTION_ID
      ? t('kbReceptorTitle')
      : (navItems.find((item) => item.id === activeSectionId)?.label ?? activeSection?.label ?? t('kbReadingPanelTitle'))
  const panelSectionData = getSectionDataForAsk(activeDrug, panelSectionId, sortedSections)
  const contributionInitialSectionKey = contributionKeyForActiveSection(
    activeSectionId,
    activeDrug,
    canonicalSections,
  )

  const updateDraftSection = (sectionId: string, patch: Partial<DrugSection>) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }))
  }

  const updateDraftReceptor = (
    profile: Record<string, number>,
    details: Record<string, ReceptorProfileDetail>,
  ) => {
    setDraft((prev) => ({ ...prev, receptorProfile: profile, receptorProfileDetails: details }))
  }

  const handleAiFill = async () => {
    setAiError(null)
    setAiLoading(true)
    try {
      const result = await generatePharmaDetails({
        genericName: drug.genericName,
        brandNames: drug.brandNames,
        drugClass: drug.drugClass,
        category: drug.category,
        language: language as 'de' | 'en' | 'fr' | 'es',
        tier: aiTier,
        includeMarketAvailability: true,
      })
      setAiModelLabel(result.model?.label ?? null)
      setDraft((prev) => {
        let sections = prev.sections.map((s) => {
          if (s.key === 'custom') return s
          const aiContent = result.sections[s.key as DrugSectionKey]
          return aiContent ? { ...s, content: aiContent } : s
        })
        sections = applyStructuredBundle(sections, result.structured)
        const receptorPatch =
          result.receptorAffinityProfile.length > 0
            ? buildReceptorUpgradePatch(prev, result.receptorAffinityProfile)
            : {}
        const withClass = applyAiClassificationIfEmpty(
          { ...prev, sections, dataModelVersion: 2 as const, ...receptorPatch },
          result.classification,
          result.nbn,
        )
        return applyAiBrandNamesIfEmpty(withClass, result.brandNames)
      })
      const prepDrafts = generatedPreparationsToDrafts(drug, result.marketAvailability)
      if (prepDrafts.length > 0) {
        setPendingGeneratedPreparations(prepDrafts)
      }
      setAiReferences(result.references)
      setAiNotice(true)
      if (prepDrafts.length > 0) {
        showNotionToast(`KI-Entwurf erstellt: ${prepDrafts.length} Präparate`)
      }
      announceDraftNotice(t('kbDraftAiNotice'))
      showNotionToast(t('kbPharmaAiSuccess'))
    } catch {
      setAiError(t('kbPharmaAiError'))
    } finally {
      setAiLoading(false)
    }
  }

  const handleRegenerateSection = async (sectionKey: DrugSectionKey | 'receptor') => {
    if (mode !== 'editing') return
    const regenId = sectionKey === 'receptor' ? KB_RECEPTOR_SECTION_ID : sectionKey
    setSectionRegenError(null)
    setSectionRegenKey(regenId)
    try {
      const apiSection = sectionKey === 'receptor' ? 'rezeptorprofil' : sectionKey
      const result = await generatePharmaDetails({
        genericName: draft.genericName,
        brandNames: draft.brandNames,
        drugClass: draft.drugClass,
        category: draft.category,
        sections: [apiSection],
        language: language as 'de' | 'en' | 'fr' | 'es',
        tier: aiTier,
      })
      setAiModelLabel(result.model?.label ?? null)

      setDraft((prev) => {
        let next = { ...prev }
        const aiContent = result.sections[apiSection]
        if (aiContent) {
          next = {
            ...next,
            sections: next.sections.map((s) =>
              s.key === apiSection ? { ...s, content: aiContent } : s,
            ),
          }
        }
        if (sectionKey !== 'receptor') {
          next = {
            ...next,
            sections: applyStructuredBundle(next.sections, result.structured, apiSection),
          }
        }
        if (sectionKey === 'receptor' || apiSection === 'rezeptorprofil') {
          if (result.receptorAffinityProfile.length === 0 && !aiContent) {
            return prev
          }
          if (result.receptorAffinityProfile.length > 0) {
            next = { ...next, ...buildReceptorUpgradePatch(prev, result.receptorAffinityProfile) }
          }
        }
        return applyAiBrandNamesIfEmpty(next, result.brandNames)
      })

      if (sectionKey === 'receptor' && result.receptorAffinityProfile.length === 0 && !result.sections.rezeptorprofil) {
        setSectionRegenError(t('kbReceptorRegenerateEmpty'))
        return
      }

      announceDraftNotice(t('kbDraftAiNotice'))
      showNotionToast(t('kbSectionRegenerateSuccess'))
    } catch {
      setSectionRegenError(t('kbSectionRegenerateError'))
    } finally {
      setSectionRegenKey(null)
    }
  }

  const handleRegeneratePreparations = async () => {
    if (mode !== 'editing') return
    setSectionRegenError(null)
    setSectionRegenKey('preparations')
    try {
      const result = await generatePharmaDetails({
        genericName: draft.genericName,
        brandNames: draft.brandNames,
        drugClass: draft.drugClass,
        category: draft.category,
        sections: [],
        language: language as 'de' | 'en' | 'fr' | 'es',
        tier: aiTier,
        includeMarketAvailability: true,
        marketAvailabilityOnly: true,
      })
      setAiModelLabel(result.model?.label ?? null)
      const prepDrafts = generatedPreparationsToDrafts(draft, result.marketAvailability)
      setAiReferences(result.references)
      setAiNotice(true)
      if (prepDrafts.length === 0) {
        setSectionRegenError('Keine neuen KI-Präparate zurückgegeben.')
        return
      }
      setPendingGeneratedPreparations(prepDrafts)
      announceDraftNotice(t('kbDraftAiNotice'))
      showNotionToast(`KI-Entwurf erstellt: ${prepDrafts.length} Präparate`)
    } catch {
      setSectionRegenError(t('kbSectionRegenerateError'))
    } finally {
      setSectionRegenKey(null)
    }
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((s) => s.id === sectionId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, order: sorted[swapIdx].order }
          if (s.id === sorted[swapIdx].id) return { ...s, order: sorted[idx].order }
          return s
        }),
      }
    })
  }

  const duplicateSection = (sectionId: string) => {
    setDraft((prev) => {
      const source = prev.sections.find((s) => s.id === sectionId)
      if (!source) return prev
      const maxOrder = Math.max(...prev.sections.map((s) => s.order))
      return {
        ...prev,
        sections: [
          ...prev.sections,
          {
            ...source,
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            key: 'custom' as const,
            isDefault: false,
            order: maxOrder + 1,
          },
        ],
      }
    })
  }

  const addCustomSection = () => {
    setDraft((prev) => {
      const maxOrder = prev.sections.length > 0 ? Math.max(...prev.sections.map((s) => s.order)) : -1
      return {
        ...prev,
        sections: [
          ...prev.sections,
          {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            key: 'custom' as const,
            label: t('kbPharmaSectionLabelPlaceholder'),
            content: '',
            isDefault: false,
            isCollapsedByDefault: false,
            order: maxOrder + 1,
            hidden: false,
          },
        ],
      }
    })
  }

  const resetSectionOrder = () => {
    setDraft((prev) => {
      const templateOrder = new Map(DEFAULT_SECTION_TEMPLATES.map((tmpl) => [tmpl.key, tmpl.order]))
      return {
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          order: templateOrder.has(s.key) ? (templateOrder.get(s.key) ?? s.order) : prev.sections.length,
        })),
      }
    })
  }

  return (
    <div className={`kbp-detail-view${editMode ? ' kbp-detail-view--editing' : ' kbp-detail-view--reading'}`}>
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          drugName={drug.genericName}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showFinalizeConfirm && (
        <FinalizeConfirmDialog
          onConfirm={() => {
            finalizeDraft()
            if (finalizeAction === 'exit') onBack()
          }}
          onDiscard={() => {
            discardDraftAndExitEdit()
            if (finalizeAction === 'exit') onBack()
          }}
          onCancel={() => setShowFinalizeConfirm(false)}
        />
      )}

      <div className="kbp-detail-topbar">
        <button type="button" className="kbp-back-btn" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('kbPharmaBackToList')}
        </button>
        <div className="kbp-detail-topbar__actions">
          <div className="kbp-mode-toggle" role="group" aria-label={t('kbModeToggleLabel')}>
            <button
              type="button"
              className={`kbp-mode-toggle__btn${mode === 'reading' ? ' kbp-mode-toggle__btn--active' : ''}`}
              onClick={requestReadingMode}
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('kbModeReading')}
            </button>
            <button
              type="button"
              className={`kbp-mode-toggle__btn${mode === 'editing' ? ' kbp-mode-toggle__btn--active' : ''}`}
              onClick={enterEditMode}
              disabled={!permissions.canEdit}
              title={!permissions.canEdit ? t('kbModeEditDenied') : undefined}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('kbModeEditing')}
            </button>
          </div>
          {editMode ? (
            <>
              <label className="kbp-ai-mode" title={kbT(language, 'aiModeTitle')}>
                <span className="kbp-ai-mode__label">{kbT(language, 'aiModeLabel')}</span>
                <select
                  className="kbp-ai-mode__select"
                  value={aiTier}
                  onChange={(e) => setAiTier(e.target.value as KbAiTier)}
                  disabled={aiLoading}
                >
                  <option value="thorough">{kbT(language, 'aiModeThorough')}</option>
                  <option value="fast">{kbT(language, 'aiModeFast')}</option>
                </select>
              </label>
              <button
                type="button"
                className="kbp-btn kbp-btn--ai"
                onClick={() => void handleAiFill()}
                disabled={aiLoading}
                title={t('kbPharmaAiFill')}
              >
                <Sparkles className={`h-3.5 w-3.5${aiLoading ? ' kbp-spin' : ''}`} strokeWidth={1.75} aria-hidden />
                {aiLoading ? t('kbPharmaAiFilling') : t('kbPharmaAiFill')}
              </button>
              <button type="button" className="kbp-btn kbp-btn--primary" onClick={requestSave}>
                {t('kbPharmaApply')}
              </button>
              <button type="button" className="kbp-btn" onClick={requestReadingMode}>
                {isDraftDirty ? t('kbDraftDiscard') : t('kbPharmaCancel')}
              </button>
            </>
          ) : (
            <>
              <MedicationExportMenu drug={activeDrug} language={language} />
              <button type="button" className="kbp-icon-btn" onClick={onDuplicate} title={t('kbPharmaDuplicate')}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" className="kbp-icon-btn kbp-icon-btn--danger" onClick={() => setShowDeleteConfirm(true)} title={t('kbPharmaDelete')}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>

      {editMode && isDraftDirty ? (
        <div
          ref={draftActionBarRef}
          className="kbp-draft-action-bar"
          role="status"
          tabIndex={-1}
        >
          <div className="kbp-draft-action-bar__copy">
            <strong>{draftNotice ?? t('kbDraftUnsavedNotice')}</strong>
            <span>{t('kbDraftActionHint')}</span>
          </div>
          <div className="kbp-draft-action-bar__actions">
            <button type="button" className="kbp-btn kbp-btn--primary" onClick={requestSave}>
              {t('kbPharmaApply')}
            </button>
            <button type="button" className="kbp-btn" onClick={requestReadingMode}>
              {t('kbDraftDiscard')}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`kbp-detail-layout${editMode ? ' kbp-detail-layout--editing' : ' kbp-detail-layout--reading'}${
          !editMode && panelCollapsed ? ' kbp-detail-layout--panel-collapsed' : ''
        }`}
      >
        {!editMode ? (
          <KbSectionNav
            items={navItems}
            activeId={activeSectionId}
            onActivate={setActiveSectionId}
            language={language}
            variant="sidebar"
          />
        ) : null}
        <div className={`kbp-detail-main${!editMode ? ' kbp-detail-main--reading' : ''}`}>
          <div className="kbp-detail-main__content">
          <div className="kbp-drug-header">
            <div className="kbp-drug-header__top">
              {!editMode ? (
                <KbStructureImage
                  attribution={structureImageAttribution}
                  variant="detail"
                  className="kbp-drug-header__structure"
                />
              ) : null}
              <div className="kbp-drug-header__identity">
                <h2 className="kbp-drug-header__name">{activeDrug.genericName}</h2>
                {activeDrug.brandNames.length > 0 && (
                  <span className="kbp-drug-header__brands">{activeDrug.brandNames.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="kbp-drug-header__meta">
              <span className="kbp-drug-header__classification">
                {getPsychClassLabel(activeDrug.psychClass, language)}
              </span>
              {activeDrug.drugClass && <span className="kbp-drug-header__class">{activeDrug.drugClass}</span>}
              {activeDrug.atcCode && <span className="kbp-drug-header__atc">ATC: {activeDrug.atcCode}</span>}
              {activeDrug.nbn && <span className="kbp-drug-header__nbn">NbN: {activeDrug.nbn}</span>}
              {isDraftDirty ? <span className="kbp-draft-badge">{t('kbDraftBadge')}</span> : null}
            </div>
            {editMode ? (
              <div className="kbp-field kbp-drug-header__classification-edit">
                <label className="kbp-field__label" htmlFor="kbp-edit-classification">
                  {t('kbPharmaFieldClassification')}
                </label>
                <select
                  id="kbp-edit-classification"
                  className="kbp-field__select"
                  value={normalizePsychClass(draft.psychClass)}
                  onChange={(e) => {
                    const value = e.target.value as PsychopharmacaClass
                    setDraft((prev) => {
                      const next = { ...prev, psychClass: value }
                      const mapped = PSYCH_CLASS_TO_CATEGORY[value]
                      if (mapped && (!prev.category || prev.category === 'Auto')) {
                        next.category = mapped as string
                      }
                      return next
                    })
                  }}
                >
                  {PSYCHOPHARMACA_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{getPsychClassLabel(cls, language)}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <p className="kbp-drug-header__updated">
              {t('kbPharmaLastUpdated')}: {formatSiteLocaleDate(activeDrug.updatedAt, language as 'de' | 'en' | 'fr' | 'es')}
            </p>
            <div className="kbp-drug-header__audit" aria-label="Profil-Metadaten">
              <span>{formatAuditLine('Created by', activeDrug.createdByDisplayName, activeDrug.createdAt, language)}</span>
              <span>{formatAuditLine('Last modified by', activeDrug.lastModifiedByDisplayName, activeDrug.lastModifiedAt ?? activeDrug.updatedAt, language)}</span>
              {activeDrug.lastReviewedAt ? (
                <span>{formatAuditLine('Last reviewed by', activeDrug.lastReviewedByDisplayName ?? activeDrug.lastReviewedByUserId, activeDrug.lastReviewedAt, language)}</span>
              ) : null}
              <span>Verification: {activeDrug.verificationStatus ?? 'draft'}</span>
              {isNormalizedKbDrug(activeDrug) ? (
                <span
                  className="kbp-community-editable-badge"
                  title={communityEditableBadgeCopy(language).title}
                >
                  {communityEditableBadgeCopy(language).label}
                </span>
              ) : null}
              {drugNeedsClinicalReview(activeDrug) ? (
                <span
                  className="kbp-clinical-review-badge"
                  title={clinicalReviewBadgeCopy(language).title}
                >
                  {clinicalReviewBadgeCopy(language).label}
                </span>
              ) : null}
            </div>
            {!editMode ? <KeyFactsTable drug={activeDrug} language={language} /> : null}
          </div>

          {aiError && <p className="kbp-ai-error" role="alert">{aiError}</p>}

          {aiNotice && editMode && (
            <div className="kbp-ai-notice" role="note">
              <p className="kbp-ai-notice__disclaimer">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('kbPharmaAiDisclaimer')}
              </p>
              {aiModelLabel && (
                <p className="kbp-ai-notice__model">
                  {kbT(language, 'aiModelResolved')}: {aiModelLabel}
                </p>
              )}
              {aiReferences.length > 0 && (
                <div className="kbp-ai-notice__refs">
                  <span className="kbp-ai-notice__refs-title">{t('kbPharmaAiReferences')}</span>
                  <ul className="kbp-ai-notice__refs-list">
                    {aiReferences.map((ref, i) => (
                      <li key={i}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {editMode ? (
            <div id={kbSectionDomId(KB_RECEPTOR_SECTION_ID)} className="kbp-receptor-section">
              <div className="kbp-receptor-section__head">
                <h3 className="kbp-receptor-section__title">{t('kbReceptorTitle')}</h3>
                <div className="kbp-receptor-section__head-meta">
                  {activeDrug.receptorProfileVersion === 2 ? (
                    <span className="kbp-receptor-section__badge">{t('kbReceptorV2Badge')}</span>
                  ) : receptorDisplay.isLegacy ? (
                    <span className="kbp-receptor-section__badge kbp-receptor-section__badge--legacy">
                      {t('kbReceptorLegacyBadge')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="kbp-btn kbp-btn--sm kbp-btn--ai"
                    onClick={() => void handleRegenerateSection('receptor')}
                    disabled={sectionRegenKey === KB_RECEPTOR_SECTION_ID || aiLoading}
                    title={t('kbSectionRegenerate')}
                  >
                    <Sparkles
                      className={`h-3.5 w-3.5${sectionRegenKey === KB_RECEPTOR_SECTION_ID ? ' kbp-spin' : ''}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {sectionRegenKey === KB_RECEPTOR_SECTION_ID ? t('kbSectionRegenerating') : t('kbSectionRegenerate')}
                  </button>
                </div>
              </div>
              {sectionRegenKey === KB_RECEPTOR_SECTION_ID && sectionRegenError ? (
                <p className="kbp-ai-error" role="alert">{sectionRegenError}</p>
              ) : null}
              {activeDrug.lastReceptorProfileUpdatedAt ? (
                <p className="kbp-receptor-section__updated">
                  {t('kbReceptorLastUpdated')}:{' '}
                  {formatSiteLocaleDate(
                    activeDrug.lastReceptorProfileUpdatedAt,
                    language as 'de' | 'en' | 'fr' | 'es',
                  )}
                </p>
              ) : null}
              <KnowledgeBaseReceptorEditor
                editMode
                drug={activeDrug}
                onLegacyChange={updateDraftReceptor}
              />
            </div>
          ) : null}

          <div className="kbp-sections">
            {editMode && (
              <div className="kbp-edit-toolbar">
                <button type="button" className="kbp-btn kbp-btn--sm" onClick={resetSectionOrder}>
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('kbPharmaResetOrder')}
                </button>
              </div>
            )}

            {!editMode && canonicalSections.map((canonicalSection, idx) => {
              const anchorId = canonicalAnchorId(canonicalSection)

              if (canonicalSection.id === 'rezeptorprofil') {
                return (
                  <ReceptorProfileChapterSection
                    key={canonicalSection.id}
                    drug={activeDrug}
                    language={language}
                    prose={receptorProse}
                    isActive={activeSectionId === KB_RECEPTOR_SECTION_ID}
                    onActivate={() => setActiveSectionId(KB_RECEPTOR_SECTION_ID)}
                    onSectionComment={() => handleSectionComment(KB_RECEPTOR_SECTION_ID)}
                    onSectionAskAi={() => handleSectionAskAi(KB_RECEPTOR_SECTION_ID)}
                  />
                )
              }

              if (canonicalSection.id === 'klinischeHinweise') {
                const childSections = (canonicalSection.subsections ?? [])
                  .map((subsection) => ({
                    subsection,
                    section: sectionByKey(activeDrug, subsection.id),
                  }))
                  .filter(({ section }) => section && !section.hidden && (section.content.trim() || sectionHasStructuredData(section)))

                return (
                  <section
                    key={canonicalSection.id}
                    id={kbSectionDomId(anchorId)}
                    data-kb-section="klinischeHinweise"
                    className={`kbp-section kbp-section--group${activeSectionId === anchorId ? ' kbp-section--active' : ''}`}
                  >
                    <div
                      className="kbp-section__header-view kbp-section__header-view--static"
                      onClick={() => setActiveSectionId(anchorId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveSectionId(anchorId)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="kbp-section__title-wrap">
                        <span className="kbp-section__label">
                          <span className="kbp-section__title">{canonicalSection.title}</span>
                        </span>
                      </span>
                    </div>
                    <div className="kbp-section__body">
                      {childSections.length === 0 ? (
                        <p className="kbp-section__text kbp-section__text--empty">{KB_CANONICAL_PLACEHOLDER}</p>
                      ) : (
                        <div className="kbp-subsections">
                          {childSections.map(({ subsection, section }) => (
                            <SectionItem
                              key={section!.id}
                              section={section!}
                              drug={activeDrug}
                              language={language}
                              isFirst={false}
                              isLast={false}
                              isCollapsed={collapsedSections.has(section!.id)}
                              mode={mode}
                              displayTitle={subsection.title}
                              isSubsection
                              emptyText={KB_CANONICAL_PLACEHOLDER}
                              onActivate={() => setActiveSectionId(section!.id)}
                              onToggleCollapse={() =>
                                setCollapsedSections((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(section!.id)) next.delete(section!.id)
                                  else next.add(section!.id)
                                  return next
                                })
                              }
                              onContentChange={(content) => updateDraftSection(section!.id, { content })}
                              onStructuredChange={(patch) => updateDraftSection(section!.id, patch)}
                              onLabelChange={(label) => updateDraftSection(section!.id, { label })}
                              onMoveUp={() => moveSection(section!.id, 'up')}
                              onMoveDown={() => moveSection(section!.id, 'down')}
                              onToggleHidden={() => updateDraftSection(section!.id, { hidden: !section!.hidden })}
                              onDuplicate={() => duplicateSection(section!.id)}
                              onDelete={() => setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== section!.id) }))}
                              highlights={annotations.forSection(section!.id).highlights}
                              onAddAnnotation={(startOffset, endOffset, text, style, color) => {
                                annotations.addHighlight({ sectionId: section!.id, startOffset, endOffset, text, style, color })
                              }}
                              onRemoveHighlight={annotations.removeHighlight}
                              onCommentSelection={(text) => handleCommentSelection(section!.id, text)}
                              onAskAiSelection={(text) => handleAskAiSelection(section!.id, text)}
                              onSectionComment={() => handleSectionComment(section!.id)}
                              onSectionAskAi={() => handleSectionAskAi(section!.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )
              }

              const section = canonicalSection.sectionKey ? sectionByKey(activeDrug, canonicalSection.sectionKey) : undefined
              if (!section) {
                return (
                  <CanonicalPlaceholderSection
                    key={canonicalSection.id}
                    id={anchorId}
                    title={canonicalSection.title}
                    isActive={activeSectionId === anchorId}
                    onActivate={() => setActiveSectionId(anchorId)}
                  />
                )
              }

              const sectionItem = (
                <SectionItem
                  key={canonicalSection.id}
                  section={section}
                  drug={activeDrug}
                  language={language}
                  isFirst={idx === 0}
                  isLast={idx === canonicalSections.length - 1}
                  isCollapsed={collapsedSections.has(section.id)}
                  mode={mode}
                  isActive={activeSectionId === section.id}
                  displayTitle={canonicalSection.title}
                  domId={kbSectionDomId(anchorId)}
                  emptyText={KB_CANONICAL_PLACEHOLDER}
                  onActivate={() => setActiveSectionId(section.id)}
                  onToggleCollapse={() =>
                    setCollapsedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has(section.id)) next.delete(section.id)
                      else next.add(section.id)
                      return next
                    })
                  }
                  onContentChange={(content) => updateDraftSection(section.id, { content })}
                  onStructuredChange={(patch) => updateDraftSection(section.id, patch)}
                  onLabelChange={(label) => updateDraftSection(section.id, { label })}
                  onMoveUp={() => moveSection(section.id, 'up')}
                  onMoveDown={() => moveSection(section.id, 'down')}
                  onToggleHidden={() => updateDraftSection(section.id, { hidden: !section.hidden })}
                  onDuplicate={() => duplicateSection(section.id)}
                  onDelete={() => setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== section.id) }))}
                  highlights={annotations.forSection(section.id).highlights}
                  onAddAnnotation={(startOffset, endOffset, text, style, color) => {
                    annotations.addHighlight({ sectionId: section.id, startOffset, endOffset, text, style, color })
                  }}
                  onRemoveHighlight={annotations.removeHighlight}
                  onCommentSelection={(text) => handleCommentSelection(section.id, text)}
                  onAskAiSelection={(text) => handleAskAiSelection(section.id, text)}
                  onSectionComment={() => handleSectionComment(section.id)}
                  onSectionAskAi={() => handleSectionAskAi(section.id)}
                />
              )
              if (canonicalSection.id !== 'umstellung') return sectionItem
              return [
                sectionItem,
                <CountryPreparationsSection
                  key="country-preparations"
                  drug={activeDrug}
                  mode={mode}
                  language={language}
                  pendingGeneratedPreparations={pendingGeneratedPreparations}
                />,
              ]
            })}

            {editMode && renderedSections.map((section, idx) => {
              const sectionItem = (
                <SectionItem
                  key={section.id}
                  section={section}
                  drug={activeDrug}
                  language={language}
                  isFirst={idx === 0}
                  isLast={idx === renderedSections.length - 1}
                  isCollapsed={collapsedSections.has(section.id)}
                  mode={mode}
                  isActive={activeSectionId === section.id}
                  onActivate={() => setActiveSectionId(section.id)}
                  onToggleCollapse={() =>
                    setCollapsedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has(section.id)) next.delete(section.id)
                      else next.add(section.id)
                      return next
                    })
                  }
                  onContentChange={(content) => updateDraftSection(section.id, { content })}
                  onStructuredChange={(patch) => updateDraftSection(section.id, patch)}
                  onLabelChange={(label) => updateDraftSection(section.id, { label })}
                  onMoveUp={() => moveSection(section.id, 'up')}
                  onMoveDown={() => moveSection(section.id, 'down')}
                  onToggleHidden={() => updateDraftSection(section.id, { hidden: !section.hidden })}
                  onDuplicate={() => duplicateSection(section.id)}
                  onDelete={() => setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== section.id) }))}
                  onRegenerate={
                    editMode && section.key !== 'custom'
                      ? () => void handleRegenerateSection(section.key as DrugSectionKey)
                      : undefined
                  }
                  regenerateLoading={sectionRegenKey === section.key}
                  regenerateError={sectionRegenKey === section.key ? sectionRegenError : null}
                  highlights={annotations.forSection(section.id).highlights}
                  onAddAnnotation={
                    !editMode
                      ? (startOffset, endOffset, text, style, color) => {
                          annotations.addHighlight({ sectionId: section.id, startOffset, endOffset, text, style, color })
                        }
                      : undefined
                  }
                  onRemoveHighlight={!editMode ? annotations.removeHighlight : undefined}
                  onCommentSelection={
                    !editMode ? (text) => handleCommentSelection(section.id, text) : undefined
                  }
                  onAskAiSelection={
                    !editMode ? (text) => handleAskAiSelection(section.id, text) : undefined
                  }
                  onSectionComment={!editMode ? () => handleSectionComment(section.id) : undefined}
                  onSectionAskAi={!editMode ? () => handleSectionAskAi(section.id) : undefined}
                />
              )
              if (section.key !== 'umstellung') return sectionItem
              return [
                sectionItem,
                <CountryPreparationsSection
                  key="country-preparations-editor"
                  drug={activeDrug}
                  mode={mode}
                  language={language}
                  onRegenerate={() => void handleRegeneratePreparations()}
                  regenerateLoading={sectionRegenKey === 'preparations'}
                  pendingGeneratedPreparations={pendingGeneratedPreparations}
                />,
              ]
            })}

            {editMode && (
              <button type="button" className="kbp-add-section-btn" onClick={addCustomSection}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                {t('kbPharmaAddSection')}
              </button>
            )}

            {!editMode ? (
              <>
                <KbContributorsFooter substanceId={extractKbSubstanceId(activeDrug)} language={language} />
                <KbStructureImageAttributionFooter attribution={structureImageAttribution} variant="detail" />
              </>
            ) : null}
          </div>
          </div>
        </div>

        {!editMode ? (
          <div className="kbp-right-rail">
            {!panelCollapsed ? (
              <div className="kbp-reading-column">
                <KnowledgeBaseReadingPanel
                  medicationId={drug.id}
                  medicationName={drug.genericName}
                  sectionId={panelSectionId}
                  sectionLabel={panelSectionLabel}
                  sectionData={panelSectionData}
                  language={language}
                  collapsed={false}
                  onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
                  request={panelRequest}
                  tier={aiTier}
                />
                <KnowledgeBaseNotes medicationId={drug.id} language={language} />
              </div>
            ) : null}
            <div className="kbp-right-rail__tabs">
              <button
                type="button"
                className="kbp-contribution-bookmark"
                onClick={openContributionDialog}
                title={kbT(language, 'contributionBookmarkTitle')}
                aria-label={kbT(language, 'contributionBookmarkTitle')}
              >
                <Bookmark className="kbp-contribution-bookmark__icon" strokeWidth={1.75} aria-hidden />
                <span className="kbp-contribution-bookmark__label">{kbT(language, 'contributionBookmark')}</span>
              </button>
              {panelCollapsed ? (
                <KnowledgeBaseReadingPanel
                  medicationId={drug.id}
                  medicationName={drug.genericName}
                  sectionId={panelSectionId}
                  sectionLabel={panelSectionLabel}
                  sectionData={panelSectionData}
                  language={language}
                  collapsed
                  onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
                  request={panelRequest}
                  tier={aiTier}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {contributionDialogOpen ? (
        <KbSectionContributionDialog
          substanceId={extractKbSubstanceId(drug)}
          drugName={drug.genericName}
          language={language}
          initialSectionKey={contributionInitialSectionKey}
          onClose={() => setContributionDialogOpen(false)}
        />
      ) : null}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function KnowledgeBasePharma({ onClose, onCloseAll, collectionId, collectionName }: KnowledgeBasePharmaProps) {
  const { t, language } = useTranslation()
  const { drugs, addDrug, updateDrug, deleteDrug, duplicateDrug } = useKnowledgeBaseDrugs(collectionId)
  const { upsertGeneratedPreparations } = useMedicationMarketAvailability()
  const [aiTier] = useKnowledgeBaseAiTier()
  const { release: kbRelease } = useKbCurrentRelease()

  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const selectedDrug = selectedDrugId ? (drugs.find((d) => d.id === selectedDrugId) ?? null) : null

  const handleAddDrug = useCallback(
    (draft: Omit<KnowledgeBaseDrug, 'id' | 'createdAt' | 'updatedAt'>, action: CreateProfileAction) => {
      const created = addDrug(draft)
      setShowAddDialog(false)
      setSelectedDrugId(created.id)
      if (action !== 'empty') {
        void (async () => {
          try {
            const result = await generatePharmaDetails({
              genericName: created.genericName,
              brandNames: created.brandNames,
              drugClass: created.drugClass,
              category: created.category,
              language: language as 'de' | 'en' | 'fr' | 'es',
              tier: aiTier,
              includeMarketAvailability: true,
            })
            let sections = created.sections.map((section) => {
              const aiContent = result.sections[section.key as DrugSectionKey]
              return aiContent ? { ...section, content: aiContent } : section
            })
            sections = applyStructuredBundle(sections, result.structured)
            const receptorPatch =
              result.receptorAffinityProfile.length > 0
                ? buildReceptorUpgradePatch(created, result.receptorAffinityProfile)
                : {}
            const generatedDrug = applyAiBrandNamesIfEmpty(
              applyAiClassificationIfEmpty(
                { ...created, sections, dataModelVersion: 2 as const, ...receptorPatch },
                result.classification,
                result.nbn,
              ),
              result.brandNames,
            )
            updateDrug(generatedDrug)
            const prepDrafts = result.marketAvailability
              .map((entry) => aiPreparationToDraft(generatedDrug, entry))
              .filter((entry): entry is Omit<MedicationMarketAvailability, 'id' | 'createdAt'> => entry != null)
            const prepSummary = upsertGeneratedPreparations(prepDrafts)
            showNotionToast(
              prepSummary.created + prepSummary.updated > 0
                ? `KI-Entwurf erstellt inkl. ${prepSummary.created + prepSummary.updated} Präparate`
                : t('kbPharmaAiSuccess'),
            )
          } catch {
            showNotionToast(t('kbPharmaAiError'))
          }
        })()
      }
    },
    [addDrug, aiTier, language, t, updateDrug, upsertGeneratedPreparations],
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedDrugId) return
    const copy = duplicateDrug(selectedDrugId)
    if (copy) setSelectedDrugId(copy.id)
  }, [duplicateDrug, selectedDrugId])

  const handleDelete = useCallback(() => {
    if (!selectedDrugId) return
    deleteDrug(selectedDrugId)
    setSelectedDrugId(null)
  }, [deleteDrug, selectedDrugId])

  return (
    <div className="kbp-page text-ink">
      <div className="kbp-topbar">
        <button
          type="button"
          className="kbp-back-btn"
          onClick={onClose}
          aria-label={t('kbPharmaBackToKb')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('kbPharmaBackToKb')}
        </button>
        <div className="kbp-topbar__left">
          <h1 className="kbp-topbar__title">{collectionName ?? t('kbPharmaTitle')}</h1>
          <span className="kbp-topbar__subtitle">{t('kbPharmaSubtitle')}</span>
        </div>
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={onCloseAll ?? onClose}
          aria-label={t('kbPharmaClose')}
          title={t('kbPharmaClose')}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {(kbRelease || drugs.some((d) => d.kbReleaseVersion)) && (
        <div className="kbp-meta-strip" aria-label="KB release metadata">
          <span>
            {t('kbPharmaKbVersionLabel')}:{' '}
            <strong>{kbRelease?.versionLabel ?? drugs.find((d) => d.kbReleaseVersion)?.kbReleaseVersion}</strong>
          </span>
          <span>
            {t('kbPharmaKbLastSyncedLabel')}:{' '}
            <strong>
              {formatSiteLocaleDate(
                kbRelease?.syncedAt ?? drugs.find((d) => d.kbReleaseSyncedAt)?.kbReleaseSyncedAt ?? '',
                language,
              )}
            </strong>
          </span>
          <span>
            {t('kbPharmaKbSourceLabel')}:{' '}
            <strong>{kbRelease?.source ?? 'psychopharmacology.wiki'}</strong>
          </span>
        </div>
      )}

      <div className={`kbp-content${selectedDrug ? ' kbp-content--detail' : ''}`}>
        {selectedDrug ? (
          <DrugDetailView
            drug={selectedDrug}
            onBack={() => setSelectedDrugId(null)}
            onUpdate={updateDrug}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            language={language}
          />
        ) : (
          <KbPharmaClassifiedBrowse
            drugs={drugs}
            onSelect={setSelectedDrugId}
            onAdd={() => setShowAddDialog(true)}
            language={language}
          />
        )}
      </div>

      <p className="kbp-license-strip">{t('kbPharmaCommunityLicense')}</p>

      {showAddDialog && (
        <AddDrugDialog
          onSubmit={handleAddDrug}
          onCancel={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
