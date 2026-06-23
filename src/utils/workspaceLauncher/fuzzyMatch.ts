import type { LauncherCreationMode, LauncherTask } from '../../data/workspaceLauncher/launcherTasks'

/**
 * Lightweight, dependency-free fuzzy matcher for the Workspace Launcher search.
 *
 * No heavy fuzzy library is pulled in — this is a small subsequence matcher with
 * substring / prefix / word-boundary bonuses, which is plenty for matching short
 * clinical task labels and keyword lists. A higher score means a better match;
 * `0` means "no match".
 */

/** Lower-case + strip diacritics so "psychopathologie" matches "Psychopath…". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const WORD_BOUNDARY = /[\s\-/_.,()]/

/**
 * Score how well `query` matches `target`. Returns 0 when `query` is not at
 * least a subsequence of `target`.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = normalizeText(query)
  const t = normalizeText(target)
  if (!q) return 0
  if (!t) return 0

  // Exact / substring matches rank highest, with a prefix and word-boundary bonus.
  const idx = t.indexOf(q)
  if (idx >= 0) {
    if (idx === 0) return 1000 - t.length
    if (WORD_BOUNDARY.test(t[idx - 1] ?? '')) return 900 - t.length
    return 760 - idx - Math.round(t.length * 0.1)
  }

  // Subsequence match: every query char appears in order within the target.
  let ti = 0
  let consecutive = 0
  let bonus = 0
  let matched = 0
  for (let qi = 0; qi < q.length; qi += 1) {
    const ch = q[qi]!
    let found = -1
    for (let k = ti; k < t.length; k += 1) {
      if (t[k] === ch) {
        found = k
        break
      }
    }
    if (found < 0) return 0
    matched += 1
    // Reward consecutive runs and matches that start a word.
    if (found === ti) {
      consecutive += 1
      bonus += 8 + consecutive * 2
    } else {
      consecutive = 0
      if (WORD_BOUNDARY.test(t[found - 1] ?? '')) bonus += 12
    }
    ti = found + 1
  }
  if (matched < q.length) return 0
  // Base + bonuses, lightly penalised by target length so tighter labels win.
  return 400 + bonus - Math.round(t.length * 0.2)
}

/** Best score of `query` against any of the provided candidate strings. */
export function bestScore(query: string, candidates: Array<string | undefined>): number {
  let best = 0
  for (const candidate of candidates) {
    if (!candidate) continue
    const score = fuzzyScore(query, candidate)
    if (score > best) best = score
  }
  return best
}

// Filler words (DE + EN) stripped before token matching so a spoken sentence
// like "ich möchte einen Arztbrief schreiben" reduces to its content words
// (arztbrief). Diacritics are already removed by normalizeText.
const INTENT_STOPWORDS = new Set([
  // German articles / pronouns / filler
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem',
  'einer', 'eines', 'und', 'oder', 'ich', 'wir', 'mir', 'mich', 'mal', 'bitte',
  'mochte', 'mochten', 'will', 'wollen', 'kann', 'konnte', 'soll', 'neu', 'neue',
  'neuen', 'neuer', 'neues', 'fur', 'zum', 'zur', 'auf', 'aus', 'mit', 'machen',
  'erstellen', 'schreiben', 'anlegen', 'starten', 'offnen', 'erfassen', 'heute',
  'jetzt', 'gerne', 'einfach', 'nochmal', 'eintragen', 'dokumentieren',
  // English filler / verbs
  'the', 'a', 'an', 'i', 'we', 'my', 'me', 'please', 'want', 'wanna', 'need',
  'would', 'like', 'new', 'make', 'create', 'write', 'open', 'start', 'add',
  'for', 'to', 'do', 'let', 'lets', 'record', 'document', 'enter', 'now',
])

/** Split a normalized string into content tokens (length ≥ 3, no stopwords). */
function contentTokens(normalized: string, dropStopwords = true): string[] {
  return normalized
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && (!dropStopwords || !INTENT_STOPWORDS.has(w)))
}

/**
 * Token / keyword based score for multi-word or full-sentence queries (e.g. a
 * voice transcript). Rewards candidate phrases that appear verbatim in the
 * query and candidate words that match the query's content tokens. Returns `0`
 * when no candidate term is found. This complements {@link fuzzyScore} (which
 * needs the whole query to be a subsequence of a short label and therefore
 * scores spoken sentences at 0).
 */
export function intentScore(query: string, candidates: Array<string | undefined>): number {
  const queryNorm = normalizeText(query)
  if (!queryNorm) return 0
  const queryTokens = new Set(contentTokens(queryNorm))
  if (queryTokens.size === 0) return 0

  let score = 0
  let matchedTerms = 0

  for (const candidate of candidates) {
    if (!candidate) continue
    const c = normalizeText(candidate)
    if (c.length < 3) continue

    // Whole candidate phrase present in the spoken text → strongest signal.
    if (queryNorm.includes(c)) {
      score += 60 + c.length
      matchedTerms += 1
      continue
    }

    // Otherwise count candidate words that hit the query's content tokens.
    for (const word of contentTokens(c, false)) {
      if (queryTokens.has(word)) {
        score += 32
        matchedTerms += 1
      } else {
        for (const qt of queryTokens) {
          if (qt.length >= 4 && (qt.startsWith(word) || word.startsWith(qt))) {
            score += 14
            matchedTerms += 1
            break
          }
        }
      }
    }
  }

  return matchedTerms > 0 ? score : 0
}

export type LauncherSuggestion =
  | { type: 'task'; task: LauncherTask; score: number }
  | { type: 'mode'; task: LauncherTask; mode: LauncherCreationMode; score: number }

export interface SearchLauncherOptions {
  /** Resolve an i18n key to its localized display string. */
  localize: (key: LauncherTask['labelKey']) => string
  /** Hide modes that are not currently available (e.g. language-gated). */
  isModeEnabled?: (task: LauncherTask, mode: LauncherCreationMode) => boolean
  /** Maximum number of suggestions to return. */
  limit?: number
}

/**
 * Rank tasks and creation modes against `query`. Returns both task suggestions
 * (which open the follow-up creation step) and mode suggestions (deep shortcuts
 * that launch directly), so typing e.g. "psycho" surfaces the Psychopathologie
 * task alongside the "Psychopathologie aus Verlauf extrahieren" mode.
 */
export function searchLauncher(
  tasks: LauncherTask[],
  query: string,
  options: SearchLauncherOptions,
): LauncherSuggestion[] {
  const { localize, isModeEnabled, limit = 9 } = options
  const q = query.trim()
  if (!q) return []

  const suggestions: LauncherSuggestion[] = []

  for (const task of tasks) {
    const taskLabel = localize(task.labelKey)
    const taskTerms = [taskLabel, ...task.keywords]
    // Combine the exact/subsequence score (great for typed fragments like
    // "psycho") with the token/keyword score (great for spoken sentences like
    // "ich möchte einen Arztbrief schreiben", which never subsequence-match).
    const taskScore = Math.max(bestScore(q, taskTerms), intentScore(q, taskTerms))
    if (taskScore > 0) {
      suggestions.push({ type: 'task', task, score: taskScore })
    }

    for (const mode of task.modes) {
      if (isModeEnabled && !isModeEnabled(task, mode)) continue
      // A mode only surfaces as a distinct shortcut when the query matches its
      // OWN label/keywords. Matching merely via the parent task label would
      // flood the list with every mode of an already-matched task (the task
      // card itself already covers those via the follow-up step).
      const modeTerms = [localize(mode.labelKey), ...(mode.keywords ?? [])]
      const modeScore = Math.max(bestScore(q, modeTerms), intentScore(q, modeTerms))
      if (modeScore > 0) {
        // Slightly de-prioritise mode shortcuts vs. their parent task so the
        // broader card sorts first on equal-ish matches.
        suggestions.push({ type: 'mode', task, mode, score: modeScore - 1 })
      }
    }
  }

  suggestions.sort((a, b) => b.score - a.score)
  return suggestions.slice(0, limit)
}
