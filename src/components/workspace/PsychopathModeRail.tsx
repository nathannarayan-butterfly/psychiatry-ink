import { useTranslation } from '../../context/TranslationContext'
import {
  getPsychopathSubModeLabel,
  PSYCHOPATH_SUB_MODES,
  type PsychopathSubMode,
} from '../../utils/psychopathMode'

interface PsychopathModeRailProps {
  activeMode: PsychopathSubMode
  disabled?: boolean
  collapsed?: boolean
  onSelect: (mode: PsychopathSubMode) => void
}

export function PsychopathModeRail({
  activeMode,
  disabled = false,
  collapsed = false,
  onSelect,
}: PsychopathModeRailProps) {
  const { t, language, englishVariant } = useTranslation()

  if (collapsed) return null

  return (
    <nav
      className="psychopath-mode-rail"
      aria-label={t('psychopathModeRailLabel')}
    >
      <p className="psychopath-mode-rail__heading">{t('psychopathModeRailLabel')}</p>
      <div className="psychopath-mode-rail__links" role="group">
        {PSYCHOPATH_SUB_MODES.map((mode) => {
          const isActive = mode === activeMode
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={`psychopath-mode-rail__link${
                isActive ? ' psychopath-mode-rail__link--active' : ''
              }`}
              onClick={() => onSelect(mode)}
            >
              {getPsychopathSubModeLabel(mode, language, englishVariant)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
