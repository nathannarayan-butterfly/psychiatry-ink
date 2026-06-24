import type { HomepageContent } from './types'

export const homepageContentEs: HomepageContent = {
  meta: {
    title: 'Psychiatry.Ink',
    tagline: 'Espacio de trabajo psiquiátrico seguro',
  },
  nav: {
    links: [
      { id: 'product', label: 'Producto', href: '#product' },
      { id: 'workflow', label: 'Flujo de trabajo', href: '#workflow' },
      { id: 'security', label: 'Seguridad', href: '#security' },
      { id: 'demo', label: 'Demo', href: '#demo' },
      { id: 'pricing', label: 'Precios', href: '#pricing' },
    ],
    openWorkspaceLabel: 'Abrir el espacio de trabajo',
    homeAriaLabel: 'Inicio Psychiatry.Ink',
    mainNavAriaLabel: 'Navegación principal',
  },
  hero: {
    eyebrow: 'Espacio de trabajo clínico para psiquiatría',
    headline: 'Psychiatry.Ink — el espacio de trabajo inteligente para la psiquiatría moderna.',
    subtitle:
      'Psychiatry.Ink reúne en un espacio seguro la documentación, la sesión clínica, la referencia psicofarmacológica, la planificación terapéutica, las herramientas clínicas y el apoyo al razonamiento clínico asistido por IA. La IA acompaña la estructuración, la revisión y el razonamiento — la validación del clínico siempre es necesaria.',
    primaryCta: 'Abrir el espacio de trabajo',
    secondaryCta: 'Ver paciente de demo',
    devModeLink: 'Modo desarrollador — continuar sin iniciar sesión',
    trustLabelsAriaLabel: 'Aspectos de confianza del producto',
    trustLabels: [
      'IA validada por clínicos',
      'Flujos de trabajo sobre evidencia desidentificada',
      'Documentación, terapia y herramientas en un mismo lugar',
      'Diseñado para la psiquiatría',
    ],
    workspaceModules: [
      'Sesión clínica',
      'Base de conocimiento',
      'Evolución',
      'Anamnesis',
      'Terapia',
      'Medicación',
      'Ask Butterfly',
      'Interconsulta',
    ],
  },
  pillars: {
    sectionId: 'product',
    eyebrow: 'Mucho más que documentación',
    title: 'Un espacio pensado para la psiquiatría — no una app de notas genérica',
    lead:
      'Documentación clínica estructurada, sesión clínica colaborativa, referencia psicofarmacológica, planificación terapéutica, herramientas integradas e inteligencia clínica opcional — diseñado para psiquiatras que necesitan precisión, control y revisión en cada paso.',
    cards: [
      {
        id: 'fallbesprechung',
        title: 'Sesión clínica',
        description:
          'Sesión clínica estructurada con colegas: comparta paquetes de caso desidentificados, anote secciones clínicas y use Ask Butterfly como apoyo al razonamiento asistido por IA — todo dentro de un flujo controlado en el que la revisión va primero.',
      },
      {
        id: 'knowledge-base',
        title: 'Base de conocimiento',
        description:
          'Referencia psicofarmacológica con presentaciones específicas por país, perfiles de receptores, comprobación de interacciones y monografías validadas por clínicos — integrada donde se toman las decisiones de prescripción.',
      },
      {
        id: 'documentation',
        title: 'Motor de documentación',
        description:
          'Evolución, anamnesis, psicopatología y secciones estructuradas con plantillas, dictado y edición en línea asistida por IA — siempre bajo control clínico.',
      },
      {
        id: 'treatment',
        title: 'Espacio de tratamiento',
        description:
          'Plan terapéutico, gestión de la medicación, tratamientos previos y seguimiento longitudinal en un único espacio centrado en el caso — sin dispersar la información entre varios sistemas.',
      },
      {
        id: 'tools',
        title: 'Herramientas clínicas',
        description:
          'Correlación laboratorio–medicación, comprobación de combinaciones, apoyo a criterios diagnósticos, importación de documentos y calculadoras especializadas — integradas donde el clínico ya trabaja.',
      },
      {
        id: 'intelligence',
        title: 'Inteligencia clínica',
        description:
          'Perfilado dimensional opcional asistido por IA, hipótesis de mecanismos y capas de revisión estructuradas. Apoya el razonamiento clínico — nunca sustituye el diagnóstico ni la decisión terapéutica.',
      },
    ],
  },
  workflow: {
    sectionId: 'workflow',
    eyebrow: 'Flujo de trabajo',
    title: 'De la captura a la exportación — con revisión en cada paso',
    lead: 'Un flujo clínico cuidado para que el psiquiatra mantenga el control sobre la estructura, la revisión y la decisión.',
    steps: [
      {
        id: 'capture',
        title: 'Capturar',
        description:
          'Dictar, escribir o importar contenido clínico — notas, analíticas, documentos e informes externos llegan directamente al espacio de trabajo.',
      },
      {
        id: 'structure',
        title: 'Estructurar',
        description:
          'Organizar el contenido en secciones psiquiátricas, aplicar plantillas y usar la estructuración asistida por IA con visibilidad completa de las sugerencias.',
      },
      {
        id: 'review',
        title: 'Revisar',
        description:
          'Revisión clínica de las sugerencias de la IA, del apoyo a criterios diagnósticos y de los resultados de inteligencia clínica antes de aceptar nada.',
      },
      {
        id: 'act',
        title: 'Actuar',
        description:
          'Actualizar el plan terapéutico, la medicación, las notas de seguimiento y las decisiones del caso a partir de contenido revisado y validado por el clínico.',
      },
      {
        id: 'export',
        title: 'Exportar / Continuar',
        description:
          'Generar documentos, compartir resúmenes de interconsulta o continuar el caso — con continuidad auditable entre sesiones.',
      },
    ],
  },
  modules: {
    sectionId: 'modules',
    eyebrow: 'Módulos',
    title: 'Un solo espacio. Varios módulos psiquiátricos.',
    lead:
      'Cada módulo comparte el mismo contexto de caso, la misma tipografía y la misma filosofía de revisión — desde la documentación de ingreso hasta la sesión clínica y la referencia psicofarmacológica.',
    cards: [
      {
        id: 'fallbesprechung',
        label: 'A',
        title: 'Sesión clínica',
        description:
          'Sesión clínica colaborativa con paquetes de caso desidentificados, anotaciones por sección y Ask Butterfly como apoyo estructurado al razonamiento clínico.',
      },
      {
        id: 'wissensdatenbank',
        label: 'B',
        title: 'Base de conocimiento',
        description:
          'Base psicofarmacológica — presentaciones, afinidades por receptor, interacciones y monografías validadas para las decisiones de prescripción.',
      },
      {
        id: 'verlauf',
        label: 'C',
        title: 'Evolución',
        description: 'Documentación longitudinal de la evolución con secciones psiquiátricas estructuradas y continuidad entre sesiones.',
      },
      {
        id: 'anamnese',
        label: 'D',
        title: 'Anamnesis',
        description: 'Anamnesis psiquiátrica estructurada, contexto biográfico y documentación de ingreso.',
      },
      {
        id: 'psychopathologie',
        label: 'E',
        title: 'Psicopatología',
        description: 'Exploración psicopatológica sistemática con tipografía clara y plantillas de sección.',
      },
      {
        id: 'diagnostik',
        label: 'F',
        title: 'Diagnóstico y exploraciones',
        description: 'Estudio diagnóstico, hallazgos y documentación vinculada a criterios, con validación clínica.',
      },
      {
        id: 'medikation',
        label: 'G',
        title: 'Medicación',
        description: 'Listas de medicación, comprobación de combinaciones, correlación laboratorio–medicación y notación de dosis en formato clínico.',
      },
      {
        id: 'therapie',
        label: 'H',
        title: 'Terapia',
        description: 'Planificación terapéutica, notas de sesión y seguimiento de tratamientos previos en una vista longitudinal.',
      },
      {
        id: 'labor',
        label: 'I',
        title: 'Laboratorio',
        description: 'Importación de analíticas, gráficos de tendencia y correlación con la medicación y el estado clínico.',
      },
      {
        id: 'vorlagen',
        label: 'J',
        title: 'Plantillas',
        description: 'Plantillas de documento, cartas generadas y flujos documentales clínicos reutilizables.',
      },
      {
        id: 'konsil',
        label: 'K',
        title: 'Interconsulta',
        description: 'Solicitudes de interconsulta, resúmenes de caso compartidos y documentación estructurada de transferencia.',
      },
      {
        id: 'clinical-intelligence',
        label: 'L',
        title: 'Inteligencia clínica',
        description:
          'Capa opcional avanzada: perfilado dimensional, hipótesis de mecanismos y apoyo estructurado al razonamiento clínico. Funcionalidad futura — nunca diagnóstico autónomo.',
      },
    ],
  },
  security: {
    sectionId: 'security',
    eyebrow: 'Seguridad y control',
    title: 'Diseñado para generar confianza clínica',
    lead:
      'La seguridad, la desidentificación y el control del usuario son centrales — no añadidos posteriores. Psychiatry.Ink está diseñado para un uso responsable de la IA en la práctica psiquiátrica.',
    principles: [
      {
        id: 'clinician-control',
        title: 'Control clínico',
        description:
          'Las sugerencias de la IA requieren revisión y aceptación explícitas del clínico. Nada queda registrado en la historia clínica de forma automática sin su intervención.',
      },
      {
        id: 'de-identification',
        title: 'Flujos de desidentificación',
        description:
          'La evidencia y los documentos externos pueden procesarse mediante flujos de desidentificación pensados para reducir el contenido identificable antes de cualquier análisis con IA.',
      },
      {
        id: 'regional-privacy',
        title: 'Opciones regionales de privacidad',
        description:
          'Almacenamiento configurable de identificadores y ajustes de privacidad regional — pensados para alinearse con los requisitos de su consulta y sus normas de tratamiento de datos.',
      },
      {
        id: 'audit-transparency',
        title: 'Auditoría y transparencia',
        description:
          'Las acciones asistidas por IA pueden trazarse y revisarse. El espacio de trabajo está pensado para favorecer una documentación clínica transparente, no una automatización opaca.',
      },
    ],
  },
  tiers: {
    sectionId: 'pricing',
    eyebrow: 'Precios',
    title: 'Planes para cada tamaño de consulta',
    lead: 'El uso individual ya está disponible — empiece con una prueba gratuita.',
    singleUse: {
      name: 'Usuario individual',
      trial: {
        price: 'Gratis',
        detail: '1 mes de prueba gratuita, 500 créditos de IA incluidos',
      },
      thenLabel: 'Después',
      toggle: {
        monthly: 'Mensual',
        yearly: 'Anual',
      },
      yearlyRecommendation: 'Recomendado: ahorre un 20 % con la facturación anual — £239,90/año',
      yearlyConfirmation: 'Facturación anual — 20 % de ahorro aplicado',
      billing: {
        monthly: {
          price: '£24,99',
          period: '/mes',
          credits: '500 créditos de IA incluidos',
          savings: null,
        },
        yearly: {
          price: '£239,90',
          period: '/año',
          credits: '500 créditos de IA incluidos cada mes',
          savings: 'Ahorre £59,98/año — 20 % de descuento frente a £299,88/año',
        },
      },
      description:
        'Para psiquiatras que ejercen en solitario — espacio completo para documentación, herramientas clínicas e inteligencia clínica.',
      features: [
        'Modos de IA Económico, Estándar y Exhaustivo',
        'Créditos adicionales disponibles',
        '1 mes de prueba gratuita',
        '20 % de descuento con facturación anual',
      ],
      aiCreditsLink: {
        label: 'Más información sobre los créditos de IA',
        href: '/ai-credits',
      },
      cta: 'Empezar la prueba gratuita',
    },
    comingSoonNote:
      'Small Praxis (flujos en equipo, casos compartidos) y Enterprise (despliegue para organizaciones) están en desarrollo.',
  },
  demo: {
    sectionId: 'demo',
    eyebrow: 'Demo',
    title: 'Vea el espacio de trabajo en su contexto',
    lead:
      'Capturas de demostración sintéticas — sin datos reales de pacientes. Destacados: inteligencia clínica, referencia psicofarmacológica, sesión clínica, tendencias de laboratorio, comprobación de interacciones y documentación ISDM.',
    panels: [
      {
        id: 'intelligence',
        label: 'Inteligencia clínica',
        title: 'Perfil dimensional y mecanismos',
        description: 'Hipótesis ya revisadas con gráficos de gravedad e indicadores de estado · Anna Demo',
        imageSrc: '/homepage/demo-intelligence.png',
        imageAlt: 'Demo sintética — gráficos dimensionales y de mecanismos de inteligencia clínica.',
      },
      {
        id: 'knowledge-base',
        label: 'Base de conocimiento',
        title: 'Referencia psicofarmacológica',
        description: 'Perfil de receptores y monografía como apoyo a la prescripción',
        imageSrc: '/homepage/demo-knowledge-base.png',
        imageAlt: 'Demo sintética — detalle de un fármaco con perfil de receptores.',
      },
      {
        id: 'discuss',
        label: 'Sesión clínica',
        title: 'Espacio DiscussCase',
        description: 'Sesión de equipo en curso con paquete de caso curado e hilo de chat',
        imageSrc: '/homepage/demo-discuss.png',
        imageAlt: 'Demo sintética — panel de sesión clínica activa con mensajes.',
      },
      {
        id: 'labor',
        label: 'Monitorización de laboratorio',
        title: 'Tendencias de laboratorio acumuladas',
        description: 'Prolactina y marcadores metabólicos con marcas de cambio de medicación',
        imageSrc: '/homepage/demo-labor.png',
        imageAlt: 'Demo sintética — gráfico de tendencia de laboratorio con valores anómalos marcados.',
      },
      {
        id: 'interaction',
        label: 'Comprobación de interacciones',
        title: 'Combinaciones de medicación',
        description: 'Hallazgos de interacciones revisados por la base de conocimiento y la IA para la medicación activa',
        imageSrc: '/homepage/demo-interaction.png',
        imageAlt: 'Demo sintética — matriz de interacciones medicamentosas.',
      },
      {
        id: 'isdm',
        label: 'ISDM',
        title: 'Documentación sistémica',
        description: 'Cartografía fenomenológica y síntesis diagnóstica (panel de análisis ISDM)',
        imageSrc: '/homepage/demo-isdm.png',
        imageAlt: 'Demo sintética — panel de análisis de documentación ISDM.',
      },
    ],
  },
  finalCta: {
    title: '¿Listo para abrir su espacio de trabajo psiquiátrico?',
    subtitle:
      'Empiece hoy mismo con la documentación y las herramientas clínicas. Las funciones asistidas por IA son opcionales — la revisión clínica forma siempre parte del flujo.',
    primaryCta: 'Abrir el espacio de trabajo',
    secondaryCta: 'Ver paciente de demo',
  },
  poweredBy: {
    label: 'Powered with Butterfly Clinical Intelligence System',
  },
  footer: {
    companyName: 'Psychiatry Ink Ltd',
    companyRegistration: 'Sociedad inscrita en Inglaterra y Gales.',
    companyNumber: 'Número de sociedad: 17275704.',
    address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, Reino Unido',
    allRightsReserved: 'Todos los derechos reservados.',
    footerNavAriaLabel: 'Navegación del pie de página',
    links: [
      { id: 'product', label: 'Producto', href: '#product' },
      { id: 'security', label: 'Seguridad', href: '#security' },
      { id: 'pricing', label: 'Precios', href: '#pricing' },
      { id: 'sign-in', label: 'Iniciar sesión', href: '/login' },
    ],
    disclaimer:
      'Psychiatry.Ink es una herramienta de documentación clínica y un espacio de trabajo. No diagnostica pacientes, no toma decisiones terapéuticas autónomas y no sustituye al psiquiatra. Las funciones de IA requieren revisión y validación clínicas. No está destinado a urgencias ni a situaciones de crisis.',
  },
  ui: {
    availableNow: 'Ya disponible',
    billingPeriodAriaLabel: 'Periodo de facturación',
    syntheticDemoBadge: 'Demo sintética',
    enlargeScreenshotTemplate: 'Ampliar la captura: {title}',
    closeScreenshotAriaLabel: 'Cerrar la captura ampliada',
  },
}
