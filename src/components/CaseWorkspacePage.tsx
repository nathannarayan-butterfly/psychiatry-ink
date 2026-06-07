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
import { NotionApp } from './notion/NotionApp'
import { useTranslation } from '../context/TranslationContext'
import { useAuth } from '../context/AuthContext'

interface CaseWorkspacePageProps {
  caseId: string
  initialPage?: NotionPageId
  onNavigateDashboard?: () => void
  onNavigateNewCase?: (caseId: string, page?: NotionPageId) => void
}

export function CaseWorkspacePage({
  caseId,
  initialPage,
  onNavigateDashboard,
  onNavigateNewCase,
}: CaseWorkspacePageProps) {
  const { t } = useTranslation()
  const { plan } = useAuth()
  const workspaceSettings = useWorkspaceSettings()
  const languageSettings = useLanguageSettings()
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

  useEffect(() => {
    setActiveCaseId(caseId)
    touchCaseOpened(caseId)
  }, [caseId])

  const workspace = useWorkspaceState(documentTypes, languageSettings.language, caseId)
  const timeline = useTimelineTool()
  const lab = useLabTool()
  const appearance = useAppearanceSettings()
  const privacy = usePrivacySettings()
  const settingsPanel = useSettingsPanel()
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
    caseId,
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
    />
  )
}
