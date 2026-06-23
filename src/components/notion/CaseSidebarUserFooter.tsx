import { ListChecks, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { NotificationBell } from '../NotificationBell'
import { TodoQuickAdd } from '../todos/TodoQuickAdd'
import { AskButterflyOpenButton } from './AskButterflyOpenButton'

interface CaseSidebarUserFooterProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
  onOpenCredits?: () => void
  /** Active patient case id (real caseId) — enables patient-linked quick to-dos. */
  todoCaseId?: string | null
  todoPatientLabel?: string | null
}

const ACTION_BTN = 'case-sidebar-user-footer__action-btn'

function openCreditsPage(onOpenCredits?: () => void) {
  if (onOpenCredits) {
    onOpenCredits()
    return
  }
  window.location.href = '/dashboard/credits'
}

/** User name and account actions pinned to the bottom of the case sidebar. */
export function CaseSidebarUserFooter({
  creditBalance,
  onOpenSettings,
  onOpenCredits,
  todoCaseId = null,
  todoPatientLabel = null,
}: CaseSidebarUserFooterProps) {
  const { t } = useTranslation()
  const { signOut, isConfigured } = useAuth()
  const displayName = useAccountDisplayName()
  const [todoQuickAddOpen, setTodoQuickAddOpen] = useState(false)

  const creditsTooltip = t('creditsRemaining').replace('{balance}', String(creditBalance))

  return (
    <footer className="case-sidebar-user-footer">
      <span className="case-sidebar-user-footer__name">{displayName}</span>

      <div className="case-sidebar-user-footer__actions">
        <AskButterflyOpenButton variant="sidebar" />

        <button
          type="button"
          className={`${ACTION_BTN}${todoQuickAddOpen ? ` ${ACTION_BTN}--open` : ''}`}
          onClick={() => setTodoQuickAddOpen(true)}
          title={t('todoQuickAddOpen')}
          aria-label={t('todoQuickAddOpen')}
        >
          <ListChecks strokeWidth={1.75} aria-hidden />
        </button>

        <NotificationBell
          creditBalance={creditBalance}
          buttonClassName={ACTION_BTN}
          wrapClassName="case-sidebar-user-footer__notif-wrap"
          openClassName={`${ACTION_BTN}--open`}
        />

        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => openCreditsPage(onOpenCredits)}
          title={creditsTooltip}
          aria-label={creditsTooltip}
        >
          <span className="case-sidebar-user-footer__euro-symbol" aria-hidden>
            €
          </span>
        </button>

        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => onOpenSettings('appearance')}
          title={t('settings')}
          aria-label={t('settings')}
        >
          <Settings strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => {
            if (!isConfigured) return
            void signOut().then(() => {
              window.location.href = '/'
            })
          }}
          title={t('logout')}
          aria-label={t('logout')}
        >
          <LogOut strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {todoQuickAddOpen ? (
        <TodoQuickAdd
          caseId={todoCaseId}
          patientLabel={todoPatientLabel}
          onClose={() => setTodoQuickAddOpen(false)}
        />
      ) : null}
    </footer>
  )
}
