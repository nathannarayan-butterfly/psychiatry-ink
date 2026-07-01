import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppearanceSettings } from '../hooks/useAppearanceSettings'
import { useLabTool } from '../hooks/useLabTool'
import { useAssessmentStandardSettings } from '../hooks/useAssessmentStandardSettings'
import { useIsdmEngine } from '../hooks/useIsdmEngine'
import { useLanguageSettings } from '../hooks/useLanguageSettings'
import { usePrivacySettings } from '../hooks/usePrivacySettings'
import { useSettingsPanel } from '../hooks/useSettingsPanel'
import { useTimelineTool } from '../hooks/useTimelineTool'
import { useWorkspaceSettings } from '../hooks/useWorkspaceSettings'
import { useWorkspaceState } from '../hooks/useWorkspaceState'
import { useWorkspaceVault } from '../hooks/useWorkspaceVault'
import { useWorkspaceTabs, type WorkspaceTab } from '../hooks/useWorkspaceTabs'
import { touchCaseOpened, upsertCaseMeta, ensureCaseRegistryHydrated } from '../hooks/useCaseRegistry'
import { recordAuditEvent } from '../services/auditApi'
import { NOTION_PAGES, resolveNotionPageFromDocumentType, type NotionPageId } from './notion/notionPages'
import { loadNotionPageDate } from '../utils/notionPageDate'
import { loadNotionPageTime } from '../utils/notionPageTime'
import { loadNotionPageHeading } from '../utils/notionPageHeading'
import type { ClinicalWorkspacePayload } from '../utils/workspaceVault'
import { DEFAULT_CASE_ID, setActiveCaseId } from '../utils/caseContext'
import {
  applyHintTranslationsToComponents,
  ensureHintsTranslated,
} from '../services/hintTranslationAgent'
import { localizeWorkspaceComponents } from '../utils/localizeComponents'
import { toDocumentTypes } from '../utils/workspaceComponents'
import type { DocumentType } from '../types'
import type { UiLanguage } from '../types/settings'
import { NotionApp } from './notion/NotionApp'
import type { TopNavTabId } from './notion/CaseTopNav'
import { useTranslation } from '../context/TranslationContext'
import { useAuth } from '../context/AuthContext'
import { isDemoCaseReadOnly } from '../demo'
import { usePermissionContext } from '../contexts/PermissionContext'
import { useActiveAppointment, useSyncAppointmentFromUrl } from '../contexts/ActiveAppointmentContext'
import type { SubscriptionPlan } from '../data/subscriptionPlans'

// ——— Type aliases for prop shapes ———

type AppearanceState = ReturnType<typeof useAppearanceSettings>
type PrivacyState = ReturnType<typeof usePrivacySettings>
type LanguageState = ReturnType<typeof useLanguageSettings>
type AssessmentStandardState = ReturnType<typeof useAssessmentStandardSettings>
type SettingsPanelState = ReturnType<typeof useSettingsPanel>
type WorkspaceSettingsState = ReturnType<typeof useWorkspaceSettings>

// ——— Tab info passed down through the tree ———

export interface WorkspaceTabsInfo {
  tabs: WorkspaceTab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
  onUpdateTabPatient: (tabId: string, patientName: string) => void
}

// ——— Props for the inner per-tab component ———

interface WorkspaceInnerProps {
  caseId: string
  initialPage?: NotionPageId
  initialShowPatientDashboard?: boolean
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean, appointmentId?: string) => void
  onNavigate?: (path: string) => void
  initialTopTab?: TopNavTabId
  initialDiscussId?: string
  initialKonsilId?: string
  documentTypes: DocumentType[]
  language: UiLanguage
  appearance: AppearanceState
  privacy: PrivacyState
  languageSettings: LanguageState
  assessmentStandardSettings: AssessmentStandardState
  settingsPanel: SettingsPanelState
  workspaceSettings: WorkspaceSettingsState
  plan: SubscriptionPlan
  workspaceTabs: WorkspaceTabsInfo
  workspaceStorageId: string
}

// ——— CaseWorkspacePage public props ———

interface CaseWorkspacePageProps {
  caseId: string
  initialPage?: NotionPageId
  initialShowPatientDashboard?: boolean
  appointmentId?: string
  discussMode?: boolean
  discussId?: string
  konsilMode?: boolean
  konsilId?: string
  onNavigate?: (path: string) => void
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean, appointmentId?: string) => void
}

// ——— Per-tab workspace content (keyed by activeTabId to isolate state) ———

function WorkspaceInner({
  caseId,
  initialPage,
  initialShowPatientDashboard,
  onNavigateDashboard,
  onNavigateNewCase,
  onNavigate,
  initialTopTab,
  initialDiscussId,
  initialKonsilId,
  documentTypes,
  language,
  appearance,
  privacy,
  languageSettings,
  assessmentStandardSettings,
  settingsPanel,
  workspaceSettings,
  plan,
  workspaceTabs,
  workspaceStorageId,
}: WorkspaceInnerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { organisation } = usePermissionContext()
  const storesCaseMeta = workspaceStorageId === caseId
  const demoReadOnly = isDemoCaseReadOnly(caseId, user?.email)

  useEffect(() => {
    setActiveCaseId(workspaceStorageId)
    void ensureCaseRegistryHydrated().then(() => {
      touchCaseOpened(caseId)
    })
    void recordAuditEvent('case_opened', { caseId })
  }, [caseId, workspaceStorageId])

  const workspace = useWorkspaceState(
    documentTypes,
    language,
    workspaceStorageId,
    languageSettings.englishVariant,
  )
  const timeline = useTimelineTool(workspaceStorageId)
  const lab = useLabTool(workspaceStorageId)
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
      if (storesCaseMeta) {
        upsertCaseMeta(caseId, { localAge: numeric.trim() || undefined })
      }
    },
    [caseId, storesCaseMeta],
  )

  const handleMigratedAge = useCallback(
    (age: string) => {
      const numeric = age.replace(/[^\d]/g, '')
      if (!numeric) return
      setClinicalAge((current) => {
        if (current.trim()) return current
        if (storesCaseMeta) {
          upsertCaseMeta(caseId, { localAge: numeric })
        }
        return numeric
      })
    },
    [caseId, storesCaseMeta],
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
      pageHeading: loadNotionPageHeading(workspace.selectedDocumentType, workspaceStorageId),
      pageDate: loadNotionPageDate(pageId, workspaceStorageId),
      pageTime: loadNotionPageTime(pageId, workspaceStorageId),
      sectionContents: workspace.getLatestSectionContents(),
      sectionMetadata: workspace.sectionMetadata,
      activeVariantIds: workspace.activeVariantIds,
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
    workspaceStorageId,
  ])

  const handleVaultRestored = useCallback(
    (payload: ClinicalWorkspacePayload) => {
      if (payload.activeVariantIds) {
        workspace.restoreActiveVariantIds(payload.activeVariantIds)
      }
      if (payload.selectedDocumentType) {
        workspace.selectDocumentType(
          payload.selectedDocumentType,
          payload.activeVariantIds?.[payload.selectedDocumentType],
        )
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
        if (storesCaseMeta) {
          upsertCaseMeta(caseId, { localAge: next.trim() || undefined })
        }
        return next
      })
      if (storesCaseMeta) {
        upsertCaseMeta(caseId, {
          lastDocumentType: payload.selectedDocumentType ?? undefined,
          pageHeading:
            (payload.pageHeadings[docId] ?? payload.documents[docId]?.pageHeading ?? '').trim() ||
            undefined,
        })
      }
    },
    [caseId, lab, storesCaseMeta, timeline, workspace],
  )

  const workspaceVault = useWorkspaceVault({
    caseId: workspaceStorageId,
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    caseFileCloudSync: privacy.caseFileCloudSync,
    getLivePatch,
    onRestored: handleVaultRestored,
    documentTypeLabel,
    orgVault: organisation
      ? { organisationId: organisation.id, organisationTier: organisation.tier }
      : undefined,
  })

  useIsdmEngine({
    caseId: workspaceStorageId,
    enabled: true,
    vaultReady: workspaceVault.ready,
    checklistSelections: workspace.checklistSelections,
    sectionContents: workspace.sectionContents,
  })

  useEffect(() => {
    if (!workspaceVault.isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workspaceVault.isDirty])

  useEffect(() => {
    if (!workspaceVault.ready) return
    if (demoReadOnly) return
    workspaceVault.scheduleSave()
  }, [
    clinicalAge,
    workspace.sectionContents,
    workspace.editorContent,
    workspace.selectedDocumentType,
    workspace.activeVariantIds,
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
    demoReadOnly,
  ])

  useEffect(() => {
    if (!workspaceVault.ready) return
    if (demoReadOnly) return
    if (!storesCaseMeta) return
    const heading = loadNotionPageHeading(workspace.selectedDocumentType, workspaceStorageId)
    upsertCaseMeta(caseId, {
      lastDocumentType: workspace.selectedDocumentType,
      pageHeading: heading.trim() || undefined,
    })
  }, [caseId, demoReadOnly, storesCaseMeta, workspace.selectedDocumentType, workspaceStorageId, workspaceVault.ready])

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
      onNavigate={onNavigate}
      initialTopTab={initialTopTab}
      initialDiscussId={initialDiscussId}
      initialKonsilId={initialKonsilId}
      plan={plan}
      workspaceTabs={workspaceTabs}
      savedDocsCaseId={workspaceStorageId}
      workspaceStorageId={workspaceStorageId}
      showWorkspaceTabs={caseId === DEFAULT_CASE_ID}
      isIsdmActive={assessmentStandardSettings.isIsdmActive}
      assessmentStandard={assessmentStandardSettings.assessmentStandard}
      onSelectAssessmentStandard={assessmentStandardSettings.selectAssessmentStandard}
      documentTypes={documentTypes}
    />
  )
}

// ——— Outer shell: global settings + tab manager ———

export function CaseWorkspacePage({
  caseId,
  initialPage,
  initialShowPatientDashboard,
  appointmentId,
  discussMode = false,
  discussId,
  konsilMode = false,
  konsilId,
  onNavigate,
  onNavigateDashboard,
  onNavigateNewCase,
}: CaseWorkspacePageProps) {
  const { plan } = useAuth()
  const { setActiveAppointmentId } = useActiveAppointment()
  useSyncAppointmentFromUrl(window.location.search)

  useEffect(() => {
    if (appointmentId) setActiveAppointmentId(appointmentId)
  }, [appointmentId, setActiveAppointmentId])

  const workspaceSettings = useWorkspaceSettings()
  const languageSettings = useLanguageSettings()
  const assessmentStandardSettings = useAssessmentStandardSettings()
  const appearance = useAppearanceSettings()
  const privacy = usePrivacySettings()
  const settingsPanel = useSettingsPanel()

  const localizedComponents = useMemo(() => {
    const withLabels = localizeWorkspaceComponents(
      workspaceSettings.components,
      languageSettings.language,
      languageSettings.englishVariant,
    )
    return applyHintTranslationsToComponents(withLabels, languageSettings.language)
  }, [workspaceSettings.components, languageSettings.language, languageSettings.englishVariant])

  useEffect(() => {
    void ensureHintsTranslated(languageSettings.language)
  }, [languageSettings.language])

  const documentTypes = useMemo(
    () => toDocumentTypes(localizedComponents),
    [localizedComponents],
  )

  const { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTabPatient } = useWorkspaceTabs()

  // Only the very first tab (index 0) inherits the router's initialPage.
  // Newly added tabs always start blank so they don't copy the previous tab.
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId)
  const activeTabInitialPage = activeTabIndex === 0 ? initialPage : undefined
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const workspaceStorageId =
    caseId === DEFAULT_CASE_ID
      ? (activeTab?.storageId ?? DEFAULT_CASE_ID)
      : caseId

  // When the last remaining tab is closed, navigate to the dashboard rather than
  // leaving the user in a broken single-tab state.
  const handleCloseTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) {
        onNavigateDashboard?.()
      } else {
        closeTab(id)
      }
    },
    [tabs.length, closeTab, onNavigateDashboard],
  )

  const workspaceTabs: WorkspaceTabsInfo = useMemo(
    () => ({ tabs, activeTabId, onTabSelect: setActiveTabId, onAddTab: addTab, onCloseTab: handleCloseTab, onUpdateTabPatient: updateTabPatient }),
    [tabs, activeTabId, setActiveTabId, addTab, handleCloseTab, updateTabPatient],
  )

  const initialTopTab: TopNavTabId | undefined = discussMode
    ? 'discuss'
    : konsilMode
      ? 'konsil'
      : undefined

  return (
    <WorkspaceInner
      key={workspaceStorageId}
      caseId={caseId}
      initialPage={activeTabInitialPage}
      initialShowPatientDashboard={activeTabIndex === 0 ? initialShowPatientDashboard : false}
      onNavigateDashboard={onNavigateDashboard}
      onNavigateNewCase={onNavigateNewCase}
      onNavigate={onNavigate}
      initialTopTab={initialTopTab}
      initialDiscussId={discussId}
      initialKonsilId={konsilId}
      documentTypes={documentTypes}
      language={languageSettings.language}
      appearance={appearance}
      privacy={privacy}
      languageSettings={languageSettings}
      assessmentStandardSettings={assessmentStandardSettings}
      settingsPanel={settingsPanel}
      workspaceSettings={workspaceSettings}
      plan={plan}
      workspaceTabs={workspaceTabs}
      workspaceStorageId={workspaceStorageId}
    />
  )
}
