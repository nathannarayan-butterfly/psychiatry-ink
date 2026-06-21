import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useKnowledgeBaseUserId } from '../../hooks/useKnowledgeBaseUserId'
import { useKbAdminUsersSettings } from '../../hooks/useKbAdminUsersSettings'
import { SettingsField } from './SettingsField'

export function KbAdminSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const fallbackUserId = useKnowledgeBaseUserId()
  const { allowlist, addEntry, removeEntry } = useKbAdminUsersSettings()
  const [draft, setDraft] = useState('')

  const currentId = user?.id ?? fallbackUserId
  const currentEmail = user?.email ?? null

  return (
    <div>
      <p className="settings-section-lead">{t('settingsKbAdminIntro')}</p>

      <SettingsField label="AI Analytics">
        <p className="mt-1 text-sm text-muted">
          Margin, revenue, provider cost rollup. Requires KB-admin role.
        </p>
        <a
          href="/dashboard/ai-analytics"
          className="settings-section-toolbar__action mt-2 inline-flex items-center gap-1"
        >
          Open AI Analytics →
        </a>
      </SettingsField>

      <SettingsField label={t('settingsKbAdminYourId')}>
        <code className="text-sm text-ink">{currentId}</code>
        {currentEmail ? (
          <p className="mt-1 text-sm text-muted">
            {t('settingsKbAdminYourEmail')}: <code>{currentEmail}</code>
          </p>
        ) : null}
      </SettingsField>

      <SettingsField label={t('settingsKbAdminAllowlist')}>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addEntry(draft)
            setDraft('')
          }}
        >
          <input
            type="text"
            className="flex-1 rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            placeholder={t('settingsKbAdminPlaceholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="settings-section-toolbar__action inline-flex items-center gap-1"
            disabled={!draft.trim()}
          >
            <Plus size={14} aria-hidden />
            {t('settingsKbAdminAdd')}
          </button>
        </form>

        {allowlist.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('settingsKbAdminEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {allowlist.map((entry) => (
              <li key={entry} className="flex items-center justify-between gap-2 py-1 text-sm">
                <code>{entry}</code>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-muted hover:text-ink"
                  onClick={() => removeEntry(entry)}
                  aria-label={t('settingsKbAdminRemove').replace('{entry}', entry)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsField>
    </div>
  )
}
