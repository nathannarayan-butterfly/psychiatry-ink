import { describe, expect, it } from 'vitest'
import {
  classifyViewport,
  isPhoneViewport,
  PHONE_BREAKPOINT_PX,
  TABLET_BREAKPOINT_PX,
} from '../responsiveBreakpoints'

describe('responsive breakpoints', () => {
  describe('isPhoneViewport (shortest-edge / min-dimension logic)', () => {
    it('gates a phone in portrait', () => {
      expect(isPhoneViewport(390, 844)).toBe(true) // iPhone 14 portrait
    })

    it('gates a phone in landscape (width above 768 but shortest edge tiny)', () => {
      expect(isPhoneViewport(844, 390)).toBe(true) // iPhone 14 landscape
      expect(isPhoneViewport(932, 430)).toBe(true) // iPhone 15 Pro Max landscape
    })

    it('does NOT gate an iPad in portrait (768–834px → tablet)', () => {
      expect(isPhoneViewport(768, 1024)).toBe(false) // iPad / iPad mini 5
      expect(isPhoneViewport(820, 1180)).toBe(false) // iPad Air
      expect(isPhoneViewport(834, 1194)).toBe(false) // iPad Pro 11"
    })

    it('does NOT gate an iPad in landscape', () => {
      expect(isPhoneViewport(1024, 768)).toBe(false)
      expect(isPhoneViewport(1366, 1024)).toBe(false) // iPad Pro 12.9" landscape
    })

    it('does NOT gate a desktop', () => {
      expect(isPhoneViewport(1440, 900)).toBe(false)
    })

    it('treats exactly the breakpoint as NOT a phone (strict less-than)', () => {
      expect(isPhoneViewport(PHONE_BREAKPOINT_PX, 1200)).toBe(false)
      expect(isPhoneViewport(PHONE_BREAKPOINT_PX - 1, 1200)).toBe(true)
    })
  })

  describe('classifyViewport', () => {
    it('classifies phones', () => {
      expect(classifyViewport(390, 844)).toBe('phone')
      expect(classifyViewport(844, 390)).toBe('phone')
    })

    it('classifies tablets (portrait + landscape up to the tablet width)', () => {
      expect(classifyViewport(768, 1024)).toBe('tablet') // iPad portrait
      expect(classifyViewport(1024, 768)).toBe('tablet') // iPad landscape at the boundary
    })

    it('classifies desktops above the tablet width', () => {
      expect(classifyViewport(TABLET_BREAKPOINT_PX + 1, 900)).toBe('desktop')
      expect(classifyViewport(1440, 900)).toBe('desktop')
    })
  })
})
