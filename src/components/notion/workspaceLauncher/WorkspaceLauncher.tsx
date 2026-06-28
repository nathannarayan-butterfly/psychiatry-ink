import { ChevronLeft, CornerDownLeft, Loader2, Mic, Search, Square, Wrench } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { useAuth } from '../../../context/AuthContext'
import { useCompactDictation } from '../../../hooks/useCompactDictation'
import { butterflyLogoSrc } from '../../../data/butterflyLogo'
import {
  LAUNCHER_TASKS,
  type LauncherCreationMode,
  type LauncherTarget,
  type LauncherTask,
} from '../../../data/workspaceLauncher/launcherTasks'
import { filterLauncherTasksForContext } from '../../../utils/workspaceLauncher/filterLauncherTasks'
import { searchLauncher, type LauncherSuggestion } from '../../../utils/workspaceLauncher/fuzzyMatch'
import { StandaloneNotesPanel } from '../standalone/StandaloneNotesPanel'
import '../../../styles/workspace-launcher.css'

const DEV_MODE_STORAGE_KEY = 'psychiatry-ink:developerMode'

export interface WorkspaceLauncherLaunchMeta {
  taskId: string
  modeId: string
  fallback: boolean
}

interface WorkspaceLauncherProps {
  /** Route the selected task + creation mode into the existing workspace system. */
  onLaunch: (target: LauncherTarget, meta: WorkspaceLauncherLaunchMeta) => void
  /** A real patient is linked — keeps patient-bound entries, hides standalone tools. */
  hasPatient: boolean
  /** Clinical requisitions can be raised (linked patient on a non-default case). */
  canRequestAnforderungen: boolean
  /**
   * Storage id of the standalone (default) case. When provided (patient-less
   * workspace) the saved-notes side panel is shown for that case.
   */
  notesCaseId?: string | null
}

function loadDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Short, technical description of a target — only shown in Developer Mode. */
function describeTarget(target: LauncherTarget): string {
  switch (target.kind) {
    case 'workspacePage': {
      let out = `page:${target.pageId}`
      if (target.variantId) out += `#${target.variantId}`
      if (target.sectionId) out += `§${target.sectionId}`
      if (target.dictation) out += '·dictate'
      return out
    }
    case 'topTab':
      return `tab:${target.tab}${target.medicationAdd ? '+add' : ''}`
    case 'template':
      return 'template-host'
    case 'anforderung':
      return 'anforderung-modal'
    case 'aiFeature':
      return `ai:${target.feature}`
    case 'standaloneGuided':
      return `standalone:guided:${target.itemType}`
    case 'standaloneTool':
      return `standalone:tool:${target.tool}`
  }
}

function getGridColumns(grid: HTMLElement | null): number {
  if (!grid) return 1
  const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean)
  return Math.max(1, tracks.length)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Same store the dashboard greeting (`useAccountDisplayName`) reads from.
const ACCOUNT_PROFILE_KEY = 'psychiatry-ink:account-profile'
const ACCOUNT_PROFILE_PLACEHOLDER = 'Dr. —'
// Common academic / honorific prefixes to skip when picking a first name.
const NAME_TITLES = new Set([
  'dr',
  'dr.',
  'prof',
  'prof.',
  'med',
  'med.',
  'dipl',
  'dipl.',
  'mag',
  'mag.',
  'mr',
  'mr.',
  'mrs',
  'mrs.',
  'ms',
  'ms.',
  'herr',
  'frau',
])

/** First usable given-name token from a full name, skipping honorifics. */
function firstNameFromFull(full: string | null | undefined): string | null {
  if (typeof full !== 'string') return null
  const trimmed = full.trim()
  if (!trimmed || EMAIL_RE.test(trimmed)) return null
  const tokens = trimmed.split(/\s+/)
  const firstReal = tokens.find((token) => !NAME_TITLES.has(token.toLowerCase()))
  return firstReal ?? null
}

/** Display name from the account-profile store (shared with the dashboard). */
function readAccountProfileName(): string | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { name?: unknown }
    const name = typeof parsed?.name === 'string' ? parsed.name.trim() : ''
    return name && name !== ACCOUNT_PROFILE_PLACEHOLDER ? name : null
  } catch {
    return null
  }
}

/**
 * Best-effort first name for the greeting. Resolution order:
 *   1. `account-profile` store — the same source the dashboard greeting uses,
 *      so the launcher stays consistent and lights up the moment a name is set.
 *   2. Supabase auth `user_metadata` given-name fields (`first_name` /
 *      `given_name`), then display-name fields (`full_name` / `name` /
 *      `display_name`).
 * Honorifics are stripped and the first given-name token is returned. Returns
 * `null` when no usable, non-email name exists anywhere → name-less greeting.
 *
 * NOTE: in the current build none of these are populated for real accounts
 * (verified: `auth.users` carries no name metadata, there is no `profiles`
 * table, and the account-profile store has no writer yet), so the launcher
 * shows the friendly name-less greeting until a name source is wired up.
 */
function getFirstName(metadata: Record<string, unknown> | undefined): string | null {
  const fromAccount = firstNameFromFull(readAccountProfileName())
  if (fromAccount) return fromAccount

  const given = metadata?.first_name ?? metadata?.given_name
  const fromGiven = firstNameFromFull(typeof given === 'string' ? given : null)
  if (fromGiven) return fromGiven

  for (const key of ['full_name', 'name', 'display_name'] as const) {
    const value = metadata?.[key]
    const fromFull = firstNameFromFull(typeof value === 'string' ? value : null)
    if (fromFull) return fromFull
  }

  return null
}

export function WorkspaceLauncher({
  onLaunch,
  hasPatient,
  canRequestAnforderungen,
  notesCaseId,
}: WorkspaceLauncherProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const tasks = useMemo(
    () => filterLauncherTasksForContext(LAUNCHER_TASKS, { hasPatient, canRequestAnforderungen }),
    [hasPatient, canRequestAnforderungen],
  )
  const greeting = useMemo(() => {
    const firstName = getFirstName(user?.user_metadata as Record<string, unknown> | undefined)
    return firstName
      ? t('launcherGreetingNamed').replace('{name}', firstName)
      : t('launcherGreeting')
  }, [t, user?.user_metadata])
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'home' | 'followup'>('home')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [devMode, setDevMode] = useState(loadDevMode)

  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isModeEnabled = useCallback(
    (_task: LauncherTask, mode: LauncherCreationMode) =>
      !mode.languageOnly || mode.languageOnly === language,
    [language],
  )

  const enabledModes = useCallback(
    (task: LauncherTask) => task.modes.filter((mode) => isModeEnabled(task, mode)),
    [isModeEnabled],
  )

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  )

  const suggestions = useMemo<LauncherSuggestion[]>(
    () =>
      query.trim()
        ? searchLauncher(tasks, query, { localize: t, isModeEnabled })
        : [],
    [query, t, isModeEnabled, tasks],
  )

  const followupModes = useMemo(
    () => (selectedTask ? enabledModes(selectedTask) : []),
    [selectedTask, enabledModes],
  )

  // Which collection the keyboard currently drives.
  const mode: 'grid' | 'suggestions' | 'followup' =
    view === 'followup' ? 'followup' : query.trim() ? 'suggestions' : 'grid'

  const itemCount =
    mode === 'grid'
      ? tasks.length
      : mode === 'suggestions'
        ? suggestions.length
        : followupModes.length

  useEffect(() => {
    setActiveIndex(0)
  }, [mode, query, selectedTaskId, suggestions.length, followupModes.length])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const container = mode === 'grid' ? gridRef.current : listRef.current
    const active = container?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, mode])

  const toggleDevMode = useCallback(() => {
    setDevMode((current) => {
      const next = !current
      try {
        localStorage.setItem(DEV_MODE_STORAGE_KEY, next ? 'true' : 'false')
      } catch {
        /* localStorage unavailable */
      }
      return next
    })
  }, [])

  const launchMode = useCallback(
    (task: LauncherTask, modeItem: LauncherCreationMode) => {
      onLaunch(modeItem.target, {
        taskId: task.id,
        modeId: modeItem.id,
        fallback: Boolean(modeItem.fallback),
      })
    },
    [onLaunch],
  )

  const openTask = useCallback(
    (task: LauncherTask) => {
      const modes = enabledModes(task)
      // Single creation mode → skip the follow-up step and launch directly.
      if (modes.length === 1) {
        launchMode(task, modes[0]!)
        return
      }
      setSelectedTaskId(task.id)
      setView('followup')
    },
    [enabledModes, launchMode],
  )

  const goBackHome = useCallback(() => {
    setView('home')
    setSelectedTaskId(null)
    inputRef.current?.focus()
  }, [])

  // Voice input reuses the app's existing compact dictation flow (record →
  // billed `/api/transcribe`) — the same hook Ask Butterfly uses. After
  // transcription we fuzzy-match the spoken intent and launch the top hit when
  // it is confident enough; otherwise the transcript stays in the search box.
  const [emptyTranscript, setEmptyTranscript] = useState(false)
  const applyTranscription = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        // Recorded + transcribed, but nothing intelligible came back.
        setEmptyTranscript(true)
        inputRef.current?.focus()
        return
      }
      setEmptyTranscript(false)

      const matches = searchLauncher(tasks, trimmed, {
        localize: t,
        isModeEnabled,
        limit: 1,
      })
      const top = matches[0]
      // Spoken phrases are usually ≥4 chars; skip auto-launch for tiny fragments.
      if (top && trimmed.length >= 4) {
        if (top.type === 'task') openTask(top.task)
        else launchMode(top.task, top.mode)
        return
      }

      setQuery(trimmed)
      setView('home')
      setSelectedTaskId(null)
      inputRef.current?.focus()
    },
    [t, isModeEnabled, openTask, launchMode, tasks],
  )

  const {
    isRecording,
    isTranscribing,
    toggleRecording,
    error: dictationError,
  } = useCompactDictation({ onTranscriptionComplete: applyTranscription, language })

  const handleMicClick = useCallback(() => {
    setEmptyTranscript(false)
    toggleRecording()
  }, [toggleRecording])

  const voiceError = (() => {
    if (dictationError) {
      if (dictationError === 'microphone_unavailable' || dictationError === 'microphone_denied') {
        return t('launcherVoiceErrorMic')
      }
      if (dictationError === 'empty_recording') return t('launcherVoiceErrorEmpty')
      if (/credit/i.test(dictationError)) return t('launcherVoiceErrorCredits')
      if (/anmeldung|401|unauthorized|authentication/i.test(dictationError)) {
        return t('launcherVoiceErrorAuth')
      }
      if (/failed to fetch|network|ECONNREFUSED|502|503|504/i.test(dictationError)) {
        return t('launcherVoiceErrorServer')
      }
      return t('launcherVoiceErrorGeneric')
    }
    if (emptyTranscript) return t('launcherVoiceErrorEmpty')
    return null
  })()

  const activateCurrent = useCallback(() => {
    if (mode === 'grid') {
      const task = tasks[activeIndex]
      if (task) openTask(task)
      return
    }
    if (mode === 'suggestions') {
      const suggestion = suggestions[activeIndex]
      if (!suggestion) return
      if (suggestion.type === 'task') openTask(suggestion.task)
      else launchMode(suggestion.task, suggestion.mode)
      return
    }
    const modeItem = followupModes[activeIndex]
    if (selectedTask && modeItem) launchMode(selectedTask, modeItem)
  }, [mode, activeIndex, suggestions, followupModes, selectedTask, openTask, launchMode, tasks])

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          const step = mode === 'grid' ? getGridColumns(gridRef.current) : 1
          setActiveIndex((i) => Math.min(i + step, itemCount - 1))
          return
        }
        case 'ArrowUp': {
          event.preventDefault()
          const step = mode === 'grid' ? getGridColumns(gridRef.current) : 1
          setActiveIndex((i) => Math.max(i - step, 0))
          return
        }
        case 'ArrowRight':
          if (mode === 'grid') {
            event.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, itemCount - 1))
          }
          return
        case 'ArrowLeft':
          if (mode === 'grid') {
            event.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (mode === 'followup') {
            event.preventDefault()
            goBackHome()
          }
          return
        case 'Enter':
          event.preventDefault()
          activateCurrent()
          return
        case 'Escape':
          if (view === 'followup') {
            event.preventDefault()
            goBackHome()
          } else if (query) {
            event.preventDefault()
            setQuery('')
          }
          return
        default:
          return
      }
    },
    [mode, itemCount, view, query, activateCurrent, goBackHome],
  )

  const devBadge = (text: string) =>
    import.meta.env.DEV && devMode ? <span className="wl-dev-badge">{text}</span> : null

  return (
    <div className="wl-root" role="region" aria-label={greeting}>
      <div className="wl-box">
        <div className="wl-head">
          {butterflyLogoSrc ? (
            <img className="wl-logo" src={butterflyLogoSrc} alt="" aria-hidden decoding="async" />
          ) : null}
          <h1 className="wl-heading">{greeting}</h1>
        </div>

        <div className={`wl-search${isRecording ? ' wl-search--recording' : ''}`}>
          <Search className="wl-search__icon h-5 w-5" strokeWidth={2} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className="wl-search__input"
            value={query}
            placeholder={t('launcherSearchPlaceholder')}
            aria-label={t('launcherSearchLabel')}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value)
              if (view === 'followup') goBackHome()
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className={`wl-mic${isRecording ? ' wl-mic--recording' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleMicClick}
            disabled={isTranscribing}
            aria-pressed={isRecording}
            aria-label={
              isTranscribing
                ? t('launcherVoiceTranscribing')
                : isRecording
                  ? t('launcherVoiceStop')
                  : t('launcherVoiceStart')
            }
            title={
              isTranscribing
                ? t('launcherVoiceTranscribing')
                : isRecording
                  ? t('launcherVoiceStop')
                  : t('launcherVoiceStart')
            }
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 wl-mic__spin" strokeWidth={2} aria-hidden />
            ) : isRecording ? (
              <Square className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            ) : (
              <Mic className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        {voiceError ? (
          <p className="wl-voice-error" role="alert">
            {voiceError}
          </p>
        ) : null}

        {notesCaseId && mode === 'grid' ? <StandaloneNotesPanel caseId={notesCaseId} /> : null}

        {view === 'followup' && selectedTask ? (
          <div className="wl-followup">
            <div className="wl-followup__head">
              <button
                type="button"
                className="wl-followup__back"
                onMouseDown={(e) => e.preventDefault()}
                onClick={goBackHome}
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {t('launcherFollowupBack')}
              </button>
              <span className="wl-followup__task">{t(selectedTask.labelKey)}</span>
            </div>
            <p className="wl-followup__heading">{t('launcherFollowupHeading')}</p>
            <div className="wl-list" ref={listRef} role="listbox" aria-label={t('launcherFollowupHeading')}>
              {followupModes.map((modeItem, index) => (
                <button
                  key={modeItem.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  tabIndex={-1}
                  className="wl-row"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => launchMode(selectedTask, modeItem)}
                >
                  <span className="wl-row__label">
                    {t(modeItem.labelKey)}
                    {modeItem.fallback ? (
                      <span className="wl-fallback">{t('launcherFallbackBadge')}</span>
                    ) : null}
                  </span>
                  {devBadge(describeTarget(modeItem.target))}
                  <CornerDownLeft className="wl-row__enter h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : query.trim() ? (
          <div className="wl-list" ref={listRef} role="listbox" aria-label={t('launcherSuggestionsLabel')}>
            {suggestions.length === 0 ? (
              <p className="wl-empty">{t('launcherNoResults')}</p>
            ) : (
              suggestions.map((suggestion, index) => {
                const Icon = suggestion.task.icon
                const key =
                  suggestion.type === 'task'
                    ? `task:${suggestion.task.id}`
                    : `mode:${suggestion.task.id}:${suggestion.mode.id}`
                const label =
                  suggestion.type === 'task'
                    ? t(suggestion.task.labelKey)
                    : t(suggestion.mode.labelKey)
                const sub =
                  suggestion.type === 'mode'
                    ? t(suggestion.task.labelKey)
                    : t(suggestion.task.descKey)
                const target =
                  suggestion.type === 'mode'
                    ? suggestion.mode.target
                    : undefined
                const isFallback = suggestion.type === 'mode' && suggestion.mode.fallback
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    data-active={index === activeIndex}
                    tabIndex={-1}
                    className="wl-row wl-row--suggestion"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (suggestion.type === 'task') openTask(suggestion.task)
                      else launchMode(suggestion.task, suggestion.mode)
                    }}
                  >
                    <Icon className="wl-row__icon h-4 w-4" strokeWidth={1.75} aria-hidden />
                    <span className="wl-row__text">
                      <span className="wl-row__label">
                        {label}
                        {isFallback ? (
                          <span className="wl-fallback">{t('launcherFallbackBadge')}</span>
                        ) : null}
                      </span>
                      <span className="wl-row__sub">{sub}</span>
                    </span>
                    {devBadge(target ? describeTarget(target) : `task:${suggestion.task.id}`)}
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <div className="wl-grid" ref={gridRef} role="listbox" aria-label={t('launcherTaskGridLabel')}>
            {tasks.map((task, index) => {
              const Icon = task.icon
              return (
                <button
                  key={task.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  tabIndex={-1}
                  className="wl-card"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openTask(task)}
                >
                  <span className="wl-card__icon">
                    <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="wl-card__label">{t(task.labelKey)}</span>
                  <span className="wl-card__desc">{t(task.descKey)}</span>
                  {devBadge(`${task.id} · ${task.category}`)}
                </button>
              )
            })}
          </div>
        )}

        <div className="wl-footer">
          <span className="wl-hint">{t('launcherHint')}</span>
          {import.meta.env.DEV ? (
            <button
              type="button"
              className={`wl-dev-toggle${devMode ? ' wl-dev-toggle--on' : ''}`}
              aria-pressed={devMode}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleDevMode}
              title={t('launcherDevToggle')}
            >
              <Wrench className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('launcherDevToggle')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
