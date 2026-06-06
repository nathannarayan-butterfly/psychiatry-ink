export type TimelineDateKind = 'ddmmyy' | 'mmyy' | 'yy' | 'age'

export type TimelinePriority = 'low' | 'medium' | 'high' | 'critical'

export type TimelineLayout = 'horizontal' | 'snake' | 'list'

export type UtilityToolId = 'timeline' | 'lab'

export interface TimelineEntry {
  id: string
  heading: string
  subheading: string
  priority: TimelinePriority
  dateKind: TimelineDateKind
  dateValue: string
  sortKey: number
  displayDate: string
  visible: boolean
}

export interface TimelineState {
  layout: TimelineLayout
  entries: TimelineEntry[]
}

export interface TimelineSnapshot {
  layout: TimelineLayout
  entries: TimelineEntry[]
}

export interface SavedTimeline {
  id: string
  title: string
  entries: TimelineEntry[]
  layout: TimelineLayout
  updatedAt: string
}
