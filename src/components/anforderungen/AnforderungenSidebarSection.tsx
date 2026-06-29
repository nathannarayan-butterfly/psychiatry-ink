import { useCallback, useMemo } from 'react'
import { Check, FileDown, FileText, FileType, Printer, Trash2, X as XIcon } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { useAuth } from '../../context/AuthContext'
import { useCurrentOrganisation } from '../../hooks/permissions/useCurrentOrganisation'
import { useCurrentMember } from '../../hooks/permissions/useCurrentMember'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import { useAnforderungen } from '../../hooks/useAnforderungen'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { shortCaseId } from '../../utils/caseContext'
import type { Anforderung, AnforderungUrgency } from '../../types/anforderung'
import { isActiveAnforderung } from '../../types/anforderung'
import {
  canAcceptAnforderung,
  cancelAnforderung,
  deleteAnforderung,
  needsAnforderungAcceptance,
  updateAnforderungStatus,
} from '../../utils/anforderungen/storage'
import {
  diagnosticsTabForResultLink,
  resolveAnforderungResultState,
  resolveResultLink,
} from '../../utils/anforderungen/resultLinks'
import { printAnforderungen, printSingleAnforderung } from '../../utils/anforderungen/printAnforderung'
import {
  exportAnforderungenAsPdf,
  exportAnforderungenAsText,
  exportAnforderungenAsWord,
} from '../../utils/anforderungen/exportAnforderungen'
import { setDiagnosticsSectionPref } from '../../utils/befundArchive'
import { showNotionToast } from '../notion/NotionToast'

interface AnforderungenSidebarSectionProps {
  caseId: string
  onAddClick: () => void
  onNavigateToLabor?: () => void
  readOnly?: boolean
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-')
      return `${d}.${m}.${y}`
    }
    const date = new Date(iso)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${date.getFullYear()}`
  } catch {
    return iso.slice(0, 10)
  }
}

const STATUS_LABEL_KEYS: Record<Anforderung['status'], UiTranslationKey> = {
  pending: 'anforderungStatusPending',
  accepted: 'anforderungStatusAccepted',
  rejected: 'anforderungStatusRejected',
  cancelled: 'anforderungStatusCancelled',
}

const URGENCY_LABEL_KEYS: Record<AnforderungUrgency, UiTranslationKey> = {
  routine: 'anforderungUrgencyRoutine',
  soon: 'anforderungUrgencySoon',
  urgent: 'anforderungUrgencyUrgent',
}

function statusClass(status: Anforderung['status']): string {
  switch (status) {
    case 'pending':
      return 'anforderung-row__status--pending'
    case 'accepted':
      return 'anforderung-row__status--accepted'
    case 'rejected':
      return 'anforderung-row__status--rejected'
    default:
      return 'anforderung-row__status--cancelled'
  }
}

export function AnforderungenSidebarSection({
  caseId,
  onAddClick,
  onNavigateToLabor,
  readOnly = false,
}: AnforderungenSidebarSectionProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const displayName = useAccountDisplayName()
  const { organisation } = useCurrentOrganisation()
  const { role } = useCurrentMember()
  const { orders, pendingCount, refresh } = useAnforderungen(caseId)

  const activeOrders = useMemo(
    () =>
      [...orders]
        .filter(isActiveAnforderung)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders],
  )

  const canAccept = useMemo(
    () => needsAnforderungAcceptance(organisation?.tier) && canAcceptAnforderung(role),
    [organisation?.tier, role],
  )

  const printContext = useMemo(() => {
    const meta = getCaseMeta(caseId)
    const name =
      meta?.localName?.trim() ||
      [meta?.localVorname, meta?.localNachname].filter(Boolean).join(' ').trim() ||
      undefined
    return {
      caseRef: shortCaseId(caseId),
      patientName: name,
      patientDob: meta?.localGeburtsdatum?.trim() || undefined,
      requestingClinician: displayName || undefined,
      organisationName: organisation?.name,
    }
  }, [caseId, displayName, organisation?.name])

  const handleAccept = useCallback(
    (orderId: string) => {
      updateAnforderungStatus(caseId, orderId, 'accepted', {
        reviewedByUserId: user?.id,
        reviewedByDisplayName: displayName || undefined,
      })
      refresh()
      showNotionToast(t('anforderungAccepted'))
    },
    [caseId, displayName, refresh, t, user?.id],
  )

  const handleReject = useCallback(
    (orderId: string) => {
      const comment = window.prompt(t('anforderungRejectPrompt'))
      if (comment === null) return
      updateAnforderungStatus(caseId, orderId, 'rejected', {
        reviewedByUserId: user?.id,
        reviewedByDisplayName: displayName || undefined,
        reviewComment: comment.trim() || undefined,
      })
      refresh()
      showNotionToast(t('anforderungRejected'))
    },
    [caseId, displayName, refresh, t, user?.id],
  )

  const handleCancel = useCallback(
    (orderId: string) => {
      cancelAnforderung(caseId, orderId)
      refresh()
    },
    [caseId, refresh],
  )

  const handlePrint = useCallback(
    (order: Anforderung) => {
      printSingleAnforderung(order, printContext)
    },
    [printContext],
  )

  const handleDelete = useCallback(
    (orderId: string) => {
      if (!window.confirm(t('anforderungDeleteConfirm'))) return
      if (deleteAnforderung(caseId, orderId)) {
        refresh()
        showNotionToast(t('anforderungDeleted'))
      }
    },
    [caseId, refresh, t],
  )

  const handlePrintList = useCallback(() => {
    printAnforderungen(activeOrders, printContext)
  }, [activeOrders, printContext])

  const handleExportTxt = useCallback(() => {
    exportAnforderungenAsText(activeOrders, printContext)
  }, [activeOrders, printContext])

  const handleExportWord = useCallback(() => {
    exportAnforderungenAsWord(activeOrders, printContext)
  }, [activeOrders, printContext])

  const handleExportPdf = useCallback(() => {
    exportAnforderungenAsPdf(activeOrders, printContext)
  }, [activeOrders, printContext])

  const handleResultLink = useCallback(
    (order: Anforderung) => {
      const link = resolveResultLink(order.catalogId)
      if (!link) return
      setDiagnosticsSectionPref(caseId, diagnosticsTabForResultLink(link))
      onNavigateToLabor?.()
    },
    [caseId, onNavigateToLabor],
  )

  return (
    <div className="anforderungen-sidebar">
      <div className="anforderungen-sidebar__header">
        <p className="notion-diary-sidebar__saved-docs-heading">
          {t('anforderungenHeading')}
          {pendingCount > 0 ? (
            <span className="anforderungen-sidebar__badge" aria-label={t('anforderungenPendingBadge')}>
              {pendingCount}
            </span>
          ) : null}
        </p>
        {!readOnly ? (
          <button
            type="button"
            className="anforderungen-sidebar__add"
            onClick={onAddClick}
          >
            + {t('anforderungAddShort')}
          </button>
        ) : null}
      </div>

      {printContext.patientName || activeOrders.length > 0 ? (
        <div className="anforderungen-sidebar__patient">
          {printContext.patientName ? (
            <span className="anforderungen-sidebar__patient-name">
              <span className="anforderungen-sidebar__patient-key">{t('anforderungPatientLabel')}:</span>{' '}
              {printContext.patientName}
              {printContext.patientDob ? ` · ${printContext.patientDob}` : ''}
            </span>
          ) : null}
          <span className="anforderungen-sidebar__patient-ref">{printContext.caseRef}</span>
        </div>
      ) : null}

      {activeOrders.length > 0 ? (
        <div className="anforderungen-sidebar__export" role="group" aria-label={t('anforderungExport')}>
          <button
            type="button"
            className="anforderungen-sidebar__export-btn"
            title={t('print')}
            aria-label={t('print')}
            onClick={handlePrintList}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="anforderungen-sidebar__export-btn"
            title={t('anforderungExportTxt')}
            aria-label={t('anforderungExportTxt')}
            onClick={handleExportTxt}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="anforderungen-sidebar__export-btn"
            title={t('anforderungExportWord')}
            aria-label={t('anforderungExportWord')}
            onClick={handleExportWord}
          >
            <FileType className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="anforderungen-sidebar__export-btn"
            title={t('anforderungExportPdf')}
            aria-label={t('anforderungExportPdf')}
            onClick={handleExportPdf}
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      {activeOrders.length === 0 ? (
        <p className="anforderungen-sidebar__empty">{t('anforderungenEmpty')}</p>
      ) : (
        <ul className="anforderungen-sidebar__list">
          {activeOrders.slice(0, 12).map((order) => {
            const resultState = resolveAnforderungResultState(caseId, order)
            return (
              <li key={order.id} className="anforderung-row">
                <div className="anforderung-row__main">
                  <span className="anforderung-row__label" title={order.label}>
                    {order.label}
                  </span>
                  <span className={`anforderung-row__status ${statusClass(order.status)}`}>
                    {t(STATUS_LABEL_KEYS[order.status])}
                  </span>
                </div>
                <div className="anforderung-row__meta">
                  {order.requestedDate ? (
                    <span>{formatShortDate(order.requestedDate)}</span>
                  ) : null}
                  <span className="anforderung-row__urgency">
                    {t(URGENCY_LABEL_KEYS[order.urgency])}
                  </span>
                  {order.createdByDisplayName?.trim() ? (
                    <span className="anforderung-row__clinician">
                      {t('anforderungOrderedBy')}: {order.createdByDisplayName.trim()}
                    </span>
                  ) : null}
                  {resultState === 'pending' ? (
                    <button
                      type="button"
                      className="anforderung-row__link"
                      onClick={() => handleResultLink(order)}
                    >
                      {t('anforderungResultPending')}
                    </button>
                  ) : null}
                </div>
                <div className="anforderung-row__actions">
                  <button
                    type="button"
                    className="anforderung-row__action"
                    title={t('print')}
                    aria-label={t('print')}
                    onClick={() => handlePrint(order)}
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {order.status === 'pending' && canAccept && !readOnly ? (
                    <>
                      <button
                        type="button"
                        className="anforderung-row__action anforderung-row__action--accept"
                        title={t('anforderungAccept')}
                        aria-label={t('anforderungAccept')}
                        onClick={() => handleAccept(order.id)}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="anforderung-row__action anforderung-row__action--reject"
                        title={t('anforderungReject')}
                        aria-label={t('anforderungReject')}
                        onClick={() => handleReject(order.id)}
                      >
                        <XIcon className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {!readOnly && order.status !== 'rejected' ? (
                    <button
                      type="button"
                      className="anforderung-row__action"
                      title={t('anforderungCancel')}
                      aria-label={t('anforderungCancel')}
                      onClick={() => handleCancel(order.id)}
                    >
                      ×
                    </button>
                  ) : null}
                  {!readOnly ? (
                    <button
                      type="button"
                      className="anforderung-row__action anforderung-row__action--delete"
                      title={t('anforderungDelete')}
                      aria-label={t('anforderungDelete')}
                      onClick={() => handleDelete(order.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
