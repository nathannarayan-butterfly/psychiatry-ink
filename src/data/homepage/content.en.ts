import type { HomepageContent } from './types'

export const homepageContentEn: HomepageContent = {
  meta: {
    title: 'Psychiatry.Ink',
    tagline: 'Secure psychiatric workspace',
  },
  nav: {
    links: [
      { id: 'product', label: 'Product', href: '#product' },
      { id: 'workflow', label: 'Workflow', href: '#workflow' },
      { id: 'security', label: 'Security', href: '#security' },
      { id: 'demo', label: 'Demo', href: '#demo' },
      { id: 'pricing', label: 'Pricing', href: '#pricing' },
    ],
    openWorkspaceLabel: 'Open Workspace',
    homeAriaLabel: 'Psychiatry.Ink home',
    mainNavAriaLabel: 'Main navigation',
  },
  hero: {
    eyebrow: 'Psychiatric clinical workspace',
    headline: 'Psychiatry.Ink — the clinical workspace for modern psychiatry.',
    subtitle:
      'Psychiatry.Ink is a secure psychiatric workspace for documentation, case discussion, psychopharmacology reference, treatment planning, clinical tools, and AI-assisted clinical intelligence. AI supports structuring, review, and reasoning — clinician acceptance is always required.',
    primaryCta: 'Open Workspace',
    secondaryCta: 'View Demo Patient',
    devModeLink: 'Developer mode — continue without sign-in',
    trustLabelsAriaLabel: 'Product trust highlights',
    trustLabels: [
      'Clinician-reviewed AI',
      'De-identified evidence workflows',
      'Documentation + therapy + tools',
      'Built for psychiatry',
    ],
    workspaceModules: [
      'Case Discussion',
      'Knowledge Base',
      'Progress Notes',
      'History',
      'Therapy',
      'Medication',
      'Ask Butterfly',
      'Consultation',
    ],
  },
  pillars: {
    sectionId: 'product',
    eyebrow: 'More than documentation',
    title: 'A psychiatric workspace — not a generic notes app',
    lead:
      'Structured clinical documentation, collaborative case discussion, psychopharmacology reference, treatment planning, built-in tools, and optional clinical intelligence — designed for psychiatrists who need precision, control, and review at every step.',
    cards: [
      {
        id: 'fallbesprechung',
        title: 'Case Discussion',
        description:
          'Structured case discussion with colleagues — share de-identified case packages, annotate clinical sections, and use Ask Butterfly for AI-assisted reasoning within a controlled, review-first workflow.',
      },
      {
        id: 'knowledge-base',
        title: 'Knowledge Base',
        description:
          'Psychopharmacology reference with country-specific preparations, receptor profiles, interaction checks, and clinician-verified monographs — integrated where medication decisions are made.',
      },
      {
        id: 'documentation',
        title: 'Documentation Engine',
        description:
          'Progress notes, history, psychopathology, and structured sections with templates, dictation support, and inline AI-assisted editing — always under clinician control.',
      },
      {
        id: 'treatment',
        title: 'Treatment Workspace',
        description:
          'Therapy planning, medication management, prior therapies, and longitudinal tracking in one case-centric workspace — not scattered across separate systems.',
      },
      {
        id: 'tools',
        title: 'Clinical Tools',
        description:
          'Lab correlation, combination checks, diagnostic criteria support, document import, and specialty calculators — integrated where clinicians already work.',
      },
      {
        id: 'intelligence',
        title: 'Clinical Intelligence',
        description:
          'Optional AI-assisted dimensional profiling, mechanism hypotheses, and structured review layers. Supports clinical reasoning — never autonomous diagnosis or treatment decisions.',
      },
    ],
  },
  workflow: {
    sectionId: 'workflow',
    eyebrow: 'Workflow',
    title: 'From capture to export — with review at every step',
    lead: 'A deliberate clinical workflow that keeps the psychiatrist in control of structure, review, and action.',
    steps: [
      {
        id: 'capture',
        title: 'Capture',
        description:
          'Dictate, type, or import clinical material — notes, labs, documents, and external reports enter the workspace.',
      },
      {
        id: 'structure',
        title: 'Structure',
        description:
          'Organize into psychiatric sections, apply templates, and use AI-assisted structuring with full visibility into suggestions.',
      },
      {
        id: 'review',
        title: 'Review',
        description:
          'Clinician review of AI suggestions, diagnostic criteria support, and clinical intelligence outputs before anything is accepted.',
      },
      {
        id: 'act',
        title: 'Act',
        description:
          'Update treatment plans, medication, therapy notes, and case decisions based on reviewed, clinician-approved content.',
      },
      {
        id: 'export',
        title: 'Export / Continue',
        description:
          'Generate documents, share consultation summaries, or continue the case — with audit-friendly continuity across sessions.',
      },
    ],
  },
  modules: {
    sectionId: 'modules',
    eyebrow: 'Modules',
    title: 'One workspace. Multiple psychiatric modules.',
    lead:
      'Every module shares the same case context, typography, and review philosophy — from admission documentation to case discussion and psychopharmacology reference.',
    cards: [
      {
        id: 'fallbesprechung',
        label: 'A',
        title: 'Case Discussion',
        description:
          'Collaborative case discussion with de-identified packages, section annotations, and Ask Butterfly for structured clinical reasoning support.',
      },
      {
        id: 'wissensdatenbank',
        label: 'B',
        title: 'Knowledge Base',
        description:
          'Psychopharmacology knowledge base — preparations, receptor affinities, interactions, and verified monographs for prescribing decisions.',
      },
      {
        id: 'verlauf',
        label: 'C',
        title: 'Progress Notes',
        description: 'Longitudinal progress documentation with structured psychiatric sections and session continuity.',
      },
      {
        id: 'anamnese',
        label: 'D',
        title: 'History',
        description: 'Structured psychiatric history, biographical context, and admission documentation.',
      },
      {
        id: 'psychopathologie',
        label: 'E',
        title: 'Psychopathology',
        description: 'Systematic psychopathological examination with typographic clarity and section templates.',
      },
      {
        id: 'diagnostik',
        label: 'F',
        title: 'Diagnostics & Findings',
        description: 'Diagnostic workup, findings, and criteria-linked documentation with clinician sign-off.',
      },
      {
        id: 'medikation',
        label: 'G',
        title: 'Medication',
        description: 'Medication lists, combination checks, lab–med correlation, and dose notation in clinical format.',
      },
      {
        id: 'therapie',
        label: 'H',
        title: 'Therapy',
        description: 'Treatment planning, therapy notes, and prior therapy tracking in one longitudinal view.',
      },
      {
        id: 'labor',
        label: 'I',
        title: 'Laboratory',
        description: 'Lab import, trend graphs, and correlation with medication and clinical status.',
      },
      {
        id: 'vorlagen',
        label: 'J',
        title: 'Templates',
        description: 'Document templates, generated letters, and reusable clinical document workflows.',
      },
      {
        id: 'konsil',
        label: 'K',
        title: 'Consultation',
        description: 'Consultation requests, shared case summaries, and structured handoff documentation.',
      },
      {
        id: 'clinical-intelligence',
        label: 'L',
        title: 'Clinical Intelligence',
        description:
          'Advanced optional layer: dimensional profiling, mechanism hypotheses, and structured clinical reasoning support. Future capability — not autonomous diagnosis.',
      },
    ],
  },
  security: {
    sectionId: 'security',
    eyebrow: 'Security & control',
    title: 'Designed for clinical trust',
    lead:
      'Security, de-identification, and user control are central — not afterthoughts. Psychiatry.Ink is built to support responsible AI use in psychiatric practice.',
    principles: [
      {
        id: 'clinician-control',
        title: 'Clinician control',
        description:
          'AI suggestions are designed to require explicit clinician review and acceptance. Nothing is applied automatically to the clinical record without your action.',
      },
      {
        id: 'de-identification',
        title: 'De-identification workflows',
        description:
          'Evidence and external material can be processed through de-identification workflows designed to reduce identifiable content before AI-assisted analysis.',
      },
      {
        id: 'regional-privacy',
        title: 'Regional privacy options',
        description:
          'Supports configurable identifier storage and regional privacy settings — designed to align with your practice requirements and data handling preferences.',
      },
      {
        id: 'audit-transparency',
        title: 'Audit & transparency',
        description:
          'AI-assisted actions can be tracked and reviewed. The workspace is designed to support transparent clinical documentation rather than opaque automation.',
      },
    ],
  },
  tiers: {
    sectionId: 'pricing',
    eyebrow: 'Pricing',
    title: 'Plans for every practice size',
    lead: 'Individual use is available now — start with a free trial.',
    singleUse: {
      name: 'Single User',
      trial: {
        price: 'Free',
        detail: '1 month free trial with 500 AI credits',
      },
      thenLabel: 'Then',
      toggle: {
        monthly: 'Monthly',
        yearly: 'Yearly',
      },
      yearlyRecommendation: 'Recommended: Save 20% with yearly billing — £239.90/year',
      yearlyConfirmation: 'Yearly billing — 20% savings applied',
      billing: {
        monthly: {
          price: '£24.99',
          period: '/month',
          credits: '500 AI credits included',
          savings: null,
        },
        yearly: {
          price: '£239.90',
          period: '/year',
          credits: '500 AI credits included each month',
          savings: 'Save £59.98/year — 20% off vs £299.88/year',
        },
      },
      description:
        'Individual psychiatrist — full workspace for documentation, tools, and clinical intelligence.',
      features: [
        'Economic, Standard, and Gründlich AI modes',
        'Extra credits available',
        '1 month free trial',
        '20% discount with annual billing',
      ],
      aiCreditsLink: {
        label: 'AI credit information',
        href: '/ai-credits',
      },
      cta: 'Start free trial',
    },
    comingSoonNote:
      'Small Praxis (team workflows, shared cases) and Enterprise (organisational deployment) — in development.',
  },
  demo: {
    sectionId: 'demo',
    eyebrow: 'Demo',
    title: 'See the workspace in context',
    lead:
      'Synthetic demo screenshots — no real patient data. Highlights include Clinical Intelligence, psychopharmacology reference, case discussion, lab trends, interaction checks, and ISDM documentation.',
    panels: [
      {
        id: 'intelligence',
        label: 'Clinical Intelligence',
        title: 'Dimensional profile & mechanisms',
        description: 'Pre-reviewed hypotheses with severity graphs and status chips · Anna Demo',
        imageSrc: '/homepage/demo-intelligence.png',
        imageAlt: 'Synthetic demo — Clinical Intelligence dimensional and mechanism graphs.',
      },
      {
        id: 'knowledge-base',
        label: 'Knowledge Base',
        title: 'Psychopharmacology reference',
        description: 'Receptor profile and monograph for prescribing decisions',
        imageSrc: '/homepage/demo-knowledge-base.png',
        imageAlt: 'Synthetic demo — Knowledge base drug detail with receptor profile.',
      },
      {
        id: 'discuss',
        label: 'Case discussion',
        title: 'DiscussCase workspace',
        description: 'Active team discussion with curated case package and chat thread',
        imageSrc: '/homepage/demo-discuss.png',
        imageAlt: 'Synthetic demo — Active case discussion panel with messages.',
      },
      {
        id: 'labor',
        label: 'Lab monitoring',
        title: 'Cumulative lab trends',
        description: 'Prolactin and metabolic markers with medication change markers',
        imageSrc: '/homepage/demo-labor.png',
        imageAlt: 'Synthetic demo — Lab trend graph with abnormal flags.',
      },
      {
        id: 'interaction',
        label: 'Interaction check',
        title: 'Medication combinations',
        description: 'Knowledge-base and AI-reviewed interaction findings for active meds',
        imageSrc: '/homepage/demo-interaction.png',
        imageAlt: 'Synthetic demo — Medication interaction matrix.',
      },
      {
        id: 'isdm',
        label: 'ISDM',
        title: 'System documentation',
        description: 'Phenomenology mapping and diagnostic synthesis (ISDM analysis panel)',
        imageSrc: '/homepage/demo-isdm.png',
        imageAlt: 'Synthetic demo — ISDM system documentation analysis panel.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to open your psychiatric workspace?',
    subtitle:
      'Start with documentation and clinical tools today. AI-assisted features are optional — clinician review is always part of the workflow.',
    primaryCta: 'Open Workspace',
    secondaryCta: 'View Demo Patient',
  },
  poweredBy: {
    label: 'Powered with Butterfly Clinical Intelligence System',
  },
  footer: {
    companyName: 'Psychiatry Ink Ltd',
    companyRegistration: 'Company registered in England and Wales.',
    companyNumber: 'Company number: 17275704.',
    address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom',
    allRightsReserved: 'All rights reserved.',
    footerNavAriaLabel: 'Footer navigation',
    links: [
      { id: 'product', label: 'Product', href: '#product' },
      { id: 'security', label: 'Security', href: '#security' },
      { id: 'pricing', label: 'Pricing', href: '#pricing' },
      { id: 'sign-in', label: 'Sign in', href: '/login' },
    ],
    disclaimer:
      'Psychiatry.Ink is a clinical documentation and workspace tool. It does not diagnose patients, make autonomous treatment decisions, or replace psychiatrists. AI features require clinician review and acceptance. Not intended for emergency or crisis use.',
  },
  ui: {
    availableNow: 'Available now',
    billingPeriodAriaLabel: 'Billing period',
    syntheticDemoBadge: 'Synthetic demo',
    enlargeScreenshotTemplate: 'Enlarge {title} screenshot',
    closeScreenshotAriaLabel: 'Close enlarged screenshot',
  },
}
