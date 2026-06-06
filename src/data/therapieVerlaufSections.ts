import type { WorkspaceSectionTemplate } from '../types/workspaceSettings'

export const defaultTherapieVerlaufSections: WorkspaceSectionTemplate[] = [
  {
    id: 'aufnahmeanlass-verlegungsgrund',
    label: 'Aufnahmeanlass',
    description:
      'Klinische Notwendigkeit der Aufnahme oder Verlegung — nicht mit Medikation oder Stationsverhalten beginnen.',
    exampleHint:
      'Die stationär-psychiatrische Aufnahme erfolgte aufgrund einer zunehmenden psychischen Dekompensation bei bekannter paranoider Schizophrenie mit Verhaltensauffälligkeiten, Medikamentenverweigerung und deutlich reduzierter Krankheitseinsicht.\n\nAlternativ (JVA): Die Verlegung aus der JVA erfolgte zur weiteren stationär-psychiatrischen Diagnostik und Behandlung bei zunehmender psychischer Dekompensation und im Haftalltag nicht mehr ausreichend führbarem Verhalten.',
  },
  {
    id: 'psychopathologischer-ausgangsbefund',
    label: 'Ausgangsbefund',
    description:
      'Initialer psychopathologischer Zustand als Ausgangsbasis — klinisch präzise, nicht überladen.',
    exampleHint:
      'Bei Aufnahme zeigte sich der Patient bewusstseinsklar und allseits orientiert, im Kontakt jedoch misstrauisch, angespannt und nur eingeschränkt kooperativ. Psychopathologisch bestanden eine formale Denkverlangsamung bzw. teils gedankliche Einengung, paranoide Befürchtungen sowie eine deutlich reduzierte Krankheitseinsicht und Behandlungsmotivation.',
  },
  {
    id: 'initiales-stationsverhalten',
    label: 'Initiales Stationsverhalten',
    description:
      'Verhalten in den ersten Tagen/Wochen: Kooperation, Hygiene, Rückzug, Konflikte, Regelakzeptanz, Reizbarkeit, bgH/Fixierung.',
    exampleHint:
      'Im initialen Stationsverlauf zeigte sich der Patient wechselhaft führbar. Er war zeitweise angespannt, reizbar und nur begrenzt absprachefähig, konnte sich unter engmaschiger pflegerischer und ärztlicher Begleitung jedoch zunehmend besser an die Stationsstruktur anpassen.',
  },
  {
    id: 'diagnostische-einordnung',
    label: 'Diagnostische Einordnung',
    description:
      'Verbindung des klinischen Bildes mit Arbeitsdiagnose und therapeutischem Vorgehen.',
    exampleHint:
      'Diagnostisch wurde der Verlauf als psychotische Dekompensation bei bekannter paranoider Schizophrenie eingeordnet. Vor diesem Hintergrund erfolgte eine engmaschige psychiatrische Verlaufskontrolle mit schrittweiser Anpassung der psychopharmakologischen Behandlung.',
  },
  {
    id: 'psychopharmakologische-behandlung',
    label: 'Medikation',
    description:
      'Medikation chronologisch mit Begründung für Änderungen, Verträglichkeit, Compliance und Depot.',
    exampleHint:
      'Die psychopharmakologische Behandlung wurde im Verlauf mehrfach angepasst. Initial erfolgte eine antipsychotische Behandlung mit … Bei unzureichender Wirkung wurde die Medikation um … ergänzt. Unter der Behandlung zeigte sich eine zunehmende Reduktion der psychotischen Symptomatik.\n\nAufgrund vermehrter Speichelsekretion wurde Pipamperon im Verlauf reduziert. Eine Depotbehandlung wurde aufgrund der bekannten Complianceproblematik empfohlen; der Patient zeigte sich diesbezüglich jedoch nur eingeschränkt einverstanden.',
  },
  {
    id: 'therapeutische-massnahmen',
    label: 'Therapeutische Maßnahmen',
    description:
      'Multimodale Behandlung: Gespräche, Psychoedukation, Ergo-, Bewegungs- und Milieutherapie, ADL/Hygiene.',
    exampleHint:
      'Neben der medikamentösen Behandlung erfolgten regelmäßige ärztliche und pflegerische Gespräche, psychoedukative Interventionen sowie eine Einbindung in die stationsinternen therapeutischen Angebote. Unter zunehmender Stabilisierung konnte der Patient schrittweise besser an ergotherapeutischen und bewegungstherapeutischen Angeboten teilnehmen.\n\nIm Bereich der Körperpflege und Alltagsstrukturierung bestand weiterhin Unterstützungsbedarf, wobei sich im Verlauf unter Anleitung eine gewisse Besserung zeigte.',
  },
  {
    id: 'besondere-ereignisse',
    label: 'Besondere Ereignisse',
    description:
      'Fixierung, bgH, Zwangsmedikation, Ess-/Trinkverweigerung, Konsile, Aggression, Suizidalität — sachlich und datiert.',
    exampleHint:
      'Im Verlauf kam es zu einzelnen besonderen Ereignissen mit vorübergehend erhöhter Anspannung und eingeschränkter Steuerungsfähigkeit. Aufgrund akuter Eigen- bzw. Fremdgefährdung waren zeitweise besondere Sicherungsmaßnahmen erforderlich. Nach Abklingen der akuten Situation konnten diese jeweils beendet werden.\n\nAm … kam es nach verbaler Eskalation und fehlender Absprachefähigkeit zu einer kurzzeitigen Fixierung. Nach klinischer Beruhigung konnte die Maßnahme beendet werden.',
  },
  {
    id: 'stabilisierung-besserung',
    label: 'Stabilisierung',
    description:
      'Kontrast zum Aufnahmezustand: Besserung, Kooperation, Restsymptomatik — ohne übertriebene Remissionsdarstellung.',
    exampleHint:
      'Im weiteren Verlauf zeigte sich unter der etablierten Behandlung eine zunehmende psychische Stabilisierung. Die zuvor ausgeprägte Anspannung und Reizbarkeit nahmen ab, der Patient war im Kontakt besser erreichbar und zeigte sich zunehmend kooperativ. Psychotische Inhalte traten deutlich in den Hintergrund.\n\nWeiterhin bestanden eine eingeschränkte Krankheitseinsicht, eine reduzierte Belastbarkeit sowie residuale negative Symptome mit Antriebsminderung und sozialem Rückzug.',
  },
  {
    id: 'entlassungs-rueckverlegungszustand',
    label: 'Entlassungszustand',
    description:
      'Zustand bei Entlassung oder Rückverlegung — psychisch, somatisch und bezüglich Gefährdung.',
    exampleHint:
      'Die Rückverlegung in die JVA erfolgte in ausreichend stabilem psychischen und somatischen Zustand. Zum Entlassungszeitpunkt zeigte sich der Patient bewusstseinsklar, allseits orientiert, im Kontakt ausreichend kooperativ und ohne Hinweise auf eine akute Eigen- oder Fremdgefährdung.\n\nBei weiterhin bestehender Grunderkrankung und eingeschränkter Krankheitseinsicht wird eine engmaschige psychiatrische Weiterbehandlung empfohlen.',
  },
  {
    id: 'empfehlungen-hinweise',
    label: 'Empfehlungen',
    description:
      'Fortführungsplan: Medikation, Kontrollen, überwachte Einnahme — zurückhaltend formuliert.',
    exampleHint:
      'Wir bitten um Fortführung der etablierten Medikation sowie um regelmäßige psychiatrische Verlaufskontrollen. Empfohlen werden zudem regelmäßige Labor- und EKG-Kontrollen entsprechend der aktuellen Medikation. Eine überwachte Medikamenteneinnahme erscheint aufgrund der bekannten eingeschränkten Krankheitseinsicht und Complianceproblematik weiterhin indiziert.',
  },
]

export function cloneTherapieVerlaufSections(): WorkspaceSectionTemplate[] {
  return defaultTherapieVerlaufSections.map((section) => ({
    ...section,
    checklistItems: section.checklistItems?.map((item) => ({ ...item })),
  }))
}

const LEGACY_THERAPIE_VERLAUF_IDS = new Set([
  'therapieziel',
  'massnahmen',
  'verlauf',
  'prognose',
])

export function isLegacyTherapieVerlaufSections(
  sections: WorkspaceSectionTemplate[],
): boolean {
  if (sections.length === 0) return false
  const ids = new Set(sections.map((section) => section.id))
  const hasLegacy = [...LEGACY_THERAPIE_VERLAUF_IDS].some((id) => ids.has(id))
  return hasLegacy && !ids.has('aufnahmeanlass-verlegungsgrund')
}
