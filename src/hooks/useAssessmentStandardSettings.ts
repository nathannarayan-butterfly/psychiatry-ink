import { useCallback, useEffect, useState } from 'react'
import type { AssessmentStandard } from '../types/isdm'
import { safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink-assessment-standard'

function loadAssessmentStandard(): AssessmentStandard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'international_structured_diagnostic_mapping') {
      return 'international_structured_diagnostic_mapping'
    }
  } catch {
    // ignore
  }
  return 'local_clinical'
}

export function useAssessmentStandardSettings() {
  const [assessmentStandard, setAssessmentStandardState] =
    useState<AssessmentStandard>(loadAssessmentStandard)

  useEffect(() => {
    safeSetItem(STORAGE_KEY, assessmentStandard)
  }, [assessmentStandard])

  const selectAssessmentStandard = useCallback((next: AssessmentStandard) => {
    setAssessmentStandardState(next)
  }, [])

  const isIsdmActive = assessmentStandard === 'international_structured_diagnostic_mapping'

  return {
    assessmentStandard,
    isIsdmActive,
    selectAssessmentStandard,
  }
}
