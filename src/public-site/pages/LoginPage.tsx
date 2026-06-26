import type { PublicLocale } from '../publicRoutes'

interface LoginPageProps {
  locale: PublicLocale
  brandName: string
}

interface LoginCopy {
  title: string
  lead: string
  emailLabel: string
  passwordLabel: string
  submit: string
  noScript: string
}

const COPY: Record<PublicLocale, LoginCopy> = {
  en: {
    title: 'Sign in',
    lead: 'Sign in to your secure psychiatric workspace.',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    submit: 'Sign in',
    noScript: 'Loading the secure sign-in form…',
  },
  de: {
    title: 'Anmelden',
    lead: 'Melden Sie sich bei Ihrem sicheren psychiatrischen Arbeitsbereich an.',
    emailLabel: 'E-Mail-Adresse',
    passwordLabel: 'Passwort',
    submit: 'Anmelden',
    noScript: 'Das sichere Anmeldeformular wird geladen…',
  },
}

/**
 * Static, meaningful login shell for prerendered HTML. The real interactive
 * authentication form (with validation + Supabase auth) is rendered by the SPA
 * once JavaScript loads; this shell guarantees crawlers / no-JS visitors see a
 * branded, descriptive page instead of a blank "JavaScript required" screen.
 */
export function LoginPage({ locale, brandName }: LoginPageProps) {
  const copy = COPY[locale]
  return (
    <section className="hp-section ps-login" aria-labelledby="ps-login-title">
      <div className="ps-login__card">
        <p className="ps-login__brand">{brandName}</p>
        <h1 id="ps-login-title" className="ps-login__title">
          {copy.title}
        </h1>
        <p className="ps-login__lead">{copy.lead}</p>
        <p className="ps-login__hint">{copy.noScript}</p>
      </div>
    </section>
  )
}
