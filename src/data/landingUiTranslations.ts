import type { UiLanguage } from '../types/settings'

export const landingUiTranslations = {
  // ── Header navigation ────────────────────────────────────────────────────
  navFeatures: {
    de: 'Funktionen',
    en: 'Features',
    fr: 'Fonctionnalités',
    es: 'Funciones',
  },
  navPricing: {
    de: 'Preise',
    en: 'Pricing',
    fr: 'Tarifs',
    es: 'Precios',
  },
  navLogin: {
    de: 'Anmelden',
    en: 'Log in',
    fr: 'Se connecter',
    es: 'Iniciar sesión',
  },
  navSignup: {
    de: 'Registrieren',
    en: 'Sign up',
    fr: "S'inscrire",
    es: 'Registrarse',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroEyebrow: {
    de: 'Psychiatrische Dokumentation',
    en: 'Psychiatric documentation',
    fr: 'Documentation psychiatrique',
    es: 'Documentación psiquiátrica',
  },
  heroTitleLine1: {
    de: 'Ruhig schreiben.',
    en: 'Write calmly.',
    fr: 'Écrire sereinement.',
    es: 'Escribir con calma.',
  },
  heroTitleLine2: {
    de: 'Klinisch präzise bleiben.',
    en: 'Stay clinically precise.',
    fr: 'Rester cliniquement précis.',
    es: 'Mantener la precisión clínica.',
  },
  heroSubtitle: {
    de: 'Psychiatry.ink ist ein minimaler Arbeitsbereich für Verlaufsdokumentation — mit optionaler KI-Unterstützung, Diktat und lokalem Datenschutz nach Region.',
    en: 'Psychiatry.ink is a minimal workspace for progress documentation — with optional AI support, dictation and region-based local data protection.',
    fr: 'Psychiatry.ink est un espace de travail minimaliste pour la documentation de suivi — avec une assistance IA optionnelle, la dictée et une protection des données locale selon la région.',
    es: 'Psychiatry.ink es un espacio de trabajo minimalista para la documentación de evolución — con asistencia de IA opcional, dictado y protección de datos local según la región.',
  },
  heroCtaPrimary: {
    de: 'Kostenlos starten',
    en: 'Start for free',
    fr: 'Commencer gratuitement',
    es: 'Empezar gratis',
  },
  heroCtaSecondary: {
    de: 'Bereits registriert?',
    en: 'Already registered?',
    fr: 'Déjà inscrit ?',
    es: '¿Ya tienes cuenta?',
  },
  heroDevEntry: {
    de: 'Entwicklermodus — ohne Anmeldung fortfahren',
    en: 'Developer mode — continue without signing in',
    fr: 'Mode développeur — continuer sans connexion',
    es: 'Modo desarrollador — continuar sin iniciar sesión',
  },

  // ── Features section ──────────────────────────────────────────────────────
  featureEditorTitle: {
    de: 'Notion-artiger Editor',
    en: 'Notion-style editor',
    fr: 'Éditeur façon Notion',
    es: 'Editor estilo Notion',
  },
  featureEditorDesc: {
    de: 'Strukturierte Abschnitte für Aufnahme, Verlauf, Psychopathologie und Therapie — ohne visuelles Rauschen.',
    en: 'Structured sections for admission, progress, psychopathology and therapy — without visual noise.',
    fr: "Des sections structurées pour l'admission, l'évolution, la psychopathologie et la thérapie — sans bruit visuel.",
    es: 'Secciones estructuradas para ingreso, evolución, psicopatología y terapia — sin ruido visual.',
  },
  featureAiTitle: {
    de: 'KI-Assistent',
    en: 'AI assistant',
    fr: 'Assistant IA',
    es: 'Asistente de IA',
  },
  featureAiDesc: {
    de: 'Schnell, standard oder gründlich — nutzbar mit verfügbarem Credit-Guthaben. Bei erschöpftem Guthaben bleiben Bearbeitung und Export nutzbar.',
    en: 'Fast, standard or thorough — usable with your available credit balance. When credits run out, editing and export remain available.',
    fr: "Rapide, standard ou approfondi — utilisable selon votre solde de crédits disponible. Une fois les crédits épuisés, l'édition et l'export restent accessibles.",
    es: 'Rápido, estándar o exhaustivo — disponible con su saldo de créditos. Si se agotan los créditos, la edición y la exportación siguen disponibles.',
  },
  featureDictationTitle: {
    de: 'Diktat',
    en: 'Dictation',
    fr: 'Dictée',
    es: 'Dictado',
  },
  featureDictationDesc: {
    de: 'Aufnahme und Transkription direkt im Dokument — mit verfügbarem Credit-Guthaben.',
    en: 'Recording and transcription directly in the document — with your available credit balance.',
    fr: 'Enregistrement et transcription directement dans le document — selon votre solde de crédits disponible.',
    es: 'Grabación y transcripción directamente en el documento — con su saldo de créditos disponible.',
  },
  featurePrivacyTitle: {
    de: 'Regionaler Datenschutz',
    en: 'Regional data protection',
    fr: 'Protection des données régionale',
    es: 'Protección de datos regional',
  },
  featurePrivacyDesc: {
    de: 'DACH: lokale Patientenfelder. Volle Sync-Stufe nur in erlaubten Regionen — Pro-Plan für Patienten-Dashboard.',
    en: 'DACH: local patient fields. Full sync tier only in permitted regions — Pro plan for the patient dashboard.',
    fr: 'DACH : champs patient locaux. Niveau de synchronisation complet uniquement dans les régions autorisées — formule Pro pour le tableau de bord patient.',
    es: 'DACH: campos de paciente locales. Nivel de sincronización completo solo en regiones permitidas — plan Pro para el panel del paciente.',
  },

  // ── Pricing section ───────────────────────────────────────────────────────
  pricingLead: {
    de: 'KI und Diktat laufen über eine optimierte API-Infrastruktur mit führenden LLM-Anbietern — zuverlässig, skalierbar und auf psychiatrische Dokumentation ausgelegt.',
    en: 'AI and dictation run on an optimised API infrastructure with leading LLM providers — reliable, scalable and built for psychiatric documentation.',
    fr: "L'IA et la dictée reposent sur une infrastructure API optimisée avec les principaux fournisseurs de LLM — fiable, évolutive et conçue pour la documentation psychiatrique.",
    es: 'La IA y el dictado funcionan sobre una infraestructura de API optimizada con los principales proveedores de LLM — fiable, escalable y diseñada para la documentación psiquiátrica.',
  },
  pricingPerMonth: {
    de: '/Monat',
    en: '/month',
    fr: '/mois',
    es: '/mes',
  },
  pricingRecommended: {
    de: 'Empfohlen',
    en: 'Recommended',
    fr: 'Recommandé',
    es: 'Recomendado',
  },
  pricingProCta: {
    de: 'Pro testen',
    en: 'Try Pro',
    fr: 'Essayer Pro',
    es: 'Probar Pro',
  },
  pricingStripeNote: {
    de: 'Abrechnung via Stripe — demnächst verfügbar',
    en: 'Billing via Stripe — coming soon',
    fr: 'Facturation via Stripe — bientôt disponible',
    es: 'Facturación con Stripe — próximamente',
  },

  // ── Closing call-to-action ────────────────────────────────────────────────
  ctaTitle: {
    de: 'Bereit für den ersten Eintrag?',
    en: 'Ready for your first entry?',
    fr: 'Prêt pour votre première entrée ?',
    es: '¿Listo para tu primera entrada?',
  },
  ctaSubtitle: {
    de: 'Registrieren Sie sich und erhalten Sie {credits} Credits zum Ausprobieren.',
    en: 'Sign up and receive {credits} credits to try it out.',
    fr: 'Inscrivez-vous et recevez {credits} crédits pour le tester.',
    es: 'Regístrese y reciba {credits} créditos para probarlo.',
  },
  ctaButton: {
    de: 'Jetzt registrieren',
    en: 'Sign up now',
    fr: "S'inscrire maintenant",
    es: 'Registrarse ahora',
  },
} as const satisfies Record<string, Record<UiLanguage, string>>

export type LandingUiKey = keyof typeof landingUiTranslations

export function translateLandingUi(language: UiLanguage, key: LandingUiKey): string {
  return landingUiTranslations[key][language] ?? landingUiTranslations[key].de
}
