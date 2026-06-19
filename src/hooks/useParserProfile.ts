import { useCallback, useEffect, useState } from 'react'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'
import {
  EMPTY_PARSER_PROFILE,
  type HeadingAlias,
  type ParserProfile,
  type TabularColumnAlias,
} from '../schemas/documentImport/parserProfile'
import type { DateLocationHint } from '../utils/documentImport/dateAssociation'
import {
  clearParserProfile,
  loadParserProfile,
  saveParserProfile,
} from '../utils/documentImport/parserProfileStore'

export interface UseParserProfileResult {
  profile: ParserProfile
  setDateLocation: (dateLocation: DateLocationHint) => void
  addHeadingAlias: (alias: HeadingAlias) => void
  updateHeadingAlias: (index: number, alias: HeadingAlias) => void
  removeHeadingAlias: (index: number) => void
  addColumnAlias: (alias: TabularColumnAlias) => void
  updateColumnAlias: (index: number, alias: TabularColumnAlias) => void
  removeColumnAlias: (index: number) => void
  reset: () => void
}

/**
 * Per-user parser-profile hook. Loads the profile for the signed-in user and
 * persists every change (mirrors the auto-saving settings hooks in this app).
 */
export function useParserProfile(): UseParserProfileResult {
  const userId = useKnowledgeBaseUserId()
  const [profile, setProfile] = useState<ParserProfile>(() => loadParserProfile(userId))

  useEffect(() => {
    setProfile(loadParserProfile(userId))
  }, [userId])

  const commit = useCallback(
    (next: ParserProfile) => {
      const saved = saveParserProfile(userId, next)
      setProfile(saved)
    },
    [userId],
  )

  const setDateLocation = useCallback(
    (dateLocation: DateLocationHint) => commit({ ...profile, dateLocation }),
    [commit, profile],
  )

  const addHeadingAlias = useCallback(
    (alias: HeadingAlias) => commit({ ...profile, headingAliases: [...profile.headingAliases, alias] }),
    [commit, profile],
  )

  const updateHeadingAlias = useCallback(
    (index: number, alias: HeadingAlias) =>
      commit({
        ...profile,
        headingAliases: profile.headingAliases.map((a, i) => (i === index ? alias : a)),
      }),
    [commit, profile],
  )

  const removeHeadingAlias = useCallback(
    (index: number) =>
      commit({ ...profile, headingAliases: profile.headingAliases.filter((_, i) => i !== index) }),
    [commit, profile],
  )

  const addColumnAlias = useCallback(
    (alias: TabularColumnAlias) =>
      commit({ ...profile, columnAliases: [...profile.columnAliases, alias] }),
    [commit, profile],
  )

  const updateColumnAlias = useCallback(
    (index: number, alias: TabularColumnAlias) =>
      commit({
        ...profile,
        columnAliases: profile.columnAliases.map((a, i) => (i === index ? alias : a)),
      }),
    [commit, profile],
  )

  const removeColumnAlias = useCallback(
    (index: number) =>
      commit({ ...profile, columnAliases: profile.columnAliases.filter((_, i) => i !== index) }),
    [commit, profile],
  )

  const reset = useCallback(() => {
    clearParserProfile(userId)
    setProfile(EMPTY_PARSER_PROFILE)
  }, [userId])

  return {
    profile,
    setDateLocation,
    addHeadingAlias,
    updateHeadingAlias,
    removeHeadingAlias,
    addColumnAlias,
    updateColumnAlias,
    removeColumnAlias,
    reset,
  }
}
