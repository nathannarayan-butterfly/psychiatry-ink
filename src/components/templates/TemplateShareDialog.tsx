import { Download, Mail, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { DocumentTemplate } from '../../types/documentTemplate'
import {
  buildTemplateShareFilename,
  downloadTemplateShareFile,
  encodeTemplateShareFile,
} from '../../utils/documentTemplate/shareFormat'

const ACCOUNT_PROFILE_KEY = 'psychiatry-ink:account-profile'
const PLACEHOLDER_EMAIL = 'arzt@klinik.example'

function readAccountEmail(): string | undefined {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { email?: string }
    const email = parsed.email?.trim()
    if (!email || email === PLACEHOLDER_EMAIL) return undefined
    return email
  } catch {
    return undefined
  }
}

interface TemplateShareDialogProps {
  template: DocumentTemplate
  onClose: () => void
}

export function TemplateShareDialog({ template, onClose }: TemplateShareDialogProps) {
  const { t } = useTranslation()
  const accountName = useAccountDisplayName()
  const [recipientEmail, setRecipientEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const creator = {
        name: accountName || undefined,
        email: readAccountEmail(),
      }
      const content = await encodeTemplateShareFile(template, creator)
      downloadTemplateShareFile(content, buildTemplateShareFilename(template.title))
    } catch {
      setError(t('templateShareErrorExport'))
    } finally {
      setBusy(false)
    }
  }, [accountName, t, template])

  return (
    <div className="dt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dt-modal dt-modal--share" onClick={(event) => event.stopPropagation()}>
        <header className="dt-modal__header">
          <h2 className="dt-modal__title">{t('templateShareTitle')}</h2>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label={t('dokumenteClose')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <p className="dt-modal__intro">{t('templateShareDescription')}</p>

        <label className="dt-field-label">
          {t('templateShareRecipientEmail')}
          <input
            className="dt-input"
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder={t('templateShareRecipientPlaceholder')}
            autoComplete="email"
          />
        </label>

        <p className="dt-modal__hint">
          <Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('templateShareEmailDeferred')}
        </p>

        <p className="dt-modal__hint">{t('templateShareInstructions')}</p>

        {error ? <p className="dt-error">{error}</p> : null}

        <footer className="dt-modal__footer">
          <button type="button" className="dt-btn dt-btn--ghost" onClick={onClose}>
            {t('templateImportCancel')}
          </button>
          <button
            type="button"
            className="dt-btn dt-btn--primary"
            onClick={() => void handleDownload()}
            disabled={busy}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('templateShareDownload')}
          </button>
        </footer>
      </div>
    </div>
  )
}
