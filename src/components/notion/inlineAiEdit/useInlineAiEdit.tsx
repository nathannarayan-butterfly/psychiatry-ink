import { useCallback, useReducer, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { requestInlineEdit, transcribeInstruction } from '../../../services/inlineEditApi'
import { buildEditContext } from '../../../utils/inlineAiEdit/buildEditContext'
import {
  createInitialState,
  inlineEditReducer,
  type InlineEditState,
} from '../../../utils/inlineAiEdit/reducer'
import {
  isVoiceCaptureSupported,
  startVoiceRecording,
  type VoiceRecording,
} from '../../../utils/inlineAiEdit/voiceCapture'
import { InlineAiEditPopup } from './InlineAiEditPopup'

export interface OpenInlineEditArgs {
  selectedText: string
  fullText: string
  selectionStart: number
  selectionEnd: number
  position: { top: number; left: number }
  /** Apply an accepted edit to the document (splice + onChange). */
  applyReplacement: (editedText: string) => void
}

interface Session extends OpenInlineEditArgs {
  contextBefore: string
  contextAfter: string
}

export interface UseInlineAiEdit {
  open: (args: OpenInlineEditArgs) => void
  isOpen: boolean
  popup: ReactNode
}

export function useInlineAiEdit(options: { caseId?: string }): UseInlineAiEdit {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [state, dispatch] = useReducer(inlineEditReducer, createInitialState(true))
  const [instructionDraft, setInstructionDraft] = useState('')
  const recorderRef = useRef<VoiceRecording | null>(null)
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session

  const canRecord = isVoiceCaptureSupported()

  const errorMessage = useCallback(
    (error: unknown) => (error instanceof Error ? error.message : t('inlineAiEditError')),
    [t],
  )

  const cancelRecorder = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
  }, [])

  const close = useCallback(() => {
    cancelRecorder()
    setSession(null)
    setInstructionDraft('')
  }, [cancelRecorder])

  const runEdit = useCallback(
    async (instruction: string) => {
      const current = sessionRef.current
      if (!current) return
      dispatch({ type: 'EDIT_STARTED' })
      try {
        const response = await requestInlineEdit({
          caseId: options.caseId,
          selectedText: current.selectedText,
          contextBefore: current.contextBefore,
          contextAfter: current.contextAfter,
          instruction,
        })
        dispatch({ type: 'EDIT_SUCCEEDED', editedText: response.editedText, mock: response.mock })
      } catch (error) {
        dispatch({ type: 'EDIT_FAILED', error: errorMessage(error) })
      }
    },
    [errorMessage, options.caseId],
  )

  const beginRecording = useCallback(async () => {
    if (!canRecord) {
      dispatch({ type: 'RECORDING_UNAVAILABLE' })
      return
    }
    dispatch({ type: 'START_RECORDING' })
    try {
      recorderRef.current = await startVoiceRecording()
    } catch {
      recorderRef.current = null
      dispatch({ type: 'RECORDING_UNAVAILABLE' })
    }
  }, [canRecord])

  const open = useCallback(
    (args: OpenInlineEditArgs) => {
      const { contextBefore, contextAfter } = buildEditContext(
        args.fullText,
        args.selectionStart,
        args.selectionEnd,
      )
      setSession({ ...args, contextBefore, contextAfter })
      setInstructionDraft('')
      // Reset the reducer to the initial phase for this session.
      dispatch(canRecord ? { type: 'START_RECORDING' } : { type: 'RECORDING_UNAVAILABLE' })
      if (canRecord) void beginRecording()
    },
    [beginRecording, canRecord],
  )

  const handleStopRecording = useCallback(async () => {
    const recorder = recorderRef.current
    dispatch({ type: 'STOP_RECORDING' })
    if (!recorder) {
      dispatch({ type: 'TRANSCRIBE_FAILED', error: t('inlineAiEditError') })
      return
    }
    try {
      const blob = await recorder.stop()
      recorderRef.current = null
      const result = await transcribeInstruction(blob, options.caseId)
      const text = result.text.trim()
      dispatch({ type: 'TRANSCRIBED', text })
      if (text) void runEdit(text)
    } catch (error) {
      recorderRef.current = null
      dispatch({ type: 'TRANSCRIBE_FAILED', error: errorMessage(error) })
    }
  }, [errorMessage, options.caseId, runEdit, t])

  const handleSubmitTyped = useCallback(() => {
    const instruction = instructionDraft.trim()
    if (!instruction) return
    dispatch({ type: 'SUBMIT_TYPED', instruction })
    void runEdit(instruction)
  }, [instructionDraft, runEdit])

  const handleAccept = useCallback(() => {
    const current = sessionRef.current
    if (current && state.proposal !== null) {
      current.applyReplacement(state.proposal)
    }
    close()
  }, [close, state.proposal])

  const handleRerunReuse = useCallback(() => {
    if (!state.instruction.trim()) {
      dispatch({ type: 'SWITCH_TO_TYPING' })
      return
    }
    dispatch({ type: 'RERUN_REUSE' })
    void runEdit(state.instruction)
  }, [runEdit, state.instruction])

  const handleRerunRerecord = useCallback(() => {
    if (canRecord) {
      void beginRecording()
    } else {
      dispatch({ type: 'SWITCH_TO_TYPING' })
    }
  }, [beginRecording, canRecord])

  const handleRetry = useCallback(() => {
    if (state.instruction.trim()) {
      void runEdit(state.instruction)
    } else {
      handleRerunRerecord()
    }
  }, [handleRerunRerecord, runEdit, state.instruction])

  const popup: ReactNode = session ? (
    <InlineAiEditPopup
      position={session.position}
      state={state as InlineEditState}
      originalText={session.selectedText}
      instructionDraft={instructionDraft}
      canRecord={canRecord}
      onInstructionDraftChange={setInstructionDraft}
      onStopRecording={() => void handleStopRecording()}
      onSubmitTyped={handleSubmitTyped}
      onAccept={handleAccept}
      onReject={close}
      onRerunReuse={handleRerunReuse}
      onRerunRerecord={handleRerunRerecord}
      onRetry={handleRetry}
      onClose={close}
    />
  ) : null

  return { open, isOpen: session !== null, popup }
}
