import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppearanceSettings } from '../hooks/useAppearanceSettings'
import { useLabTool } from '../hooks/useLabTool'
import { useLanguageSettings } from '../hooks/useLanguageSettings'
import { usePrivacySettings } from '../hooks/usePrivacySettings'
import { useSettingsPanel } from '../hooks/useSettingsPanel'
import { useTimelineTool } from '../hooks/useTimelineTool'
import { useWorkspaceSettings } from '../hooks/useWorkspaceSettings'
import { useWorkspaceState } from '../hooks/useWorkspaceState'
import { useWorkspaceVault } from '../hooks/useWorkspaceVault'
import { useWorkspaceTabs, type WorkspaceTab } from '../hooks/useWorkspaceTabs'
import { touchCaseOpened, upsertCaseMeta } from '../hooks/useCaseRegistry'
import { NOTION_PAGES, resolveNotionPageFromDocumentType, type NotionPageId } from './notion/notionPages'
import { loadNotionPageDate } from '../utils/notionPageDate'
import { loadNotionPageTime } from '../utils/notionPageTime'
import { loadNotionPageHeading } from '../utils/notionPageHeading'
import type { ClinicalWorkspacePayload } from '../utils/workspaceVault'
import { setActiveCaseId } from '../utils/caseContext'
import {
  applyHintTranslationsToComponents,
  ensureHintsTranslated,
} from '../services/hintTranslationAgent'
import { localizeWorkspaceComponents } from '../utils/localizeComponents'
import { toDocumentTypes } from '../utils/workspaceComponents'
import type { DocumentType } from '../types'
import type { UiLanguage } from '../types/settings'
import { NotionApp } from './notion/NotionApp'
import { useTranslation } from '../context/TranslationContext'
import { useAuth } from '../context/AuthContext'
import type { SubscriptionPlan } from '../data/subscriptionPlans'

// ——— Type aliases for prop shapes ———

type AppearanceState = ReturnType<typeof useAppearanceSettings>
type PrivacyState = ReturnType<typeof usePrivacySettings>
type LanguageState = ReturnType<typeof useLanguageSettings>
type SettingsPanelState = ReturnType<typeof useSettingsPanel>
type WorkspaceSettingsState = ReturnType<typeof useWorkspaceSettings>

// ——— Tab info passed down through the tree ———

export interface WorkspaceTabsInfo {
  tabs: WorkspaceTab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
}

// ——— Props for the inner per-tab component ———

interface WorkspaceInnerProps {
  caseId: string
  initialPage?: NotionPageId
  initialShowPatientDashboard?: boolean
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId) => void
  documentTypes: DocumentType[]
  language: UiLanguage
  appearance: AppearanceState
  privacy: PrivacyState
  languageSettings: LanguageState
  settingsPanel: SettingsPanelState
  workspaceSettings: WorkspaceSettingsState
  plan: SubscriptionPlan
  workspaceTabs: WorkspaceTabsInfo
}

// ——— CaseWorkspacePage public props ———

interface CaseWorkspacePageProps {
  caseId: string
  initialPage?: NotionPageId
  initialShowPatientDashboard?: boolean
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId) => void
}

// ——— Per-tab workspace content (keyed by activeTabId to isolate state) ———

function WorkspaceInner({
  caseId,
  initialPage,
  initialShowPatientDashboard,
  onNavigateDashboard,
  onNavigateNewCase,
  documentTypes,
  language,
  appearance,
  privacy,
  languageSettings,
  settingsPanel,
  workspaceSettings,
  plan,
  workspaceTabs,
}: WorkspaceInnerProps) {
  const { t } = useTranslation()

  // Each tab gets an isolated vault key so that a freshly opened tab never
  // restores another tab's selected document type or editor content.
  // Tab 0 keeps using `caseId` directly for backward compatibility.
  const activeTabIndex = workspaceTabs.tabs.findIndex((t) => t.id === workspaceTabs.activeTabId)
  const tabStorageId =
    activeTabIndex === 0 ? caseId : `${caseId}::tab::${workspaceTabs.activeTabId}`

  useEffect(() => {
    setActiveCaseId(caseId)
    touchCaseOpened(caseId)
  }, [caseId])

  const workspace = useWorkspaceState(documentTypes, language, caseId)
  const timeline = useTimelineTool()
  const lab = useLabTool()
  const [clinicalAge, setClinicalAge] = useState('')

  const documentTypeLabel = useCallback(
    (typeId: string) => {
      const page = NOTION_PAGES.find((item) => item.documentTypeId === typeId)
      return page ? t(page.labelKey) : typeId
    },
    [t],
  )

  const handleClinicalAgeChange = useCallback(
    (age: string) => {
      const numeric = age.replace(/[^\d]/g, '')
      setClinicalAge(numeric)
      upsertCaseMeta(caseId, { localAge: numeric.trim() || undefined })
    },
    [caseId],
  )

  const handleMigratedAge = useCallback(
    (age: string) => {
      const numeric = age.replace(/[^\d]/g, '')
      if (!numeric) return
      setClinicalAge((current) => {
        if (current.trim()) return current
        upsertCaseMeta(caseId, { localAge: numeric })
        return numeric
      })
    },
    [caseId],
  )

  const getLivePatch = useCallback(() => {
    const pageId = resolveNotionPageFromDocumentType(workspace.selectedDocumentType)
    const now = new Date().toISOString()

    const timelines = timeline.savedTimelines.map((item) =>
      item.id === timeline.activeTimelineId
        ? { ...item, layout: timeline.layout, entries: timeline.entries, updatedAt: now }
        : item,
    )

    const labGraphs = lab.savedLabGraphs.map((item) =>
      item.id === lab.activeLabGraphId
        ? {
            ...item,
            entries: lab.entries,
            markers: lab.markers,
            selectedParameter: lab.selectedParameter,
            dateRangePreset: lab.dateRangePreset,
            updatedAt: now,
          }
        : item,
    )

    return {
      documentTypeId: workspace.selectedDocumentType,
      pageHeading: loadNotionPageHeading(workspace.selectedDocumentType, caseId),
      pageDate: loadNotionPageDate(pageId, caseId),
      pageTime: loadNotionPageTime(pageId, caseId),
      sectionContents: workspace.getLatestSectionContents(),
      age: clinicalAge,
      timelines,
      activeTimelineId: timeline.activeTimelineId,
      labGraphs,
      activeLabGraphId: lab.activeLabGraphId,
    }
  }, [
    caseId,
    clinicalAge,
    lab.activeLabGraphId,
    lab.dateRangePreset,
    lab.entries,
    lab.markers,
    lab.savedLabGraphs,
    lab.selectedParameter,
    timeline.activeTimelineId,
    timeline.entries,
    timeline.layout,
    timeline.savedTimelines,
    workspace,
  ])

  const handleVaultRestored = useCallback(
    (payload: ClinicalWorkspacePayload) => {
      if (payload.selectedDocumentType) {
        workspace.selectDocumentType(payload.selectedDocumentType)
      }
      const docId = payload.selectedDocumentType ?? workspace.selectedDocumentType
      const snapshot = payload.documents[docId]
      if (snapshot) workspace.restoreFromSnapshot(snapshot)
      if (payload.timelines?.length) {
        timeline.restoreFromVault(payload.timelines, payload.activeTimelineId)
      } else if (payload.timeline) {
        timeline.restoreFromSnapshot(payload.timeline)
      }

      if (payload.labGraphs?.length) {
        lab.restoreFromVault(payload.labGraphs, payload.activeLabGraphId)
      } else if (payload.lab) {
        lab.restoreFromSnapshot(payload.lab)
      }

      const restoredAge = payload.age?.replace(/[^\d]/g, '') ?? ''
      setClinicalAge((current) => {
        const next = restoredAge || current
        upsertCaseMeta(caseId, { localAge: next.trim() || undefined })
        return next
      })
      upsertCaseMeta(caseId, {
        lastDocumentType: payload.selectedDocumentType ?? undefined,
        pageHeading:
          (payload.pageHeadings[docId] ?? payload.documents[docId]?.pageHeading ?? '').trim() ||
          undefined,
      })
    },
    [caseId, lab, timeline, workspace],
  )

  const workspaceVault = useWorkspaceVault({
    caseId: tabStorageId,
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    getLivePatch,
    onRestored: handleVaultRestored,
    documentTypeLabel,
  })

  useEffect(() => {
    if (!workspaceVault.ready) return
    workspaceVault.scheduleSave()
  }, [
    clinicalAge,
    workspace.sectionContents,
    workspace.editorContent,
    workspace.selectedDocumentType,
    lab.activeLabGraphId,
    lab.entries,
    lab.markers,
    lab.savedLabGraphs,
    timeline.activeTimelineId,
    timeline.entries,
    timeline.layout,
    timeline.savedTimelines,
    workspaceVault.ready,
    workspaceVault.scheduleSave,
  ])

  useEffect(() => {
    if (!workspaceVault.ready) return
    const heading = loadNotionPageHeading(workspace.selectedDocumentType, caseId)
    upsertCaseMeta(caseId, {
      lastDocumentType: workspace.selectedDocumentType,
      pageHeading: heading.trim() || undefined,
    })
  }, [caseId, workspace.selectedDocumentType, workspaceVault.ready])

  return (
    <NotionApp
      caseId={caseId}
      initialPage={initialPage}
      initialShowPatientDashboard={initialShowPatientDashboard}
      workspace={workspace}
      lab={lab}
      timeline={timeline}
      appearance={appearance}
      privacy={privacy}
      languageSettings={languageSettings}
      settingsPanel={settingsPanel}
      workspaceSettings={workspaceSettings}
      workspaceVault={workspaceVault}
      clinicalAge={{
        age: clinicalAge,
        setAge: handleClinicalAgeChange,
        ready: workspaceVault.ready,
      }}
      onMigratedAge={handleMigratedAge}
      onNavigateDashboard={onNavigateDashboard}
      onNavigateNewCase={onNavigateNewCase}
      plan={plan}
      workspaceTabs={workspaceTabs}
      savedDocsCaseId={tabStorageId}
    />
  )
}

// ——— Outer shell: global settings + tab manager ———

export function CaseWorkspacePage({
  caseId,
  initialPage,
  initialShowPatientDashboard,
  onNavigateDashboard,
  onNavigateNewCase,
}: CaseWorkspacePageProps) {
  const { plan } = useAuth()
  const workspaceSettings = useWorkspaceSettings()
  const languageSettings = useLanguageSettings()
  const appearance = useAppearanceSettings()
  const privacy = usePrivacySettings()
  const settingsPanel = useSettingsPanel()

  const localizedComponents = useMemo(() => {
    const withLabels = localizeWorkspaceComponents(
      workspaceSettings.components,
      languageSettings.language,
    )
    return applyHintTranslationsToComponents(withLabels, languageSettings.language)
  }, [workspaceSettings.components, languageSettings.language])

  useEffect(() => {
    void ensureHintsTranslated(languageSettings.language)
  }, [languageSettings.language])

  const documentTypes = useMemo(
    () => toDocumentTypes(localizedComponents),
    [localizedComponents],
  )

  const { tabs, activeTabId, setActiveTabId, addTab, closeTab } = useWorkspaceTabs()

  // Only the very first tab (index 0) inherits the router's initialPage.
  // Newly added tabs always start blank so they don't copy the previous tab.
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId)
  const activeTabInitialPage = activeTabIndex === 0 ? initialPage : undefined

  const workspaceTabs: WorkspaceTabsInfo = useMemo(
    () => ({ tabs, activeTabId, onTabSelect: setActiveTabId, onAddTab: addTab, onCloseTab: closeTab }),
    [tabs, activeTabId, setActiveTabId, addTab, closeTab],
  )

  return (
    <WorkspaceInner
      key={activeTabId}
      caseId={caseId}
      initialPage={activeTabInitialPage}
      initialShowPatientDashboard={activeTabIndex === 0 ? initialShowPatientDashboard : false}
      onNavigateDashboard={onNavigateDashboard}
      onNavigateNewCase={onNavigateNewCase}
      documentTypes={documentTypes}
      language={languageSettings.language}
      appearance={appearance}
      privacy={privacy}
      languageSettings={languageSettings}
      settingsPanel={settingsPanel}
      workspaceSettings={workspaceSettings}
      plan={plan}
      workspaceTabs={workspaceTabs}
    />
  )
}
