import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePassphraseUnlockProgress } from '../../hooks/usePassphraseUnlockProgress'
import type { UnlockStep, UnlockStepId } from '../../utils/passphraseUnlockProgress'
import { resetPassphraseUnlockProgress } from '../../utils/passphraseUnlockProgress'
import type { UiTranslationKey } from '../../data/uiTranslations'

const STEP_LABEL_KEYS: Record<UnlockStepId, UiTranslationKey> = {
  derivingKey: 'passphraseUnlockStepDerivingKey',
  fetchingSnapshots: 'passphraseUnlockStepFetchingSnapshots',
  decrypting: 'passphraseUnlockStepDecrypting',
  populatingCache: 'passphraseUnlockStepPopulatingCache',
  done: 'passphraseUnlockStepDone',
}

interface PassphraseUnlockProgressProps {
  /** Invoked when the user clicks the per-step "Erneut versuchen" button. */
  onRetry?: () => void
  /** Optional URL or callback for the per-step "Hilfe" button. */
  onHelp?: () => void
  helpHref?: string
}

function renderIcon(step: UnlockStep) {
  switch (step.state) {
    case 'success':
      return (
        <Check
          className="h-4 w-4 text-success"
          strokeWidth={2}
          aria-hidden
          data-testid={`unlock-step-${step.id}-icon-success`}
        />
      )
    case 'error':
      return (
        <AlertCircle
          className="h-4 w-4 text-recording"
          strokeWidth={2}
          aria-hidden
          data-testid={`unlock-step-${step.id}-icon-error`}
        />
      )
    case 'active':
      return (
        <Loader2
          className="h-4 w-4 animate-spin text-ink"
          strokeWidth={2}
          aria-hidden
          data-testid={`unlock-step-${step.id}-icon-active`}
        />
      )
    case 'pending':
    default:
      return (
        <span
          className="block h-2 w-2 rounded-full border border-dotted border-border"
          aria-hidden
          data-testid={`unlock-step-${step.id}-icon-pending`}
        />
      )
  }
}

/**
 * Stepped passphrase-unlock progress UI.
 *
 * Renders the five-step state machine from
 * `utils/passphraseUnlockProgress.ts` exactly as specified:
 *
 *   - pending steps render as a grey dotted line
 *   - the active step renders with a spinner + live "Fall N / M" counter
 *   - success steps render with a green check + the count it processed
 *   - error steps render with a red X + the failure message + Retry / Hilfe
 *
 * The component is purely subscriptive — every transition is driven by the
 * accountBackup.ts wrapper that runs the real crypto path.
 */
export function PassphraseUnlockProgress({
  onRetry,
  onHelp,
  helpHref,
}: PassphraseUnlockProgressProps) {
  const { t } = useTranslation()
  const progress = usePassphraseUnlockProgress()

  const isVisible = useMemo(
    () =>
      progress.inProgress ||
      progress.completed ||
      progress.failedStepId !== null,
    [progress.completed, progress.failedStepId, progress.inProgress],
  )

  if (!isVisible) return null

  return (
    <section
      className="passphrase-unlock-progress mt-3 rounded-md border-2 border-border bg-surface p-3 text-sm text-ink"
      aria-live="polite"
      data-testid="passphrase-unlock-progress"
    >
      <ol className="passphrase-unlock-progress__steps space-y-2">
        {progress.steps.map((step) => {
          const label = t(STEP_LABEL_KEYS[step.id])
          const counter =
            step.total != null && step.total > 0
              ? t('passphraseUnlockStepCounter')
                  .replace('{processed}', String(step.processed ?? 0))
                  .replace('{total}', String(step.total))
              : null
          const successCounter =
            step.state === 'success' &&
            step.total != null &&
            step.total > 0 &&
            step.id !== 'done'
              ? t('passphraseUnlockStepCounterDone').replace(
                  '{count}',
                  String(step.processed ?? step.total),
                )
              : null
          const stateClassName =
            step.state === 'pending'
              ? 'passphrase-unlock-progress__step--pending text-muted'
              : step.state === 'active'
                ? 'passphrase-unlock-progress__step--active text-ink'
                : step.state === 'success'
                  ? 'passphrase-unlock-progress__step--success text-ink'
                  : 'passphrase-unlock-progress__step--error text-recording'

          return (
            <li
              key={step.id}
              data-testid={`unlock-step-${step.id}`}
              data-state={step.state}
              className={`passphrase-unlock-progress__step flex items-start gap-2 ${stateClassName}`}
            >
              <span className="passphrase-unlock-progress__icon mt-0.5 flex h-4 w-4 items-center justify-center">
                {renderIcon(step)}
              </span>
              <div className="passphrase-unlock-progress__body flex flex-col">
                <span className="passphrase-unlock-progress__label">
                  {label}
                  {step.state === 'active' && counter ? (
                    <span className="passphrase-unlock-progress__counter ml-2 text-xs text-muted">
                      {counter}
                    </span>
                  ) : null}
                  {successCounter ? (
                    <span className="passphrase-unlock-progress__counter ml-2 text-xs text-muted">
                      {successCounter}
                    </span>
                  ) : null}
                </span>
                {step.state === 'error' && step.errorMessage ? (
                  <span className="passphrase-unlock-progress__error mt-1 text-xs text-recording">
                    {step.errorMessage}
                  </span>
                ) : null}
                {step.state === 'error' ? (
                  <div className="passphrase-unlock-progress__actions mt-2 flex flex-wrap gap-2">
                    {onRetry ? (
                      <button
                        type="button"
                        onClick={() => {
                          resetPassphraseUnlockProgress()
                          onRetry()
                        }}
                        className="rounded-sm border-2 border-border px-2 py-1 text-xs text-ink transition-colors hover:bg-surface-hover"
                      >
                        {t('passphraseUnlockRetry')}
                      </button>
                    ) : null}
                    {helpHref ? (
                      <a
                        href={helpHref}
                        className="rounded-sm border-2 border-border px-2 py-1 text-xs text-ink transition-colors hover:bg-surface-hover"
                      >
                        {t('passphraseUnlockHelp')}
                      </a>
                    ) : onHelp ? (
                      <button
                        type="button"
                        onClick={onHelp}
                        className="rounded-sm border-2 border-border px-2 py-1 text-xs text-ink transition-colors hover:bg-surface-hover"
                      >
                        {t('passphraseUnlockHelp')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
