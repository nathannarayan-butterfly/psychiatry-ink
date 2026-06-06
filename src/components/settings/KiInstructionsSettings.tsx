import { useTranslation } from '../../context/TranslationContext'
import {
  KI_DOCUMENT_TYPE_IDS,
  type KiDocumentTypeId,
  type KiInstructionPresetId,
} from '../../types/kiInstructions'
import type { useKiInstructions } from '../../hooks/useKiInstructions'
import { SettingsField } from './SettingsField'

const documentLabelKeys: Record<KiDocumentTypeId, 'kiDocAufnahme' | 'kiDocVerlauf' | 'kiDocPpb' | 'kiDocTherapieVerlauf'> = {
  aufnahme: 'kiDocAufnahme',
  verlauf: 'kiDocVerlauf',
  psychopath: 'kiDocPpb',
  'therapie-verlauf': 'kiDocTherapieVerlauf',
}

const presetOptions: { id: KiInstructionPresetId; labelKey: 'kiPresetNone' | 'kiPresetLegal' | 'kiPresetCasual' | 'kiPresetFormal' }[] = [
  { id: 'none', labelKey: 'kiPresetNone' },
  { id: 'legalWriter', labelKey: 'kiPresetLegal' },
  { id: 'casualWriter', labelKey: 'kiPresetCasual' },
  { id: 'formalClinical', labelKey: 'kiPresetFormal' },
]

interface KiInstructionsSettingsProps {
  kiInstructions: ReturnType<typeof useKiInstructions>
  aiAutoMode: boolean
  onToggleAiAuto: () => void
}

export function KiInstructionsSettings({
  kiInstructions,
  aiAutoMode,
  onToggleAiAuto,
}: KiInstructionsSettingsProps) {
  const { t } = useTranslation()
  const { settings, setDefaultInstruction, applyPreset, setDocumentOverride } = kiInstructions

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('settingsKiHeading')}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">{t('settingsKiDescription')}</p>

      <SettingsField label={t('kiAutoMode')} description={t('kiAutoModeDescription')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (aiAutoMode) onToggleAiAuto()
            }}
            className={`rounded-sm border-2 px-3 py-2 text-xs transition-colors ${
              !aiAutoMode
                ? 'border-ink bg-surface-active font-medium text-ink'
                : 'border-border text-muted hover:bg-surface-hover'
            }`}
          >
            {t('kiAutoModeOff')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!aiAutoMode) onToggleAiAuto()
            }}
            className={`rounded-sm border-2 px-3 py-2 text-xs transition-colors ${
              aiAutoMode
                ? 'border-ink bg-surface-active font-medium text-ink'
                : 'border-border text-muted hover:bg-surface-hover'
            }`}
          >
            {t('kiAutoModeOn')}
          </button>
        </div>
      </SettingsField>

      <SettingsField
        label={t('kiSettingsDefaultInstruction')}
        description={t('kiSettingsDefaultInstructionDescription')}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {presetOptions.map((preset) => {
              const active = settings.preset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-sm border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? 'border-ink bg-surface-active font-medium text-ink'
                      : 'border-border text-muted hover:bg-surface-hover'
                  }`}
                >
                  {t(preset.labelKey)}
                </button>
              )
            })}
          </div>
          <textarea
            value={settings.defaultInstruction}
            onChange={(event) => setDefaultInstruction(event.target.value)}
            placeholder={t('kiExtraInstructionPlaceholder')}
            rows={3}
            className="w-full resize-y rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
      </SettingsField>

      <SettingsField
        label={t('kiSettingsDocumentOverrides')}
        description={t('kiSettingsDocumentOverridesDescription')}
      >
        <div className="space-y-3">
          {KI_DOCUMENT_TYPE_IDS.map((documentTypeId) => (
            <div key={documentTypeId} className="space-y-1">
              <label className="text-xs font-medium text-ink">{t(documentLabelKeys[documentTypeId])}</label>
              <textarea
                value={settings.documentOverrides[documentTypeId] ?? ''}
                onChange={(event) => setDocumentOverride(documentTypeId, event.target.value)}
                placeholder={t('kiSettingsDocumentOverridePlaceholder')}
                rows={2}
                className="w-full resize-y rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
          ))}
        </div>
      </SettingsField>
    </div>
  )
}
