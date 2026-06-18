import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { getCaseMeta, isListedPatientCase } from '../../hooks/useCaseRegistry'
import { flushSync } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { useCaseRegistry } from '../../hooks/useCaseRegistry'
import { addNotification } from '../../hooks/useNotifications'
import type { useLabTool } from '../../hooks/useLabTool'
import type { useTimelineTool } from '../../hooks/useTimelineTool'
import type { useWorkspaceState } from '../../hooks/useWorkspaceState'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import type { useSettingsPanel } from '../../hooks/useSettingsPanel'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { SubscriptionPlan } from '../../data/subscriptionPlans'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { AiToolKey } from '../../data/aiTools'
import type { WorkspaceTabsInfo } from '../CaseWorkspacePage'
import { SettingsPage } from '../settings/SettingsPage'
import { DocumentationTodayTotalSync } from '../DocumentationTodayTotalSync'
import { WorkspaceActivitySync } from '../WorkspaceActivitySync'
import { CaseTopNav, type TopNavTabId } from './CaseTopNav'
import { CaseSidebarPanel } from './CaseSidebarPanel'
import { CaseSidebarBackLink } from './CaseSidebarBackLink'
import { CaseSidebarNextLink } from './CaseSidebarNextLink'
import { CaseSidebarContent } from './CaseSidebarContent'
import { AnforderungCreateModal } from '../anforderungen/AnforderungCreateModal'
import { CasePatientHeader } from './CasePatientHeader'
import { WorkspaceTabBar } from './WorkspaceTabBar'
import { MeinePatientenView } from './MeinePatientenView'
import { PatientDashboardView } from './PatientDashboardView'
import { VerlaufFeedPage } from './VerlaufFeedPage'
import { LaborPage } from './LaborPage'
import { DokumentePage } from './DokumentePage'
import { TherapiePage } from './TherapiePage'
import { MedikationPage } from './MedikationPage'
import { DiagnosePage } from './DiagnosePage'
import { DiscussCasePage } from '../discuss-case/DiscussCasePage'
import { ConsultationCasePage } from '../consultation/ConsultationCasePage'
import { MedicationSectionNavProvider } from '../../contexts/MedicationSectionNavContext'
import { TherapySectionNavProvider } from '../../contexts/TherapySectionNavContext'
import { DiagnosticsSectionNavProvider } from '../../contexts/DiagnosticsSectionNavContext'
import { DokumenteSectionNavProvider } from '../../contexts/DokumenteSectionNavContext'
import { DiscussSectionNavProvider } from '../../contexts/DiscussSectionNavContext'
import { NewPatientDialog } from '../dashboard/NewPatientDialog'
import type { NewPatientData } from '../dashboard/NewPatientDialog'
import { scheduleAiGenerationImprint } from '../../utils/clinicalImprint'
import { appendVerlaufEntry } from '../../utils/verlaufFeed'
import {
  DOKUMENTE_ARCHIVE_CHANGED_EVENT,
  inferDokumentCategory,
  loadDokumente,
  type DokumentEntry,
} from '../../utils/dokumenteArchive'
import { syncWorkspaceDocumentToArchive } from '../../utils/anamnese/syncArchive'
import {
  appendSavedDoc,
  loadSavedDocs,
  removeSavedDoc,
  removeSavedDocsByTypeId,
  type SavedDoc,
} from '../../utils/savedDocs'
import { NotionTopBar } from './NotionTopBar'
import { WorkspaceContextMenu } from './WorkspaceContextMenu'
import { NotionPaper, type SavedWorkspaceDocumentPayload } from './NotionPaper'
import { NotionInputBar } from './NotionInputBar'
import { NotionTimelineCanvas } from './NotionTimelineCanvas'
import { NotionGenerationReview } from './NotionGenerationReview'
import { NotionToastHost } from './NotionToast'
import { PasteDetectionChip } from './PasteDetectionChip'
import type { SelectionActionId } from './FloatingSelectionToolbar'
import type { PasteActionId } from './PasteAssistant'
import { pasteActionTargetPage } from './PasteAssistant'
import type { ContentCategory } from '../../utils/pasteContentDetector'
import type { SlashCommandId } from './SlashCommandMenu'
import { slashCommandToAiTool } from './SlashCommandMenu'
import { parseAnamneseSections } from '../../utils/anamnese/parseSections'
import {
  isToolPage,
  isVerlaufDocumentType,
  isWorkspacePageOpen,
  NOTION_PAGES,
  resolveNotionPageFromDocumentType,
  type NotionPageId,
} from './notionPages'
import { documentTypes } from '../../data/documentTypes'
import { resolveDocumentTypeWithVariant } from '../../utils/workspaceComponents'
import type { AssessmentStandard } from '../../types/isdm'
import {
  resolveAssessmentStandardForSubMode,
  resolveDefaultPsychopathSubMode,
  type PsychopathSubMode,
} from '../../utils/psychopathMode'
import { loadNotionPageHeading } from '../../utils/notionPageHeading'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { recordAuditEvent } from '../../services/auditApi'
import { TemplateWorkspaceHost } from '../templates/TemplateWorkspaceHost'
import { usePermissionContext } from '../../contexts/PermissionContext'
import { useAuth } from '../../context/AuthContext'
import { buildTherapyAttribution } from '../../types/therapy'
import { isDemoCase, isDemoCaseReadOnly } from '../../demo'
import '../../styles/demo-patient-dev.css'
import '../../styles/anforderungen.css'
import { useCanAccessCase } from '../../hooks/permissions'
import { ActiveAppointmentBar } from '../calendar/ActiveAppointmentBar'
import { CalendarItemModal } from '../calendar/CalendarItemModal'
import { useActiveAppointment } from '../../contexts/ActiveAppointmentContext'
import { useCalendar } from '../../hooks/useCalendar'
import { useNextPatientWorkflow } from '../../hooks/useNextPatientWorkflow'
import { endOfDayIso, startOfDayIso } from '../../utils/calendarLabels'
import type { CreateCalendarItemInput } from '../../types/calendar'

type WorkspaceState = ReturnType<typeof useWorkspaceState>
type LabState = ReturnType<typeof useLabTool>
type TimelineState = ReturnType<typeof useTimelineTool>
type AppearanceState = ReturnType<typeof useAppearanceSettings>
type LanguageState = ReturnType<typeof useLanguageSettings>
type SettingsPanelState = ReturnType<typeof useSettingsPanel>
type PrivacyState = ReturnType<typeof usePrivacySettings>
type WorkspaceSettingsState = ReturnType<typeof useWorkspaceSettings>
type WorkspaceVaultState = ReturnType<typeof useWorkspaceVault>

interface ClinicalAgeState {
  age: string
  setAge: (age: string) => void
  ready: boolean
}

interface NotionAppProps {
  caseId: string
  initialPage?: NotionPageId
  initialShowPatientDashboard?: boolean
  workspace: WorkspaceState
  lab: LabState
  timeline: TimelineState
  appearance: AppearanceState
  privacy: PrivacyState
  languageSettings: LanguageState
  settingsPanel: SettingsPanelState
  workspaceSettings: WorkspaceSettingsState
  workspaceVault: WorkspaceVaultState
  clinicalAge: ClinicalAgeState
  onMigratedAge?: (age: string) => void
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean, appointmentId?: string) => void
  onNavigate?: (path: string) => void
  initialTopTab?: TopNavTabId
  initialDiscussId?: string
  initialKonsilId?: string
  plan: SubscriptionPlan
  workspaceTabs?: WorkspaceTabsInfo
  workspaceStorageId?: string
  showWorkspaceTabs?: boolean
  /**
   * Storage key used for the saved-docs sidebar list.
   * Defaults to `caseId` but should be set to a per-tab key for general workspace
   * tabs so that each tab has its own isolated saved-docs list.
   */
  savedDocsCaseId?: string
  isIsdmActive?: boolean
  assessmentStandard: AssessmentStandard
  onSelectAssessmentStandard: (standard: AssessmentStandard) => void
}

/** Maps a detected ContentCategory to the workspace page to navigate to. */
function categoryToNotionPage(category: ContentCategory): NotionPageId | null {
  switch (category) {
    case 'aufnahme': return 'aufnahme'
    case 'verlauf': return 'verlauf'
    case 'labor': return 'labor'
    case 'medikation': return 'medikation'
    default: return null
  }
}

interface PasteChipState {
  id: number
  text: string
  category: ContentCategory
}

function isAiToolKey(action: SelectionActionId | PasteActionId): action is AiToolKey {
  return (
    action === 'summarize' ||
    action === 'structure' ||
    action === 'shorten' ||
    action === 'formalize' ||
    action === 'bulletPoints' ||
    action === 'proofread' ||
    action === 'expand'
  )
}

function CaseSectionNavProviders({
  activeTab,
  caseId,
  children,
}: {
  activeTab: TopNavTabId
  caseId: string
  children: ReactNode
}) {
  if (activeTab === 'medikation') {
    return <MedicationSectionNavProvider>{children}</MedicationSectionNavProvider>
  }
  if (activeTab === 'therapie') {
    return <TherapySectionNavProvider>{children}</TherapySectionNavProvider>
  }
  if (activeTab === 'labor') {
    return <DiagnosticsSectionNavProvider caseId={caseId}>{children}</DiagnosticsSectionNavProvider>
  }
  if (activeTab === 'dokumente') {
    return <DokumenteSectionNavProvider>{children}</DokumenteSectionNavProvider>
  }
  if (activeTab === 'discuss') {
    return <DiscussSectionNavProvider>{children}</DiscussSectionNavProvider>
  }
  return <>{children}</>
}

export function NotionApp({
  caseId,
  initialPage,
  initialShowPatientDashboard,
  workspace,
  lab,
  timeline,
  appearance,
  privacy,
  languageSettings,
  settingsPanel,
  workspaceSettings,
  workspaceVault,
  clinicalAge,
  onMigratedAge,
  onNavigateDashboard,
  onNavigateNewCase,
  onNavigate,
  initialTopTab,
  initialDiscussId,
  initialKonsilId,
  plan: _plan,
  workspaceTabs,
  workspaceStorageId,
  showWorkspaceTabs = false,
  savedDocsCaseId,
  isIsdmActive: _isIsdmActive = false,
  assessmentStandard,
  onSelectAssessmentStandard,
}: NotionAppProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { member, role } = usePermissionContext()
  const storageCaseIdForAccess = workspaceStorageId ?? caseId
  const caseAccessChecks = useCanAccessCase(storageCaseIdForAccess)
  const [breakReminderActive, setBreakReminderActive] = useState(false)
  // Each workspace tab gets its own saved-docs list via a per-tab storage key.
  const savedDocsKey = savedDocsCaseId ?? caseId
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>(() => loadSavedDocs(savedDocsKey))
  const storageCaseId = workspaceStorageId ?? caseId
  const [pendingMedicationAdd, setPendingMedicationAdd] = useState(false)
  const [templateHostOpen, setTemplateHostOpen] = useState(false)
  const [anforderungModalOpen, setAnforderungModalOpen] = useState(false)

  useEffect(() => {
    setSavedDocs(loadSavedDocs(savedDocsKey))
  }, [savedDocsKey])

  // Track whether the current formal document type has a draft-only entry (no
  // manually-saved version), so we can show the workspace draft warning banner.
  const [hasDraftOnlyBanner, setHasDraftOnlyBanner] = useState(false)
  useEffect(() => {
    const docTypeId = workspace.selectedDocumentType
    if (!docTypeId || !inferDokumentCategory(docTypeId)) {
      setHasDraftOnlyBanner(false)
      return
    }
    const checkDraftOnly = () => {
      const all = loadDokumente(storageCaseId)
      const forType = all.filter((e) => e.pageType === docTypeId)
      const hasSaved = forType.some((e) => e.source === 'manual' || e.source === 'ai-accepted')
      const hasDraft = forType.some((e) => e.source === 'draft')
      setHasDraftOnlyBanner(hasDraft && !hasSaved)
    }
    checkDraftOnly()

    function handleArchiveChanged(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === storageCaseId) checkDraftOnly()
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    return () => {
      window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    }
  }, [storageCaseId, workspace.selectedDocumentType])

  const handleAssessmentStandardChange = useCallback(
    (next: AssessmentStandard) => {
      onSelectAssessmentStandard(next)
      if (workspace.selectedDocumentType === 'psychopath') {
        workspace.selectComponentVariant(resolveDefaultPsychopathSubMode(next))
      }
    },
    [onSelectAssessmentStandard, workspace],
  )

  const handlePsychopathModeSelect = useCallback(
    (mode: PsychopathSubMode) => {
      workspace.selectComponentVariant(mode)
      const nextStandard = resolveAssessmentStandardForSubMode(mode)
      if (assessmentStandard !== nextStandard) {
        onSelectAssessmentStandard(nextStandard)
      }
    },
    [assessmentStandard, onSelectAssessmentStandard, workspace],
  )

  const handleBreakStart = useCallback(() => {
    setBreakReminderActive(true)
  }, [])

  const handleClosePanelGraphic = useCallback(() => {
    appearance.setShowPanelGraphic(false)
    setBreakReminderActive(false)
  }, [appearance])

  const documentTypeLabel = useCallback(
    (typeId: string | undefined) => {
      if (!typeId) return ''
      const page = NOTION_PAGES.find((item) => item.documentTypeId === typeId)
      return page ? t(page.labelKey) : typeId
    },
    [t],
  )

  const fallbackTitle = useCallback(
    (shortId: string) => t('dashboardCaseFallback').replace('{id}', shortId),
    [t],
  )

  const caseRegistry = useCaseRegistry({
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    documentTypeLabel,
    fallbackTitle,
  })

  const resolveArchiveDocumentTitle = useCallback(
    (docTypeId: string) => {
      const pageHeading = loadNotionPageHeading(docTypeId, storageCaseId)
      if (pageHeading.trim()) return pageHeading.trim()
      const page = NOTION_PAGES.find((item) => item.documentTypeId === docTypeId)
      return page ? t(page.labelKey) : docTypeId
    },
    [storageCaseId, t],
  )

  const archiveActiveDocumentIfNeeded = useCallback(
    (source: 'draft' | 'manual' | 'ai-accepted' = 'draft') => {
      const docTypeId = workspace.selectedDocumentType
      if (!docTypeId || workspace.generationPendingReview) return null
      if (!inferDokumentCategory(docTypeId)) return null

      const title = resolveArchiveDocumentTitle(docTypeId)
      const archived = syncWorkspaceDocumentToArchive({
        caseId: storageCaseId,
        documentTypeId: docTypeId,
        title,
        sectionContents: workspace.getLatestSectionContents(),
        editorContent: workspace.editorContent,
        source,
        language: languageSettings.language,
      })

      // Only add explicitly saved documents (manual or AI-accepted) to Recent.
      // Draft/autosave archives triggered by navigation are not shown in Recent.
      if (source !== 'draft' && archived?.content.trim()) {
        const updated = appendSavedDoc(savedDocsKey, {
          typeId: archived.pageType,
          typeLabel: title,
          date: archived.date,
          content: archived.content,
          sectionContents: archived.sectionContents ?? {},
        })
        setSavedDocs(updated)
      }

      return archived
    },
    [
      languageSettings.language,
      resolveArchiveDocumentTitle,
      savedDocsKey,
      storageCaseId,
      workspace,
    ],
  )

  /**
   * skipDraftArchive: pass true when this function is called from an explicit
   * manual save (handleVaultSaveWithArchive) that already archived the document
   * with source='manual', to avoid creating a redundant draft entry on top of it.
   */
  const handleVaultSaveWithFeedAppend = useCallback(
    async (opts?: { skipDraftArchive?: boolean }) => {
      const docTypeId = workspace.selectedDocumentType
      if (isVerlaufDocumentType(docTypeId)) {
        // Do not append while an AI result is still awaiting physician review
        if (!workspace.generationPendingReview) {
          const content =
            Object.values(workspace.sectionContents).join('\n\n') ||
            workspace.editorContent
          if (content.trim()) {
            const activeSection = workspace.sections.find(
              (s) => s.id === workspace.activeSectionId,
            )
            const source = workspace.generationWasAccepted ? 'ai-accepted' : 'manual'
            const attribution = buildTherapyAttribution(
              user?.id ?? member?.userId ?? '',
              role,
              member?.therapyDiscipline,
              member?.therapyDisciplineCustom,
            )
            appendVerlaufEntry(storageCaseId, {
              date: new Date().toISOString(),
              content: content.trim(),
              pageType: docTypeId,
              sectionLabel: activeSection?.label,
              source,
              ...(attribution && docTypeId === 'therapie-verlauf' ? { attribution } : {}),
            })
          }
        }
      } else if (
        !opts?.skipDraftArchive &&
        !workspace.generationPendingReview &&
        inferDokumentCategory(docTypeId)
      ) {
        archiveActiveDocumentIfNeeded(
          workspace.generationWasAccepted ? 'ai-accepted' : 'draft',
        )
      }
      await workspaceVault.saveNow()
    },
    [
      archiveActiveDocumentIfNeeded,
      storageCaseId,
      workspace.activeSectionId,
      workspace.editorContent,
      workspace.generationPendingReview,
      workspace.generationWasAccepted,
      workspace.sectionContents,
      workspace.sections,
      workspace.selectedDocumentType,
      workspaceVault,
      member,
      role,
      user?.id,
    ],
  )
  const [activeTopTab, setActiveTopTab] = useState<TopNavTabId>(() => {
    if (initialShowPatientDashboard) return 'overview'
    if (initialTopTab) return initialTopTab
    return 'workspace'
  })
  useEffect(() => {
    if (initialTopTab) setActiveTopTab(initialTopTab)
  }, [initialTopTab])

  const { activeAppointment, setActiveAppointmentId } = useActiveAppointment()
  const calendarRange = useMemo(
    () => ({ from: startOfDayIso(new Date()), to: endOfDayIso(new Date()) }),
    [],
  )
  const { create: createCalendarItem, update: updateCalendarItem, complete: completeCalendarItem } =
    useCalendar(calendarRange)
  const [calendarPrefill, setCalendarPrefill] = useState<Partial<CreateCalendarItemInput> | null>(null)
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)

  const showActiveAppointment =
    activeAppointment != null &&
    activeAppointment.caseId === caseId &&
    activeAppointment.status !== 'cancelled'

  const { completeAndGoToNext } = useNextPatientWorkflow({
    setActiveAppointmentId,
    onNavigateToCase: (nextCaseId, apptId) => {
      onNavigateNewCase?.(nextCaseId, undefined, true, apptId)
    },
  })

  const patientCases = useMemo(
    () => caseRegistry.cases.filter(isListedPatientCase),
    [caseRegistry.cases],
  )
  const [showPatientRegistry, setShowPatientRegistry] = useState(false)
  const initialPageAppliedRef = useRef(false)
  const [activePage, setActivePage] = useState<NotionPageId>(
    () => initialPage ?? resolveNotionPageFromDocumentType(workspace.selectedDocumentType),
  )

  useEffect(() => {
    if (!initialPage || initialPageAppliedRef.current) return
    initialPageAppliedRef.current = true
    setActivePage(initialPage)
    const page = NOTION_PAGES.find((item) => item.id === initialPage)
    if (page?.kind === 'document' && page.documentTypeId) {
      workspace.selectDocumentType(page.documentTypeId)
    }
  }, [initialPage, workspace])

  // Route backup reminder through notifications instead of a banner
  const _backupNotifiedRef = useRef(false)
  useEffect(() => {
    if (workspaceVault.showBackupReminder && !_backupNotifiedRef.current) {
      _backupNotifiedRef.current = true
      addNotification('warning', t('notificationBackupReminder'))
    }
  }, [workspaceVault.showBackupReminder, t])

  useEffect(() => {
    if (!workspace.selectedDocumentType) return
    if (!isToolPage(activePage)) {
      setActivePage(resolveNotionPageFromDocumentType(workspace.selectedDocumentType))
    }
  }, [workspace.selectedDocumentType, activePage])

  useEffect(() => {
    if (activeTopTab !== 'workspace') return
    if (isToolPage(activePage)) return
    void recordAuditEvent('clinical_document_viewed', {
      caseId: storageCaseId,
      metadata: { pageId: activePage },
    })
  }, [activePage, activeTopTab, storageCaseId])

  const activePageConfig = useMemo(
    () => NOTION_PAGES.find((page) => page.id === activePage) ?? NOTION_PAGES[0],
    [activePage],
  )

  const activeSection = workspace.sections.find(
    (section) => section.id === workspace.activeSectionId,
  )

  const documentLabel = t(activePageConfig.labelKey)

  const workspacePageLabel = useMemo(() => {
    if (activeTopTab !== 'workspace') return undefined
    if (workspace.selectedDocumentType) return documentLabel
    if (isToolPage(activePage)) {
      const page = NOTION_PAGES.find((item) => item.id === activePage)
      return page ? t(page.labelKey) : undefined
    }
    return undefined
  }, [activePage, activeTopTab, documentLabel, t, workspace.selectedDocumentType])

  const showCaseSidebar = !showPatientRegistry

  type PendingNavAction =
    | { type: 'closeDocument' }
    | { type: 'navigateDashboard' }
    | { type: 'navigateCase'; caseId: string; page?: NotionPageId; showPatientDashboard?: boolean }
    | { type: 'closeTab'; tabId: string }
    | { type: 'viewSavedDoc'; doc: SavedDoc }

  const [pendingNavAction, setPendingNavAction] = useState<PendingNavAction | null>(null)
  const [isSavingBeforeNav, setIsSavingBeforeNav] = useState(false)

  // Load a Recent/saved document into the workspace. Extracted so it can run
  // both directly (no unsaved changes) and after the unsaved-changes guard.
  const viewSavedDocNow = useCallback(
    (doc: SavedDoc) => {
      const hasSectionContents = Object.keys(doc.sectionContents).length > 0
      workspace.selectDocumentType(doc.typeId)
      if (hasSectionContents) {
        workspace.restoreFromSnapshot({
          documentTypeId: doc.typeId,
          pageHeading: '',
          sectionContents: doc.sectionContents,
          savedAt: doc.date,
        })
      } else {
        workspace.setEditorContent(doc.content)
      }
      setActiveTopTab('workspace')
    },
    [workspace],
  )

  const executePendingNavAction = useCallback(
    (action: PendingNavAction) => {
      if (action.type === 'closeDocument') {
        workspace.resetToBlankPage()
        setShowPatientRegistry(false)
        setActiveTopTab('workspace')
        setActivePage('aufnahme')
      } else if (action.type === 'navigateDashboard') {
        onNavigateDashboard?.()
      } else if (action.type === 'navigateCase') {
        onNavigateNewCase?.(action.caseId, action.page, action.showPatientDashboard)
      } else if (action.type === 'closeTab') {
        workspaceTabs?.onCloseTab(action.tabId)
      } else if (action.type === 'viewSavedDoc') {
        viewSavedDocNow(action.doc)
      }
    },
    [onNavigateDashboard, onNavigateNewCase, viewSavedDocNow, workspace, workspaceTabs],
  )

  const handleUnsavedSave = useCallback(async () => {
    if (!pendingNavAction) return
    setIsSavingBeforeNav(true)
    try {
      await handleVaultSaveWithFeedAppend()
    } finally {
      setIsSavingBeforeNav(false)
    }
    const action = pendingNavAction
    setPendingNavAction(null)
    executePendingNavAction(action)
  }, [executePendingNavAction, handleVaultSaveWithFeedAppend, pendingNavAction])

  const handleUnsavedDiscard = useCallback(() => {
    const action = pendingNavAction
    setPendingNavAction(null)
    if (action) executePendingNavAction(action)
  }, [executePendingNavAction, pendingNavAction])

  const handleUnsavedCancel = useCallback(() => {
    setPendingNavAction(null)
  }, [])

  const guardedNav = useCallback(
    (action: PendingNavAction, proceed: () => void) => {
      if (workspaceVault.isDirty) {
        setPendingNavAction(action)
      } else {
        proceed()
      }
    },
    [workspaceVault.isDirty],
  )

  const handleCloseWorkspacePage = useCallback(() => {
    const doClose = () => {
      archiveActiveDocumentIfNeeded('draft')
      workspace.resetToBlankPage()
      setShowPatientRegistry(false)
      setActiveTopTab('workspace')
      setActivePage('aufnahme')
    }
    guardedNav({ type: 'closeDocument' }, doClose)
  }, [archiveActiveDocumentIfNeeded, guardedNav, workspace])

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const doClose = () => workspaceTabs?.onCloseTab(tabId)
      guardedNav({ type: 'closeTab', tabId }, doClose)
    },
    [guardedNav, workspaceTabs],
  )

  const handleAcceptGenerationWithArchive = useCallback(async () => {
    const docTypeId = workspace.selectedDocumentType
    if (!docTypeId) return

    const category = inferDokumentCategory(docTypeId)
    const content =
      workspace.sections.length > 0
        ? Object.values(workspace.sectionContents).join('\n\n') || workspace.editorContent
        : workspace.editorContent
    const sectionContents =
      workspace.sections.length > 0 ? workspace.sectionContents : {}

    if (category && content.trim()) {
      syncWorkspaceDocumentToArchive({
        caseId: storageCaseId,
        documentTypeId: docTypeId,
        title: documentLabel,
        sectionContents,
        editorContent: workspace.editorContent,
        source: 'ai-accepted',
        language: languageSettings.language,
      })
    }

    if (content.trim()) {
      const updated = appendSavedDoc(savedDocsKey, {
        typeId: docTypeId,
        typeLabel: documentLabel,
        date: new Date().toISOString(),
        content: content.trim(),
        sectionContents,
      })
      setSavedDocs(updated)
      scheduleAiGenerationImprint(storageCaseId, {
        documentTypeId: docTypeId,
        text: content.trim(),
      })
    }

    await workspaceVault.saveNow()
    workspace.acceptGeneration()
    workspace.resetToBlankPage()
  }, [documentLabel, languageSettings.language, savedDocsKey, storageCaseId, workspace, workspaceVault])

  const handleVaultSaveWithArchive = useCallback(async (payload?: SavedWorkspaceDocumentPayload) => {
    if (!payload) {
      await handleVaultSaveWithFeedAppend()
      return
    }

    const docTypeId = payload?.documentTypeId ?? workspace.selectedDocumentType
    const category = inferDokumentCategory(docTypeId)
    const content = payload
      ? payload.content || Object.values(payload.sectionContents).join('\n\n') || payload.pageHeading
      : workspace.sections.length > 0
        ? Object.values(workspace.sectionContents).join('\n\n') || workspace.editorContent
        : workspace.editorContent
    const sectionContents =
      payload?.sectionContents ?? (workspace.sections.length > 0 ? workspace.sectionContents : {})
    const typeLabel = payload?.pageHeading.trim() || documentLabel
    const savedAt = payload?.savedAt ?? new Date().toISOString()

    // Archive manual saves for formal document types — skip if AI review pending
    // or if AI was just accepted (to avoid duplicating the ai-accepted entry)
    if (category && !workspace.generationPendingReview && !workspace.generationWasAccepted) {
      if (content.trim()) {
        syncWorkspaceDocumentToArchive({
          caseId: storageCaseId,
          documentTypeId: docTypeId,
          title: typeLabel,
          sectionContents,
          editorContent: workspace.editorContent,
          source: 'manual',
          language: languageSettings.language,
        })
      }
    }

    // Add to sidebar list whenever there is content and a document type is selected
    if (docTypeId && content.trim() && !workspace.generationPendingReview) {
      const updated = appendSavedDoc(savedDocsKey, {
        typeId: docTypeId,
        typeLabel,
        date: savedAt,
        content: content.trim(),
        sectionContents,
      })
      setSavedDocs(updated)
    }

    // Skip redundant draft archive: we already wrote a manual entry above.
    await handleVaultSaveWithFeedAppend({ skipDraftArchive: true })
    if (docTypeId && content.trim() && !workspace.generationPendingReview) {
      workspace.resetToBlankPage()
    }
  }, [documentLabel, handleVaultSaveWithFeedAppend, languageSettings.language, savedDocsKey, storageCaseId, workspace])

  const handleViewSavedDoc = useCallback(
    (doc: SavedDoc) => {
      // Opening another Recent document replaces the currently-open one, so warn
      // first if the active document has unsaved changes.
      guardedNav({ type: 'viewSavedDoc', doc }, () => viewSavedDocNow(doc))
    },
    [guardedNav, viewSavedDocNow],
  )

  const handleRemoveSavedDoc = useCallback(
    (id: string) => {
      const updated = removeSavedDoc(savedDocsKey, id)
      setSavedDocs(updated)
    },
    [savedDocsKey],
  )

  const handleAfterDeleteDokument = useCallback(
    (pageType: string) => {
      const updated = removeSavedDocsByTypeId(savedDocsKey, pageType)
      setSavedDocs(updated)
    },
    [savedDocsKey],
  )

  /**
   * Navigate to the workspace page for the given draft entry and inject its content
   * so the user can continue editing there. An explicit Save in the workspace will
   * promote the draft to a manual (non-draft) document.
   */
  const handleEditDraft = useCallback(
    (entry: DokumentEntry) => {
      // Lab documents live in the dedicated Labor tool tab, not the document workspace.
      if (entry.pageType === 'labor' || entry.category === 'laborbefunde') {
        setActiveTopTab('labor')
        return
      }

      if (entry.pageType.startsWith('template-doc:') && entry.sourceRefId) {
        setTemplateHostOpen(true)
        return
      }

      const pageId = resolveNotionPageFromDocumentType(entry.pageType)
      const hasSectionContents =
        entry.sectionContents && Object.keys(entry.sectionContents).length > 0

      if (hasSectionContents) {
        workspace.restoreFromSnapshot({
          documentTypeId: entry.pageType,
          pageHeading: entry.title,
          sectionContents: entry.sectionContents!,
          savedAt: entry.date,
        })
      } else {
        workspace.selectDocumentType(entry.pageType)
        workspace.setEditorContent(entry.content)
      }

      setActivePage(pageId)
      setActiveTopTab('workspace')
    },
    [workspace],
  )

  const showMultistageSections = Boolean(
    workspace.currentDocumentType?.multistage &&
      workspace.sections.length > 0 &&
      !workspace.isTherapieVerlaufDocument,
  )

  const componentVariants = useMemo(
    () =>
      workspace.currentDocumentType?.variants?.map((variant) => ({
        id: variant.id,
        label: variant.label,
      })) ?? [],
    [workspace.currentDocumentType?.variants],
  )

  const sectionConfigs = workspace.currentDocumentType?.sections ?? []

  const handlePageSelect = useCallback(
    (pageId: NotionPageId) => {
      setActivePage(pageId)
      const page = NOTION_PAGES.find((item) => item.id === pageId)
      if (page?.kind === 'document' && page.documentTypeId) {
        workspace.selectDocumentType(page.documentTypeId)
      }
    },
    [workspace],
  )

  const handlePageSelectWithSection = useCallback(
    (pageId: NotionPageId, sectionId: string) => {
      setActivePage(pageId)
      const page = NOTION_PAGES.find((item) => item.id === pageId)
      if (page?.kind === 'document' && page.documentTypeId) {
        workspace.selectDocumentTypeAndSection(page.documentTypeId, sectionId)
      }
    },
    [workspace],
  )

  const pageSubsections = useMemo(() => {
    const result: Partial<Record<NotionPageId, { id: string; label: string }[]>> = {}
    for (const page of NOTION_PAGES) {
      if (!page.documentTypeId) continue
      const baseDocType = documentTypes.find((dt) => dt.id === page.documentTypeId)
      if (!baseDocType) continue
      const variantId = workspace.activeVariantIds[page.documentTypeId]
      const resolvedType = resolveDocumentTypeWithVariant(baseDocType, variantId)
      if (resolvedType.multistage && resolvedType.sections?.length) {
        result[page.id] = resolvedType.sections.map((s) => ({ id: s.id, label: s.label }))
      }
    }
    return result
  }, [workspace.activeVariantIds])

  const runAiTool = useCallback(
    (tool: AiToolKey) => {
      flushSync(() => {
        workspace.selectAiTool(tool)
      })
      workspace.handleGenerateWithTool(tool)
    },
    [workspace],
  )

  const handleSectionAiTool = useCallback(
    (sectionId: string, tool: AiToolKey) => {
      flushSync(() => {
        workspace.focusSection(sectionId)
        workspace.selectAiTool(tool)
      })
      workspace.handleGenerateWithTool(tool, { sectionId, forceSegment: true })
    },
    [workspace],
  )

  const handleEditorAiTool = useCallback(
    (tool: AiToolKey) => {
      flushSync(() => {
        workspace.selectAiTool(tool)
      })
      workspace.handleGenerateWithTool(tool)
    },
    [workspace],
  )

  const handleSelectionAction = useCallback(
    (action: SelectionActionId, _selectedText: string) => {
      if (isAiToolKey(action)) {
        runAiTool(action)
        return
      }

      if (action === 'convertVerlauf') {
        handlePageSelect('verlauf')
        runAiTool('structure')
        return
      }

      if (action === 'convertPpb') {
        handlePageSelect('psychopath')
        runAiTool('structure')
        return
      }

      if (action === 'convertArztbrief') {
        runAiTool('formalize')
      }
    },
    [handlePageSelect, runAiTool],
  )

  const appendTextToEditor = useCallback(
    (text: string) => {
      const current = workspace.editorContent.trim()
      const next = current ? `${current}\n\n${text.trim()}` : text.trim()
      workspace.setEditorContent(next)
    },
    [workspace],
  )

  /** Strip a previously-appended paste block from the active editor content. */
  const removeTextFromEditor = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const current = workspace.editorContent
      if (!current.includes(trimmed)) return
      const next = current.split(trimmed).join('').replace(/\n{3,}/g, '\n\n').trim()
      workspace.setEditorContent(next)
    },
    [workspace],
  )

  const [pasteChip, setPasteChip] = useState<PasteChipState | null>(null)

  const applyDetectedCategory = useCallback(
    (text: string, category: ContentCategory) => {
      const targetPage = categoryToNotionPage(category)
      if (targetPage) {
        handlePageSelect(targetPage)
      }
      appendTextToEditor(text)
    },
    [appendTextToEditor, handlePageSelect],
  )

  // Insert a detected paste into the correct page WITHOUT touching the chip.
  // For Aufnahme: attempt to distribute pasted text to the correct section tabs
  // via section-aware parsing. If ≥ 2 sections are found, use restoreFromSnapshot
  // so the workspace shows each section immediately. restoreFromSnapshot runs
  // after handlePageSelect in the same React update batch, so its state writes
  // override the blank-state initialisation from selectDocumentType.
  const insertDetectedCategory = useCallback(
    (text: string, category: ContentCategory) => {
      if (category === 'aufnahme') {
        const parsed = parseAnamneseSections(text)
        if (Object.keys(parsed).length >= 2) {
          handlePageSelect('aufnahme')
          workspace.restoreFromSnapshot({
            documentTypeId: 'aufnahme',
            pageHeading: '',
            sectionContents: parsed,
            savedAt: new Date().toISOString(),
          })
          return
        }
      }
      applyDetectedCategory(text, category)
    },
    [applyDetectedCategory, handlePageSelect, workspace],
  )

  // Remove a previously-inserted paste from its page. Operates on the currently
  // active page, which is the page the paste was inserted into.
  const clearDetectedCategory = useCallback(
    (text: string, category: ContentCategory) => {
      if (category === 'aufnahme') {
        const parsed = parseAnamneseSections(text)
        if (Object.keys(parsed).length >= 2) {
          workspace.restoreFromSnapshot({
            documentTypeId: 'aufnahme',
            pageHeading: '',
            sectionContents: {},
            savedAt: new Date().toISOString(),
          })
          return
        }
      }
      removeTextFromEditor(text)
    },
    [removeTextFromEditor, workspace],
  )

  const handleDetectedPaste = useCallback(
    (text: string, category: ContentCategory) => {
      insertDetectedCategory(text, category)
      setPasteChip({ id: Date.now(), text, category })
    },
    [insertDetectedCategory],
  )

  // Deferred re-route for the chip's "change category" action. We clear the old
  // page first (committed in the triggering render), then insert into the new
  // page from this effect. Splitting the move across two renders avoids the
  // stale-closure content that selectDocumentType would otherwise persist back
  // to the old document during navigation — which is what caused content to be
  // duplicated instead of moved.
  const [pendingReroute, setPendingReroute] = useState<{
    text: string
    category: ContentCategory
  } | null>(null)

  useEffect(() => {
    if (!pendingReroute) return
    const { text, category } = pendingReroute
    setPendingReroute(null)
    insertDetectedCategory(text, category)
  }, [pendingReroute, insertDetectedCategory])

  const handleChangePasteCategory = useCallback(
    (newCategory: ContentCategory) => {
      const chip = pasteChip
      if (!chip || newCategory === chip.category) return
      clearDetectedCategory(chip.text, chip.category)
      setPendingReroute({ text: chip.text, category: newCategory })
      setPasteChip((current) =>
        current ? { ...current, category: newCategory } : null,
      )
    },
    [clearDetectedCategory, pasteChip],
  )

  const handlePasteAction = useCallback(
    (action: PasteActionId, pastedText: string) => {
      const targetPage = pasteActionTargetPage(action)
      if (targetPage) {
        handlePageSelect(targetPage)
        appendTextToEditor(pastedText)
        return
      }

      if (isAiToolKey(action)) {
        appendTextToEditor(pastedText)
        flushSync(() => {
          workspace.selectAiTool(action)
        })
        workspace.handleGenerateWithTool(action)
      }
    },
    [appendTextToEditor, handlePageSelect, workspace],
  )

  const handleSlashCommand = useCallback(
    (command: SlashCommandId) => {
      const aiTool = slashCommandToAiTool(command)
      if (aiTool) {
        runAiTool(aiTool)
        return
      }

      switch (command) {
        case 'heading': {
          const heading = t('notionSlashHeadingTemplate')
          appendTextToEditor(heading)
          break
        }
        case 'anamneseSection':
          handlePageSelect('aufnahme')
          appendTextToEditor(t('notionSlashAnamneseTemplate'))
          break
        case 'verlaufEntry':
          handlePageSelect('verlauf')
          appendTextToEditor(t('notionSlashVerlaufTemplate'))
          break
        case 'psychopathSection':
          handlePageSelect('psychopath')
          appendTextToEditor(t('notionSlashPsychopathTemplate'))
          break
        case 'addLabValue':
          handlePageSelect('labor')
          lab.openAddLabDialog()
          break
        case 'insertVisualisation':
          handlePageSelect('visualisation')
          break
        default:
          break
      }
    },
    [appendTextToEditor, handlePageSelect, lab, runAiTool, t],
  )

  const showToolCanvas = isToolPage(activePage)
  const showDocumentCanvas = !showToolCanvas

  // Patient name and linked state — read from local case registry (client-side only)
  const [patientMetaVersion, setPatientMetaVersion] = useState(0)
  const currentPatientName = useMemo(
    () => {
      const meta = getCaseMeta(caseId)
      const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
        .filter(Boolean)
        .join(' ')
      return (
        structuredName ||
        meta?.localName?.trim() ||
        (isDemoCase(caseId) ? t('demoPatientDisplayName') : undefined)
      )
    },
    [caseId, patientMetaVersion, t],
  )
  const hasPatient = Boolean(currentPatientName)

  const nextPatient = useMemo(() => {
    const listedPatients = caseRegistry.cases.filter(isListedPatientCase)
    if (listedPatients.length <= 1) return undefined

    const currentIndex = listedPatients.findIndex((item) => item.caseId === caseId)
    if (currentIndex === -1 || currentIndex >= listedPatients.length - 1) return undefined
    return listedPatients[currentIndex + 1]
  }, [caseId, caseRegistry.cases])

  const prevPatient = useMemo(() => {
    const listedPatients = caseRegistry.cases.filter(isListedPatientCase)
    if (listedPatients.length <= 1) return undefined

    const currentIndex = listedPatients.findIndex((item) => item.caseId === caseId)
    if (currentIndex <= 0) return undefined
    return listedPatients[currentIndex - 1]
  }, [caseId, caseRegistry.cases])

  const nextPatientName = useMemo(() => {
    if (!nextPatient) return undefined
    const meta = getCaseMeta(nextPatient.caseId)
    const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
      .filter(Boolean)
      .join(' ')
    return structuredName || meta?.localName?.trim() || nextPatient.displayTitle
  }, [nextPatient, patientMetaVersion])

  const prevPatientName = useMemo(() => {
    if (!prevPatient) return undefined
    const meta = getCaseMeta(prevPatient.caseId)
    const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
      .filter(Boolean)
      .join(' ')
    return structuredName || meta?.localName?.trim() || prevPatient.displayTitle
  }, [prevPatient, patientMetaVersion])

  // Keep the workspace tab label in sync with the current patient name.
  // Uses stable refs so it only fires when the patient name or active tab actually changes.
  const onUpdateTabPatient = workspaceTabs?.onUpdateTabPatient
  const activeWorkspaceTabId = workspaceTabs?.activeTabId
  useEffect(() => {
    if (!showWorkspaceTabs || !onUpdateTabPatient || !activeWorkspaceTabId) return
    onUpdateTabPatient(activeWorkspaceTabId, currentPatientName ?? '')
  }, [currentPatientName, showWorkspaceTabs, onUpdateTabPatient, activeWorkspaceTabId])

  // Update the browser tab title to reflect the active patient.
  useEffect(() => {
    const base = 'Psychiatry.ink'
    document.title = currentPatientName ? `${currentPatientName} – ${base}` : base
    return () => {
      document.title = base
    }
  }, [currentPatientName])

  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false)

  const handlePatientCreated = useCallback(
    (patient: NewPatientData) => {
      caseRegistry.upsertCaseMeta(caseId, {
        localName: patient.name || undefined,
        localVorname: patient.vorname || undefined,
        localNachname: patient.nachname || undefined,
        localGeburtsdatum: patient.geburtsdatum || undefined,
        localGeschlecht: patient.geschlecht || undefined,
        lastOpened: new Date().toISOString(),
      })
      setPatientMetaVersion((v) => v + 1)
      void caseRegistry.refresh()
      setShowCreatePatientDialog(false)
      setShowPatientRegistry(false)
      setActiveTopTab('overview')
    },
    [caseId, caseRegistry],
  )

  const handleRegistryEditPatient = useCallback(
    (targetCaseId: string, patient: NewPatientData) => {
      caseRegistry.upsertCaseMeta(targetCaseId, {
        localName: patient.name || undefined,
        localVorname: patient.vorname || undefined,
        localNachname: patient.nachname || undefined,
        localGeburtsdatum: patient.geburtsdatum || undefined,
        localGeschlecht: patient.geschlecht || undefined,
      })
      if (targetCaseId === caseId) {
        setPatientMetaVersion((v) => v + 1)
      }
      void caseRegistry.refresh()
    },
    [caseId, caseRegistry],
  )

  const handleRegistryOpenPatient = useCallback(
    (targetCaseId: string) => {
      if (targetCaseId === caseId) {
        setShowPatientRegistry(false)
        setActiveTopTab('overview')
        return
      }
      guardedNav(
        { type: 'navigateCase', caseId: targetCaseId, showPatientDashboard: true },
        () => {
          archiveActiveDocumentIfNeeded('draft')
          onNavigateNewCase?.(targetCaseId, undefined, true)
        },
      )
    },
    [archiveActiveDocumentIfNeeded, caseId, guardedNav, onNavigateNewCase],
  )

  const handleRegistryCreatePatient = useCallback(
    (patient: NewPatientData) => {
      const newCaseId = caseRegistry.addCase()
      if (patient.name || patient.vorname || patient.nachname || patient.geburtsdatum || patient.geschlecht) {
        caseRegistry.upsertCaseMeta(newCaseId, {
          localName: patient.name || undefined,
          localVorname: patient.vorname || undefined,
          localNachname: patient.nachname || undefined,
          localGeburtsdatum: patient.geburtsdatum || undefined,
          localGeschlecht: patient.geschlecht || undefined,
        })
      }
      void caseRegistry.refresh()
      guardedNav(
        { type: 'navigateCase', caseId: newCaseId, showPatientDashboard: true },
        () => {
          archiveActiveDocumentIfNeeded('draft')
          onNavigateNewCase?.(newCaseId, undefined, true)
        },
      )
    },
    [archiveActiveDocumentIfNeeded, caseRegistry, guardedNav, onNavigateNewCase],
  )

  const handleCalendarCreatePatient = useCallback(
    async (patient: NewPatientData) => {
      const newCaseId = caseRegistry.addCase()
      if (patient.name || patient.vorname || patient.nachname || patient.geburtsdatum || patient.geschlecht) {
        caseRegistry.upsertCaseMeta(newCaseId, {
          localName: patient.name || undefined,
          localVorname: patient.vorname || undefined,
          localNachname: patient.nachname || undefined,
          localGeburtsdatum: patient.geburtsdatum || undefined,
          localGeschlecht: patient.geschlecht || undefined,
        })
      }
      await caseRegistry.refresh()
      return newCaseId
    },
    [caseRegistry],
  )

  const workspaceReadOnly = !caseAccessChecks.canEdit || isDemoCaseReadOnly(storageCaseIdForAccess ?? caseId, user?.email)
  const showDemoBanner = isDemoCaseReadOnly(storageCaseIdForAccess ?? caseId, user?.email)
  const [workspaceMenuRequest, setWorkspaceMenuRequest] = useState(0)
  const requestWorkspaceMenu = useCallback(() => {
    setWorkspaceMenuRequest((current) => current + 1)
  }, [])

  const handleTopTabSelect = useCallback(
    (tab: TopNavTabId) => {
      if (
        activeTopTab === 'workspace' &&
        tab !== 'workspace' &&
        workspace.selectedDocumentType
      ) {
        archiveActiveDocumentIfNeeded('draft')
      }
      setShowPatientRegistry(false)
      setActiveTopTab(tab)

      if (!onNavigate) return

      const casePath = `/case/${encodeURIComponent(storageCaseId)}`
      if (tab === 'discuss') {
        onNavigate(`${casePath}/discuss`)
      } else if (tab === 'konsil') {
        onNavigate(`${casePath}/konsil`)
      } else if (activeTopTab === 'discuss' || activeTopTab === 'konsil') {
        onNavigate(casePath)
      }
    },
    [activeTopTab, archiveActiveDocumentIfNeeded, onNavigate, storageCaseId, workspace.selectedDocumentType],
  )

  if (storageCaseIdForAccess && caseAccessChecks.isLoading) {
    return (
      <div className="notion-preview-app text-ink case-access-state" aria-busy="true">
        <div className="case-access-state__inner">…</div>
      </div>
    )
  }

  if (storageCaseIdForAccess && !caseAccessChecks.canView) {
    return (
      <div className="notion-preview-app text-ink case-access-denied">
        <div className="case-access-denied__inner">
          <h1 className="case-access-denied__title">Kein Zugriff auf diesen Fall</h1>
          {onNavigateDashboard ? (
            <button type="button" className="btn-secondary" onClick={onNavigateDashboard}>
              Zum Dashboard
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'notion-preview-app text-ink',
        showCaseSidebar ? 'notion-preview-app--case-sidebar' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-area={showCaseSidebar ? activeTopTab : undefined}
    >
      {showDemoBanner ? (
        <div className="demo-readonly-banner" role="status">
          {t('demoReadOnlyBanner')}
        </div>
      ) : null}
      <WorkspaceActivitySync workspace={workspace} />
      <DocumentationTodayTotalSync isDocumentationPage={showDocumentCanvas} />
      {!showCaseSidebar && !settingsPanel.isOpen ? (
        <NotionTopBar
          creditBalance={workspace.creditBalance}
          onOpenSettings={settingsPanel.openSettings}
          onNavigateDashboard={
            onNavigateDashboard
              ? () =>
                  guardedNav({ type: 'navigateDashboard' }, () => {
                    archiveActiveDocumentIfNeeded('draft')
                    onNavigateDashboard()
                  })
              : undefined
          }
        />
      ) : null}

      {showWorkspaceTabs && workspaceTabs && !settingsPanel.isOpen && (
        <WorkspaceTabBar
          tabs={workspaceTabs.tabs}
          activeTabId={workspaceTabs.activeTabId}
          onTabSelect={workspaceTabs.onTabSelect}
          onAddTab={workspaceTabs.onAddTab}
          onCloseTab={handleCloseTab}
        />
      )}

      {settingsPanel.isOpen ? (
        <SettingsPage
          activeSection={settingsPanel.activeSection}
          onSectionChange={settingsPanel.setActiveSection}
          onClose={settingsPanel.closeSettings}
          creditBalance={workspace.creditBalance}
          appearance={appearance}
          privacy={privacy}
          workspace={workspaceSettings}
          aiAutoMode={workspace.aiAutoMode}
          onToggleAiAuto={workspace.toggleAiAutoMode}
          kiInstructions={workspace.kiInstructions}
          language={languageSettings.language}
          englishVariant={languageSettings.englishVariant}
          onSelectLanguage={languageSettings.selectLanguage}
          onSelectEnglishVariant={languageSettings.selectEnglishVariant}
          assessmentStandard={assessmentStandard}
          onSelectAssessmentStandard={handleAssessmentStandardChange}
          workspaceVault={workspaceVault}
        />
      ) : (
        <>
      {!showCaseSidebar ? (
      <CaseTopNav
        activeTab={activeTopTab}
        onTabSelect={handleTopTabSelect}
        patientName={currentPatientName}
        onPatientClick={() => {
          setShowPatientRegistry(false)
          setActiveTopTab('overview')
        }}
        nextPatientName={nextPatientName}
        onNextPatientClick={
          nextPatient ? () => handleRegistryOpenPatient(nextPatient.caseId) : undefined
        }
        prevPatientName={prevPatientName}
        onPrevPatientClick={
          prevPatient ? () => handleRegistryOpenPatient(prevPatient.caseId) : undefined
        }
        onRegistryClick={() => {
          setShowPatientRegistry(true)
          void caseRegistry.refresh()
        }}
        registryActive={showPatientRegistry}
        hasPatient={hasPatient}
        onCreatePatient={() => setShowCreatePatientDialog(true)}
        activePageLabel={workspacePageLabel}
        onCloseWorkspacePage={
          activeTopTab === 'workspace' &&
          !showPatientRegistry &&
          isWorkspacePageOpen(activePage, workspace.selectedDocumentType)
            ? handleCloseWorkspacePage
            : undefined
        }
      />
      ) : null}

      {showActiveAppointment && activeAppointment ? (
        <ActiveAppointmentBar
          appointment={activeAppointment}
          onNavigateTab={(tab, page) => {
            setShowPatientRegistry(false)
            setActiveTopTab(tab)
            if (page) {
              setActivePage(page)
              const notionPage = NOTION_PAGES.find((item) => item.id === page)
              if (notionPage?.kind === 'document' && notionPage.documentTypeId) {
                workspace.selectDocumentType(notionPage.documentTypeId)
              }
            }
          }}
          onCreateFollowUp={(prefill) => {
            setCalendarPrefill({ ...prefill, caseId })
            setCalendarModalOpen(true)
          }}
          onAddNote={(notes) => {
            void updateCalendarItem(activeAppointment.id, { notes })
          }}
          onComplete={() => void completeCalendarItem(activeAppointment.id)}
          onCompleteAndNext={() => void completeAndGoToNext(activeAppointment)}
        />
      ) : null}

      <CalendarItemModal
        open={calendarModalOpen}
        onClose={() => {
          setCalendarModalOpen(false)
          setCalendarPrefill(null)
        }}
        cases={patientCases}
        initial={calendarPrefill as CreateCalendarItemInput | null}
        onCreatePatient={handleCalendarCreatePatient}
        onSave={async (input) => {
          await createCalendarItem({ ...input, caseId: input.caseId ?? caseId })
        }}
      />

      <CaseSectionNavProviders activeTab={activeTopTab} caseId={storageCaseId}>
      {showCaseSidebar ? (
        <CaseSidebarPanel
          ariaLabel={t('patientDashboardQuickAccess')}
          onNavigateHome={
            onNavigateDashboard
              ? () =>
                  guardedNav({ type: 'navigateDashboard' }, () => {
                    archiveActiveDocumentIfNeeded('draft')
                    onNavigateDashboard()
                  })
              : undefined
          }
          onBackToPatients={() => {
            setShowPatientRegistry(true)
            void caseRegistry.refresh()
          }}
          activeTab={activeTopTab}
          onTabSelect={handleTopTabSelect}
          hasPatient={hasPatient}
          onCreatePatient={() => setShowCreatePatientDialog(true)}
          creditBalance={workspace.creditBalance}
          onOpenSettings={settingsPanel.openSettings}
          onBreakStart={handleBreakStart}
        >
          <CaseSidebarContent
            activeTab={activeTopTab}
            onOpenWorkspacePage={(pageId) => {
              setActiveTopTab('workspace')
              handlePageSelect(pageId)
            }}
            onOpenTemplateFromPatient={() => setTemplateHostOpen(true)}
            onAddAnforderung={
              workspaceReadOnly ? undefined : () => setAnforderungModalOpen(true)
            }
            workspaceSidebar={
              activeTopTab === 'workspace'
                ? {
                    storageCaseId,
                    panelGraphicEnabled: appearance.settings.showPanelGraphic,
                    breakReminderActive,
                    onClosePanelGraphic: handleClosePanelGraphic,
                    onBreakStart: handleBreakStart,
                    onNavigateToLabor: () => setActiveTopTab('labor'),
                    savedDocs,
                    onViewSavedDoc: handleViewSavedDoc,
                    onRemoveSavedDoc: handleRemoveSavedDoc,
                    openDocumentLabel: workspace.selectedDocumentType ? documentLabel : undefined,
                    onCloseDocument: workspace.selectedDocumentType
                      ? handleCloseWorkspacePage
                      : undefined,
                    onAddAnforderung: workspaceReadOnly
                      ? undefined
                      : () => setAnforderungModalOpen(true),
                    anforderungenReadOnly: workspaceReadOnly,
                  }
                : undefined
            }
          />
        </CaseSidebarPanel>
      ) : null}

      <main
        className={[
          'notion-preview-main',
          showCaseSidebar ? 'notion-preview-main--case-sidebar' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showCaseSidebar ? (
          <div className="case-main-top-bar">
            <CaseSidebarBackLink
              variant="content"
              active={showPatientRegistry}
              onClick={() => {
                setShowPatientRegistry(true)
                void caseRegistry.refresh()
              }}
            />
            {hasPatient ? (
              <>
                <span className="case-main-top-bar__sep" aria-hidden>
                  |
                </span>
                <CaseSidebarNextLink
                  nextPatientName={nextPatientName}
                  disabled={!nextPatient}
                  onClick={
                    nextPatient
                      ? () => handleRegistryOpenPatient(nextPatient.caseId)
                      : () => {}
                  }
                />
              </>
            ) : null}
          </div>
        ) : null}

        {showPatientRegistry ? (
          <MeinePatientenView
            cases={caseRegistry.cases}
            loading={caseRegistry.loading}
            error={caseRegistry.error}
            onOpenPatient={handleRegistryOpenPatient}
            onCreatePatient={handleRegistryCreatePatient}
            onEditPatient={handleRegistryEditPatient}
          />
        ) : null}

        {!showPatientRegistry && activeTopTab === 'overview' ? (
          <PatientDashboardView
            caseId={caseId}
            metaVersion={patientMetaVersion}
            therapyCaseId={storageCaseId}
            onTabSelect={setActiveTopTab}
            onAddMedication={() => {
              setPendingMedicationAdd(true)
              setActiveTopTab('medikation')
            }}
            onOpenWorkspacePage={(pageId) => {
              setActiveTopTab('workspace')
              handlePageSelect(pageId)
            }}
            onOpenTemplateFromPatient={() => setTemplateHostOpen(true)}
            onNavigateHome={
              onNavigateDashboard
                ? () =>
                    guardedNav({ type: 'navigateDashboard' }, () => {
                      archiveActiveDocumentIfNeeded('draft')
                      onNavigateDashboard()
                    })
                : undefined
            }
          />
        ) : null}

        {!showPatientRegistry && activeTopTab === 'verlauf' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <VerlaufFeedPage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'diagnose' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <DiagnosePage
                caseId={caseId}
                onJumpToSection={(pageId) => {
                  setActiveTopTab('workspace')
                  setActivePage(pageId)
                }}
              />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'dokumente' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <DokumentePage
            caseId={storageCaseId}
            onAfterDelete={handleAfterDeleteDokument}
            onEditDraft={handleEditDraft}
          />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'labor' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <LaborPage caseId={storageCaseId} hasPatient={hasPatient} useExternalSidebar />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'medikation' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <MedikationPage
                caseId={storageCaseId}
                autoOpenMedicationAdd={pendingMedicationAdd}
                onAutoOpenMedicationAddHandled={() => setPendingMedicationAdd(false)}
              />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'therapie' ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <TherapiePage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'discuss' && onNavigate ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <DiscussCasePage
                embedded
                caseId={storageCaseId}
                discussionId={initialDiscussId}
                onNavigate={onNavigate}
                onNavigateHome={onNavigateDashboard}
              />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'konsil' && onNavigate ? (
          <div className="case-tab-shell">
            <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
            <div className="case-tab-shell__body case-tab-shell__body--full">
              <ConsultationCasePage
                embedded
                caseId={storageCaseId}
                requestId={initialKonsilId}
                onNavigate={onNavigate}
                onNavigateHome={onNavigateDashboard}
              />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && activeTopTab === 'workspace' ? (
          <>
        <div className="case-tab-shell">
          <CasePatientHeader caseId={caseId} metaVersion={patientMetaVersion} />
          {workspacePageLabel &&
          isWorkspacePageOpen(activePage, workspace.selectedDocumentType) ? (
            <div className="case-workspace-doc-bar">
              <span className="case-workspace-doc-bar__label">{workspacePageLabel}</span>
              <button
                type="button"
                className="case-workspace-doc-bar__close"
                onClick={handleCloseWorkspacePage}
                aria-label={t('workspaceCloseDocument')}
                title={t('workspaceCloseDocument')}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : null}
          <div className="case-tab-shell__body case-tab-shell__body--full">
        <WorkspaceContextMenu
          activePage={activePage}
          activeSectionId={workspace.activeSectionId}
          pageSubsections={pageSubsections}
          onSelect={handlePageSelect}
          onSelectWithSection={handlePageSelectWithSection}
          openMenuRequest={workspaceMenuRequest}
          konsilAction={
            hasPatient && onNavigate
              ? {
                  labelKey: 'topNavKonsil',
                  onSelect: () => handleTopTabSelect('konsil'),
                }
              : undefined
          }
          templateAction={{
            labelKey:
              storageCaseId === DEFAULT_CASE_ID
                ? 'templateOpenEmpty'
                : 'templateCreateFromPatient',
            onSelect: () => setTemplateHostOpen(true),
          }}
        >
          <div className="notion-preview-canvas">
            {activePage === 'timeline' ? (
              <NotionTimelineCanvas
                caseId={storageCaseId}
                timeline={timeline}
                onVaultSave={handleVaultSaveWithArchive}
              />
            ) : activePage === 'labor' || activePage === 'visualisation' ? (
              <LaborPage
                caseId={storageCaseId}
                hasPatient={hasPatient}
                onCreatePatient={() => setShowCreatePatientDialog(true)}
              />
            ) : (
              <>
                {storageCaseId === DEFAULT_CASE_ID ? (
                  <div className="notion-template-toolbar">
                    <button
                      type="button"
                      className="dt-entry-btn"
                      onClick={() => setTemplateHostOpen(true)}
                    >
                      {t('templateOpenEmpty')}
                    </button>
                  </div>
                ) : null}
                {hasDraftOnlyBanner && workspace.selectedDocumentType && (
                  <div className="workspace-draft-banner" role="status">
                    {t('anamneseDraftWarning')}
                  </div>
                )}
              <NotionPaper
                caseId={caseId}
                workspaceStorageId={storageCaseId}
                documentTypeId={workspace.selectedDocumentType}
                documentLabel={documentLabel}
                sectionLabel={activeSection?.label}
                sections={workspace.sections}
                sectionConfigs={sectionConfigs}
                sectionContents={workspace.sectionContents}
                checklistSelections={workspace.checklistSelections}
                componentVariants={componentVariants}
                activeVariantId={workspace.activeVariantId}
                documentMode={workspace.documentMode}
                activeChecklistItems={workspace.activeChecklistItems}
                activeChecklistSelections={workspace.activeChecklistSelections}
                showNormalBefundButton={workspace.showNormalBefundButton}
                activeSectionId={workspace.activeSectionId}
                showMultistageSections={showMultistageSections}
                editorContent={workspace.editorContent}
                dictationPhase={workspace.dictationPhase}
                dictationDurationMs={workspace.dictationDurationMs}
                dictationPlaybackMs={workspace.dictationPlaybackMs}
                isPlayingBack={workspace.isPlayingBack}
                isDictationActive={workspace.isDictationActive}
                inputMode={workspace.inputMode}
                dictationError={workspace.dictationError}
                isGenerating={workspace.isGenerating}
                aiModelTier={workspace.aiModelTier}
                selectedAiTool={workspace.selectedAiTool}
                aiCanGenerate={workspace.aiCanGenerate && caseAccessChecks.canUseAI}
                panelGraphicEnabled={appearance.settings.showPanelGraphic}
                breakReminderActive={breakReminderActive}
                pageType={appearance.settings.pageType}
                onEditorChange={workspace.setEditorContent}
                onSectionContentChange={workspace.setSectionContent}
                onEditorPaste={workspace.onEditorPaste}
                onDetectedPaste={handleDetectedPaste}
                onSaveSection={workspace.saveSection}
                onSelectAiModelTier={workspace.setAiModelTier}
                onSelectAiTool={workspace.selectAiTool}
                kiExtraInstruction={workspace.kiExtraInstruction}
                onKiExtraInstructionChange={workspace.setKiExtraInstruction}
                onGenerate={workspace.handleGenerate}
                onSelectionAction={handleSelectionAction}
                onPasteAction={handlePasteAction}
                onSlashCommand={handleSlashCommand}
                onSectionSelect={workspace.selectSection}
                onSectionFocus={workspace.focusSection}
                onSectionAiTool={handleSectionAiTool}
                onEditorAiTool={handleEditorAiTool}
                onVariantSelect={workspace.selectComponentVariant}
                onToggleChecklistItem={workspace.toggleChecklistItem}
                onInsertNormalBefund={workspace.insertNormalBefund}
                onPauseDictation={workspace.pauseDictation}
                onResumeDictation={workspace.resumeDictation}
                onStopRecording={workspace.stopRecording}
                onTogglePlayback={workspace.togglePlayback}
                onDiscardRecording={workspace.discardRecording}
                onTranscribe={workspace.transcribeRecording}
                onClosePanelGraphic={handleClosePanelGraphic}
                onBreakStart={handleBreakStart}
                privacy={privacy}
                clinicalAge={clinicalAge}
                onMigratedAge={onMigratedAge}
                onOpenPrivacySettings={() => settingsPanel.openSettings('privacy')}
                onSaveWorkspaceVault={handleVaultSaveWithArchive}
                onStartDictation={workspace.startDictation}
                onSwitchToWrite={() => workspace.setInputMode('write')}
                dictationDisabled={!workspace.dictationCreditsAvailable}
                onNavigateToLabor={() => {
                  setActiveTopTab('labor')
                }}
                savedDocs={savedDocs}
                onViewSavedDoc={handleViewSavedDoc}
                onRemoveSavedDoc={handleRemoveSavedDoc}
                onCloseDocument={
                  workspace.selectedDocumentType ? handleCloseWorkspacePage : undefined
                }
                onPsychopathModeSelect={handlePsychopathModeSelect}
                accessReadOnly={workspaceReadOnly}
                onOpenWorkspaceMenu={requestWorkspaceMenu}
                useExternalSidebar={showCaseSidebar}
              />
              </>
            )}
          </div>
        </WorkspaceContextMenu>
          </div>
        </div>

        {showDocumentCanvas ? (
          <>
            {workspace.generationPendingReview ? (
              <NotionGenerationReview
                isGenerating={workspace.isGenerating}
                onRewrite={workspace.handleRewrite}
                onRegenerate={workspace.handleGenerate}
                onAccept={handleAcceptGenerationWithArchive}
                onReject={workspace.rejectGeneration}
              />
            ) : null}
            <NotionInputBar
              dictationPhase={workspace.dictationPhase}
              isDictationActive={workspace.isDictationActive}
            />
          </>
        ) : null}
          </>
        ) : null}
      </main>
      </CaseSectionNavProviders>

        </>
      )}

      {showCreatePatientDialog && (
        <NewPatientDialog
          onSubmit={handlePatientCreated}
          onCancel={() => setShowCreatePatientDialog(false)}
        />
      )}

      <NotionToastHost />

      {pasteChip ? (
        <PasteDetectionChip
          key={pasteChip.id}
          category={pasteChip.category}
          onChangeCategory={handleChangePasteCategory}
          onDismiss={() => setPasteChip(null)}
        />
      ) : null}
      {pendingNavAction && (
        <UnsavedChangesDialog
          onSave={() => void handleUnsavedSave()}
          onDiscard={handleUnsavedDiscard}
          onCancel={handleUnsavedCancel}
          isSaving={isSavingBeforeNav}
        />
      )}

      {templateHostOpen ? (
        <TemplateWorkspaceHost
          caseId={storageCaseId !== DEFAULT_CASE_ID ? storageCaseId : undefined}
          context={storageCaseId !== DEFAULT_CASE_ID ? 'patientWorkspace' : 'emptyWorkspace'}
          saveToPatientDocuments={false}
          onClose={() => setTemplateHostOpen(false)}
        />
      ) : null}

      <AnforderungCreateModal
        caseId={storageCaseId}
        open={anforderungModalOpen}
        onClose={() => setAnforderungModalOpen(false)}
      />
    </div>
  )
}
