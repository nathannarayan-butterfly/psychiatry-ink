import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCaseMeta, upsertCaseMeta } from '../../hooks/useCaseRegistry'
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
import { LottieCharacterStage } from '../LottieCharacterStage'
import { SettingsPage } from '../settings/SettingsPage'
import { DocumentationTodayTotalSync } from '../DocumentationTodayTotalSync'
import { WorkspaceActivitySync } from '../WorkspaceActivitySync'
import { PanelDateCard } from '../PanelDateCard'
import { CaseTopNav, type TopNavTabId } from './CaseTopNav'
import { WorkspaceTabBar } from './WorkspaceTabBar'
import { DiagnosenWidget } from './DiagnosenWidget'
import { MeinePatientenView } from './MeinePatientenView'
import { PatientDashboardView } from './PatientDashboardView'
import { VerlaufFeedPage } from './VerlaufFeedPage'
import { LaborPage } from './LaborPage'
import { DokumentePage } from './DokumentePage'
import { TherapiePage } from './TherapiePage'
import { NewPatientDialog } from '../dashboard/NewPatientDialog'
import type { NewPatientData } from '../dashboard/NewPatientDialog'
import { scheduleAiGenerationImprint } from '../../utils/clinicalImprint'
import { appendVerlaufEntry } from '../../utils/verlaufFeed'
import { appendDokument, inferDokumentCategory } from '../../utils/dokumenteArchive'
import { appendSavedDoc, loadSavedDocs, type SavedDoc } from '../../utils/savedDocs'
import { NotionTopBar } from './NotionTopBar'
import { WorkspaceContextMenu } from './WorkspaceContextMenu'
import { NotionPaper, type SavedWorkspaceDocumentPayload } from './NotionPaper'
import { NotionInputBar } from './NotionInputBar'
import { NotionTimelineCanvas } from './NotionTimelineCanvas'
import { NotionGenerationReview } from './NotionGenerationReview'
import { NotionToastHost } from './NotionToast'
import type { SelectionActionId } from './FloatingSelectionToolbar'
import type { PasteActionId } from './PasteAssistant'
import { pasteActionTargetPage } from './PasteAssistant'
import type { SlashCommandId } from './SlashCommandMenu'
import { slashCommandToAiTool } from './SlashCommandMenu'
import {
  isToolPage,
  isWorkspacePageOpen,
  NOTION_PAGES,
  resolveNotionPageFromDocumentType,
  type NotionPageId,
} from './notionPages'
import { documentTypes } from '../../data/documentTypes'
import { resolveDocumentTypeWithVariant } from '../../utils/workspaceComponents'

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
  onNavigateNewCase?: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean) => void
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
  plan: _plan,
  workspaceTabs,
  workspaceStorageId,
  showWorkspaceTabs = false,
  savedDocsCaseId,
}: NotionAppProps) {
  const { t } = useTranslation()
  const [breakLottieActive, setBreakLottieActive] = useState(false)
  // Each workspace tab gets its own saved-docs list via a per-tab storage key.
  const savedDocsKey = savedDocsCaseId ?? caseId
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>(() => loadSavedDocs(savedDocsKey))
  const storageCaseId = workspaceStorageId ?? caseId

  useEffect(() => {
    setSavedDocs(loadSavedDocs(savedDocsKey))
  }, [savedDocsKey])

  const handleBreakStart = useCallback(() => {
    setBreakLottieActive(true)
  }, [])

  const handleClosePanelGraphic = useCallback(() => {
    appearance.setShowPanelGraphic(false)
    setBreakLottieActive(false)
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

  const VERLAUF_DOCUMENT_TYPES = ['verlauf', 'therapie-verlauf']

  const handleVaultSaveWithFeedAppend = useCallback(async () => {
    const docTypeId = workspace.selectedDocumentType
    if (VERLAUF_DOCUMENT_TYPES.includes(docTypeId)) {
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
          appendVerlaufEntry(storageCaseId, {
            date: new Date().toISOString(),
            content: content.trim(),
            pageType: docTypeId,
            sectionLabel: activeSection?.label,
            source,
          })
        }
      }
    }
    await workspaceVault.saveNow()
  }, [
    storageCaseId,
    workspace.activeSectionId,
    workspace.editorContent,
    workspace.generationPendingReview,
    workspace.generationWasAccepted,
    workspace.sectionContents,
    workspace.sections,
    workspace.selectedDocumentType,
    workspaceVault,
  ])
  const [activeTopTab, setActiveTopTab] = useState<TopNavTabId>('workspace')
  const [showPatientDashboard, setShowPatientDashboard] = useState(
    () => initialShowPatientDashboard ?? false,
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

  const handleCloseWorkspacePage = useCallback(() => {
    workspace.resetToBlankPage()
    setShowPatientDashboard(true)
  }, [workspace])

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
      appendDokument(storageCaseId, {
        category,
        title: documentLabel,
        content: content.trim(),
        date: new Date().toISOString(),
        source: 'ai-accepted',
        pageType: docTypeId,
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
  }, [documentLabel, savedDocsKey, storageCaseId, workspace, workspaceVault])

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
        appendDokument(storageCaseId, {
          category,
          title: typeLabel,
          content: content.trim(),
          date: savedAt,
          source: 'manual',
          pageType: docTypeId,
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

    await handleVaultSaveWithFeedAppend()
    if (docTypeId && content.trim() && !workspace.generationPendingReview) {
      workspace.resetToBlankPage()
    }
  }, [documentLabel, handleVaultSaveWithFeedAppend, savedDocsKey, storageCaseId, workspace])

  const handleViewSavedDoc = useCallback(
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
      // Navigate to workspace tab to show the document
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
      return structuredName || meta?.localName?.trim() || undefined
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId, patientMetaVersion],
  )
  const hasPatient = Boolean(currentPatientName)

  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false)

  const handlePatientCreated = useCallback(
    (patient: NewPatientData) => {
      upsertCaseMeta(caseId, {
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
      setShowPatientDashboard(true)
    },
    [caseId, caseRegistry],
  )

  const handleRegistryOpenPatient = useCallback(
    (targetCaseId: string) => {
      if (targetCaseId === caseId) {
        setShowPatientRegistry(false)
        setShowPatientDashboard(true)
        return
      }
      onNavigateNewCase?.(targetCaseId, undefined, true)
    },
    [caseId, onNavigateNewCase],
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
      onNavigateNewCase?.(newCaseId, undefined, true)
    },
    [caseRegistry, onNavigateNewCase],
  )

  return (
    <div className="notion-preview-app text-ink">
      <WorkspaceActivitySync workspace={workspace} />
      <DocumentationTodayTotalSync isDocumentationPage={showDocumentCanvas} />
      <NotionTopBar
        creditBalance={workspace.creditBalance}
        onOpenSettings={settingsPanel.openSettings}
        onNavigateDashboard={onNavigateDashboard}
      />

      {showWorkspaceTabs && workspaceTabs && (
        <WorkspaceTabBar
          tabs={workspaceTabs.tabs}
          activeTabId={workspaceTabs.activeTabId}
          onTabSelect={workspaceTabs.onTabSelect}
          onAddTab={workspaceTabs.onAddTab}
          onCloseTab={workspaceTabs.onCloseTab}
        />
      )}

      {settingsPanel.isOpen ? (
        <SettingsPage
          activeSection={settingsPanel.activeSection}
          onSectionChange={settingsPanel.setActiveSection}
          onClose={settingsPanel.closeSettings}
          appearance={appearance}
          privacy={privacy}
          workspace={workspaceSettings}
          aiAutoMode={workspace.aiAutoMode}
          onToggleAiAuto={workspace.toggleAiAutoMode}
          kiInstructions={workspace.kiInstructions}
          language={languageSettings.language}
          onSelectLanguage={languageSettings.selectLanguage}
          workspaceVault={workspaceVault}
        />
      ) : (
        <>
      <CaseTopNav
        activeTab={activeTopTab}
        onTabSelect={(tab) => {
          setShowPatientRegistry(false)
          setShowPatientDashboard(false)
          setActiveTopTab(tab)
        }}
        patientName={currentPatientName}
        onPatientClick={() => {
          setShowPatientRegistry(false)
          setShowPatientDashboard(true)
        }}
        onRegistryClick={() => {
          setShowPatientDashboard(false)
          setShowPatientRegistry(true)
        }}
        registryActive={showPatientRegistry}
        hasPatient={hasPatient}
        onCreatePatient={() => setShowCreatePatientDialog(true)}
        activePageLabel={workspacePageLabel}
        onCloseWorkspacePage={
          activeTopTab === 'workspace' &&
          !showPatientDashboard &&
          !showPatientRegistry &&
          isWorkspacePageOpen(activePage, workspace.selectedDocumentType)
            ? handleCloseWorkspacePage
            : undefined
        }
      />

      <main className="notion-preview-main" data-lottie-exclusion>
        {showPatientRegistry ? (
          <MeinePatientenView
            cases={caseRegistry.cases}
            loading={caseRegistry.loading}
            error={caseRegistry.error}
            onOpenPatient={handleRegistryOpenPatient}
            onCreatePatient={handleRegistryCreatePatient}
          />
        ) : null}

        {!showPatientRegistry && showPatientDashboard ? (
          <PatientDashboardView
            caseId={caseId}
            onTabSelect={(tab) => {
              setShowPatientDashboard(false)
              setActiveTopTab(tab)
            }}
            onOpenWorkspacePage={(pageId) => {
              setShowPatientDashboard(false)
              setActiveTopTab('workspace')
              handlePageSelect(pageId)
            }}
          />
        ) : null}

        {!showPatientRegistry && !showPatientDashboard && activeTopTab === 'verlauf' ? (
          <div className="notion-tab-content-row">
            <aside className="notion-tab-content-row__sidebar">
              <PanelDateCard layout="sidebar" />
              <DiagnosenWidget caseId={caseId} onDiagnosesChanged={workspaceVault.scheduleSave} />
            </aside>
            <div className="notion-tab-content-row__body">
              <VerlaufFeedPage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && !showPatientDashboard && activeTopTab === 'dokumente' ? (
          <div className="notion-tab-content-row">
            <div className="notion-tab-content-row__body notion-tab-content-row__body--full">
              <DokumentePage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && !showPatientDashboard && activeTopTab === 'labor' ? (
          <div className="notion-tab-content-row notion-tab-content-row--full">
            <div className="notion-tab-content-row__body notion-tab-content-row__body--full">
              <LaborPage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && !showPatientDashboard && activeTopTab === 'therapie' ? (
          <div className="notion-tab-content-row">
            <aside className="notion-tab-content-row__sidebar">
              <PanelDateCard layout="sidebar" />
            </aside>
            <div className="notion-tab-content-row__body">
              <TherapiePage caseId={storageCaseId} />
            </div>
          </div>
        ) : null}

        {!showPatientRegistry && !showPatientDashboard && activeTopTab === 'workspace' ? (
          <>
        <WorkspaceContextMenu
          activePage={activePage}
          activeSectionId={workspace.activeSectionId}
          pageSubsections={pageSubsections}
          onSelect={handlePageSelect}
          onSelectWithSection={handlePageSelectWithSection}
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
                onCreatePatient={() => setShowCreatePatientDialog(true)}
              />
            ) : (
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
                aiCanGenerate={workspace.aiCanGenerate}
                panelGraphicEnabled={appearance.settings.showPanelGraphic}
                breakLottieActive={breakLottieActive}
                pageType={appearance.settings.pageType}
                onEditorChange={workspace.setEditorContent}
                onSectionContentChange={workspace.setSectionContent}
                onEditorPaste={workspace.onEditorPaste}
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
                  setShowPatientDashboard(false)
                  setActiveTopTab('labor')
                }}
                savedDocs={savedDocs}
                onViewSavedDoc={handleViewSavedDoc}
                onCloseDocument={
                  workspace.selectedDocumentType ? handleCloseWorkspacePage : undefined
                }
              />
            )}
          </div>
        </WorkspaceContextMenu>

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

        </>
      )}

      {showCreatePatientDialog && (
        <NewPatientDialog
          onCreated={handlePatientCreated}
          onCancel={() => setShowCreatePatientDialog(false)}
        />
      )}

      <NotionToastHost />
      <LottieCharacterStage />
    </div>
  )
}
