import { aiDocumentationToolKeys } from '../../data/aiTools'
import { aiModelTiers } from '../../data/aiTools'
import { cloneAiConfig, createNewComponentAiConfig } from '../../data/aiManagerPresets'
import {
  translateSettingsExtraUi,
  type SettingsExtraUiKey,
} from '../../data/settingsExtraUiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import type { WorkspaceAiConfig } from '../../types/aiManager'
import type { AiModelTier } from '../../types'
import { SettingsField } from './SettingsField'

const tierLabelKeys: Record<AiModelTier, SettingsExtraUiKey> = {
  fast: 'aiTierFast',
  standard: 'aiTierStandard',
  thorough: 'aiTierThorough',
}

const toolLabelKeys: Record<string, SettingsExtraUiKey> = {
  summarize: 'aiToolSummarize',
  structure: 'aiToolStructure',
  shorten: 'aiToolShorten',
  formalize: 'aiToolFormalize',
  bulletPoints: 'aiToolBulletPoints',
  proofread: 'aiToolProofread',
  expand: 'aiToolExpand',
}

interface AiManagerSettingsProps {
  ai: WorkspaceAiConfig | undefined
  onChange: (ai: WorkspaceAiConfig) => void
}

export function AiManagerSettings({ ai, onChange }: AiManagerSettingsProps) {
  const { language } = useTranslation()
  const config = ai ?? createNewComponentAiConfig()

  const updateConfig = (patch: Partial<WorkspaceAiConfig>) => {
    onChange({ ...cloneAiConfig(config), ...patch })
  }

  const updateTool = (
    key: (typeof aiDocumentationToolKeys)[number],
    patch: Partial<NonNullable<WorkspaceAiConfig['tools'][typeof key]>>,
  ) => {
    const currentRule = config.tools[key] ?? { enabled: false, highlightInScopes: [] }
    updateConfig({
      tools: {
        ...config.tools,
        [key]: { ...currentRule, ...patch },
      },
    })
  }

  return (
    <div className="space-y-4 rounded-sm border-2 border-border bg-surface-hover/20 p-3">
      <div>
        <p className="text-sm font-medium text-ink">
          {translateSettingsExtraUi(language, 'aiManagerTitle')}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {translateSettingsExtraUi(language, 'aiManagerIntro')}
        </p>
      </div>

      <SettingsField
        label={translateSettingsExtraUi(language, 'aiDefaultMode')}
        description={translateSettingsExtraUi(language, 'aiDefaultModeDesc')}
      >
        <select
          value={config.defaultTier}
          onChange={(event) =>
            updateConfig({ defaultTier: event.target.value as AiModelTier })
          }
          className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        >
          {aiModelTiers.map((tier) => (
            <option key={tier} value={tier}>
              {translateSettingsExtraUi(language, tierLabelKeys[tier])}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsField
        label={translateSettingsExtraUi(language, 'aiAllowGenerate')}
        description={translateSettingsExtraUi(language, 'aiAllowGenerateDesc')}
      >
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={config.generateInScopes.includes('segment')}
              onChange={(event) => {
                const scopes = new Set(config.generateInScopes)
                if (event.target.checked) scopes.add('segment')
                else scopes.delete('segment')
                updateConfig({ generateInScopes: [...scopes] })
              }}
            />
            {translateSettingsExtraUi(language, 'aiScopeThisSegment')}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={config.generateInScopes.includes('document')}
              onChange={(event) => {
                const scopes = new Set(config.generateInScopes)
                if (event.target.checked) scopes.add('document')
                else scopes.delete('document')
                updateConfig({ generateInScopes: [...scopes] })
              }}
            />
            {translateSettingsExtraUi(language, 'aiScopeAllSegments')}
          </label>
        </div>
      </SettingsField>

      <SettingsField
        label={translateSettingsExtraUi(language, 'aiRecommendedFunctions')}
        description={translateSettingsExtraUi(language, 'aiRecommendedFunctionsDesc')}
      >
        <div className="space-y-2">
          {aiDocumentationToolKeys.map((key) => {
            const rule = config.tools[key] ?? { enabled: false, highlightInScopes: [] }
            return (
              <div
                key={key}
                className="rounded-sm border border-border/70 bg-surface px-2.5 py-2"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) =>
                      updateTool(key, {
                        enabled: event.target.checked,
                        highlightInScopes: event.target.checked
                          ? (rule.highlightInScopes ?? ['segment'])
                          : [],
                      })
                    }
                  />
                  {toolLabelKeys[key]
                    ? translateSettingsExtraUi(language, toolLabelKeys[key])
                    : key}
                </label>
                {rule.enabled ? (
                  <div className="mt-2 flex flex-wrap gap-3 pl-6 text-xs text-muted">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={rule.highlightInScopes?.includes('segment') ?? false}
                        onChange={(event) => {
                          const scopes = new Set(rule.highlightInScopes ?? [])
                          if (event.target.checked) scopes.add('segment')
                          else scopes.delete('segment')
                          updateTool(key, { highlightInScopes: [...scopes] })
                        }}
                      />
                      {translateSettingsExtraUi(language, 'aiScopeSegment')}
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={rule.highlightInScopes?.includes('document') ?? false}
                        onChange={(event) => {
                          const scopes = new Set(rule.highlightInScopes ?? [])
                          if (event.target.checked) scopes.add('document')
                          else scopes.delete('document')
                          updateTool(key, { highlightInScopes: [...scopes] })
                        }}
                      />
                      {translateSettingsExtraUi(language, 'aiScopeAllSegments')}
                    </label>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </SettingsField>
    </div>
  )
}
