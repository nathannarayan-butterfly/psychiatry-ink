import type { HomepageContent } from './types'

export const homepageContentFr: HomepageContent = {
  meta: {
    title: 'Psychiatry.Ink',
    tagline: 'Espace de travail psychiatrique sécurisé',
  },
  nav: {
    links: [
      { id: 'product', label: 'Produit', href: '#product' },
      { id: 'workflow', label: 'Workflow', href: '#workflow' },
      { id: 'security', label: 'Sécurité', href: '#security' },
      { id: 'demo', label: 'Démo', href: '#demo' },
      { id: 'pricing', label: 'Tarifs', href: '#pricing' },
    ],
    openWorkspaceLabel: 'Ouvrir l\'espace de travail',
    homeAriaLabel: 'Accueil Psychiatry.Ink',
    mainNavAriaLabel: 'Navigation principale',
  },
  hero: {
    eyebrow: 'Espace de travail clinique pour la psychiatrie',
    headline: 'Psychiatry.Ink — l\'espace de travail intelligent de la psychiatrie moderne.',
    heroShotSrc: '/homepage/en/demo-overview.png',
    subtitle:
      'Psychiatry.Ink réunit dans un espace sécurisé la documentation, la discussion de cas, la référence psychopharmacologique, la planification thérapeutique, les outils cliniques et l\'aide au raisonnement clinique assistée par IA. L\'IA accompagne la structuration, la relecture et le raisonnement — la validation par le clinicien reste toujours requise.',
    primaryCta: 'Ouvrir l\'espace de travail',
    secondaryCta: 'Voir la patiente démo',
    devModeLink: 'Mode développeur — continuer sans connexion',
    trustLabelsAriaLabel: 'Points forts de confiance du produit',
    trustLabels: [
      'IA validée par des cliniciens',
      'Workflows sur données dé-identifiées',
      'Documentation, thérapie et outils réunis',
      'Conçu pour la psychiatrie',
    ],
    workspaceModules: [
      'Discussion de cas',
      'Base de connaissances',
      'Évolution',
      'Anamnèse',
      'Thérapie',
      'Médication',
      'Ask Butterfly',
      'Consultation',
    ],
  },
  pillars: {
    sectionId: 'product',
    eyebrow: 'Bien plus qu\'un outil de documentation',
    title: 'Un espace pensé pour la psychiatrie — pas une simple application de notes',
    lead:
      'Documentation clinique structurée, discussion de cas collaborative, référence psychopharmacologique, planification thérapeutique, outils intégrés et intelligence clinique optionnelle — pour les psychiatres qui exigent précision, contrôle et relecture à chaque étape.',
    cards: [
      {
        id: 'fallbesprechung',
        title: 'Discussion de cas',
        description:
          'Discussion de cas structurée entre confrères : partage de dossiers dé-identifiés, annotation des sections cliniques et raisonnement assisté par IA via Ask Butterfly — au sein d\'un workflow contrôlé qui place la relecture en premier.',
      },
      {
        id: 'knowledge-base',
        title: 'Base de connaissances',
        description:
          'Référence psychopharmacologique avec présentations par pays, profils de récepteurs, vérification des interactions et monographies validées par des cliniciens — intégrée là où se prennent les décisions de prescription.',
      },
      {
        id: 'documentation',
        title: 'Moteur de documentation',
        description:
          'Évolution, anamnèse, psychopathologie et sections structurées avec modèles, dictée et édition assistée par IA en ligne — toujours sous contrôle clinique.',
      },
      {
        id: 'treatment',
        title: 'Espace de prise en charge',
        description:
          'Plan thérapeutique, gestion médicamenteuse, antécédents thérapeutiques et suivi longitudinal réunis dans un espace centré sur le cas — sans dispersion entre plusieurs systèmes.',
      },
      {
        id: 'tools',
        title: 'Outils cliniques',
        description:
          'Corrélation biologie–médication, vérification des associations médicamenteuses, aide aux critères diagnostiques, import de documents et calculateurs spécialisés — intégrés là où vous travaillez déjà.',
      },
      {
        id: 'intelligence',
        title: 'Intelligence clinique',
        description:
          'Profilage dimensionnel optionnel assisté par IA, hypothèses mécanistiques et couches de relecture structurées. Soutient le raisonnement clinique — jamais de diagnostic ni de décision thérapeutique autonome.',
      },
    ],
  },
  workflow: {
    sectionId: 'workflow',
    eyebrow: 'Workflow',
    title: 'De la saisie à l\'export — avec relecture à chaque étape',
    lead: 'Un workflow clinique pensé pour que le psychiatre garde la main sur la structure, la relecture et la décision.',
    steps: [
      {
        id: 'capture',
        title: 'Saisir',
        description:
          'Dicter, saisir ou importer du contenu clinique — notes, biologie, documents et comptes rendus externes arrivent directement dans l\'espace de travail.',
      },
      {
        id: 'structure',
        title: 'Structurer',
        description:
          'Organiser le contenu en sections psychiatriques, appliquer des modèles et utiliser la structuration assistée par IA avec une visibilité complète sur les suggestions.',
      },
      {
        id: 'review',
        title: 'Relire',
        description:
          'Relecture clinique des suggestions IA, de l\'aide aux critères diagnostiques et des résultats d\'intelligence clinique avant toute validation.',
      },
      {
        id: 'act',
        title: 'Agir',
        description:
          'Mettre à jour les plans thérapeutiques, la médication, les notes de suivi et les décisions de cas à partir de contenus relus et validés par le clinicien.',
      },
      {
        id: 'export',
        title: 'Exporter / Poursuivre',
        description:
          'Générer des documents, partager des synthèses de consultation ou poursuivre le cas — avec une continuité auditable d\'une session à l\'autre.',
      },
    ],
  },
  modules: {
    sectionId: 'modules',
    eyebrow: 'Modules',
    title: 'Un seul espace. Plusieurs modules psychiatriques.',
    lead:
      'Chaque module partage le même contexte de cas, la même typographie et la même philosophie de relecture — de la documentation d\'admission à la discussion de cas et à la référence psychopharmacologique.',
    cards: [
      {
        id: 'fallbesprechung',
        label: 'A',
        title: 'Discussion de cas',
        description:
          'Discussion collaborative avec dossiers dé-identifiés, annotations de sections et Ask Butterfly pour un soutien structuré au raisonnement clinique.',
      },
      {
        id: 'wissensdatenbank',
        label: 'B',
        title: 'Base de connaissances',
        description:
          'Base psychopharmacologique — présentations, affinités aux récepteurs, interactions et monographies vérifiées pour les décisions de prescription.',
      },
      {
        id: 'verlauf',
        label: 'C',
        title: 'Évolution',
        description: 'Documentation longitudinale de l\'évolution avec sections psychiatriques structurées et continuité d\'une séance à l\'autre.',
      },
      {
        id: 'anamnese',
        label: 'D',
        title: 'Anamnèse',
        description: 'Anamnèse psychiatrique structurée, contexte biographique et documentation d\'admission.',
      },
      {
        id: 'psychopathologie',
        label: 'E',
        title: 'Psychopathologie',
        description: 'Examen psychopathologique systématique avec une typographie claire et des modèles de sections.',
      },
      {
        id: 'diagnostik',
        label: 'F',
        title: 'Diagnostic & examens',
        description: 'Bilan diagnostique, résultats d\'examens et documentation reliée aux critères, avec validation clinique.',
      },
      {
        id: 'medikation',
        label: 'G',
        title: 'Médication',
        description: 'Listes médicamenteuses, vérification des associations, corrélation biologie–médication et notation des doses au format clinique.',
      },
      {
        id: 'therapie',
        label: 'H',
        title: 'Thérapie',
        description: 'Planification thérapeutique, notes de séance et suivi des thérapies antérieures, dans une vue longitudinale.',
      },
      {
        id: 'labor',
        label: 'I',
        title: 'Laboratoire',
        description: 'Import des résultats biologiques, courbes de tendance et corrélation avec la médication et l\'état clinique.',
      },
      {
        id: 'vorlagen',
        label: 'J',
        title: 'Modèles',
        description: 'Modèles de documents, courriers générés et workflows documentaires cliniques réutilisables.',
      },
      {
        id: 'konsil',
        label: 'K',
        title: 'Consultation',
        description: 'Demandes de consultation, synthèses de cas partagées et documentation de transmission structurée.',
      },
      {
        id: 'clinical-intelligence',
        label: 'L',
        title: 'Intelligence clinique',
        description:
          'Couche optionnelle avancée : profilage dimensionnel, hypothèses mécanistiques et soutien structuré au raisonnement clinique. Fonction à venir — pas de diagnostic autonome.',
      },
    ],
  },
  security: {
    sectionId: 'security',
    eyebrow: 'Sécurité & contrôle',
    title: 'Pensé pour la confiance clinique',
    lead:
      'Sécurité, dé-identification et contrôle utilisateur sont au cœur du produit — pas des ajouts a posteriori. Psychiatry.Ink est conçu pour un usage responsable de l\'IA en psychiatrie.',
    principles: [
      {
        id: 'clinician-control',
        title: 'Contrôle clinique',
        description:
          'Les suggestions de l\'IA exigent une relecture et une validation explicites par le clinicien. Rien n\'est inscrit automatiquement au dossier sans votre intervention.',
      },
      {
        id: 'de-identification',
        title: 'Workflows de dé-identification',
        description:
          'Les preuves cliniques et documents externes peuvent être traités via des workflows de dé-identification, conçus pour réduire le contenu identifiant avant toute analyse assistée par IA.',
      },
      {
        id: 'regional-privacy',
        title: 'Options de confidentialité régionales',
        description:
          'Stockage des identifiants paramétrable et réglages de confidentialité régionaux — pour s\'aligner sur vos exigences de pratique et vos règles de traitement des données.',
      },
      {
        id: 'audit-transparency',
        title: 'Audit & transparence',
        description:
          'Les actions assistées par IA peuvent être tracées et relues. L\'espace de travail est conçu pour favoriser une documentation clinique transparente plutôt qu\'une automatisation opaque.',
      },
    ],
  },
  tiers: {
    sectionId: 'pricing',
    eyebrow: 'Tarifs',
    title: 'Des offres pour toutes les tailles de pratique',
    lead: 'L\'usage individuel est disponible — commencez par un essai gratuit.',
    singleUse: {
      name: 'Utilisateur individuel',
      trial: {
        price: 'Gratuit',
        detail: '1 mois d\'essai gratuit, 500 crédits IA inclus',
      },
      thenLabel: 'Ensuite',
      toggle: {
        monthly: 'Mensuel',
        yearly: 'Annuel',
      },
      yearlyRecommendation: 'Recommandé : économisez 20 % avec l\'abonnement annuel — £239,90/an',
      yearlyConfirmation: 'Abonnement annuel — 20 % d\'économie appliqués',
      billing: {
        monthly: {
          price: '£24,99',
          period: '/mois',
          credits: '500 crédits IA inclus',
          savings: null,
        },
        yearly: {
          price: '£239,90',
          period: '/an',
          credits: '500 crédits IA inclus chaque mois',
          savings: 'Économisez £59,98/an — 20 % de réduction par rapport à £299,88/an',
        },
      },
      description:
        'Pour le psychiatre exerçant seul — espace complet pour la documentation, les outils cliniques et l\'intelligence clinique.',
      features: [
        'Modes IA Économique, Standard et Approfondi',
        'Crédits supplémentaires disponibles',
        '1 mois d\'essai gratuit',
        '20 % de réduction avec l\'abonnement annuel',
      ],
      aiCreditsLink: {
        label: 'En savoir plus sur les crédits IA',
        href: '/ai-credits',
      },
      cta: 'Commencer l\'essai gratuit',
    },
    comingSoonNote:
      'Small Praxis (workflows d\'équipe, cas partagés) et Enterprise (déploiement organisationnel) sont en cours de développement.',
  },
  demo: {
    sectionId: 'demo',
    eyebrow: 'Démo',
    title: 'Voir l\'espace de travail en situation',
    lead:
      'Captures d\'écran de démonstration synthétiques — aucune donnée patient réelle. Au programme : intelligence clinique, référence psychopharmacologique, discussion de cas, courbes biologiques, vérification des interactions et documentation ISDM.',
    panels: [
      {
        id: 'intelligence',
        label: 'Intelligence clinique',
        title: 'Profil dimensionnel & mécanismes',
        description: 'Hypothèses déjà relues, courbes de sévérité et badges de statut · Nikolaos Demo',
        imageSrc: '/homepage/en/demo-intelligence.png',
        imageAlt: 'Démo synthétique — intelligence clinique : graphiques dimensionnels et de mécanismes.',
      },
      {
        id: 'knowledge-base',
        label: 'Base de connaissances',
        title: 'Référence psychopharmacologique',
        description: 'Profil de récepteurs et monographie pour appuyer la prescription',
        imageSrc: '/homepage/en/demo-knowledge-base.png',
        imageAlt: 'Démo synthétique — détail d\'un médicament avec profil de récepteurs.',
      },
      {
        id: 'discuss',
        label: 'Discussion de cas',
        title: 'Espace DiscussCase',
        description: 'Discussion d\'équipe en cours, dossier curaté et fil de discussion',
        imageSrc: '/homepage/en/demo-discuss.png',
        imageAlt: 'Démo synthétique — panneau de discussion de cas en cours, avec messages.',
      },
      {
        id: 'labor',
        label: 'Suivi biologique',
        title: 'Courbes biologiques cumulées',
        description: 'Prolactine et marqueurs métaboliques avec repères de changement médicamenteux',
        imageSrc: '/homepage/en/demo-labor.png',
        imageAlt: 'Démo synthétique — courbe de tendance biologique avec valeurs anormales.',
      },
      {
        id: 'interaction',
        label: 'Interactions médicamenteuses',
        title: 'Associations médicamenteuses',
        description: 'Résultats d\'interactions issus de la base de connaissances et de l\'IA pour la médication active',
        imageSrc: '/homepage/en/demo-interaction.png',
        imageAlt: 'Démo synthétique — matrice d\'interactions médicamenteuses.',
      },
      {
        id: 'isdm',
        label: 'ISDM',
        title: 'Documentation systémique',
        description: 'Cartographie phénoménologique et synthèse diagnostique (panneau d\'analyse ISDM)',
        imageSrc: '/homepage/en/demo-isdm.png',
        imageAlt: 'Démo synthétique — panneau d\'analyse ISDM.',
      },
    ],
  },
  finalCta: {
    title: 'Prêt à ouvrir votre espace de travail psychiatrique ?',
    subtitle:
      'Commencez dès aujourd\'hui avec la documentation et les outils cliniques. Les fonctions assistées par IA sont optionnelles — la relecture clinique fait toujours partie du workflow.',
    primaryCta: 'Ouvrir l\'espace de travail',
    secondaryCta: 'Voir la patiente démo',
  },
  poweredBy: {
    label: 'Powered with Butterfly Clinical Intelligence System',
  },
  footer: {
    companyName: 'Psychiatry Ink Ltd',
    companyRegistration: 'Société immatriculée en Angleterre et au Pays de Galles.',
    companyNumber: 'Numéro de société : 17275704.',
    address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, Royaume-Uni',
    allRightsReserved: 'Tous droits réservés.',
    footerNavAriaLabel: 'Navigation du pied de page',
    links: [
      { id: 'product', label: 'Produit', href: '#product' },
      { id: 'security', label: 'Sécurité', href: '#security' },
      { id: 'pricing', label: 'Tarifs', href: '#pricing' },
      { id: 'sign-in', label: 'Connexion', href: '/login' },
    ],
    disclaimer:
      'Psychiatry.Ink est un outil de documentation clinique et un espace de travail. Il ne pose pas de diagnostic, ne prend pas de décisions thérapeutiques autonomes et ne remplace pas le psychiatre. Les fonctionnalités IA exigent une relecture et une validation cliniques. Non destiné à un usage en situation d\'urgence ou de crise.',
  },
  ui: {
    availableNow: 'Disponible',
    billingPeriodAriaLabel: 'Période de facturation',
    syntheticDemoBadge: 'Démo synthétique',
    enlargeScreenshotTemplate: 'Agrandir la capture : {title}',
    closeScreenshotAriaLabel: 'Fermer la capture agrandie',
  },
}
