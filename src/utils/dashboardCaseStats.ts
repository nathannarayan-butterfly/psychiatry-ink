import { loadDiagnosen } from './diagnosenArchive'
import { loadDokumente } from './dokumenteArchive'
import { loadBefunde } from './laborArchive'
import { loadTherapieEintraege } from './therapieArchive'
import { loadVerlaufFeed } from './verlaufFeed'

export interface CaseClinicalStats {
  diagnoses: number
  documents: number
  verlauf: number
  labor: number
  therapie: number
}

export function getCaseClinicalStats(caseId: string): CaseClinicalStats {
  return {
    diagnoses: loadDiagnosen(caseId).length,
    documents: loadDokumente(caseId).length,
    verlauf: loadVerlaufFeed(caseId).length,
    labor: loadBefunde(caseId).length,
    therapie: loadTherapieEintraege(caseId).length,
  }
}
