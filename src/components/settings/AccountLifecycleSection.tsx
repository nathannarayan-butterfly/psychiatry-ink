import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { PasswordInput } from '../auth/PasswordInput'
import { wipeLocalDeviceData } from '../../utils/wipeLocalData'
import {
  AccountLifecycleError,
  type AccountLifecycleStatus,
  cancelAccountDeletion,
  fetchAccountLifecycle,
  reactivateAccount,
  requestAccountDeletion,
  unsubscribeAccount,
} from '../../services/accountLifecycleApi'

const DELETE_TOKEN = 'DELETE'

const BTN_PRIMARY =
  'rounded-sm border-2 border-ink bg-ink px-4 py-2 text-sm text-surface transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-60'
const BTN_SECONDARY =
  'rounded-sm border-2 border-border bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-ink'
const BTN_DANGER =
  'rounded-sm border-2 border-[var(--color-danger)] bg-[var(--color-danger)] px-4 py-2 text-sm text-white transition-colors hover:bg-surface hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-60'
const INPUT_CLASS =
  'w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink'

function formatDate(iso: string | null, language: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function AccountLifecycleSection() {
  const { t, language } = useTranslation()
  const { signOut } = useAuth()

  const [status, setStatus] = useState<AccountLifecycleStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Unsubscribe disclosure.
  const [showUnsubscribe, setShowUnsubscribe] = useState(false)
  // Delete disclosure + inputs.
  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const next = await fetchAccountLifecycle()
      if (mountedRef.current) setStatus(next)
    } catch {
      // Advisory UI — leave the section hidden on a fetch failure.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mapError = useCallback(
    (err: unknown): string => {
      if (err instanceof AccountLifecycleError) {
        switch (err.code) {
          case 'org_block':
            return t('settingsAccountOrgOwnershipBlock')
          case 'confirmation_mismatch':
            return t('settingsAccountDeleteConfirmMismatch')
          case 'password_incorrect':
            return t('settingsAccountDeletePasswordIncorrect')
          default:
            return t('settingsAccountLifecycleError')
        }
      }
      return t('settingsAccountLifecycleError')
    },
    [t],
  )

  const handleUnsubscribe = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await unsubscribeAccount()
      if (mountedRef.current) {
        setStatus(next)
        setShowUnsubscribe(false)
      }
    } catch (err) {
      if (mountedRef.current) setError(mapError(err))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }, [mapError])

  const handleReactivate = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await reactivateAccount()
      if (mountedRef.current) {
        setStatus(next)
        setNotice(t('settingsAccountReactivated'))
      }
    } catch (err) {
      if (mountedRef.current) setError(mapError(err))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }, [mapError, t])

  const handleCancelDeletion = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await cancelAccountDeletion()
      if (mountedRef.current) {
        setStatus(next)
        setNotice(t('settingsAccountDeleteCancelled'))
      }
    } catch (err) {
      if (mountedRef.current) setError(mapError(err))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }, [mapError, t])

  const handleDelete = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await requestAccountDeletion({ password, confirmation: confirmText.trim() })
      // Confirmed: wipe device-local data, then sign out. The returning-user
      // banner + this section surface the cancellable delete-pending state on
      // the next login.
      await wipeLocalDeviceData()
      await signOut()
    } catch (err) {
      if (mountedRef.current) {
        setError(mapError(err))
        setBusy(false)
      }
    }
  }, [confirmText, password, mapError, signOut])

  if (!status) return null

  const accountStatus = status.accountStatus
  const deleteConfirmEnabled = confirmText.trim() === DELETE_TOKEN && password.length > 0 && !busy

  return (
    <div className="mt-8 border-t-2 border-border pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t('settingsAccountSubscriptionHeading')}
      </h3>

      {/* ── Dormant: reactivate CTA + deletion countdown ── */}
      {accountStatus === 'dormant' ? (
        <div
          className="mt-3 rounded-sm border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          <p>{t('settingsAccountDormantNotice').replace('{date}', formatDate(status.purgeAfter, language))}</p>
          <div className="mt-3">
            <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => void handleReactivate()}>
              {busy ? t('settingsAccountLifecycleProcessing') : t('settingsAccountReactivate')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Delete pending: cancel CTA + scheduled date ── */}
      {accountStatus === 'delete_pending' ? (
        <div
          className="mt-3 rounded-sm border-2 border-[var(--color-danger)] bg-rose-50 p-3 text-sm text-rose-900"
          role="alert"
        >
          <p>{t('settingsAccountDeletePendingNotice').replace('{date}', formatDate(status.purgeAfter, language))}</p>
          <div className="mt-3">
            <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => void handleCancelDeletion()}>
              {busy ? t('settingsAccountLifecycleProcessing') : t('settingsAccountDeleteCancel')}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Active / unknown: unsubscribe + delete (danger zone) ── */}
      {accountStatus !== 'delete_pending' && accountStatus !== 'dormant' ? (
        <>
          <p className="mt-2 text-sm text-muted">{t('settingsAccountSubscriptionActiveNotice')}</p>

          <div className="mt-3">
            {showUnsubscribe ? (
              <div className="rounded-sm border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  {t('settingsAccountUnsubscribeWarning').replace('{days}', String(status.dormantDays))}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    disabled={busy}
                    onClick={() => void handleUnsubscribe()}
                  >
                    {busy ? t('settingsAccountLifecycleProcessing') : t('settingsAccountUnsubscribeConfirm')}
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={busy}
                    onClick={() => {
                      setShowUnsubscribe(false)
                      setError(null)
                    }}
                  >
                    {t('settingsAccountPasswordCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={BTN_SECONDARY} onClick={() => setShowUnsubscribe(true)}>
                {t('settingsAccountUnsubscribe')}
              </button>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-danger)]">
              {t('settingsAccountDeleteHeading')}
            </h3>
            {showDelete ? (
              <div
                className="mt-3 flex flex-col gap-3 rounded-sm border-2 border-[var(--color-danger)] bg-rose-50 p-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault()
                }}
              >
                <p className="text-sm text-rose-900">
                  {t('settingsAccountDeleteWarning').replace(/\{days\}/g, String(status.deleteGraceDays))}
                </p>
                <label className="flex flex-col gap-1 text-xs text-rose-900">
                  <span>{t('settingsAccountDeleteConfirmTypeLabel')}</span>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={busy}
                    autoComplete="off"
                    aria-label={t('settingsAccountDeleteConfirmTypeLabel')}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-rose-900">
                  <span>{t('settingsAccountDeletePasswordLabel')}</span>
                  <PasswordInput
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className={INPUT_CLASS}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN_DANGER}
                    disabled={!deleteConfirmEnabled}
                    onClick={() => void handleDelete()}
                  >
                    {busy ? t('settingsAccountLifecycleProcessing') : t('settingsAccountDeleteSubmit')}
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={busy}
                    onClick={() => {
                      setShowDelete(false)
                      setConfirmText('')
                      setPassword('')
                      setError(null)
                    }}
                  >
                    {t('settingsAccountPasswordCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <button type="button" className={BTN_SECONDARY} onClick={() => setShowDelete(true)}>
                  {t('settingsAccountDeleteHeading')}
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-xs text-[var(--status-success)]" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
