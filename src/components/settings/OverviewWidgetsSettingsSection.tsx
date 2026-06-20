import { useTranslation } from '../../context/TranslationContext'
import { OVERVIEW_WIDGET_LIST } from '../notion/overview/overviewWidgetRegistry'
import { isOverviewWidgetVisible } from '../../utils/overview/overviewLayout'

/**
 * Informational catalog of Übersicht widgets. Layout editing happens per patient
 * on the Übersicht tab (Layout bearbeiten → Widget hinzufügen).
 */
export function OverviewWidgetsSettingsSection() {
  const { t } = useTranslation()

  const catalog = OVERVIEW_WIDGET_LIST.filter((def) =>
    isOverviewWidgetVisible(def.id, def.visibility, {
      hasSpiegel: true,
      hasAdditionalSpiegel: true,
      hasPsychotherapy: true,
      hasIsdm: true,
      hasLabData: true,
      hasButterfly: true,
      hasEkg: true,
      hasEeg: true,
      hasCt: true,
      hasZwangsmassnahme: true,
    }),
  )

  return (
    <div>
      <p className="mt-1 mb-2 text-sm text-muted">{t('overviewWidgetsSettingsIntro')}</p>
      <p className="mb-6 text-sm text-muted">{t('overviewWidgetsSettingsEditHint')}</p>

      <ul className="overview-widgets-settings-list">
        {catalog.map((def) => (
          <li key={def.id} className="overview-widgets-settings-list__item">
            <div className="overview-widgets-settings-list__head">
              <h3 className="overview-widgets-settings-list__title">{t(def.titleKey)}</h3>
              {def.visibility !== 'always' ? (
                <span className="overview-widgets-settings-list__badge">{t('overviewWidgetsConditional')}</span>
              ) : null}
            </div>
            <p className="overview-widgets-settings-list__desc">{t(def.descriptionKey)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
