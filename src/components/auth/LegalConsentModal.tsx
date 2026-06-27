import { Fragment, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { getLegalDoc } from '../../public-site/legalContent'
import type { LegalBlock } from '../../public-site/legalContent'
import { localizedPath, toPublicLocale } from '../../public-site/publicRoutes'

type LegalTab = 'privacy' | 'terms'

interface LegalConsentModalProps {
  open: boolean
  onClose: () => void
  initialTab?: LegalTab
}

function renderMultiline(text: string) {
  const lines = text.split('\n')
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ))
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === 'h3') {
    return <h3 className="signup-legal-modal__subheading">{block.text}</h3>
  }
  if (block.type === 'ul') {
    return (
      <ul className="signup-legal-modal__list">
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }
  if (block.type === 'link') {
    return (
      <p className="signup-legal-modal__paragraph">
        <a href={block.href} className="signup-legal-modal__link">
          <strong>{block.text}</strong>
        </a>
      </p>
    )
  }
  return <p className="signup-legal-modal__paragraph">{renderMultiline(block.text)}</p>
}

export function LegalConsentModal({ open, onClose, initialTab = 'privacy' }: LegalConsentModalProps) {
  const { t, language } = useTranslation()
  const [tab, setTab] = useState<LegalTab>(initialTab)
  const publicLocale = toPublicLocale(language)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const doc = getLegalDoc(tab, publicLocale)
  const externalHref = localizedPath(tab, language)

  return (
    <div
      className="signup-legal-modal__backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="signup-legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-legal-modal-title"
      >
        <header className="signup-legal-modal__header">
          <h2 id="signup-legal-modal-title" className="signup-legal-modal__title">
            {t('signupWizardLegalModalTitle')}
          </h2>
          <button
            type="button"
            className="signup-legal-modal__close"
            onClick={onClose}
            aria-label={t('signupWizardLegalClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="signup-legal-modal__tabs" role="tablist" aria-label={t('signupWizardLegalModalTitle')}>
          <button
            type="button"
            role="tab"
            id="signup-legal-tab-privacy"
            aria-selected={tab === 'privacy'}
            aria-controls="signup-legal-panel"
            className={`signup-legal-modal__tab${tab === 'privacy' ? ' signup-legal-modal__tab--active' : ''}`}
            onClick={() => setTab('privacy')}
          >
            {t('signupWizardLegalTabPrivacy')}
          </button>
          <button
            type="button"
            role="tab"
            id="signup-legal-tab-terms"
            aria-selected={tab === 'terms'}
            aria-controls="signup-legal-panel"
            className={`signup-legal-modal__tab${tab === 'terms' ? ' signup-legal-modal__tab--active' : ''}`}
            onClick={() => setTab('terms')}
          >
            {t('signupWizardLegalTabTerms')}
          </button>
        </div>

        <div
          id="signup-legal-panel"
          role="tabpanel"
          aria-labelledby={tab === 'privacy' ? 'signup-legal-tab-privacy' : 'signup-legal-tab-terms'}
          className="signup-legal-modal__body"
        >
          <p className="signup-legal-modal__updated">{doc.lastUpdatedLabel}</p>
          <p className="signup-legal-modal__lead">{renderMultiline(doc.lead)}</p>
          {doc.sections.map((section) => (
            <section key={section.id} className="signup-legal-modal__section" aria-label={section.heading}>
              <h3 className="signup-legal-modal__heading">{section.heading}</h3>
              {section.blocks.map((block, index) => (
                <LegalBlockView key={index} block={block} />
              ))}
            </section>
          ))}
        </div>

        <footer className="signup-legal-modal__footer">
          <a href={externalHref} target="_blank" rel="noreferrer" className="signup-legal-modal__external">
            {t('signupWizardOpenInNewWindow')}
          </a>
          <button type="button" className="landing-btn landing-btn--ghost" onClick={onClose}>
            {t('signupWizardLegalClose')}
          </button>
        </footer>
      </div>
    </div>
  )
}
