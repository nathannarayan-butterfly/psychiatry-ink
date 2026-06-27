import { AlertTriangle, CreditCard, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiLanguage } from '../../types/settings'
import {
  fetchAiCreditStatus,
  startSubscriptionCheckout,
  type AiCreditStatus,
  type SubscriptionInterval,
} from '../../services/aiCreditsApi'

/**
 * Pre-lapse trial warning + soft-lock banner with a subscribe / recharge CTA.
 *
 * Self-fetches `/api/ai-credits/status` so it can be dropped anywhere a logged-in
 * user is shown (dashboard, credits page, app shell). Renders nothing unless the
 * user is locked, the trial is about to lapse, or the subscription is past_due.
 *
 * Strings are localised inline (en/de/fr/es) to keep the feature self-contained;
 * `onRechargeClick` is optional — when omitted the recharge CTA is hidden (e.g.
 * when the banner already sits above the credit-pack purchase grid).
 */

const TRIAL_WARNING_DAYS = 7

const MONTHLY_PRICE = '£24.99'
const YEARLY_PRICE = '£239.90'

type Copy = {
  lockedTitle: string
  lockedBody: string
  creditsLockedTitle: string
  creditsLockedBody: string
  trialTitle: (days: number) => string
  trialBody: string
  pastDueTitle: string
  pastDueBody: string
  subscribeMonthly: string
  subscribeYearly: string
  recharge: string
  redirecting: string
}

const COPY: Record<UiLanguage, Copy> = {
  en: {
    lockedTitle: 'Your free trial has ended',
    lockedBody:
      'Subscribe to keep using AI features. Your data stays safe and fully accessible.',
    creditsLockedTitle: 'An active subscription is required to use your credits',
    creditsLockedBody:
      'Your purchased credits stay banked and never expire. Subscribe to start spending them on AI features again.',
    trialTitle: (days) => `Your free trial ends in ${days} ${days === 1 ? 'day' : 'days'}`,
    trialBody: 'Subscribe now to keep uninterrupted access to AI features.',
    pastDueTitle: 'Your last payment failed',
    pastDueBody:
      'Update your payment method to keep using AI features. Access continues for now but may be paused soon.',
    subscribeMonthly: `Subscribe — ${MONTHLY_PRICE}/mo`,
    subscribeYearly: `Subscribe yearly — ${YEARLY_PRICE}/yr`,
    recharge: 'Top up credits',
    redirecting: 'Redirecting…',
  },
  de: {
    lockedTitle: 'Ihre kostenlose Testphase ist beendet',
    lockedBody:
      'Abonnieren Sie, um KI-Funktionen weiter zu nutzen. Ihre Daten bleiben sicher und vollständig zugänglich.',
    creditsLockedTitle: 'Abonnement erforderlich, um Ihre Credits zu nutzen',
    creditsLockedBody:
      'Ihre gekauften Credits bleiben erhalten und verfallen nicht. Abonnieren Sie, um sie wieder für KI-Funktionen einzusetzen.',
    trialTitle: (days) => `Ihre Testphase endet in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
    trialBody: 'Abonnieren Sie jetzt für ununterbrochenen Zugang zu KI-Funktionen.',
    pastDueTitle: 'Ihre letzte Zahlung ist fehlgeschlagen',
    pastDueBody:
      'Aktualisieren Sie Ihre Zahlungsmethode, um KI-Funktionen weiter zu nutzen. Der Zugang bleibt vorerst bestehen, kann aber bald pausiert werden.',
    subscribeMonthly: `Abonnieren — ${MONTHLY_PRICE}/Mon.`,
    subscribeYearly: `Jährlich abonnieren — ${YEARLY_PRICE}/Jahr`,
    recharge: 'Credits aufladen',
    redirecting: 'Weiterleitung…',
  },
  fr: {
    lockedTitle: 'Votre essai gratuit est terminé',
    lockedBody:
      'Abonnez-vous pour continuer à utiliser les fonctions IA. Vos données restent en sécurité et entièrement accessibles.',
    creditsLockedTitle: 'Un abonnement actif est requis pour utiliser vos crédits',
    creditsLockedBody:
      'Vos crédits achetés restent acquis et n’expirent pas. Abonnez-vous pour recommencer à les utiliser pour les fonctions IA.',
    trialTitle: (days) => `Votre essai gratuit se termine dans ${days} ${days === 1 ? 'jour' : 'jours'}`,
    trialBody: 'Abonnez-vous maintenant pour conserver un accès ininterrompu aux fonctions IA.',
    pastDueTitle: 'Votre dernier paiement a échoué',
    pastDueBody:
      'Mettez à jour votre moyen de paiement pour continuer à utiliser les fonctions IA. L’accès se poursuit pour l’instant mais pourrait être suspendu bientôt.',
    subscribeMonthly: `S’abonner — ${MONTHLY_PRICE}/mois`,
    subscribeYearly: `Abonnement annuel — ${YEARLY_PRICE}/an`,
    recharge: 'Recharger des crédits',
    redirecting: 'Redirection…',
  },
  es: {
    lockedTitle: 'Tu prueba gratuita ha finalizado',
    lockedBody:
      'Suscríbete para seguir usando las funciones de IA. Tus datos permanecen seguros y totalmente accesibles.',
    creditsLockedTitle: 'Se requiere una suscripción activa para usar tus créditos',
    creditsLockedBody:
      'Tus créditos comprados se conservan y no caducan. Suscríbete para volver a usarlos en las funciones de IA.',
    trialTitle: (days) => `Tu prueba gratuita termina en ${days} ${days === 1 ? 'día' : 'días'}`,
    trialBody: 'Suscríbete ahora para mantener el acceso ininterrumpido a las funciones de IA.',
    pastDueTitle: 'Tu último pago ha fallado',
    pastDueBody:
      'Actualiza tu método de pago para seguir usando las funciones de IA. El acceso continúa por ahora, pero podría pausarse pronto.',
    subscribeMonthly: `Suscribirse — ${MONTHLY_PRICE}/mes`,
    subscribeYearly: `Suscripción anual — ${YEARLY_PRICE}/año`,
    recharge: 'Recargar créditos',
    redirecting: 'Redirigiendo…',
  },
}

type BannerKind = 'locked' | 'credits_locked' | 'trial' | 'past_due'

function resolveKind(status: AiCreditStatus): BannerKind | null {
  // A blocked account that still holds banked credits gets the credits-specific
  // "subscription required to use your credits" prompt rather than the generic
  // trial-ended copy.
  if (!status.access && status.reason === 'subscription_required') return 'credits_locked'
  if (!status.access || status.locked) return 'locked'
  if (status.subscriptionStatus === 'past_due') return 'past_due'
  const subscribed = status.subscriptionStatus === 'active' || status.subscriptionStatus === 'trialing'
  if (
    !subscribed &&
    status.daysRemaining !== null &&
    status.daysRemaining <= TRIAL_WARNING_DAYS
  ) {
    return 'trial'
  }
  return null
}

interface SubscriptionBannerProps {
  /** Optional callback for the "top up credits" CTA (e.g. scroll to the pack grid). */
  onRechargeClick?: () => void
  /** Bumps to force a re-fetch (e.g. after returning from checkout). */
  refreshKey?: number
}

export function SubscriptionBanner({ onRechargeClick, refreshKey }: SubscriptionBannerProps) {
  const { language } = useTranslation()
  const copy = COPY[language] ?? COPY.en
  const [status, setStatus] = useState<AiCreditStatus | null>(null)
  const [busy, setBusy] = useState<SubscriptionInterval | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const next = await fetchAiCreditStatus()
        if (mountedRef.current) setStatus(next)
      } catch {
        // Status is advisory UI — silently ignore fetch failures.
      }
    })()
  }, [refreshKey])

  const handleSubscribe = useCallback(async (interval: SubscriptionInterval) => {
    setBusy(interval)
    try {
      const { url } = await startSubscriptionCheckout(interval)
      if (url) {
        window.location.href = url
        return
      }
    } catch {
      // Surfaced by the dashboard's own checkout messaging; reset busy state.
    }
    if (mountedRef.current) setBusy(null)
  }, [])

  if (!status) return null
  const kind = resolveKind(status)
  if (!kind) return null

  const tone =
    kind === 'locked' || kind === 'credits_locked'
      ? 'border-rose-300 bg-rose-50 text-rose-900'
      : 'border-amber-300 bg-amber-50 text-amber-900'

  const title =
    kind === 'locked'
      ? copy.lockedTitle
      : kind === 'credits_locked'
        ? copy.creditsLockedTitle
        : kind === 'past_due'
          ? copy.pastDueTitle
          : copy.trialTitle(status.daysRemaining ?? 0)

  const body =
    kind === 'locked'
      ? copy.lockedBody
      : kind === 'credits_locked'
        ? copy.creditsLockedBody
        : kind === 'past_due'
          ? copy.pastDueBody
          : copy.trialBody

  const Icon = kind === 'locked' || kind === 'credits_locked' ? Lock : AlertTriangle

  return (
    <div
      role={kind === 'locked' || kind === 'credits_locked' ? 'alert' : 'status'}
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-sm opacity-90">{body}</p>
        </div>
      </div>

      {status.stripeConfigured !== false ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
            disabled={busy !== null}
            onClick={() => void handleSubscribe('month')}
          >
            <CreditCard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {busy === 'month' ? copy.redirecting : copy.subscribeMonthly}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium transition hover:bg-white/60 disabled:opacity-60"
            disabled={busy !== null}
            onClick={() => void handleSubscribe('year')}
          >
            {busy === 'year' ? copy.redirecting : copy.subscribeYearly}
          </button>
          {onRechargeClick ? (
            <button
              type="button"
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium underline-offset-2 hover:underline"
              onClick={onRechargeClick}
            >
              {copy.recharge}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
