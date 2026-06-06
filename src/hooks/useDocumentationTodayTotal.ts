import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatDocumentationDuration,
  getDocumentationTodayDateKey,
  readDocumentationTodayTotalSeconds,
  writeDocumentationTodayTotalSeconds,
} from '../utils/documentationTodayTotal'

const TICK_MS = 1000

export function useDocumentationTodayTotal() {
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(() =>
    readDocumentationTodayTotalSeconds(),
  )
  const shouldCountRef = useRef(false)
  const todayTotalSecondsRef = useRef(todayTotalSeconds)
  const dateKeyRef = useRef(getDocumentationTodayDateKey())

  todayTotalSecondsRef.current = todayTotalSeconds

  const setShouldCountTodayTotal = useCallback((shouldCount: boolean) => {
    shouldCountRef.current = shouldCount
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const dateKey = getDocumentationTodayDateKey()
      if (dateKey !== dateKeyRef.current) {
        dateKeyRef.current = dateKey
        todayTotalSecondsRef.current = 0
        setTodayTotalSeconds(0)
      }

      if (!shouldCountRef.current) return

      const nextSeconds = todayTotalSecondsRef.current + 1
      todayTotalSecondsRef.current = nextSeconds
      writeDocumentationTodayTotalSeconds(nextSeconds, dateKey)
      setTodayTotalSeconds(nextSeconds)
    }, TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return {
    todayTotalSeconds,
    todayTotalLabel: formatDocumentationDuration(todayTotalSeconds),
    setShouldCountTodayTotal,
  }
}
