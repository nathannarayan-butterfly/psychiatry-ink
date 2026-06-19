/**
 * Helpers for building `ClinicalImportCandidate`s with stable ids and sensible
 * confidence defaults. Parser adapters use these so candidate construction stays
 * consistent and the discriminated union is always well-formed.
 */
import type {
  CandidateForModule,
  CandidateModule,
  ImportClarification,
  ImportConfidence,
  ImportSourceLocation,
} from '../../schemas/documentImport/envelope'

let counter = 0

/**
 * Deterministic-ish unique id. Uses `crypto.randomUUID` when available, otherwise
 * a counter+timestamp fallback (keeps tests in non-crypto environments working).
 */
export function candidateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  counter += 1
  return `cand-${Date.now()}-${counter}`
}

interface MakeCandidateArgs<M extends CandidateModule> {
  module: M
  data: CandidateForModule<M>['data']
  sourceLocation?: ImportSourceLocation
  confidence?: ImportConfidence
  rawText?: string
  aiSuggested?: boolean
  clarifications?: ImportClarification[]
}

export function makeCandidate<M extends CandidateModule>(
  args: MakeCandidateArgs<M>,
): CandidateForModule<M> {
  return {
    id: candidateId(),
    module: args.module,
    confidence: args.confidence ?? 'medium',
    sourceLocation: args.sourceLocation ?? {},
    rawText: args.rawText,
    aiSuggested: args.aiSuggested ?? false,
    clarifications: args.clarifications && args.clarifications.length > 0 ? args.clarifications : undefined,
    data: args.data,
  } as CandidateForModule<M>
}
