import { useCallback, useEffect, useState } from 'react'
import type { AiModelOptionId, AiModelPreferences, AiTaskId } from '../types/aiModelPreferences'
import { defaultAiModelPreferences } from '../types/aiModelPreferences'
import {
  loadAiModelPreferences,
  saveAiModelPreferences,
} from '../utils/resolveAiModel'

export function useAiModelPreferences() {
  const [preferences, setPreferences] = useState<AiModelPreferences>(loadAiModelPreferences)

  useEffect(() => {
    saveAiModelPreferences(preferences)
  }, [preferences])

  const setTaskModel = useCallback((taskId: AiTaskId, optionId: AiModelOptionId) => {
    setPreferences((current) => ({
      tasks: {
        ...current.tasks,
        [taskId]: optionId,
      },
    }))
  }, [])

  const resetTaskModel = useCallback((taskId: AiTaskId) => {
    setPreferences((current) => {
      const nextTasks = { ...current.tasks }
      delete nextTasks[taskId]
      return { tasks: nextTasks }
    })
  }, [])

  const resetAll = useCallback(() => {
    setPreferences(defaultAiModelPreferences)
  }, [])

  return {
    preferences,
    setTaskModel,
    resetTaskModel,
    resetAll,
  }
}
