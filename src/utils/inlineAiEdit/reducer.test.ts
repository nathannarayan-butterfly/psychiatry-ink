import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  inlineEditReducer,
  type InlineEditState,
} from './reducer'

describe('inlineEditReducer', () => {
  it('starts in recording when capture is available, typing otherwise', () => {
    expect(createInitialState(true).phase).toBe('recording')
    expect(createInitialState(false).phase).toBe('typing')
  })

  it('walks record → transcribe → edit → preview', () => {
    let state = createInitialState(true)
    state = inlineEditReducer(state, { type: 'STOP_RECORDING' })
    expect(state.phase).toBe('transcribing')

    state = inlineEditReducer(state, { type: 'TRANSCRIBED', text: '  Diesen Satz umformulieren  ' })
    expect(state.phase).toBe('editing')
    expect(state.instruction).toBe('Diesen Satz umformulieren')

    state = inlineEditReducer(state, { type: 'EDIT_SUCCEEDED', editedText: 'Neuer Text', mock: false })
    expect(state.phase).toBe('preview')
    expect(state.proposal).toBe('Neuer Text')
    expect(state.mock).toBe(false)
  })

  it('empty transcription falls back to typing (mock mode)', () => {
    let state = createInitialState(true)
    state = inlineEditReducer(state, { type: 'STOP_RECORDING' })
    state = inlineEditReducer(state, { type: 'TRANSCRIBED', text: '   ' })
    expect(state.phase).toBe('typing')
  })

  it('transcribe failure degrades to typing with an error note', () => {
    let state: InlineEditState = createInitialState(true)
    state = inlineEditReducer(state, { type: 'TRANSCRIBE_FAILED', error: 'Mikrofon weg' })
    expect(state.phase).toBe('typing')
    expect(state.error).toBe('Mikrofon weg')
  })

  it('typed submission requires non-empty instruction', () => {
    let state = createInitialState(false)
    state = inlineEditReducer(state, { type: 'SUBMIT_TYPED', instruction: '   ' })
    expect(state.phase).toBe('typing')

    state = inlineEditReducer(state, { type: 'SUBMIT_TYPED', instruction: 'kürzen' })
    expect(state.phase).toBe('editing')
    expect(state.instruction).toBe('kürzen')
  })

  it('rerun with same instruction re-enters editing and clears the proposal', () => {
    let state = createInitialState(true)
    state = inlineEditReducer(state, { type: 'SUBMIT_TYPED', instruction: 'kürzen' })
    state = inlineEditReducer(state, { type: 'EDIT_SUCCEEDED', editedText: 'A', mock: false })
    expect(state.proposal).toBe('A')

    state = inlineEditReducer(state, { type: 'RERUN_REUSE' })
    expect(state.phase).toBe('editing')
    expect(state.proposal).toBeNull()
    expect(state.instruction).toBe('kürzen')
  })

  it('rerun re-record clears the proposal and re-enters recording', () => {
    let state = createInitialState(true)
    state = inlineEditReducer(state, { type: 'SUBMIT_TYPED', instruction: 'kürzen' })
    state = inlineEditReducer(state, { type: 'EDIT_SUCCEEDED', editedText: 'A', mock: true })
    state = inlineEditReducer(state, { type: 'RERUN_RERECORD' })
    expect(state.phase).toBe('recording')
    expect(state.proposal).toBeNull()
  })

  it('edit failure surfaces an error state', () => {
    let state = createInitialState(true)
    state = inlineEditReducer(state, { type: 'SUBMIT_TYPED', instruction: 'kürzen' })
    state = inlineEditReducer(state, { type: 'EDIT_FAILED', error: 'Serverfehler' })
    expect(state.phase).toBe('error')
    expect(state.error).toBe('Serverfehler')
  })
})
