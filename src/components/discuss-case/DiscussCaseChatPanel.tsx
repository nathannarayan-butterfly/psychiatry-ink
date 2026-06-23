import { Check, ChevronDown, Copy, FileText, MessageSquare, Mic, Pencil, Pin, PinOff, RefreshCw, Reply, Send, Smile, Square, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type {
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussCaseReplyPreview,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { ButterflyLogo } from '../ButterflyLogo'
import {
  askDiscussAi,
  deleteDiscussMessage,
  editDiscussMessage,
  editDiscussTranscript,
  fetchDiscussPresence,
  sendDiscussMessage,
  sendDiscussTyping,
  sendDiscussVoiceMessage,
  setDiscussMessagePin,
  toggleDiscussMessageReaction,
  transcribeDiscussVoiceMessage,
} from '../../services/discussCaseApi'
import {
  discussChromeT,
  fillTemplate,
  type DiscussChromeLocale,
} from '../../utils/discussCase/chromeI18n'
import { isEmojiOnlyMessage } from '../../utils/discussCase/chatEmojis'
import {
  getChatBubbleColors,
  getParticipantColor,
  type ChatBubbleColors,
} from '../../utils/discussCase/participantColors'
import { DiscussCaseVoiceMessagePlayer } from './DiscussCaseVoiceMessagePlayer'
import { DiscussCaseEmojiPicker } from './DiscussCaseEmojiPicker'
import { DiscussCaseMessageReactions } from './DiscussCaseMessageReactions'
import {
  DISCUSS_VOICE_MAX_DURATION_MS,
  formatVoiceDuration,
  isVoiceCaptureSupported,
  startVoiceRecording,
  type VoiceRecording,
} from '../../utils/discussCase/voiceRecording'
import {
  buildReplyPreview,
  discussCaseMessageDomId,
} from '../../utils/discussCase/messageReply'
import { DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT } from '../../constants/discussCaseVoiceRetention'

interface DiscussCaseChatPanelProps {
  discussionId: string
  permissions: DiscussCasePermission[]
  messages: DiscussCaseMessage[]
  onMessagesChange: (messages: DiscussCaseMessage[]) => void
  pendingQuote?: DiscussQuoteExcerpt | null
  onPendingQuoteChange?: (quote: DiscussQuoteExcerpt | null) => void
  onSaveDraftToCase?: (text: string) => void
  participants?: DiscussCaseParticipant[]
  currentUserId?: string
  embedded?: boolean
  locale?: ChatLocale
  voiceRetentionDays?: number
}

const ROLE_TAGS: Record<ChatLocale, Record<DiscussCaseParticipant['role'], string>> = {
  de: { owner: 'Eigentümer', internal: 'Intern', external: 'Extern' },
  en: { owner: 'Owner', internal: 'Internal', external: 'External' },
  fr: { owner: 'Propriétaire', internal: 'Interne', external: 'Externe' },
  es: { owner: 'Propietario', internal: 'Interno', external: 'Externo' },
}

function roleTag(locale: ChatLocale, role: DiscussCaseParticipant['role']): string {
  return (ROLE_TAGS[locale] ?? ROLE_TAGS.de)[role]
}

/** Display name persisted for Butterfly answers shared into the chat thread. */
export const DISCUSS_AI_AUTHOR_LABEL = 'Butterfly'

const LEGACY_DISCUSS_AI_AUTHOR_LABEL = 'KI-Assistent'

function isButterflyAuthor(displayName: string | null | undefined): boolean {
  return displayName === DISCUSS_AI_AUTHOR_LABEL || displayName === LEGACY_DISCUSS_AI_AUTHOR_LABEL
}

const CHAT_I18N = {
  de: {
    quoteFrom: 'Zitat aus',
    sendAiToChat: 'An Chat senden',
    insertAiToComposer: 'In Entwurf',
    aiDraftLabel: 'Entwurf — nicht in Akte gespeichert',
    askButterfly: 'Butterfly fragen',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Antwort generieren',
    aiQuestionPlaceholder: 'Frage zum sichtbaren Paket…',
    aiRequestFailed: 'Butterfly-Anfrage fehlgeschlagen',
    aiSendFailed: 'Butterfly-Antwort konnte nicht gesendet werden',
    messagePlaceholder: 'Nachricht schreiben…',
    removeQuote: 'Zitat entfernen',
    sendFailed: 'Nachricht konnte nicht gesendet werden',
    recordVoice: 'Sprachnachricht aufnehmen',
    stopRecording: 'Aufnahme beenden',
    cancelRecording: 'Aufnahme abbrechen',
    sendVoice: 'Sprachnachricht senden',
    discardVoice: 'Aufnahme verwerfen',
    recording: 'Aufnahme läuft…',
    voiceSendFailed: 'Sprachnachricht konnte nicht gesendet werden',
    micUnavailable: 'Mikrofon nicht verfügbar',
    maxDurationReached: 'Maximale Aufnahmedauer erreicht (5 Min.)',
    insertEmoji: 'Emoji einfügen',
    reactionFailed: 'Reaktion fehlgeschlagen',
    voiceRetentionNotice: 'Sprachnachrichten werden gespeichert und nach {days} Tagen automatisch gelöscht.',
    voiceRetentionDismiss: 'Verstanden',
    deleteConfirm: 'Nachricht löschen? Dies kann nicht rückgängig gemacht werden.',
    deleteVoiceConfirm: 'Sprachnachricht löschen? Die Aufnahme wird dauerhaft entfernt.',
    deleteModeratorConfirm: 'Nachricht von {author} löschen? Dies kann nicht rückgängig gemacht werden.',
    editFailed: 'Bearbeiten fehlgeschlagen',
    deleteFailed: 'Löschen fehlgeschlagen',
    editCancel: 'Abbrechen',
    editSave: 'Speichern',
    editedLabel: 'bearbeitet',
    editMessage: 'Nachricht bearbeiten',
    deleteMessage: 'Nachricht löschen',
    reply: 'Antworten',
    replyingTo: 'Antwort an',
    cancelReply: 'Antwort abbrechen',
    voiceMessage: 'Sprachnachricht',
    originalMessageDeleted: 'Originalnachricht gelöscht',
    jumpToLatest: 'Zu den neuesten',
    chatHeading: 'Diskussion',
    emptyTitle: 'Noch keine Nachrichten',
    emptyHint: 'Starten Sie die Diskussion oder zitieren Sie eine Stelle aus dem Dokument.',
    aiCopy: 'Kopieren',
    aiSaveDraft: 'Als Entwurf speichern',
    aiRegenerate: 'Neu',
    aiDiscard: 'Verwerfen',
  },
  en: {
    quoteFrom: 'Quote from',
    sendAiToChat: 'Send to chat',
    insertAiToComposer: 'To draft',
    aiDraftLabel: 'Draft — not saved to record',
    askButterfly: 'Ask Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Generate answer',
    aiQuestionPlaceholder: 'Question about the visible package…',
    aiRequestFailed: 'Butterfly request failed',
    aiSendFailed: 'Could not send Butterfly answer to chat',
    messagePlaceholder: 'Write a message…',
    removeQuote: 'Remove quote',
    sendFailed: 'Could not send message',
    recordVoice: 'Record voice message',
    stopRecording: 'Stop recording',
    cancelRecording: 'Cancel recording',
    sendVoice: 'Send voice message',
    discardVoice: 'Discard recording',
    recording: 'Recording…',
    voiceSendFailed: 'Could not send voice message',
    micUnavailable: 'Microphone unavailable',
    maxDurationReached: 'Maximum recording length reached (5 min)',
    insertEmoji: 'Insert emoji',
    reactionFailed: 'Reaction failed',
    voiceRetentionNotice: 'Voice messages are stored and automatically deleted after {days} days.',
    voiceRetentionDismiss: 'Got it',
    deleteConfirm: 'Delete this message? This cannot be undone.',
    deleteVoiceConfirm: 'Delete this voice message? The recording will be permanently removed.',
    deleteModeratorConfirm: 'Delete message from {author}? This cannot be undone.',
    editFailed: 'Edit failed',
    deleteFailed: 'Delete failed',
    editCancel: 'Cancel',
    editSave: 'Save',
    editedLabel: 'edited',
    editMessage: 'Edit message',
    deleteMessage: 'Delete message',
    reply: 'Reply',
    replyingTo: 'Replying to',
    cancelReply: 'Cancel reply',
    voiceMessage: 'Voice message',
    originalMessageDeleted: 'Original message deleted',
    jumpToLatest: 'Jump to latest',
    chatHeading: 'Discussion',
    emptyTitle: 'No messages yet',
    emptyHint: 'Start the discussion or quote a passage from the document.',
    aiCopy: 'Copy',
    aiSaveDraft: 'Save as draft',
    aiRegenerate: 'Regenerate',
    aiDiscard: 'Discard',
  },
  fr: {
    quoteFrom: 'Citation de',
    sendAiToChat: 'Envoyer au chat',
    insertAiToComposer: 'Vers brouillon',
    aiDraftLabel: 'Brouillon — non enregistré au dossier',
    askButterfly: 'Demander à Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Générer une réponse',
    aiQuestionPlaceholder: 'Question sur le paquet visible…',
    aiRequestFailed: 'Échec de la requête Butterfly',
    aiSendFailed: 'Impossible d\'envoyer la réponse Butterfly au chat',
    messagePlaceholder: 'Écrire un message…',
    removeQuote: 'Retirer la citation',
    sendFailed: 'Impossible d\'envoyer le message',
  },
  es: {
    quoteFrom: 'Cita de',
    sendAiToChat: 'Enviar al chat',
    insertAiToComposer: 'Al borrador',
    aiDraftLabel: 'Borrador — no guardado en el expediente',
    askButterfly: 'Preguntar a Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Generar respuesta',
    aiQuestionPlaceholder: 'Pregunta sobre el paquete visible…',
    aiRequestFailed: 'Error en la solicitud a Butterfly',
    aiSendFailed: 'No se pudo enviar la respuesta de Butterfly al chat',
    messagePlaceholder: 'Escribir un mensaje…',
    removeQuote: 'Quitar cita',
    sendFailed: 'No se pudo enviar el mensaje',
  },
} as const

type ChatLocale = keyof typeof CHAT_I18N

type VoiceChatLocale = 'de' | 'en'

function voiceLocale(locale: ChatLocale): VoiceChatLocale {
  return locale === 'en' ? 'en' : 'de'
}

function reactionLocale(locale: ChatLocale): VoiceChatLocale {
  return locale === 'en' ? 'en' : 'de'
}

function insertTextAtCursor(textarea: HTMLTextAreaElement, text: string): { value: string; cursor: number } {
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? start
  const value = textarea.value.slice(0, start) + text + textarea.value.slice(end)
  return { value, cursor: start + text.length }
}

function chatT(locale: ChatLocale, key: keyof (typeof CHAT_I18N)['de']): string {
  const strings = CHAT_I18N[locale] as Partial<(typeof CHAT_I18N)['de']>
  return strings[key] ?? CHAT_I18N.de[key]
}

function formatRetentionNotice(locale: ChatLocale, days: number): string {
  return chatT(locale, 'voiceRetentionNotice').replace('{days}', String(days))
}

const VOICE_RETENTION_NOTICE_KEY = 'discuss-case-voice-retention-notice-dismissed'

/** Group consecutive messages by the same author within this window (ms). */
const GROUP_WINDOW_MS = 5 * 60 * 1000

/** Long-press duration (ms) before showing message actions on touch devices. */
const MESSAGE_ACTIONS_LONG_PRESS_MS = 450

function bubbleInlineStyle(colors: ChatBubbleColors): CSSProperties {
  return {
    '--dc-bubble-bg': colors.bg,
    '--dc-bubble-border': colors.border,
    '--dc-bubble-text': colors.text,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    color: colors.text,
  } as CSSProperties
}

function authorInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

type PendingReply = {
  messageId: string
  preview: DiscussCaseReplyPreview
}

function isReplyTargetPresent(messageId: string | null, messages: DiscussCaseMessage[]): boolean {
  if (!messageId) return false
  return messages.some((message) => message.id === messageId)
}

function scrollToDiscussMessage(messageId: string): void {
  document.getElementById(discussCaseMessageDomId(messageId))?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

export function DiscussCaseChatPanel({
  discussionId,
  permissions,
  messages,
  onMessagesChange,
  pendingQuote = null,
  onPendingQuoteChange,
  onSaveDraftToCase,
  participants,
  currentUserId,
  embedded = false,
  locale = 'de',
  voiceRetentionDays = DISCUSS_CASE_VOICE_RETENTION_DAYS_DEFAULT,
}: DiscussCaseChatPanelProps) {
  const participantList = participants ?? []
  const participantByUserId = new Map(participantList.map((p) => [p.userId, p]))
  const participantIndexByUserId = new Map(
    participantList.map((p, index) => [p.userId, index]),
  )

  const resolveParticipantIndex = (userId: string): number | undefined => {
    const index = participantIndexByUserId.get(userId)
    return index !== undefined && index >= 0 ? index : undefined
  }

  const resolveAuthor = (message: DiscussCaseMessage): { name: string; tag: string | null } => {
    if (isButterflyAuthor(message.authorDisplayName)) {
      return { name: chatT(locale, 'butterflyAssistant'), tag: null }
    }
    const participant = participantByUserId.get(message.authorUserId)
    const isSelf = currentUserId && message.authorUserId === currentUserId
    const name = isSelf
      ? 'Sie'
      : message.authorDisplayName || message.authorUserId.slice(0, 8)
    return { name, tag: participant ? roleTag(locale, participant.role) : null }
  }
  const [messageDraft, setMessageDraft] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; durationMs: number } | null>(null)
  const [voiceSending, setVoiceSending] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null)
  const [reactionsOpenId, setReactionsOpenId] = useState<string | null>(null)
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null)
  const [pendingReply, setPendingReply] = useState<PendingReply | null>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [transcribingId, setTranscribingId] = useState<string | null>(null)
  const [transcriptEditId, setTranscriptEditId] = useState<string | null>(null)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const lastTypingPingRef = useRef(0)
  const [voiceNoticeDismissed, setVoiceNoticeDismissed] = useState(() => {
    try {
      return localStorage.getItem(VOICE_RETENTION_NOTICE_KEY) === '1'
    } catch {
      return false
    }
  })
  const voiceRecorderRef = useRef<VoiceRecording | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const prevMessageCountRef = useRef(messages.length)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressMessageIdRef = useRef<string | null>(null)
  const suppressBubbleClickRef = useRef(false)

  const canSend = permissions.includes('send_message')
  const canManage = permissions.includes('manage_discussion')
  const canReact = permissions.includes('comment')
  const canRecordVoice = canSend && isVoiceCaptureSupported()
  const canAskAi = permissions.includes('ask_ai')
  const canSaveToCase = permissions.includes('save_to_case')
  const chromeLocale = locale as DiscussChromeLocale

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    isNearBottomRef.current = true
    setShowJumpToLatest(false)
    chatEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceFromBottom < 96
    isNearBottomRef.current = nearBottom
    if (nearBottom) setShowJumpToLatest(false)
  }, [])

  // Only follow new messages when the reader is already at the bottom (or sent
  // the message themselves). Otherwise surface a "jump to latest" pill so a
  // polled message from another participant never yanks the viewport while
  // someone is reading earlier history.
  useEffect(() => {
    const grew = messages.length > prevMessageCountRef.current
    const lastMessage = messages[messages.length - 1]
    const fromSelf = Boolean(
      lastMessage && currentUserId && lastMessage.authorUserId === currentUserId,
    )
    prevMessageCountRef.current = messages.length
    if (isNearBottomRef.current || fromSelf || aiDraft) {
      scrollToLatest()
    } else if (grew) {
      setShowJumpToLatest(true)
    }
  }, [aiDraft, currentUserId, messages, scrollToLatest])

  useEffect(() => {
    if (pendingQuote) {
      setPendingReply(null)
      composerRef.current?.focus()
    }
  }, [pendingQuote])

  useEffect(() => {
    if (pendingReply) {
      composerRef.current?.focus()
    }
  }, [pendingReply])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      voiceRecorderRef.current?.cancel()
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }, [])

  const stopRecording = useCallback(async () => {
    const recorder = voiceRecorderRef.current
    if (!recorder) return
    clearRecordingTimer()
    voiceRecorderRef.current = null
    setRecording(false)
    try {
      const blob = await recorder.stop()
      const durationMs = Math.max(recordingMs, 1000)
      setVoicePreview({ blob, durationMs })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'voiceSendFailed'))
    }
  }, [clearRecordingTimer, locale, recordingMs])

  const cancelRecording = useCallback(() => {
    clearRecordingTimer()
    voiceRecorderRef.current?.cancel()
    voiceRecorderRef.current = null
    setRecording(false)
    setRecordingMs(0)
    setVoicePreview(null)
  }, [clearRecordingTimer])

  const dismissVoiceNotice = useCallback(() => {
    setVoiceNoticeDismissed(true)
    try {
      localStorage.setItem(VOICE_RETENTION_NOTICE_KEY, '1')
    } catch {
      /* ignore storage errors */
    }
  }, [])

  const showVoiceRetentionNotice = canRecordVoice && !voiceNoticeDismissed

  const startRecording = useCallback(async () => {
    if (recording || voiceSending || !canRecordVoice) return
    setActionError(null)
    setVoicePreview(null)
    try {
      const recorder = await startVoiceRecording()
      voiceRecorderRef.current = recorder
      setRecording(true)
      setRecordingMs(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingMs((prev) => {
          const next = prev + 200
          if (next >= DISCUSS_VOICE_MAX_DURATION_MS) {
            void stopRecording()
          }
          return next
        })
      }, 200)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'micUnavailable'))
    }
  }, [canRecordVoice, locale, recording, stopRecording, voiceSending])

  const sendVoicePreview = useCallback(async () => {
    if (!voicePreview || voiceSending) return
    setVoiceSending(true)
    setActionError(null)
    try {
      const message = await sendDiscussVoiceMessage(
        discussionId,
        voicePreview.blob,
        voicePreview.durationMs,
        pendingReply?.messageId ?? null,
      )
      onMessagesChange([...messages, message])
      setVoicePreview(null)
      setRecordingMs(0)
      setPendingReply(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'voiceSendFailed'))
    } finally {
      setVoiceSending(false)
    }
  }, [discussionId, locale, messages, onMessagesChange, pendingReply, voicePreview, voiceSending])

  const clearPendingReply = useCallback(() => {
    setPendingReply(null)
  }, [])

  const beginReply = useCallback(
    (message: DiscussCaseMessage) => {
      onPendingQuoteChange?.(null)
      setPendingReply({
        messageId: message.id,
        preview: buildReplyPreview(message),
      })
      setActionError(null)
    },
    [onPendingQuoteChange],
  )

  const renderReplyPreviewText = useCallback(
    (preview: DiscussCaseReplyPreview, replyToMessageId: string | null) => {
      const targetPresent = isReplyTargetPresent(replyToMessageId, messages)
      const isVoice = preview.messageKind === 'voice'
      const snippet = targetPresent
        ? isVoice
          ? chatT(locale, 'voiceMessage')
          : preview.bodySnippet
        : chatT(locale, 'originalMessageDeleted')

      return (
        <>
          <cite className="discuss-case-chat__quote-label">
            {chatT(locale, 'replyingTo')} {preview.senderDisplayName}
          </cite>
          <p className="discuss-case-chat__quote-text">
            {isVoice && targetPresent ? (
              <span className="discuss-case-chat__reply-voice">
                <Mic className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                {snippet}
              </span>
            ) : (
              snippet
            )}
          </p>
        </>
      )
    },
    [locale, messages],
  )

  const handleSend = useCallback(async () => {
    const body = messageDraft.trim()
    if ((!body && !pendingQuote) || !canSend || sending) return
    setSending(true)
    setActionError(null)
    try {
      const message = await sendDiscussMessage(
        discussionId,
        body,
        pendingQuote,
        undefined,
        pendingReply?.messageId ?? null,
      )
      onMessagesChange([...messages, message])
      setMessageDraft('')
      onPendingQuoteChange?.(null)
      setPendingReply(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'sendFailed'))
    } finally {
      setSending(false)
    }
  }, [
    canSend,
    discussionId,
    locale,
    messageDraft,
    messages,
    onMessagesChange,
    onPendingQuoteChange,
    pendingQuote,
    pendingReply,
    sending,
  ])

  const beginEdit = useCallback((message: DiscussCaseMessage) => {
    setEditingId(message.id)
    setEditDraft(message.body)
    setActionError(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft('')
  }, [])

  const saveEdit = useCallback(
    async (message: DiscussCaseMessage) => {
      const body = editDraft.trim()
      if (!body || actionBusyId) return
      if (body === message.body) {
        cancelEdit()
        return
      }
      setActionBusyId(message.id)
      setActionError(null)
      try {
        const updated = await editDiscussMessage(discussionId, message.id, body)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
        setEditingId(null)
        setEditDraft('')
      } catch (err) {
        setActionError(err instanceof Error ? err.message : chatT(locale, 'editFailed'))
      } finally {
        setActionBusyId(null)
      }
    },
    [actionBusyId, cancelEdit, discussionId, editDraft, locale, messages, onMessagesChange],
  )

  const handleDelete = useCallback(
    async (message: DiscussCaseMessage) => {
      if (actionBusyId) return
      const author = resolveAuthor(message)
      const isSelfMessage = Boolean(currentUserId && message.authorUserId === currentUserId)
      const isVoiceMessage = message.messageKind === 'voice'
      let confirmText = chatT(locale, 'deleteConfirm')
      if (isVoiceMessage) {
        confirmText = chatT(locale, 'deleteVoiceConfirm')
      } else if (!isSelfMessage && canManage) {
        confirmText = chatT(locale, 'deleteModeratorConfirm').replace('{author}', author.name)
      }
      const confirmed = window.confirm(confirmText)
      if (!confirmed) return
      setActionBusyId(message.id)
      setActionError(null)
      try {
        await deleteDiscussMessage(discussionId, message.id)
        onMessagesChange(messages.filter((m) => m.id !== message.id))
        if (editingId === message.id) cancelEdit()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : chatT(locale, 'deleteFailed'))
      } finally {
        setActionBusyId(null)
      }
    },
    [
      actionBusyId,
      cancelEdit,
      canManage,
      currentUserId,
      discussionId,
      editingId,
      locale,
      messages,
      onMessagesChange,
    ],
  )

  const handleAskAi = useCallback(async () => {
    const question = aiQuestion.trim()
    if (!question || !canAskAi || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await askDiscussAi(discussionId, question)
      setAiDraft(result.answer)
      setAiQuestion('')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : chatT(locale, 'aiRequestFailed'))
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiQuestion, canAskAi, discussionId, locale])

  const handleSendAiToChat = useCallback(async () => {
    if (!aiDraft || !canSend || sending) return
    setSending(true)
    setActionError(null)
    try {
      const message = await sendDiscussMessage(
        discussionId,
        aiDraft,
        null,
        DISCUSS_AI_AUTHOR_LABEL,
      )
      onMessagesChange([...messages, message])
      setAiDraft(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'aiSendFailed'))
    } finally {
      setSending(false)
    }
  }, [aiDraft, canSend, discussionId, locale, messages, onMessagesChange, sending])

  const handleInsertAiDraft = useCallback(() => {
    if (!aiDraft) return
    setMessageDraft((prev) => `${prev}${prev ? '\n\n' : ''}${aiDraft}`)
    setAiDraft(null)
  }, [aiDraft])

  const handleInsertEmoji = useCallback((emoji: string) => {
    const textarea = composerRef.current
    if (!textarea) {
      setMessageDraft((prev) => `${prev}${emoji}`)
      return
    }
    const { value, cursor } = insertTextAtCursor(textarea, emoji)
    setMessageDraft(value)
    requestAnimationFrame(() => {
      textarea.selectionStart = cursor
      textarea.selectionEnd = cursor
      textarea.focus()
    })
  }, [])

  const handleToggleReaction = useCallback(
    async (message: DiscussCaseMessage, emoji: string) => {
      if (!canReact || reactionBusyId) return
      setReactionBusyId(message.id)
      setActionError(null)
      try {
        const updated = await toggleDiscussMessageReaction(discussionId, message.id, emoji)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : chatT(locale, 'reactionFailed'))
      } finally {
        setReactionBusyId(null)
      }
    },
    [canReact, discussionId, locale, messages, onMessagesChange, reactionBusyId],
  )

  const handleTranscribe = useCallback(
    async (message: DiscussCaseMessage, force = false) => {
      if (transcribingId) return
      setTranscribingId(message.id)
      setActionError(null)
      try {
        const updated = await transcribeDiscussVoiceMessage(discussionId, message.id, force)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : discussChromeT(chromeLocale, 'transcriptFailed'))
      } finally {
        setTranscribingId(null)
      }
    },
    [chromeLocale, discussionId, messages, onMessagesChange, transcribingId],
  )

  const beginTranscriptEdit = useCallback((message: DiscussCaseMessage) => {
    setTranscriptEditId(message.id)
    setTranscriptDraft(message.transcript?.text ?? '')
    setActionError(null)
  }, [])

  const cancelTranscriptEdit = useCallback(() => {
    setTranscriptEditId(null)
    setTranscriptDraft('')
  }, [])

  const saveTranscriptEdit = useCallback(
    async (message: DiscussCaseMessage) => {
      const text = transcriptDraft.trim()
      if (!text || actionBusyId) return
      setActionBusyId(message.id)
      setActionError(null)
      try {
        const updated = await editDiscussTranscript(discussionId, message.id, text)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
        setTranscriptEditId(null)
        setTranscriptDraft('')
      } catch (err) {
        setActionError(err instanceof Error ? err.message : discussChromeT(chromeLocale, 'transcriptFailed'))
      } finally {
        setActionBusyId(null)
      }
    },
    [actionBusyId, chromeLocale, discussionId, messages, onMessagesChange, transcriptDraft],
  )

  const handleTogglePin = useCallback(
    async (message: DiscussCaseMessage) => {
      if (actionBusyId) return
      setActionBusyId(message.id)
      setActionError(null)
      try {
        const updated = await setDiscussMessagePin(discussionId, message.id, !message.pinned)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : discussChromeT(chromeLocale, 'pinFailed'))
      } finally {
        setActionBusyId(null)
      }
    },
    [actionBusyId, chromeLocale, discussionId, messages, onMessagesChange],
  )

  // Best-effort typing heartbeat: ping the ephemeral presence endpoint at most
  // once every 2.5s while the composer is being edited. The server keeps a
  // short TTL so the indicator self-clears when typing stops.
  const pingTyping = useCallback(() => {
    if (!canSend) return
    const now = Date.now()
    if (now - lastTypingPingRef.current < 2_500) return
    lastTypingPingRef.current = now
    void sendDiscussTyping(discussionId)
  }, [canSend, discussionId])

  // Poll who else is typing on a short cadence so "X is typing…" feels live
  // without a realtime socket. Independent of the 12s message poll in the view.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const typing = await fetchDiscussPresence(discussionId)
        if (!cancelled) setTypingUserIds(typing)
      } catch {
        /* ignore transient presence failures */
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), 4_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [discussionId])

  const typingIndicator = useMemo(() => {
    if (typingUserIds.length === 0) return null
    const names = typingUserIds.map((userId) => {
      if (currentUserId && userId === currentUserId) return discussChromeT(chromeLocale, 'selfLabel')
      const participant = participantByUserId.get(userId)
      return participant?.userId.slice(0, 8) ?? discussChromeT(chromeLocale, 'someone')
    })
    if (names.length === 1) {
      return fillTemplate(discussChromeT(chromeLocale, 'typingOne'), { name: names[0]! })
    }
    if (names.length === 2) {
      return fillTemplate(discussChromeT(chromeLocale, 'typingTwo'), {
        name: names[0]!,
        name2: names[1]!,
      })
    }
    return discussChromeT(chromeLocale, 'typingMany')
  }, [chromeLocale, currentUserId, participantByUserId, typingUserIds])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressMessageIdRef.current = null
  }, [])

  const handleMessagePointerDown = useCallback(
    (messageId: string) => {
      clearLongPressTimer()
      longPressMessageIdRef.current = messageId
      longPressTimerRef.current = setTimeout(() => {
        if (longPressMessageIdRef.current === messageId) {
          suppressBubbleClickRef.current = true
          setActionsOpenId(messageId)
          setReactionsOpenId(null)
        }
      }, MESSAGE_ACTIONS_LONG_PRESS_MS)
    },
    [clearLongPressTimer],
  )

  const handleMessagePointerUp = useCallback(() => {
    clearLongPressTimer()
  }, [clearLongPressTimer])

  const handleBubbleClick = useCallback(
    (message: DiscussCaseMessage, event: MouseEvent<HTMLDivElement>) => {
      if (suppressBubbleClickRef.current) {
        suppressBubbleClickRef.current = false
        return
      }
      const target = event.target as HTMLElement
      if (target.closest('button, a, textarea, input, audio, [role="slider"]')) return
      if (canReact) {
        setReactionsOpenId((current) => (current === message.id ? null : message.id))
        setActionsOpenId(null)
      }
    },
    [canReact],
  )

  return (
    <aside className={['discuss-case-chat', embedded ? 'discuss-case-chat--embedded' : ''].join(' ').trim()}>
      {!embedded ? (
        <header className="discuss-case-chat__header">
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          <h2 className="discuss-case-chat__title">{chatT(locale, 'chatHeading')}</h2>
        </header>
      ) : null}

      <div
        className="discuss-case-chat__messages"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <div className="discuss-case-chat__empty-state">
            <span className="discuss-case-chat__empty-icon" aria-hidden="true">
              <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="discuss-case-chat__empty-title">{chatT(locale, 'emptyTitle')}</p>
            <p className="discuss-case-chat__empty-hint">{chatT(locale, 'emptyHint')}</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const author = resolveAuthor(message)
            const isAiMessage = isButterflyAuthor(message.authorDisplayName)
            const isSelf = Boolean(currentUserId && message.authorUserId === currentUserId && !isAiMessage)
            const participantIndex = resolveParticipantIndex(message.authorUserId)
            const avatarColor = isAiMessage
              ? null
              : getParticipantColor(message.authorUserId, participantIndex)
            const bubbleColors =
              isAiMessage || !message.authorUserId
                ? null
                : getChatBubbleColors(message.authorUserId, isSelf, participantIndex)
            const isVoiceMessage = message.messageKind === 'voice'
            const prev = messages[index - 1]
            const prevIsAi = isButterflyAuthor(prev?.authorDisplayName)
            const grouped =
              Boolean(prev) &&
              !isAiMessage &&
              !prevIsAi &&
              !isVoiceMessage &&
              prev.messageKind !== 'voice' &&
              prev.authorUserId === message.authorUserId &&
              new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                GROUP_WINDOW_MS
            const canDeleteMessage =
              !isAiMessage && ((isSelf && canSend) || (canManage && !isSelf))
            const canEditMessage = isSelf && canSend && !isVoiceMessage && !isAiMessage
            const canReplyMessage = canSend && !isAiMessage
            const canPinMessage = canManage && !isAiMessage
            const isEditing = editingId === message.id && canEditMessage
            const busy = actionBusyId === message.id
            const hasBody = Boolean(message.body.trim())
            const emojiOnlyBody =
              hasBody &&
              !isVoiceMessage &&
              !message.quoteExcerpt &&
              !message.replyPreview &&
              isEmojiOnlyMessage(message.body)
            const hasMessageActions =
              (canReplyMessage || canEditMessage || canDeleteMessage || canPinMessage) && !isEditing
            const reactionsOpen = reactionsOpenId === message.id
            const actionsOpen = actionsOpenId === message.id
            return (
              <article
                key={message.id}
                id={discussCaseMessageDomId(message.id)}
                className={[
                  'discuss-case-chat__message',
                  isAiMessage
                    ? 'discuss-case-chat__message--ai'
                    : isSelf
                      ? 'discuss-case-chat__message--self'
                      : 'discuss-case-chat__message--other',
                  grouped ? 'discuss-case-chat__message--grouped' : '',
                  reactionsOpen ? 'discuss-case-chat__message--reactions-open' : '',
                  actionsOpen ? 'discuss-case-chat__message--actions-open' : '',
                ].join(' ').trim()}
                tabIndex={0}
                onPointerDown={() => handleMessagePointerDown(message.id)}
                onPointerUp={handleMessagePointerUp}
                onPointerLeave={handleMessagePointerUp}
                onPointerCancel={handleMessagePointerUp}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    if (actionsOpenId === message.id) setActionsOpenId(null)
                  }
                }}
              >
                {!isSelf ? (
                  <span
                    className={[
                      'discuss-case-chat__avatar discuss-case-avatar',
                      isAiMessage ? 'discuss-case-chat__avatar--ai' : '',
                    ].join(' ').trim()}
                    style={
                      avatarColor
                        ? {
                            backgroundColor: avatarColor.bg,
                            color: avatarColor.text,
                            borderColor: avatarColor.border,
                          }
                        : undefined
                    }
                    aria-hidden={grouped ? 'true' : undefined}
                  >
                    {grouped ? '' : isAiMessage ? (
                      <ButterflyLogo variant="grey" size={14} />
                    ) : (
                      authorInitials(author.name)
                    )}
                  </span>
                ) : null}
                <div className="discuss-case-chat__message-content">
                  {!grouped ? (
                    <header className="discuss-case-chat__message-meta">
                      <span
                        className="discuss-case-chat__message-author"
                        style={avatarColor ? { color: avatarColor.text } : undefined}
                      >
                        {author.name}
                        {author.tag ? (
                          <span className="discuss-case-chat__message-role">{author.tag}</span>
                        ) : null}
                      </span>
                      <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    </header>
                  ) : null}
                  <div
                    className="discuss-case-chat__bubble-wrap"
                    onClick={(event) => handleBubbleClick(message, event)}
                  >
                    <div
                      className={[
                        'discuss-case-chat__message-bubble',
                        grouped ? 'discuss-case-chat__message-bubble--grouped' : '',
                        isSelf ? 'discuss-case-chat__message-bubble--own' : '',
                        bubbleColors ? 'discuss-case-chat__message-bubble--colored' : '',
                        emojiOnlyBody ? 'discuss-case-chat__message-bubble--emoji-only' : '',
                        message.pinned ? 'discuss-case-chat__message-bubble--pinned' : '',
                      ].join(' ').trim()}
                      style={bubbleColors ? bubbleInlineStyle(bubbleColors) : undefined}
                    >
                      {message.pinned ? (
                        <span className="discuss-case-chat__pin-badge" title={discussChromeT(chromeLocale, 'pinnedHeading')}>
                          <Pin className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                        </span>
                      ) : null}
                      {message.replyPreview ? (
                        isReplyTargetPresent(message.replyToMessageId, messages) ? (
                          <button
                            type="button"
                            className="discuss-case-chat__quote discuss-case-chat__reply-quote discuss-case-chat__reply-quote--clickable"
                            onClick={() => {
                              if (message.replyToMessageId) {
                                scrollToDiscussMessage(message.replyToMessageId)
                              }
                            }}
                          >
                            {renderReplyPreviewText(message.replyPreview, message.replyToMessageId)}
                          </button>
                        ) : (
                          <blockquote className="discuss-case-chat__quote discuss-case-chat__reply-quote">
                            {renderReplyPreviewText(message.replyPreview, message.replyToMessageId)}
                          </blockquote>
                        )
                      ) : null}
                      {message.quoteExcerpt ? (
                        <blockquote className="discuss-case-chat__quote">
                          {message.quoteExcerpt.sectionLabel ? (
                            <cite className="discuss-case-chat__quote-label">
                              {chatT(locale, 'quoteFrom')} {message.quoteExcerpt.sectionLabel}
                            </cite>
                          ) : null}
                          <p className="discuss-case-chat__quote-text">{message.quoteExcerpt.text}</p>
                        </blockquote>
                      ) : null}
                      {isEditing ? (
                        <div className="discuss-case-chat__message-edit">
                          <textarea
                            className="discuss-case-chat__input discuss-case-chat__message-edit-input"
                            rows={3}
                            autoFocus
                            value={editDraft}
                            disabled={busy}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault()
                                void saveEdit(message)
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                          />
                          <div className="discuss-case-chat__message-edit-actions">
                            <button
                              type="button"
                              className="discuss-case-chat__edit-cancel"
                              onClick={cancelEdit}
                              disabled={busy}
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {chatT(locale, 'editCancel')}
                            </button>
                            <button
                              type="button"
                              className="discuss-case-chat__edit-save"
                              onClick={() => void saveEdit(message)}
                              disabled={busy || !editDraft.trim()}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              {chatT(locale, 'editSave')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isVoiceMessage && message.voiceAttachment ? (
                            <DiscussCaseVoiceMessagePlayer
                              discussionId={discussionId}
                              messageId={message.id}
                              durationMs={message.voiceAttachment.durationMs}
                              locale={voiceLocale(locale)}
                            />
                          ) : null}
                          {isVoiceMessage ? (
                            <div className="discuss-case-chat__transcript">
                              {message.transcript ? (
                                transcriptEditId === message.id ? (
                                  <div className="discuss-case-chat__transcript-edit">
                                    <textarea
                                      className="discuss-case-chat__input discuss-case-chat__transcript-input"
                                      rows={3}
                                      autoFocus
                                      value={transcriptDraft}
                                      disabled={busy}
                                      onChange={(e) => setTranscriptDraft(e.target.value)}
                                    />
                                    <div className="discuss-case-chat__transcript-edit-actions">
                                      <button
                                        type="button"
                                        className="discuss-case-chat__edit-cancel"
                                        onClick={cancelTranscriptEdit}
                                        disabled={busy}
                                      >
                                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        {discussChromeT(chromeLocale, 'transcriptCancel')}
                                      </button>
                                      <button
                                        type="button"
                                        className="discuss-case-chat__edit-save"
                                        onClick={() => void saveTranscriptEdit(message)}
                                        disabled={busy || !transcriptDraft.trim()}
                                      >
                                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                                        {discussChromeT(chromeLocale, 'transcriptSave')}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="discuss-case-chat__transcript-meta">
                                      <FileText className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                                      {discussChromeT(
                                        chromeLocale,
                                        message.transcript.status === 'edited'
                                          ? 'transcriptEdited'
                                          : 'transcriptMachine',
                                      )}
                                      {(isSelf || canManage) ? (
                                        <button
                                          type="button"
                                          className="discuss-case-chat__transcript-edit-btn"
                                          onClick={() => beginTranscriptEdit(message)}
                                          disabled={busy}
                                        >
                                          {discussChromeT(chromeLocale, 'transcriptEditAction')}
                                        </button>
                                      ) : null}
                                    </p>
                                    <p className="discuss-case-chat__transcript-text">
                                      {message.transcript.text}
                                    </p>
                                  </>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="discuss-case-chat__transcribe-btn"
                                  onClick={() => void handleTranscribe(message)}
                                  disabled={transcribingId === message.id}
                                >
                                  {transcribingId === message.id ? (
                                    <span className="clinical-loading__spinner" aria-hidden="true" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                                  )}
                                  {discussChromeT(
                                    chromeLocale,
                                    transcribingId === message.id ? 'transcribing' : 'transcribe',
                                  )}
                                </button>
                              )}
                            </div>
                          ) : null}
                          {hasBody ? (
                            <p
                              className={[
                                'discuss-case-chat__message-body',
                                emojiOnlyBody ? 'discuss-case-chat__message-body--emoji-only' : '',
                              ].join(' ').trim()}
                            >
                              {message.body.trim()}
                            </p>
                          ) : null}
                          <span className="discuss-case-chat__message-footer">
                            {message.editedAt ? (
                              <span className="discuss-case-chat__message-edited">
                                {chatT(locale, 'editedLabel')}
                              </span>
                            ) : null}
                            <time
                              className="discuss-case-chat__message-time"
                              dateTime={message.createdAt}
                            >
                              {formatMessageTime(message.createdAt)}
                            </time>
                          </span>
                        </>
                      )}
                    </div>
                    {hasMessageActions ? (
                      <div className="discuss-case-chat__message-actions">
                        {canReplyMessage ? (
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginReply(message)}
                            disabled={busy}
                            aria-label={chatT(locale, 'reply')}
                            title={chatT(locale, 'reply')}
                          >
                            <Reply className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        {canPinMessage ? (
                          <button
                            type="button"
                            className={[
                              'icon-action-btn',
                              message.pinned ? 'icon-action-btn--active' : '',
                            ].join(' ').trim()}
                            onClick={() => void handleTogglePin(message)}
                            disabled={busy}
                            aria-label={discussChromeT(
                              chromeLocale,
                              message.pinned ? 'unpin' : 'pin',
                            )}
                            title={discussChromeT(chromeLocale, message.pinned ? 'unpin' : 'pin')}
                            aria-pressed={message.pinned}
                          >
                            {message.pinned ? (
                              <PinOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                            ) : (
                              <Pin className="h-3.5 w-3.5" strokeWidth={1.75} />
                            )}
                          </button>
                        ) : null}
                        {canEditMessage ? (
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEdit(message)}
                            disabled={busy}
                            aria-label={chatT(locale, 'editMessage')}
                            title={chatT(locale, 'editMessage')}
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        {canDeleteMessage ? (
                          <button
                            type="button"
                            className="icon-action-btn icon-action-btn--danger"
                            onClick={() => void handleDelete(message)}
                            disabled={busy}
                            aria-label={chatT(locale, 'deleteMessage')}
                            title={chatT(locale, 'deleteMessage')}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {!isEditing ? (
                      <DiscussCaseMessageReactions
                        reactions={message.reactions ?? []}
                        currentUserId={currentUserId}
                        locale={reactionLocale(locale)}
                        align={isSelf ? 'right' : 'left'}
                        canReact={canReact}
                        busy={reactionBusyId === message.id}
                        open={reactionsOpen}
                        onOpenChange={(open) => {
                          setReactionsOpenId(open ? message.id : null)
                          if (open) setActionsOpenId(null)
                        }}
                        onToggle={(emoji) => void handleToggleReaction(message, emoji)}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {showJumpToLatest ? (
        <button
          type="button"
          className="discuss-case-chat__jump-latest"
          onClick={() => scrollToLatest()}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {chatT(locale, 'jumpToLatest')}
        </button>
      ) : null}

      {actionError ? (
        <p className="discuss-case-chat__action-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {typingIndicator ? (
        <div className="discuss-case-chat__typing" role="status" aria-live="polite">
          <span className="discuss-case-chat__typing-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {typingIndicator}
        </div>
      ) : null}

      {canSend ? (
        <div className="discuss-case-chat__composer">
          {showVoiceRetentionNotice ? (
            <div className="discuss-case-chat__voice-retention-notice" role="note">
              <p>{formatRetentionNotice(voiceLocale(locale), voiceRetentionDays)}</p>
              <button
                type="button"
                className="discuss-case-chat__voice-retention-dismiss"
                onClick={dismissVoiceNotice}
              >
                {chatT(voiceLocale(locale), 'voiceRetentionDismiss')}
              </button>
            </div>
          ) : null}
          <div className="discuss-case-chat__composer-row">
          <div className="discuss-case-chat__composer-main">
            {pendingReply ? (
              <blockquote className="discuss-case-chat__composer-quote discuss-case-chat__composer-reply">
                {renderReplyPreviewText(pendingReply.preview, pendingReply.messageId)}
                <button
                  type="button"
                  className="discuss-case-chat__composer-quote-remove icon-action-btn"
                  onClick={clearPendingReply}
                  aria-label={chatT(locale, 'cancelReply')}
                  title={chatT(locale, 'cancelReply')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </blockquote>
            ) : pendingQuote ? (
              <blockquote className="discuss-case-chat__composer-quote">
                {pendingQuote.sectionLabel ? (
                  <cite className="discuss-case-chat__quote-label">
                    {chatT(locale, 'quoteFrom')} {pendingQuote.sectionLabel}
                  </cite>
                ) : null}
                <p className="discuss-case-chat__quote-text">{pendingQuote.text}</p>
                <button
                  type="button"
                  className="discuss-case-chat__composer-quote-remove icon-action-btn"
                  onClick={() => onPendingQuoteChange?.(null)}
                  aria-label={chatT(locale, 'removeQuote')}
                  title={chatT(locale, 'removeQuote')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </blockquote>
            ) : null}
            {recording ? (
              <div className="discuss-case-chat__recording" role="status">
                <span className="discuss-case-chat__recording-dot" aria-hidden="true" />
                <span className="discuss-case-chat__recording-label">{chatT(locale, 'recording')}</span>
                <span className="discuss-case-chat__recording-time">
                  {formatVoiceDuration(recordingMs)}
                </span>
                <div className="discuss-case-chat__recording-actions">
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={cancelRecording}
                    aria-label={chatT(locale, 'cancelRecording')}
                    title={chatT(locale, 'cancelRecording')}
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="discuss-case-chat__recording-stop icon-action-btn"
                    onClick={() => void stopRecording()}
                    aria-label={chatT(locale, 'stopRecording')}
                    title={chatT(locale, 'stopRecording')}
                  >
                    <Square className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : voicePreview ? (
              <div className="discuss-case-chat__voice-preview">
                <DiscussCaseVoiceMessagePlayer
                  discussionId={discussionId}
                  messageId="preview"
                  durationMs={voicePreview.durationMs}
                  locale={voiceLocale(locale)}
                  previewBlob={voicePreview.blob}
                />
                <div className="discuss-case-chat__voice-preview-actions">
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={cancelRecording}
                    disabled={voiceSending}
                    aria-label={chatT(locale, 'discardVoice')}
                    title={chatT(locale, 'discardVoice')}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="discuss-case-chat__send-btn discuss-case-chat__send-btn--inline"
                    disabled={voiceSending}
                    onClick={() => void sendVoicePreview()}
                    aria-label={chatT(locale, 'sendVoice')}
                    title={chatT(locale, 'sendVoice')}
                  >
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  ref={composerRef}
                  className="discuss-case-chat__input"
                  rows={3}
                  placeholder={chatT(locale, 'messagePlaceholder')}
                  value={messageDraft}
                  onChange={(e) => {
                    setMessageDraft(e.target.value)
                    pingTyping()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                />
                {emojiPickerOpen ? (
                  <DiscussCaseEmojiPicker
                    locale={reactionLocale(locale)}
                    mode="composer"
                    onSelect={handleInsertEmoji}
                    onClose={() => setEmojiPickerOpen(false)}
                  />
                ) : null}
              </>
            )}
          </div>
          {!recording && !voicePreview ? (
            <>
              <div className="discuss-case-chat__composer-tools">
                <button
                  type="button"
                  className={[
                    'discuss-case-chat__emoji-btn',
                    emojiPickerOpen ? 'discuss-case-chat__emoji-btn--active' : '',
                  ].join(' ').trim()}
                  disabled={sending || voiceSending}
                  onClick={() => setEmojiPickerOpen((open) => !open)}
                  aria-label={chatT(locale, 'insertEmoji')}
                  title={chatT(locale, 'insertEmoji')}
                  aria-expanded={emojiPickerOpen}
                >
                  <Smile className="h-4 w-4" strokeWidth={1.75} />
                </button>
                {canRecordVoice ? (
                  <button
                    type="button"
                    className={[
                      'discuss-case-chat__mic-btn',
                      recording ? 'discuss-case-chat__mic-btn--active' : '',
                    ].join(' ').trim()}
                    disabled={sending || voiceSending}
                    onClick={() => void startRecording()}
                    aria-label={chatT(locale, 'recordVoice')}
                    title={chatT(locale, 'recordVoice')}
                  >
                    <Mic className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="discuss-case-chat__send-btn"
                disabled={sending || (!messageDraft.trim() && !pendingQuote)}
                onClick={() => void handleSend()}
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          ) : null}
          </div>
        </div>
      ) : null}

      {canAskAi ? (
        <section className="discuss-case-chat__ai">
          <header className="discuss-case-chat__ai-header">
            <ButterflyLogo variant="color" breathing size={16} />
            <span>{chatT(locale, 'askButterfly')}</span>
          </header>
          <div className="discuss-case-chat__ai-composer">
            <textarea
              className="discuss-case-chat__input"
              rows={2}
              placeholder={chatT(locale, 'aiQuestionPlaceholder')}
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
            />
            <div className="discuss-case-chat__ai-actions-row">
              <button
                type="button"
                className="discuss-case-chat__ai-btn"
                disabled={aiLoading || !aiQuestion.trim()}
                onClick={() => void handleAskAi()}
              >
                {aiLoading ? (
                  <span className="clinical-loading__spinner" aria-hidden="true" />
                ) : (
                  chatT(locale, 'generateAnswer')
                )}
              </button>
            </div>
          </div>

          {aiError ? <p className="discuss-case-chat__ai-error">{aiError}</p> : null}

          {aiDraft ? (
            <div className="discuss-case-chat__ai-draft">
              <p className="discuss-case-chat__ai-draft-label">{chatT(locale, 'aiDraftLabel')}</p>
              <pre className="discuss-case-chat__ai-draft-text">{aiDraft}</pre>
              <div className="discuss-case-chat__ai-actions">
                <button type="button" onClick={() => void navigator.clipboard.writeText(aiDraft)}>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> {chatT(locale, 'aiCopy')}
                </button>
                {canSend ? (
                  <button
                    type="button"
                    className="discuss-case-chat__ai-send-chat"
                    disabled={sending}
                    onClick={() => void handleSendAiToChat()}
                  >
                    <Send className="h-3.5 w-3.5" strokeWidth={1.75} /> {chatT(locale, 'sendAiToChat')}
                  </button>
                ) : null}
                {canSend ? (
                  <button type="button" onClick={handleInsertAiDraft}>
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />{' '}
                    {chatT(locale, 'insertAiToComposer')}
                  </button>
                ) : null}
                {canSaveToCase && onSaveDraftToCase ? (
                  <button type="button" onClick={() => onSaveDraftToCase(aiDraft)}>
                    {chatT(locale, 'aiSaveDraft')}
                  </button>
                ) : null}
                <button type="button" onClick={() => void handleAskAi()}>
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> {chatT(locale, 'aiRegenerate')}
                </button>
                <button type="button" onClick={() => setAiDraft(null)}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {chatT(locale, 'aiDiscard')}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
