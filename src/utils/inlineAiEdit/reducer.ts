/**
 * Pure state machine for the inline AI edit flow. Kept DOM-free so the
 * transition logic (record → transcribe → edit → preview → accept/reject/rerun)
 * can be unit-tested in isolation. The hook performs the side effects (mic,
 * fetch) and dispatches the resulting actions.
 */

export type InlineEditPhase =
  | 'recording' // capturing the spoken instruction
  | 'transcribing' // STT in flight
  | 'typing' // typed-instruction fallback (mic/STT unavailable or user choice)
  | 'editing' // LLM edit in flight
  | 'preview' // AI proposal shown with Accept/Reject/Rerun
  | 'error'

export interface InlineEditState {
  phase: InlineEditPhase
  /** The instruction (transcribed or typed). */
  instruction: string
  /** The AI's proposed replacement, shown in the before/after preview. */
  proposal: string | null
  /** True when the proposal came from the mock provider (no API key). */
  mock: boolean
  error: string | null
}

export type InlineEditAction =
  | { type: 'START_RECORDING' }
  | { type: 'RECORDING_UNAVAILABLE' }
  | { type: 'STOP_RECORDING' }
  | { type: 'TRANSCRIBED'; text: string }
  | { type: 'TRANSCRIBE_FAILED'; error: string }
  | { type: 'SET_INSTRUCTION'; text: string }
  | { type: 'SUBMIT_TYPED'; instruction: string }
  | { type: 'EDIT_STARTED' }
  | { type: 'EDIT_SUCCEEDED'; editedText: string; mock: boolean }
  | { type: 'EDIT_FAILED'; error: string }
  | { type: 'RERUN_RERECORD' }
  | { type: 'RERUN_REUSE' }
  | { type: 'SWITCH_TO_TYPING' }

export function createInitialState(canRecord: boolean): InlineEditState {
  return {
    phase: canRecord ? 'recording' : 'typing',
    instruction: '',
    proposal: null,
    mock: false,
    error: null,
  }
}

export function inlineEditReducer(
  state: InlineEditState,
  action: InlineEditAction,
): InlineEditState {
  switch (action.type) {
    case 'START_RECORDING':
    case 'RERUN_RERECORD':
      // A fresh recording captures a new instruction — clear any prior one.
      return { ...state, phase: 'recording', instruction: '', proposal: null, error: null }

    case 'RECORDING_UNAVAILABLE':
      return { ...state, phase: 'typing', error: null }

    case 'STOP_RECORDING':
      return { ...state, phase: 'transcribing', error: null }

    case 'TRANSCRIBED': {
      const instruction = action.text.trim()
      // Empty transcription (e.g. mock mode) → fall back to typing.
      if (!instruction) return { ...state, phase: 'typing' }
      return { ...state, instruction, phase: 'editing', error: null }
    }

    case 'TRANSCRIBE_FAILED':
      // Degrade gracefully to a typed instruction rather than dead-ending.
      return { ...state, phase: 'typing', error: action.error }

    case 'SET_INSTRUCTION':
      return { ...state, instruction: action.text }

    case 'SUBMIT_TYPED': {
      const instruction = action.instruction.trim()
      if (!instruction) return state
      return { ...state, instruction, phase: 'editing', error: null }
    }

    case 'SWITCH_TO_TYPING':
      return { ...state, phase: 'typing', error: null }

    case 'EDIT_STARTED':
      return { ...state, phase: 'editing', error: null }

    case 'EDIT_SUCCEEDED':
      return {
        ...state,
        phase: 'preview',
        proposal: action.editedText,
        mock: action.mock,
        error: null,
      }

    case 'EDIT_FAILED':
      return { ...state, phase: 'error', error: action.error }

    case 'RERUN_REUSE':
      // Re-run the AI with the SAME instruction.
      if (!state.instruction.trim()) return { ...state, phase: 'typing' }
      return { ...state, phase: 'editing', proposal: null, error: null }

    default:
      return state
  }
}
