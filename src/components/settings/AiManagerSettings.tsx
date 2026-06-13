import { aiDocumentationToolKeys } from '../../data/aiTools'
import { aiModelTiers } from '../../data/aiTools'
import { cloneAiConfig, createNewComponentAiConfig } from '../../data/aiManagerPresets'
import type { WorkspaceAiConfig } from '../../types/aiManager'
import type { AiModelTier } from '../../types'
import { SettingsField } from './SettingsField'

const tierLabels: Record<AiModelTier, string> = {
  fast: 'Economical',
  standard: 'Standard',
  thorough: 'Gründlich',
}

const toolLabels: Record<string, string> = {
  summarize: 'Zusammenfassen',
  structure: 'Strukturieren',
  shorten: 'Kürzen',
  formalize: 'Formalisieren',
  bulletPoints: 'Stichpunkte',
  proofread: 'Korrektur',
  expand: 'Erweitern',
}

interface AiManagerSettingsProps {
  ai: WorkspaceAiConfig | undefined
  onChange: (ai: WorkspaceAiConfig) => void
}

export function AiManagerSettings({ ai, onChange }: AiManagerSettingsProps) {
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
        <p className="text-sm font-medium text-ink">KI-Manager</p>
        <p className="mt-0.5 text-xs text-muted">
          Empfehlungen für den Arbeitsbereich — Nutzer können jederzeit manuell
          anderen Modus oder andere KI-Funktion wählen.
        </p>
      </div>

      <SettingsField
        label="Standard-Modus"
        description="Schnell, Standard oder Gründlich beim Öffnen dieser Komponente."
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
              {tierLabels[tier]}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsField
        label="Generieren erlauben"
        description="Bei welchem Umfang der Generieren-Button aktiv werden kann."
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
            Dieses Segment
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
            Alle Segmente
          </label>
        </div>
      </SettingsField>

      <SettingsField
        label="Empfohlene KI-Funktionen"
        description="Hervorgehoben als Empfehlung — alle Funktionen bleiben im Arbeitsbereich wählbar."
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
                  {toolLabels[key] ?? key}
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
                      Segment
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
                      Alle Segmente
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
