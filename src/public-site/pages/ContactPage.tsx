import { useState, type FormEvent } from 'react'
import type { ContactCategory } from '../contactContent'
import { getContactCopy } from '../contactContent'
import { localizedPath, type PublicLocale } from '../publicRoutes'
import { PublicLink } from '../components/PublicLink'

interface ContactPageProps {
  locale: PublicLocale
  onNavigate?: (path: string) => void
}

interface FormState {
  name: string
  email: string
  subject: string
  message: string
  organisation: string
  category: ContactCategory | ''
  privacyConsent: boolean
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  organisation: '',
  category: '',
  privacyConsent: false,
}

export function ContactPage({ locale, onNavigate }: ContactPageProps) {
  const copy = getContactCopy(locale)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (status === 'error') {
      setStatus('idle')
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.privacyConsent) return

    setStatus('submitting')
    setErrorMessage(null)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      privacyConsent: true,
      locale,
      website: '',
    }
    if (form.organisation.trim()) payload.organisation = form.organisation.trim()
    if (form.category) payload.category = form.category

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        if (response.status === 503) {
          setErrorMessage(copy.errorUnavailable)
        } else {
          setErrorMessage(data?.error ?? copy.errorGeneric)
        }
        setStatus('error')
        return
      }

      setForm(INITIAL_FORM)
      setStatus('success')
    } catch {
      setErrorMessage(copy.errorGeneric)
      setStatus('error')
    }
  }

  return (
    <section className="hp-section ps-contact" aria-labelledby="ps-contact-title">
      <div className="ps-contact__container">
        <header className="ps-contact__header">
          <h1 id="ps-contact-title" className="ps-contact__title">{copy.title}</h1>
          <p className="ps-contact__lead">{copy.lead}</p>
        </header>

        {status === 'success' ? (
          <div className="ps-contact__success" role="status">
            {copy.success}
          </div>
        ) : (
          <form className="ps-contact__form" onSubmit={handleSubmit} noValidate>
            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-name">
                {copy.nameLabel}
                <span className="ps-contact__required" aria-hidden="true"> *</span>
              </label>
              <input
                id="contact-name"
                className="ps-contact__input"
                type="text"
                name="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-email">
                {copy.emailLabel}
                <span className="ps-contact__required" aria-hidden="true"> *</span>
              </label>
              <input
                id="contact-email"
                className="ps-contact__input"
                type="email"
                name="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-subject">
                {copy.subjectLabel}
                <span className="ps-contact__required" aria-hidden="true"> *</span>
              </label>
              <input
                id="contact-subject"
                className="ps-contact__input"
                type="text"
                name="subject"
                required
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
              />
            </div>

            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-organisation">
                {copy.organisationLabel}
              </label>
              <input
                id="contact-organisation"
                className="ps-contact__input"
                type="text"
                name="organisation"
                autoComplete="organization"
                value={form.organisation}
                onChange={(e) => updateField('organisation', e.target.value)}
              />
            </div>

            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-category">
                {copy.categoryLabel}
              </label>
              <select
                id="contact-category"
                className="ps-contact__select"
                name="category"
                value={form.category}
                onChange={(e) =>
                  updateField('category', e.target.value as ContactCategory | '')
                }
              >
                <option value="">{copy.categoryPlaceholder}</option>
                {copy.categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ps-contact__field">
              <label className="ps-contact__label" htmlFor="contact-message">
                {copy.messageLabel}
                <span className="ps-contact__required" aria-hidden="true"> *</span>
              </label>
              <p className="ps-contact__warning" role="note">{copy.messageWarning}</p>
              <textarea
                id="contact-message"
                className="ps-contact__textarea"
                name="message"
                required
                rows={6}
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
              />
            </div>

            <div className="ps-contact__field ps-contact__field--checkbox">
              <label className="ps-contact__checkbox-label">
                <input
                  type="checkbox"
                  className="ps-contact__checkbox"
                  name="privacyConsent"
                  required
                  checked={form.privacyConsent}
                  onChange={(e) => updateField('privacyConsent', e.target.checked)}
                />
                <span>
                  {copy.privacyConsentBefore}
                  <PublicLink
                    href={localizedPath('privacy', locale)}
                    className="ps-contact__inline-link"
                    onNavigate={onNavigate}
                  >
                    {copy.privacyConsentLink}
                  </PublicLink>
                  {copy.privacyConsentAfter}
                </span>
              </label>
            </div>

            {/* Honeypot — hidden from users, bots often fill it. */}
            <div className="ps-contact__honeypot" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            {status === 'error' && errorMessage ? (
              <p className="ps-contact__error" role="alert">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              className="hp-btn hp-btn--primary ps-contact__submit"
              disabled={status === 'submitting' || !form.privacyConsent}
            >
              {status === 'submitting' ? copy.submitting : copy.submit}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
