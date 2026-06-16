import type { SettingsSectionId } from '../../types/settings'

export interface SettingsSectionGroup {
  groupLabel?: string
  items: { id: SettingsSectionId; label: string }[]
}

interface SettingsSectionNavProps {
  groups: SettingsSectionGroup[]
  activeSection: SettingsSectionId
  onSectionChange: (section: SettingsSectionId) => void
  /** Fallback landmark label for groups without a heading. */
  ariaLabel?: string
}

/** Primary settings-section navigation, styled like the clinical-area sidebar nav. */
export function SettingsSectionNav({
  groups,
  activeSection,
  onSectionChange,
  ariaLabel,
}: SettingsSectionNavProps) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <nav
          key={group.groupLabel ?? `group-${groupIndex}`}
          className="case-sidebar-nav"
          aria-label={group.groupLabel ?? ariaLabel}
        >
          {group.groupLabel ? (
            <p className="case-sidebar-nav__heading">{group.groupLabel}</p>
          ) : null}
          {group.items.map((item) => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={[
                  'case-sidebar-nav__link',
                  isActive ? 'case-sidebar-nav__link--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSectionChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="case-sidebar-nav__link-label">{item.label}</span>
              </button>
            )
          })}
        </nav>
      ))}
    </>
  )
}
