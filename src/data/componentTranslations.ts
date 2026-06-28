import type { UiLanguage } from '../types/settings'

type LocalizedText = Record<UiLanguage, string>
type LocalizedLines = Record<UiLanguage, string[]>

interface SectionTranslation {
  label: LocalizedText
}

interface VariantTranslation {
  label: LocalizedText
  railHeading?: LocalizedText
}

interface ComponentTranslation {
  label: LocalizedText
  /** Stored labels that should still resolve via i18n (migrations / legacy defaults). */
  legacyLabelDe?: string[]
  toolLabelLines?: LocalizedLines
  railHeading?: LocalizedText
  legacyRailHeadingDe?: string[]
  variants?: Record<string, VariantTranslation>
  sections?: Record<string, SectionTranslation>
}

export const componentTranslations: Record<string, ComponentTranslation> = {
  aufnahme: {
    label: {
      de: 'Aufnahme',
      en: 'Admission',
      fr: 'Admission',
      es: 'Ingreso',
    },
    railHeading: {
      de: 'Aufnahme',
      en: 'Admission',
      fr: 'Admission',
      es: 'Ingreso',
    },
    variants: {
      sections: {
        label: {
          de: 'Abschnitte',
          en: 'Sections',
          fr: 'Sections',
          es: 'Secciones',
        },
      },
      free: {
        label: {
          de: 'Freitext',
          en: 'Free text',
          fr: 'Texte libre',
          es: 'Texto libre',
        },
      },
    },
    sections: {
      aufnahmeanlass: {
        label: {
          de: 'Aufnahmeanlass',
          en: 'Reason for admission',
          fr: "Motif d'admission",
          es: 'Motivo de ingreso',
        },
      },
      'aktuelle-beschwerden': {
        label: {
          de: 'Aktuelle Beschwerden',
          en: 'Current complaints',
          fr: 'Plaintes actuelles',
          es: 'Motivo de consulta actual',
        },
      },
      eigenanamnese: {
        label: {
          de: 'Eigenanamnese',
          en: 'Personal history',
          fr: 'Anamnèse personnelle',
          es: 'Anamnesis personal',
        },
      },
      'aktuelle-krankheitsanamnese': {
        label: {
          de: 'Aktuelle Krankheitsanamnese',
          en: 'Current illness history',
          fr: 'Anamnèse de la maladie actuelle',
          es: 'Anamnesis de la enfermedad actual',
        },
      },
      'psychiatrische-vorgeschichte': {
        label: {
          de: 'Psychiatrische Vorgeschichte',
          en: 'Psychiatric history',
          fr: 'Antécédents psychiatriques',
          es: 'Antecedentes psiquiátricos',
        },
      },
      'somatische-anamnese': {
        label: {
          de: 'Somatische Anamnese',
          en: 'Somatic history',
          fr: 'Anamnèse somatique',
          es: 'Anamnesis somática',
        },
      },
      suchtanamnese: {
        label: {
          de: 'Suchtanamnese',
          en: 'Substance use history',
          fr: 'Anamnèse addictive',
          es: 'Anamnesis adictiva',
        },
      },
      medikamentenanamnese: {
        label: {
          de: 'Medikamentenanamnese',
          en: 'Medication history',
          fr: 'Anamnèse médicamenteuse',
          es: 'Anamnesis farmacológica',
        },
      },
      familienanamnese: {
        label: {
          de: 'Familienanamnese',
          en: 'Family history',
          fr: 'Anamnèse familiale',
          es: 'Anamnesis familiar',
        },
      },
      'biografische-anamnese': {
        label: {
          de: 'Biografische Anamnese',
          en: 'Biographical history',
          fr: 'Anamnèse biographique',
          es: 'Anamnesis biográfica',
        },
      },
      sozialanamnese: {
        label: {
          de: 'Sozialanamnese',
          en: 'Social history',
          fr: 'Anamnèse sociale',
          es: 'Anamnesis social',
        },
      },
      'schul-und-berufsanamnese': {
        label: {
          de: 'Schul- und Berufsanamnese',
          en: 'Education and occupational history',
          fr: 'Anamnèse scolaire et professionnelle',
          es: 'Anamnesis escolar y laboral',
        },
      },
      'forensische-anamnese': {
        label: {
          de: 'Forensische Anamnese',
          en: 'Forensic history',
          fr: 'Anamnèse médico-légale',
          es: 'Anamnesis forense',
        },
      },
      traumaanamnese: {
        label: {
          de: 'Traumaanamnese',
          en: 'Trauma history',
          fr: 'Anamnèse traumatique',
          es: 'Anamnesis traumática',
        },
      },
      'suizid-und-selbstgefaehrdungsanamnese': {
        label: {
          de: 'Suizid- und Selbstgefährdungsanamnese',
          en: 'Suicide and self-harm risk',
          fr: "Risque suicidaire et d'automutilation",
          es: 'Riesgo suicida y de autolesión',
        },
      },
      fremdgefaehrdungsanamnese: {
        label: {
          de: 'Fremdgefährdungsanamnese',
          en: 'Risk to others',
          fr: 'Risque pour autrui',
          es: 'Riesgo para terceros',
        },
      },
      'psychopathologischer-befund': {
        label: {
          de: 'Psychopathologischer Befund',
          en: 'Mental State Examination',
          fr: 'Examen psychiatrique',
          es: 'Exploración psicopatológica',
        },
      },
      'somatischer-befund': {
        label: {
          de: 'Somatischer Befund',
          en: 'Somatic findings',
          fr: 'Examen somatique',
          es: 'Hallazgos somáticos',
        },
      },
      'neurologischer-befund': {
        label: {
          de: 'Neurologischer Befund',
          en: 'Neurological exam',
          fr: 'Examen neurologique',
          es: 'Exploración neurológica',
        },
      },
      'diagnostische-einschaetzung': {
        label: {
          de: 'Diagnostische Einschätzung',
          en: 'Diagnostic assessment',
          fr: 'Évaluation diagnostique',
          es: 'Evaluación diagnóstica',
        },
      },
      'therapieplanung-behandlungsplan': {
        label: {
          de: 'Therapieplanung / Behandlungsplan',
          en: 'Treatment plan',
          fr: 'Plan thérapeutique',
          es: 'Plan de tratamiento',
        },
      },
    },
  },
  verlauf: {
    label: {
      de: 'Verlauf',
      en: 'Progress Note',
      fr: 'Évolution',
      es: 'Evolución',
    },
    variants: {
      short: {
        label: {
          de: 'Kurznotiz',
          en: 'Short Note',
          fr: 'Note courte',
          es: 'Nota breve',
        },
      },
      broad: {
        label: {
          de: 'Breiter Verlauf',
          en: 'Detailed Progress',
          fr: 'Évolution détaillée',
          es: 'Evolución detallada',
        },
        railHeading: {
          de: 'Verlauf',
          en: 'Progress Note',
          fr: 'Évolution',
          es: 'Evolución',
        },
      },
    },
    sections: {
      psychopathologie: {
        label: {
          de: 'Psychopathologie',
          en: 'Psychopathology',
          fr: 'Psychopathologie',
          es: 'Psicopatología',
        },
      },
      stationsverhalten: {
        label: {
          de: 'Stationsverhalten',
          en: 'Ward behaviour',
          fr: 'Comportement sur l’unité',
          es: 'Conducta en la unidad',
        },
      },
      risiko: {
        label: {
          de: 'Risiko',
          en: 'Risk',
          fr: 'Risque',
          es: 'Riesgo',
        },
      },
      'compliance-krankheitseinsicht': {
        label: {
          de: 'Compliance / Krankheitseinsicht',
          en: 'Compliance / Insight',
          fr: 'Observance / Insight',
          es: 'Adherencia / Insight',
        },
      },
      'medikation-vertraeglichkeit': {
        label: {
          de: 'Medikation / Verträglichkeit',
          en: 'Medication / Tolerability',
          fr: 'Médication / Tolérance',
          es: 'Medicación / Tolerabilidad',
        },
      },
      'besondere-ereignisse': {
        label: {
          de: 'Besondere Ereignisse',
          en: 'Notable events',
          fr: 'Événements particuliers',
          es: 'Eventos relevantes',
        },
      },
      somatik: {
        label: {
          de: 'Somatik',
          en: 'Somatics',
          fr: 'Somatique',
          es: 'Somática',
        },
      },
      'beurteilung-plan': {
        label: {
          de: 'Beurteilung / Plan',
          en: 'Assessment / Plan',
          fr: 'Évaluation / Plan',
          es: 'Evaluación / Plan',
        },
      },
    },
  },
  psychopath: {
    label: {
      de: 'Psychopathologischer Befund',
      en: 'Mental State Examination',
      fr: 'Examen psychiatrique',
      es: 'Exploración psicopatológica',
    },
    toolLabelLines: {
      de: ['Psycho-', 'pathologie'],
      en: ['Mental State', 'Examination'],
      fr: ['Examen', 'psychiatrique'],
      es: ['Exploración', 'psicopatológica'],
    },
    variants: {
      free: {
        label: {
          de: 'Freitext',
          en: 'Free text',
          fr: 'Texte libre',
          es: 'Texto libre',
        },
      },
      sections: {
        label: {
          de: 'Abschnitte',
          en: 'Sections',
          fr: 'Sections',
          es: 'Secciones',
        },
        railHeading: {
          de: 'Psychopathologie',
          en: 'Mental State Examination',
          fr: 'Sémiologie psychiatrique',
          es: 'Exploración psicopatológica',
        },
      },
      checklist: {
        label: {
          de: 'AMDP-Checkliste',
          en: 'Structured examination',
          fr: 'Sémiologie psychiatrique',
          es: 'Exploración estructurada',
        },
        railHeading: {
          de: 'Psychopathologie',
          en: 'Mental State Examination',
          fr: 'Sémiologie psychiatrique',
          es: 'Exploración psicopatológica',
        },
      },
      isdm: {
        label: {
          de: 'ISDM V.1',
          en: 'ISDM V.1',
          fr: 'ISDM V.1',
          es: 'ISDM V.1',
        },
      },
    },
    sections: {
      bewusstsein: {
        label: {
          de: 'Bewusstsein',
          en: 'Consciousness',
          fr: 'Conscience',
          es: 'Conciencia',
        },
      },
      'aufmerksamkeit-gedaechtnis': {
        label: {
          de: 'Aufmerksamkeit & Gedächtnis',
          en: 'Attention & Memory',
          fr: 'Attention & Mémoire',
          es: 'Atención y memoria',
        },
      },
      'formales-denken': {
        label: {
          de: 'Formales Denken',
          en: 'Formal thought',
          fr: 'Pensée formelle',
          es: 'Pensamiento formal',
        },
      },
      'inhaltliches-denken': {
        label: {
          de: 'Inhaltliches Denken',
          en: 'Thought content',
          fr: 'Contenu de pensée',
          es: 'Contenido del pensamiento',
        },
      },
      wahrnehmung: {
        label: {
          de: 'Wahrnehmung',
          en: 'Perception',
          fr: 'Perception',
          es: 'Percepción',
        },
      },
      'ich-stoerungen': {
        label: {
          de: 'Ich-Störungen',
          en: 'Ego disturbances',
          fr: 'Troubles du moi',
          es: 'Alteraciones del yo',
        },
      },
      affektivitaet: {
        label: {
          de: 'Affektivität',
          en: 'Affectivity',
          fr: 'Affectivité',
          es: 'Afectividad',
        },
      },
      'antrieb-psychomotorik': {
        label: {
          de: 'Antrieb & Psychomotorik',
          en: 'Drive & Psychomotor activity',
          fr: 'Énergie & Psychomotricité',
          es: 'Impulso y psicomotricidad',
        },
      },
      suizidalitaet: {
        label: {
          de: 'Suizidalität & Selbstgefährdung',
          en: 'Suicidality & Self-harm risk',
          fr: 'Suicidalité & Autodestruction',
          es: 'Suicidalidad y autolesión',
        },
      },
      'vegetative-funktionen': {
        label: {
          de: 'Vegetative Funktionen',
          en: 'Vegetative functions',
          fr: 'Fonctions végétatives',
          es: 'Funciones vegetativas',
        },
      },
      sozialverhalten: {
        label: {
          de: 'Sozialverhalten & Kontakt',
          en: 'Social behaviour & contact',
          fr: 'Comportement social & contact',
          es: 'Conducta social y contacto',
        },
      },
    },
  },
  'therapie-verlauf': {
    label: {
      de: 'Arztbrief',
      en: 'Discharge letter',
      fr: 'Lettre de sortie',
      es: 'Informe de alta',
    },
    legacyLabelDe: ['Therapie und Verlauf'],
    railHeading: {
      de: 'Arztbrief',
      en: 'Discharge letter',
      fr: 'Lettre de sortie',
      es: 'Informe de alta',
    },
    legacyRailHeadingDe: ['Therapie und Verlauf'],
    sections: {
      'aufnahmeanlass-verlegungsgrund': {
        label: {
          de: 'Aufnahmeanlass',
          en: 'Admission reason',
          fr: 'Motif d\'admission',
          es: 'Motivo de ingreso',
        },
      },
      'psychopathologischer-ausgangsbefund': {
        label: {
          de: 'Ausgangsbefund',
          en: 'Initial findings',
          fr: 'État initial',
          es: 'Hallazgo inicial',
        },
      },
      'initiales-stationsverhalten': {
        label: {
          de: 'Initiales Stationsverhalten',
          en: 'Initial ward behaviour',
          fr: 'Comportement initial',
          es: 'Conducta inicial en planta',
        },
      },
      'diagnostische-einordnung': {
        label: {
          de: 'Diagnostische Einordnung',
          en: 'Diagnostic assessment',
          fr: 'Évaluation diagnostique',
          es: 'Evaluación diagnóstica',
        },
      },
      'psychopharmakologische-behandlung': {
        label: {
          de: 'Medikation',
          en: 'Medication',
          fr: 'Médication',
          es: 'Medicación',
        },
      },
      'therapeutische-massnahmen': {
        label: {
          de: 'Therapeutische Maßnahmen',
          en: 'Therapeutic interventions',
          fr: 'Mesures thérapeutiques',
          es: 'Medidas terapéuticas',
        },
      },
      'besondere-ereignisse': {
        label: {
          de: 'Besondere Ereignisse',
          en: 'Notable events',
          fr: 'Événements particuliers',
          es: 'Eventos particulares',
        },
      },
      'stabilisierung-besserung': {
        label: {
          de: 'Stabilisierung',
          en: 'Stabilisation',
          fr: 'Stabilisation',
          es: 'Estabilización',
        },
      },
      'entlassungs-rueckverlegungszustand': {
        label: {
          de: 'Entlassungszustand',
          en: 'Discharge status',
          fr: 'État de sortie',
          es: 'Estado al alta',
        },
      },
      'empfehlungen-hinweise': {
        label: {
          de: 'Empfehlungen',
          en: 'Recommendations',
          fr: 'Recommandations',
          es: 'Recomendaciones',
        },
      },
    },
  },
  medikation: {
    label: {
      de: 'Medikation',
      en: 'Medication',
      fr: 'Médication',
      es: 'Medicación',
    },
    railHeading: {
      de: 'Medikation',
      en: 'Medication',
      fr: 'Médication',
      es: 'Medicación',
    },
  },
  therapieplanung: {
    label: {
      de: 'Therapieplanung',
      en: 'Therapy planning',
      fr: 'Planification thérapeutique',
      es: 'Planificación terapéutica',
    },
    railHeading: {
      de: 'Therapieplanung',
      en: 'Therapy planning',
      fr: 'Planification thérapeutique',
      es: 'Planificación terapéutica',
    },
  },
}
