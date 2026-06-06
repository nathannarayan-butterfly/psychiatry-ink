import { useEffect } from 'react'
import { useWorkspaceSession } from '../context/WorkspaceSessionContext'
import type { useWorkspaceState } from '../hooks/useWorkspaceState'

type Workspace = ReturnType<typeof useWorkspaceState>

export function WorkspaceActivitySync({ workspace }: { workspace: Workspace }) {
  const { bumpActivity } = useWorkspaceSession()

  useEffect(() => {
    bumpActivity()
  }, [
    bumpActivity,
    workspace.editorContent,
    workspace.dictationPhase,
    workspace.isGenerating,
    workspace.isDictationActive,
    workspace.isPlayingBack,
    workspace.activeSectionId,
    workspace.selectedDocumentType,
    workspace.inputMode,
    workspace.documentMode,
    workspace.therapieVerlaufSourceText,
    workspace.generationScope,
  ])

  return null
}
