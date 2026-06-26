import type { HomepageContent } from './types'

export const homepageContentDe: HomepageContent = {
  meta: {
    title: 'Psychiatrie.Ink',
    tagline: 'Sicherer psychiatrischer Arbeitsbereich',
  },
  nav: {
    links: [
      { id: 'product', label: 'Produkt', href: '#product' },
      { id: 'workflow', label: 'Workflow', href: '#workflow' },
      { id: 'security', label: 'Sicherheit', href: '#security' },
      { id: 'demo', label: 'Demo', href: '#demo' },
      { id: 'pricing', label: 'Preise', href: '#pricing' },
    ],
    openWorkspaceLabel: 'Arbeitsbereich öffnen',
    homeAriaLabel: 'Psychiatrie.Ink Startseite',
    mainNavAriaLabel: 'Hauptnavigation',
  },
  hero: {
    eyebrow: 'Klinischer Arbeitsbereich für die Psychiatrie',
    headline: 'Psychiatrie.Ink — der intelligente Arbeitsbereich für die moderne Psychiatrie.',
    subtitle:
      'Psychiatrie.Ink bündelt Dokumentation, Fallbesprechung, psychopharmakologische Referenz, Therapieplanung, klinische Tools und KI-gestützte Clinical Intelligence in einem sicheren Arbeitsbereich. Die KI unterstützt beim Strukturieren, Prüfen und klinischen Reasoning — die ärztliche Freigabe bleibt immer erforderlich.',
    primaryCta: 'Arbeitsbereich öffnen',
    secondaryCta: 'Demo-Patientin ansehen',
    devModeLink: 'Entwicklermodus — ohne Anmeldung fortfahren',
    trustLabelsAriaLabel: 'Vertrauensmerkmale des Produkts',
    trustLabels: [
      'Klinisch geprüfte KI',
      'De-identifizierte Evidenz-Workflows',
      'Dokumentation, Therapie und Tools in einem',
      'Speziell für die Psychiatrie',
    ],
    workspaceModules: [
      'Fallbesprechung',
      'Wissensdatenbank',
      'Verlauf',
      'Anamnese',
      'Therapie',
      'Medikation',
      'Ask Butterfly',
      'Konsil',
    ],
  },
  pillars: {
    sectionId: 'product',
    eyebrow: 'Mehr als Dokumentation',
    title: 'Ein psychiatrischer Arbeitsbereich — keine generische Notiz-App',
    lead:
      'Strukturierte klinische Dokumentation, kollaborative Fallbesprechung, psychopharmakologische Referenz, Therapieplanung, integrierte Tools und optionale Clinical Intelligence — entwickelt für Psychiaterinnen und Psychiater, die in jedem Schritt Präzision, Kontrolle und Prüfung erwarten.',
    cards: [
      {
        id: 'fallbesprechung',
        title: 'Fallbesprechung',
        description:
          'Strukturierte Fallbesprechung mit Kolleginnen und Kollegen: de-identifizierte Fallpakete teilen, klinische Abschnitte annotieren und Ask Butterfly für KI-gestütztes Reasoning nutzen — eingebettet in einen kontrollierten Workflow mit Prüfung an erster Stelle.',
      },
      {
        id: 'knowledge-base',
        title: 'Wissensdatenbank',
        description:
          'Psychopharmakologische Referenz mit länderspezifischen Präparaten, Rezeptorprofilen, Interaktionsprüfung und ärztlich verifizierten Monographien — direkt dort eingebunden, wo Verordnungsentscheidungen getroffen werden.',
      },
      {
        id: 'documentation',
        title: 'Dokumentations-Engine',
        description:
          'Verlauf, Anamnese, Psychopathologie und strukturierte Abschnitte mit Vorlagen, Diktierfunktion und KI-gestützter Inline-Bearbeitung — stets unter ärztlicher Kontrolle.',
      },
      {
        id: 'treatment',
        title: 'Therapie-Arbeitsbereich',
        description:
          'Therapieplanung, Medikationsmanagement, Vortherapien und longitudinaler Verlauf in einem fallzentrierten Arbeitsbereich — nicht verteilt über mehrere Systeme.',
      },
      {
        id: 'tools',
        title: 'Klinische Tools',
        description:
          'Laborkorrelation, Kombinationsprüfung, Diagnosekriterien-Unterstützung, Dokumentenimport und Fachrechner — eingebunden dort, wo Sie ohnehin klinisch arbeiten.',
      },
      {
        id: 'intelligence',
        title: 'Clinical Intelligence',
        description:
          'Optionales KI-gestütztes dimensionales Profiling, Mechanismushypothesen und strukturierte Prüfebenen. Unterstützt das klinische Denken — niemals autonome Diagnose oder Therapieentscheidung.',
      },
    ],
  },
  workflow: {
    sectionId: 'workflow',
    eyebrow: 'Workflow',
    title: 'Von der Erfassung bis zum Export — mit Prüfung in jedem Schritt',
    lead: 'Ein durchdachter klinischer Workflow, in dem Sie als behandelnde Ärztin oder behandelnder Arzt Struktur, Prüfung und Handlung jederzeit in der Hand behalten.',
    steps: [
      {
        id: 'capture',
        title: 'Erfassen',
        description:
          'Diktieren, tippen oder klinisches Material importieren — Notizen, Laborwerte, Dokumente und externe Berichte gelangen direkt in den Arbeitsbereich.',
      },
      {
        id: 'structure',
        title: 'Strukturieren',
        description:
          'In psychiatrische Abschnitte gliedern, Vorlagen anwenden und KI-gestützte Strukturierung mit voller Transparenz über alle Vorschläge nutzen.',
      },
      {
        id: 'review',
        title: 'Prüfen',
        description:
          'Ärztliche Prüfung von KI-Vorschlägen, Diagnosekriterien-Unterstützung und Clinical-Intelligence-Ergebnissen — bevor irgendetwas in die Akte übernommen wird.',
      },
      {
        id: 'act',
        title: 'Handeln',
        description:
          'Therapiepläne, Medikation, Verlaufseinträge und Fallentscheidungen auf Basis geprüfter und freigegebener Inhalte aktualisieren.',
      },
      {
        id: 'export',
        title: 'Export / Fortsetzen',
        description:
          'Dokumente generieren, Konsilberichte teilen oder den Fall fortsetzen — mit auditfähiger Kontinuität über alle Sitzungen hinweg.',
      },
    ],
  },
  modules: {
    sectionId: 'modules',
    eyebrow: 'Module',
    title: 'Ein Arbeitsbereich. Mehrere psychiatrische Module.',
    lead:
      'Jedes Modul nutzt denselben Fallkontext, dieselbe Typografie und dieselbe Prüfphilosophie — von der Aufnahmedokumentation über die Fallbesprechung bis zur psychopharmakologischen Referenz.',
    cards: [
      {
        id: 'fallbesprechung',
        label: 'A',
        title: 'Fallbesprechung',
        description:
          'Kollaborative Fallbesprechung mit de-identifizierten Fallpaketen, Abschnittsannotationen und Ask Butterfly für strukturierte Reasoning-Unterstützung.',
      },
      {
        id: 'wissensdatenbank',
        label: 'B',
        title: 'Wissensdatenbank',
        description:
          'Psychopharmakologische Wissensdatenbank — Präparate, Rezeptoraffinitäten, Interaktionen und verifizierte Monographien für die Verordnungsentscheidung.',
      },
      {
        id: 'verlauf',
        label: 'C',
        title: 'Verlauf',
        description: 'Longitudinale Verlaufsdokumentation mit strukturierten psychiatrischen Abschnitten und durchgängiger Sitzungskontinuität.',
      },
      {
        id: 'anamnese',
        label: 'D',
        title: 'Anamnese',
        description: 'Strukturierte psychiatrische Anamnese, biografischer Kontext und vollständige Aufnahmedokumentation.',
      },
      {
        id: 'psychopathologie',
        label: 'E',
        title: 'Psychopathologie',
        description: 'Systematischer psychopathologischer Befund mit typografischer Klarheit und Abschnittsvorlagen.',
      },
      {
        id: 'diagnostik',
        label: 'F',
        title: 'Diagnostik & Befunde',
        description: 'Diagnostische Abklärung, Befunde und kriterienbasierte Dokumentation mit ärztlicher Freigabe.',
      },
      {
        id: 'medikation',
        label: 'G',
        title: 'Medikation',
        description: 'Medikationspläne, Kombinationsprüfung, Labor-Medikations-Korrelation und Dosisnotation im klinischen Format.',
      },
      {
        id: 'therapie',
        label: 'H',
        title: 'Therapie',
        description: 'Therapieplanung, Therapieverläufe und Vortherapien-Tracking in einer durchgängigen longitudinalen Ansicht.',
      },
      {
        id: 'labor',
        label: 'I',
        title: 'Labor',
        description: 'Laborimport, Trendgrafiken und Korrelation mit Medikation und klinischem Status.',
      },
      {
        id: 'vorlagen',
        label: 'J',
        title: 'Vorlagen',
        description: 'Dokumentvorlagen, generierte Arztbriefe und wiederverwendbare klinische Dokument-Workflows.',
      },
      {
        id: 'konsil',
        label: 'K',
        title: 'Konsil',
        description: 'Konsilanfragen, geteilte Fallzusammenfassungen und strukturierte Übergabedokumentation.',
      },
      {
        id: 'clinical-intelligence',
        label: 'L',
        title: 'Clinical Intelligence',
        description:
          'Optionale erweiterte Ebene: dimensionales Profiling, Mechanismushypothesen und strukturierte Reasoning-Unterstützung. Zukünftige Funktion — keine autonome Diagnose.',
      },
    ],
  },
  security: {
    sectionId: 'security',
    eyebrow: 'Sicherheit & Kontrolle',
    title: 'Konzipiert für klinisches Vertrauen',
    lead:
      'Sicherheit, De-Identifikation und ärztliche Kontrolle stehen im Zentrum — keine nachträglich aufgesetzten Funktionen. Psychiatrie.Ink ist auf einen verantwortungsvollen KI-Einsatz in der psychiatrischen Praxis ausgelegt.',
    principles: [
      {
        id: 'clinician-control',
        title: 'Ärztliche Kontrolle',
        description:
          'KI-Vorschläge erfordern eine ausdrückliche ärztliche Prüfung und Freigabe. Nichts wird ohne Ihr Zutun automatisch in die Akte übernommen.',
      },
      {
        id: 'de-identification',
        title: 'De-Identifikations-Workflows',
        description:
          'Evidenz und externes Material lassen sich durch De-Identifikations-Workflows verarbeiten, die identifizierende Inhalte vor jeder KI-Analyse reduzieren.',
      },
      {
        id: 'regional-privacy',
        title: 'Regionale Datenschutzoptionen',
        description:
          'Konfigurierbare Identifikatorspeicherung und regionale Datenschutzeinstellungen — abgestimmt auf die Anforderungen Ihrer Praxis und Ihren Datenumgang.',
      },
      {
        id: 'audit-transparency',
        title: 'Audit & Transparenz',
        description:
          'KI-gestützte Aktionen lassen sich nachvollziehen und prüfen. Der Arbeitsbereich ist auf transparente klinische Dokumentation ausgelegt — nicht auf undurchsichtige Automatisierung.',
      },
    ],
  },
  tiers: {
    sectionId: 'pricing',
    eyebrow: 'Preise',
    title: 'Tarife für jede Praxisgröße',
    lead: 'Die Einzelnutzung ist verfügbar — starten Sie mit einer kostenlosen Testphase.',
    singleUse: {
      name: 'Einzelnutzung',
      trial: {
        price: 'Kostenlos',
        detail: '1 Monat kostenlos testen — inklusive 500 KI-Credits',
      },
      thenLabel: 'Danach',
      toggle: {
        monthly: 'Monatlich',
        yearly: 'Jährlich',
      },
      yearlyRecommendation: 'Empfohlen: 20 % sparen mit jährlicher Abrechnung — £239,90/Jahr',
      yearlyConfirmation: 'Jährliche Abrechnung — 20 % Ersparnis aktiviert',
      billing: {
        monthly: {
          price: '£24,99',
          period: '/Monat',
          credits: '500 KI-Credits inklusive',
          savings: null,
        },
        yearly: {
          price: '£239,90',
          period: '/Jahr',
          credits: '500 KI-Credits pro Monat inklusive',
          savings: '£59,98/Jahr sparen — 20 % gegenüber £299,88/Jahr',
        },
      },
      description:
        'Für Psychiaterinnen und Psychiater im Einzelbetrieb — voller Arbeitsbereich für Dokumentation, Tools und Clinical Intelligence.',
      features: [
        'KI-Modi „Wirtschaftlich", „Standard" und „Gründlich"',
        'Zusätzliche Credits buchbar',
        '1 Monat kostenlose Testphase',
        '20 % Rabatt bei jährlicher Abrechnung',
      ],
      aiCreditsLink: {
        label: 'Hinweise zu KI-Credits',
        href: '/ai-credits',
      },
      cta: 'Kostenlose Testphase starten',
    },
    comingSoonNote:
      'Small Praxis (Team-Workflows, gemeinsame Fälle) und Enterprise (organisationsweite Bereitstellung) sind in Entwicklung.',
  },
  demo: {
    sectionId: 'demo',
    eyebrow: 'Demo',
    title: 'Den Arbeitsbereich im Kontext sehen',
    lead:
      'Synthetische Demo-Screenshots — keine echten Patientendaten. Highlights: Clinical Intelligence, psychopharmakologische Referenz, Fallbesprechung, Laborverläufe, Interaktionsprüfung und ISDM-Dokumentation.',
    panels: [
      {
        id: 'intelligence',
        label: 'Clinical Intelligence',
        title: 'Dimensionales Profil & Mechanismen',
        description: 'Vorgeprüfte Hypothesen mit Schweregrad-Grafiken und Status-Chips · Anna Demo',
        imageSrc: '/homepage/demo-intelligence.png',
        imageAlt: 'Synthetische Demo — Clinical Intelligence mit dimensionalen und Mechanismus-Grafiken.',
      },
      {
        id: 'knowledge-base',
        label: 'Wissensdatenbank',
        title: 'Psychopharmakologische Referenz',
        description: 'Rezeptorprofil und Monographie für die Verordnungsentscheidung',
        imageSrc: '/homepage/demo-knowledge-base.png',
        imageAlt: 'Synthetische Demo — Wirkstoffdetail aus der Wissensdatenbank mit Rezeptorprofil.',
      },
      {
        id: 'discuss',
        label: 'Fallbesprechung',
        title: 'DiscussCase-Arbeitsbereich',
        description: 'Aktive Teambesprechung mit kuratiertem Fallpaket und Chat-Verlauf',
        imageSrc: '/homepage/demo-discuss.png',
        imageAlt: 'Synthetische Demo — Aktives Fallbesprechungs-Panel mit Nachrichten.',
      },
      {
        id: 'labor',
        label: 'Labormonitoring',
        title: 'Kumulative Laborverläufe',
        description: 'Prolaktin und metabolische Marker mit Markierungen für Medikationswechsel',
        imageSrc: '/homepage/demo-labor.png',
        imageAlt: 'Synthetische Demo — Labor-Trendgrafik mit Markierungen für auffällige Werte.',
      },
      {
        id: 'interaction',
        label: 'Interaktionsprüfung',
        title: 'Medikationskombinationen',
        description: 'Befunde aus Wissensdatenbank- und KI-gestützter Interaktionsprüfung der aktiven Medikation',
        imageSrc: '/homepage/demo-interaction.png',
        imageAlt: 'Synthetische Demo — Interaktionsmatrix für Medikation.',
      },
      {
        id: 'isdm',
        label: 'ISDM',
        title: 'Systemdokumentation',
        description: 'Phänomenologisches Mapping und diagnostische Synthese (ISDM-Analysepanel)',
        imageSrc: '/homepage/demo-isdm.png',
        imageAlt: 'Synthetische Demo — ISDM-Systemdokumentations-Analysepanel.',
      },
    ],
  },
  finalCta: {
    title: 'Bereit, Ihren psychiatrischen Arbeitsbereich zu öffnen?',
    subtitle:
      'Starten Sie heute mit Dokumentation und klinischen Tools. KI-gestützte Funktionen sind optional — die ärztliche Prüfung bleibt immer Teil des Workflows.',
    primaryCta: 'Arbeitsbereich öffnen',
    secondaryCta: 'Demo-Patientin ansehen',
  },
  poweredBy: {
    label: 'Powered with Butterfly Clinical Intelligence System',
  },
  footer: {
    companyName: 'Psychiatry Ink Ltd',
    companyRegistration: 'Eingetragen in England und Wales (Vereinigtes Königreich).',
    companyNumber: 'Handelsregisternummer: 17275704.',
    address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, Vereinigtes Königreich',
    allRightsReserved: 'Alle Rechte vorbehalten.',
    footerNavAriaLabel: 'Fußzeilen-Navigation',
    links: [
      { id: 'product', label: 'Produkt', href: '#product' },
      { id: 'security', label: 'Sicherheit', href: '#security' },
      { id: 'pricing', label: 'Preise', href: '#pricing' },
      { id: 'sign-in', label: 'Anmelden', href: '/login' },
    ],
    disclaimer:
      'Psychiatrie.Ink ist ein Werkzeug für klinische Dokumentation und Arbeitsorganisation. Es stellt keine Diagnosen, trifft keine autonomen Therapieentscheidungen und ersetzt keine ärztliche Tätigkeit. KI-Funktionen erfordern eine ärztliche Prüfung und Freigabe. Nicht für Notfall- oder Krisensituationen vorgesehen.',
  },
  ui: {
    availableNow: 'Jetzt verfügbar',
    billingPeriodAriaLabel: 'Abrechnungszeitraum',
    syntheticDemoBadge: 'Synthetische Demo',
    enlargeScreenshotTemplate: 'Screenshot vergrößern: {title}',
    closeScreenshotAriaLabel: 'Vergrößerten Screenshot schließen',
  },
}
