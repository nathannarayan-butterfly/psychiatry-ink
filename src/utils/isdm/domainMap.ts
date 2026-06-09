import type { IsdmPhenomenologyDomain } from '../../types/isdm'

/** Psychopath checklist section ids → ISDM phenomenology domains. */
export const PSYCHOPATH_SECTION_DOMAIN_MAP: Record<string, IsdmPhenomenologyDomain[]> = {
  bewusstsein: ['consciousness_orientation'],
  'aufmerksamkeit-gedaechtnis': ['attention_concentration', 'memory_cognition'],
  'formales-denken': ['formal_thought_disorder'],
  'inhaltliches-denken': ['thought_content', 'delusions_overvalued_ideas'],
  wahrnehmung: ['perception_hallucinations'],
  'ich-stoerungen': ['self_experience_ego_disturbance'],
  affektivitaet: ['mood_affect'],
  'antrieb-psychomotorik': ['drive_psychomotor_activity'],
  suizidalitaet: ['risk_self'],
  'vegetative-funktionen': ['sleep_appetite_vegetative'],
  sozialverhalten: ['personality_interpersonal_style', 'appearance_behavior'],
}

/** Keyword patterns (DE/EN/FR/ES fragments) → domain. Original mapping layer only. */
export const DOMAIN_KEYWORD_PATTERNS: Record<IsdmPhenomenologyDomain, RegExp[]> = {
  appearance_behavior: [
    /hygiene\w*|selbstfürsorge|neglect|vernachlässig/i,
    /sozial\s*abgezogen|withdrawn|isolation/i,
    /aggressiv|agitation|unruhig|restless/i,
  ],
  speech_language: [/sprach|speech|paraphas|mutism|press\s*of\s*speech|logorrh/i],
  consciousness_orientation: [
    /orientier\w*|desorient|confus|somnol|vigil|bewusstsein|conscious/i,
    /klar\s*wach|alert/i,
  ],
  attention_concentration: [/aufmerksam|konzentr|attention|distract|ablenk/i],
  memory_cognition: [/gedächtn|memory|cognit|vergess|confab|demen/i],
  mood_affect: [
    /depress|gedrückt|dysphor|euphor|manic|manisch|affekt|affect|stimmung|mood|tearful|labil/i,
  ],
  drive_psychomotor_activity: [/antrieb|psychomotor|retard|agitat|motor|drive|energy/i],
  formal_thought_disorder: [/gedankenflucht|tangential|circumstant|blocking|formal\s*thought|grübeln/i],
  thought_content: [/suizid\s*gedank|death\s*wish|nihilistic|guilt|hopeless|worthless/i],
  delusions_overvalued_ideas: [/wahn|delusion|paranoi|überwach|persecut|grandiose|refer/i],
  perception_hallucinations: [/halluzin|stimmen|voices|visual\s*halluc|illusion/i],
  self_experience_ego_disturbance: [/depersonal|dereal|ego\s*disturb|ich\s*stör|passivity/i],
  anxiety_panic_phobic_symptoms: [/angst|anxiety|panic|phob|agoraph|social\s*anxiety/i],
  obsessions_compulsions: [/zwang|obsess|compuls|ritual|intrusive\s*thought/i],
  trauma_intrusions_dissociation: [/trauma|flashback|intrusion|dissoci|ptsd|nightmare/i],
  somatic_preoccupation: [/somato|hypochond|körper\s*besch|pain\s*focus/i],
  sleep_appetite_vegetative: [/schlaf|insomn|hypersomn|appetit|weight\s*change|libido/i],
  substance_related_features: [/alkohol|alcohol|substanz|substance|cannabis|opioid|withdrawal|intox/i],
  personality_interpersonal_style: [/borderline|narziss|antisocial|interpersonal|attachment/i],
  insight_judgment: [/einsicht|insight|judgment|krankheitseinsicht|compliance\s*with\s*care/i],
  risk_self: [/suizid|self\s*harm|selbstgefährd|suicidal|self\s*injur/i],
  risk_others: [/fremdgefährd|homicid|violence\s*toward|aggression\s*toward/i],
  functional_impairment: [/funktion|impair|alltag|arbeit|occupation|adl|disability/i],
}

/** Imprint metadata fields → domain hints. */
export const IMPRINT_FIELD_DOMAIN_MAP: Record<string, IsdmPhenomenologyDomain> = {
  affect: 'mood_affect',
  drive: 'drive_psychomotor_activity',
  thoughtForm: 'formal_thought_disorder',
  thoughtContent: 'thought_content',
  perception: 'perception_hallucinations',
  selfDisturbance: 'self_experience_ego_disturbance',
  cognition: 'memory_cognition',
  sleep: 'sleep_appetite_vegetative',
  cooperation: 'personality_interpersonal_style',
  insight: 'insight_judgment',
  riskSelf: 'risk_self',
  riskOthers: 'risk_others',
  aggression: 'risk_others',
  suicidality: 'risk_self',
  functioning: 'functional_impairment',
  socialInteraction: 'personality_interpersonal_style',
  hygieneSelfCare: 'appearance_behavior',
}

export function matchDomainsInText(text: string): IsdmPhenomenologyDomain[] {
  const hits = new Set<IsdmPhenomenologyDomain>()
  for (const [domain, patterns] of Object.entries(DOMAIN_KEYWORD_PATTERNS) as Array<
    [IsdmPhenomenologyDomain, RegExp[]]
  >) {
    if (patterns.some((pattern) => pattern.test(text))) {
      hits.add(domain)
    }
  }
  return [...hits]
}
