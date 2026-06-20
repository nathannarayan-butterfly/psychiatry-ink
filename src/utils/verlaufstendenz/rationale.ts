import type {
  VerlaufstendenzDomain,
  VerlaufstendenzDomainResult,
  VerlaufstendenzTrend,
} from '../../types/verlaufstendenz'

const DOMAIN_PHRASE: Record<VerlaufstendenzDomain, string> = {
  safety_risk: 'Sicherheit/Risiko',
  core_psychopathology: 'Kernpsychopathologie',
  ward_behavior: 'Stationverhalten',
  sleep_drive_affect: 'Schlaf/Antrieb/Affekt',
  insight_compliance: 'Einsicht/Compliance',
  somatic_side_effects: 'Somatischer Status/Nebenwirkungen',
  social_functioning: 'Soziales/Funktionieren',
}

const DIRECTION_PHRASE: Record<VerlaufstendenzDomainResult['direction'], string | null> = {
  deutlich_gebessert: 'deutlich gebessert',
  leicht_gebessert: 'leicht gebessert',
  stabil: 'stabil',
  leicht_verschlechtert: 'leicht verschlechtert',
  deutlich_verschlechtert: 'deutlich verschlechtert',
  gemischt: 'wechselhaft',
  nicht_beurteilbar: null,
}

const TREND_OPENING: Record<VerlaufstendenzTrend, string> = {
  deutlich_gebessert: 'Insgesamt deutliche Besserung',
  leicht_gebessert: 'Insgesamt leichte Besserung',
  stabil: 'Weitgehend stabiler Verlauf',
  schwankend: 'Wechselhafter Verlauf mit gegenläufigen Domänen',
  leicht_verschlechtert: 'Insgesamt leichte Verschlechterung',
  deutlich_verschlechtert: 'Insgesamt deutliche Verschlechterung',
  kritisch_handlungsrelevant: 'Akute sicherheitsrelevante Verschlechterung',
  nicht_beurteilbar: 'Verlaufstendenz derzeit nicht beurteilbar',
}

/** Deterministic German rationale from domain assessments — editable by clinician in UI. */
export function buildVerlaufstendenzRationale(
  trend: VerlaufstendenzTrend,
  domains: VerlaufstendenzDomainResult[],
): string {
  const opening = TREND_OPENING[trend]
  const assessable = domains.filter((d) => d.direction !== 'nicht_beurteilbar')

  if (trend === 'nicht_beurteilbar' || assessable.length === 0) {
    return `${opening} — unzureichende dokumentierte Verlaufsdaten im gewählten Fenster.`
  }

  if (trend === 'kritisch_handlungsrelevant') {
    const safety = assessable.find((d) => d.domain === 'safety_risk')
    const detail = safety?.evidence[0]?.snippet
    return detail
      ? `${opening}; ${detail}.`
      : `${opening}; prioritäre klinische Beurteilung empfohlen.`
  }

  const highlights = assessable
    .slice(0, 3)
    .map((d) => {
      const phrase = DIRECTION_PHRASE[d.direction]
      if (!phrase) return null
      return `${DOMAIN_PHRASE[d.domain]} ${phrase}`
    })
    .filter(Boolean)

  if (highlights.length === 0) {
    return `${opening} auf Basis dokumentierter Verlaufsinformationen.`
  }

  return `${opening}; ${highlights.join(', ')}.`
}
