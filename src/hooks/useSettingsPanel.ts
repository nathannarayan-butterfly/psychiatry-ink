import { useCallback, useState } from 'react'
import type { SettingsSectionId } from '../types/settings'

export function useSettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance')

  const openSettings = useCallback((section: SettingsSectionId = 'appearance') => {
    setActiveSection(section)
    setIsOpen(true)
  }, [])

  const closeSettings = useCallback(() => setIsOpen(false), [])

  return {
    isOpen,
    activeSection,
    setActiveSection,
    openSettings,
    closeSettings,
  }
}
