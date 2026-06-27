import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  AI_MODEL_CATALOG,
  AI_MODEL_GROUP_ORDER,
  AI_TASK_DEFINITIONS,
} from '../../data/aiModelCatalog'
import type { useAiModelPreferences } from '../../hooks/useAiModelPreferences'
import type { AiModelOptionId, AiTaskId } from '../../types/aiModelPreferences'
import { resolveTaskOptionId } from '../../utils/resolveAiModel'
import { SettingsField } from './SettingsField'

interface KiModelSettingsProps {
  modelPreferences: ReturnType<typeof useAiModelPreferences>
}

export function KiModelSettings({ modelPreferences }: KiModelSettingsProps) {
  const { t } = useTranslation()
  const { preferences, setTaskModel } = modelPreferences

  const groupedOptions = useMemo(() => {
    return AI_MODEL_GROUP_ORDER.map((group) => ({
      group,
      label: t(
        group === 'psyink'
          ? 'aiModelGroupPsyink'
          : group === 'openai'
            ? 'aiModelGroupOpenAi'
            : group === 'deepseek'
              ? 'aiModelGroupDeepseek'
              : group === 'google'
                ? 'aiModelGroupGoogle'
                : 'aiModelGroupMistral',
      ),
      options: AI_MODEL_CATALOG.filter((entry) => entry.provider === group),
    })).filter((group) => group.options.length > 0)
  }, [t])

  const handleChange = (taskId: AiTaskId, value: string) => {
    setTaskModel(taskId, value as AiModelOptionId)
  }

  return (
    <div className="space-y-1">
      <SettingsField label={t('kiModelSettingsTitle')} description={t('kiModelSettingsDescription')}>
        <div className="space-y-3">
          {AI_TASK_DEFINITIONS.map((task) => {
            const value = resolveTaskOptionId(task.id, preferences)
            return (
              <div key={task.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`ki-model-task-${task.id}`}
                    className="text-xs font-medium text-ink"
                  >
                    {t(task.labelKey)}
                    {!task.wired ? (
                      <span className="ml-1.5 font-normal text-muted">({t('kiModelTaskFuture')})</span>
                    ) : null}
                  </label>
                  {task.descriptionKey ? (
                    <p className="mt-0.5 text-[11px] text-muted">{t(task.descriptionKey)}</p>
                  ) : null}
                </div>
                <select
                  id={`ki-model-task-${task.id}`}
                  value={value}
                  onChange={(event) => handleChange(task.id, event.target.value)}
                  className="w-full shrink-0 rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:max-w-xs"
                >
                  {groupedOptions.map((group) => (
                    <optgroup key={group.group} label={group.label}>
                      {group.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )
          })}
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {t('aiModelsPerformanceHint')}
          </p>
        </div>
      </SettingsField>
    </div>
  )
}
