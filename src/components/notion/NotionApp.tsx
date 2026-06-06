import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { useCaseRegistry } from '../../hooks/useCaseRegistry'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import { NewCaseWorkflowDialog } from '../dashboard/NewCaseWorkflowDialog'
import type { useLabTool } from '../../hooks/useLabTool'
import type { useTimelineTool } from '../../hooks/useTimelineTool'
import type { useWorkspaceState } from '../../hooks/useWorkspaceState'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import type { useSettingsPanel } from '../../hooks/useSettingsPanel'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { AiToolKey } from '../../data/aiTools'
import { LottieCharacterStage } from '../LottieCharacterStage'
import { SettingsPage } from '../settings/SettingsPage'
import { DocumentationTodayTotalSync } from '../DocumentationTodayTotalSync'
import { WorkspaceActivitySync } from '../WorkspaceActivitySync'
import { NotionTopBar } from './NotionTopBar'
import { WorkspaceBackupBanner } from './WorkspaceBackupBanner'
import { NotionPageSwitcher } from './NotionPageSwitcher'
import { NotionPaper } from './NotionPaper'
import { NotionInputBar } from './NotionInputBar'
import { NotionLabCanvas } from './NotionLabCanvas'
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
  NOTION_PAGES,
  resolveNotionPageFromDocumentType,
  type NotionPageId,
} from './notionPages'

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
  onNavigateNewCase?: (caseId: string, page?: NotionPageId) => void
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
}: NotionAppProps) {
  const { t } = useTranslation()
  const dashboardSettings = useDashboardSettings()
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null)

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

  const handleNewPatient = useCallback(() => {
    const newCaseId = caseRegistry.addCase()
    if (dashboardSettings.openCaseDirectToWorkflow) {
      setPendingCaseId(newCaseId)
      return
    }
    onNavigateNewCase?.(newCaseId)
  }, [caseRegistry, dashboardSettings.openCaseDirectToWorkflow, onNavigateNewCase])

  const handleWorkflowSelect = useCallback(
    (pageId: NotionPageId) => {
      if (!pendingCaseId) return
      onNavigateNewCase?.(pendingCaseId, pageId)
      setPendingCaseId(null)
    },
    [onNavigateNewCase, pendingCaseId],
  )

  const handleStayOnDashboard = useCallback(() => {
    if (!pendingCaseId) return
    onNavigateNewCase?.(pendingCaseId)
    setPendingCaseId(null)
  }, [onNavigateNewCase, pendingCaseId])

  const handleCloseWorkflowDialog = useCallback(() => {
    setPendingCaseId(null)
  }, [])
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false)
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

  useEffect(() => {
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

  return (
    <div className="notion-preview-app text-ink">
      <WorkspaceActivitySync workspace={workspace} />
      <DocumentationTodayTotalSync isDocumentationPage={showDocumentCanvas} />
      <NotionTopBar
        creditBalance={workspace.creditBalance}
        onOpenSettings={settingsPanel.openSettings}
        onNavigateDashboard={onNavigateDashboard}
        onNewPatient={privacy.tier === 'full' && onNavigateNewCase ? handleNewPatient : undefined}
        newPatientDisabled={privacy.tier !== 'full'}
        newPatientDisabledTooltip={
          privacy.tier === 'disabled'
            ? t('newPatientTierDisabledTooltip')
            : t('newPatientTierLocalOnlyTooltip')
        }
      />

      <WorkspaceBackupBanner
        visible={workspaceVault.showBackupReminder && !backupBannerDismissed}
        onExport={() => void workspaceVault.exportVault()}
        onDismiss={() => setBackupBannerDismissed(true)}
      />

      <main className="notion-preview-main" data-lottie-exclusion>
        <NotionPageSwitcher
          activePage={activePage}
          onSelect={handlePageSelect}
          showInputModes={showDocumentCanvas}
          inputMode={workspace.inputMode}
          dictationPhase={workspace.dictationPhase}
          isGenerating={workspace.isGenerating}
          isDictationActive={workspace.isDictationActive}
          onInputModeChange={workspace.setInputMode}
          onDictate={workspace.startDictation}
        />

        <div className="notion-preview-canvas">
          {activePage === 'timeline' ? (
            <NotionTimelineCanvas
              caseId={caseId}
              timeline={timeline}
              onVaultSave={() => void workspaceVault.saveNow()}
            />
          ) : activePage === 'labor' || activePage === 'visualisation' ? (
            <NotionLabCanvas
              caseId={caseId}
              pageId={activePage}
              lab={lab}
              pageLabel={documentLabel}
              onVaultSave={() => void workspaceVault.saveNow()}
            />
          ) : (
            <NotionPaper
              caseId={caseId}
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
              showPanelGraphic={appearance.settings.showPanelGraphic}
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
              onClosePanelGraphic={() => appearance.setShowPanelGraphic(false)}
              privacy={privacy}
              clinicalAge={clinicalAge}
              onMigratedAge={onMigratedAge}
              onOpenPrivacySettings={() => settingsPanel.openSettings('privacy')}
              onSaveWorkspaceVault={() => void workspaceVault.saveNow()}
              onStartDictation={workspace.startDictation}
            />
          )}
        </div>

        {showDocumentCanvas ? (
          <>
            {workspace.generationPendingReview ? (
              <NotionGenerationReview
                isGenerating={workspace.isGenerating}
                onRewrite={workspace.handleRewrite}
                onRegenerate={workspace.handleGenerate}
                onAccept={workspace.acceptGeneration}
                onReject={workspace.rejectGeneration}
              />
            ) : null}
            <NotionInputBar
              dictationPhase={workspace.dictationPhase}
              isDictationActive={workspace.isDictationActive}
            />
          </>
        ) : null}
      </main>

      <NotionToastHost />
      <LottieCharacterStage />

      {pendingCaseId ? (
        <NewCaseWorkflowDialog
          onSelect={handleWorkflowSelect}
          onStayOnDashboard={handleStayOnDashboard}
          onClose={handleCloseWorkflowDialog}
        />
      ) : null}

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
      ) : null}
    </div>
  )
}
