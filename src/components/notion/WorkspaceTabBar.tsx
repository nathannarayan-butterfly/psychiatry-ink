import type { WorkspaceTab } from '../../hooks/useWorkspaceTabs'

interface WorkspaceTabBarProps {
  tabs: WorkspaceTab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
}

export function WorkspaceTabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onAddTab,
  onCloseTab,
}: WorkspaceTabBarProps) {
  return (
    <div className="workspace-tab-bar" role="tablist" aria-label="Workspaces">
      <div className="workspace-tab-bar__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={[
                'workspace-tab',
                isActive ? 'workspace-tab--active' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => onTabSelect(tab.id)}
            >
              <span className="workspace-tab__label">
                {tab.patientName ?? tab.name}
              </span>
              {tabs.length > 1 && (
                <button
                  type="button"
                  className="workspace-tab__close"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(tab.id)
                  }}
                  aria-label={`Close ${tab.patientName ?? tab.name}`}
                  tabIndex={-1}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="workspace-tab__add"
        onClick={onAddTab}
        aria-label="New workspace"
        title="New workspace"
      >
        +
      </button>
    </div>
  )
}
