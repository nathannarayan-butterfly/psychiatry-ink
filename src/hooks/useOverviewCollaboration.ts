import { useEffect, useState } from 'react'
import { listConsultationsForCase } from '../services/consultationApi'
import { listDiscussions } from '../services/discussCaseApi'
import { CONSULTATION_STATUS_LABELS } from '../types/consultation'
import type { KonsileTasksData, KonsilCardItem } from '../components/notion/overview/types'
import { formatDateDe } from '../utils/overview/dateLabels'

const DISCUSS_STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  archived: 'Archiviert',
  revoked: 'Entzogen',
}

function konsilTone(status: string): KonsilCardItem['tone'] {
  if (status === 'submitted') return 'ok'
  if (status === 'draft' || status === 'sent') return 'info'
  if (status === 'more_info_requested') return 'moderate'
  return 'neutral'
}

/** Loads recent Discuss + Konsil activity for the Übersicht collaboration widget. */
export function useOverviewCollaboration(caseId: string): KonsileTasksData {
  const [data, setData] = useState<KonsileTasksData>({
    konsile: [],
    discussions: [],
    tasks: [],
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setData((prev) => ({ ...prev, loading: true }))
      try {
        const [discussions, konsile] = await Promise.all([
          listDiscussions(caseId).catch(() => []),
          listConsultationsForCase(caseId).catch(() => []),
        ])
        if (cancelled) return

        setData({
          loading: false,
          discussions: discussions.slice(0, 4).map((d) => ({
            id: d.id,
            title: d.title,
            statusLabel: DISCUSS_STATUS_LABEL[d.status] ?? d.status,
            tone: d.status === 'active' ? 'info' : 'neutral',
          })),
          konsile: konsile.slice(0, 4).map((k) => ({
            id: k.id,
            title: k.title,
            statusLabel: CONSULTATION_STATUS_LABELS[k.status] ?? k.status,
            tone: konsilTone(k.status),
          })),
          tasks: [],
        })
      } catch {
        if (!cancelled) {
          setData({ konsile: [], discussions: [], tasks: [], loading: false })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [caseId])

  return data
}

/** Formats a calendar ISO timestamp for compact appointment rows. */
export function formatAppointmentRowLabel(iso: string): { dateLabel: string; timeLabel: string } {
  const date = new Date(iso)
  const dateLabel = formatDateDe(iso) ?? iso
  const timeLabel = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return { dateLabel, timeLabel }
}
