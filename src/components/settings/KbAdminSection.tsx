import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useKnowledgeBaseUserId } from '../../hooks/useKnowledgeBaseUserId'
import { useKbAdminUsersSettings } from '../../hooks/useKbAdminUsersSettings'

export function KbAdminSection() {
  const { user } = useAuth()
  const fallbackUserId = useKnowledgeBaseUserId()
  const { allowlist, addEntry, removeEntry } = useKbAdminUsersSettings()
  const [draft, setDraft] = useState('')

  const currentId = user?.id ?? fallbackUserId
  const currentEmail = user?.email ?? null

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">KB Batch Review — Admins</h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        Grant KB admin access by user UUID or email. Stored locally in this browser (
        <code>psychiatry-ink:kb-admin-users</code>). Server also accepts{' '}
        <code>KB_ADMIN_USER_IDS</code> / <code>VITE_KB_ADMIN_USER_IDS</code> and Supabase{' '}
        <code>app_metadata.kb_admin=true</code>.
      </p>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm">
        <p>
          <strong>Your id:</strong> <code>{currentId}</code>
        </p>
        {currentEmail ? (
          <p className="mt-1">
            <strong>Your email:</strong> <code>{currentEmail}</code>
          </p>
        ) : null}
      </div>

      <form
        className="flex gap-2 mb-4"
        onSubmit={(event) => {
          event.preventDefault()
          addEntry(draft)
          setDraft('')
        }}
      >
        <input
          type="text"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
          placeholder="User UUID or email"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm"
          disabled={!draft.trim()}
        >
          <Plus size={14} aria-hidden />
          Add
        </button>
      </form>

      {allowlist.length === 0 ? (
        <p className="text-sm text-muted">No local admins configured.</p>
      ) : (
        <ul className="space-y-2">
          {allowlist.map((entry) => (
            <li
              key={entry}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <code>{entry}</code>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-muted hover:text-ink"
                onClick={() => removeEntry(entry)}
                aria-label={`Remove ${entry}`}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
