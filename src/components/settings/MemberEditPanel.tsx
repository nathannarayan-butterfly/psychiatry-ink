import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  buildPermissionOverridesFromToggles,
  EDITABLE_MEMBER_PERMISSIONS,
  effectiveEditablePermission,
  orgDefaultAiQuotaMonthly,
  type EditableMemberPermission,
} from '../../data/org/memberPermissions'
import {
  teamRoleLabelDe,
} from '../../data/org/teamRoles'
import { THERAPY_DISCIPLINES, THERAPY_DISCIPLINE_LABEL_KEYS } from '../../data/org/therapyDiscipline'
import { useTranslation } from '../../context/TranslationContext'
import type { TeamMemberProfile } from '../../services/orgApi'
import type { Organisation, OrganisationRole, PermissionOverrideSet } from '../../types/organisation'
import type { TherapyDiscipline } from '../../types/organisation'

const PERMISSION_LABELS_DE: Record<EditableMemberPermission, string> = {
  'ai.use': 'KI-Funktionen nutzen',
  'ai.useTherapyDocumentation': 'KI-Therapiedokumentation',
  'documents.finalize': 'Dokumente finalisieren',
  'discussion.inviteExternal': 'Externe zur Fallbesprechung einladen',
  'consultation.create': 'Konsile anfordern',
}

export interface MemberEditPanelProps {
  member: TeamMemberProfile
  organisation: Organisation
  uiRoles: readonly OrganisationRole[]
  onClose: () => void
  onSave: (payload: {
    role: OrganisationRole
    therapyDiscipline?: TherapyDiscipline | null
    therapyDisciplineCustom?: string | null
    permissionOverrides: PermissionOverrideSet | null
    aiQuotaMonthly?: number | null
    resetAiQuotaMonthly?: boolean
  }) => Promise<void>
}

export function MemberEditPanel({
  member,
  organisation,
  uiRoles,
  onClose,
  onSave,
}: MemberEditPanelProps) {
  const { t } = useTranslation()
  const [role, setRole] = useState(member.role)
  const [therapyDiscipline, setTherapyDiscipline] = useState<TherapyDiscipline>(
    member.therapyDiscipline ?? 'ergotherapy',
  )
  const [therapyDisciplineCustom, setTherapyDisciplineCustom] = useState(
    member.therapyDisciplineCustom ?? '',
  )
  const [permissionToggles, setPermissionToggles] = useState<
    Partial<Record<EditableMemberPermission, boolean>>
  >({})
  const [unlimitedQuota, setUnlimitedQuota] = useState(member.aiQuotaMonthly === null)
  const [useOrgDefaultQuota, setUseOrgDefaultQuota] = useState(
    member.aiQuotaMonthly === undefined,
  )
  const [quotaInput, setQuotaInput] = useState(
    typeof member.aiQuotaMonthly === 'number' ? String(member.aiQuotaMonthly) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgDefaultQuota = orgDefaultAiQuotaMonthly(organisation.settings)

  useEffect(() => {
    const toggles: Partial<Record<EditableMemberPermission, boolean>> = {}
    for (const permission of EDITABLE_MEMBER_PERMISSIONS) {
      toggles[permission] = effectiveEditablePermission(
        role,
        permission,
        member.permissionOverrides ?? null,
      )
    }
    setPermissionToggles(toggles)
  }, [member.permissionOverrides, role])

  const effectiveQuota = useMemo(() => {
    if (unlimitedQuota) return null
    if (useOrgDefaultQuota) return orgDefaultQuota
    const parsed = Number.parseInt(quotaInput, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : orgDefaultQuota
  }, [unlimitedQuota, useOrgDefaultQuota, quotaInput, orgDefaultQuota])

  const quotaUsed = member.aiQuotaUsed ?? 0
  const quotaPercent =
    effectiveQuota && effectiveQuota > 0
      ? Math.min(100, Math.round((quotaUsed / effectiveQuota) * 100))
      : 0

  const handleTogglePermission = (permission: EditableMemberPermission, checked: boolean) => {
    setPermissionToggles((prev) => ({ ...prev, [permission]: checked }))
  }

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    try {
      const permissionOverrides = buildPermissionOverridesFromToggles(
        role,
        permissionToggles,
        member.permissionOverrides ?? null,
      )

      let aiQuotaMonthly: number | null | undefined
      let resetAiQuotaMonthly = false
      if (unlimitedQuota) {
        aiQuotaMonthly = null
      } else if (useOrgDefaultQuota) {
        resetAiQuotaMonthly = true
      } else {
        const parsed = Number.parseInt(quotaInput, 10)
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('Bitte geben Sie ein gültiges KI-Kontingent ein.')
        }
        aiQuotaMonthly = parsed
      }

      await onSave({
        role,
        therapyDiscipline: role === 'therapist' ? therapyDiscipline : null,
        therapyDisciplineCustom:
          role === 'therapist' && therapyDiscipline === 'custom'
            ? therapyDisciplineCustom.trim() || null
            : null,
        permissionOverrides,
        aiQuotaMonthly,
        resetAiQuotaMonthly,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const roleLocked = member.role === 'org_owner' || member.role === 'single_owner'

  return (
    <div className="team-settings-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="team-settings-drawer"
        role="dialog"
        aria-labelledby="member-edit-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="team-settings-drawer__header">
          <div>
            <h2 id="member-edit-title" className="team-settings-drawer__title">
              Berechtigungen bearbeiten
            </h2>
            <p className="team-settings-drawer__subtitle">
              {member.displayName ?? member.email ?? member.userId.slice(0, 8)}
            </p>
          </div>
          <button type="button" className="team-settings-drawer__close" onClick={onClose} aria-label="Schließen">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="team-settings-drawer__body">
          {error ? <p className="team-settings-error">{error}</p> : null}

          <div className="team-settings-field">
            <label className="team-settings-label" htmlFor="member-edit-role">
              Rolle
            </label>
            <select
              id="member-edit-role"
              className="team-settings-select team-settings-select--block"
              value={role}
              onChange={(e) => setRole(e.target.value as OrganisationRole)}
              disabled={roleLocked}
            >
              {uiRoles.map((option) => (
                <option key={option} value={option}>
                  {teamRoleLabelDe(option)}
                </option>
              ))}
            </select>
          </div>

          {role === 'therapist' ? (
            <>
              <div className="team-settings-field">
                <label className="team-settings-label" htmlFor="member-edit-discipline">
                  {t('teamInviteTherapyDiscipline')}
                </label>
                <select
                  id="member-edit-discipline"
                  className="team-settings-select team-settings-select--block"
                  value={therapyDiscipline}
                  onChange={(e) => setTherapyDiscipline(e.target.value as TherapyDiscipline)}
                >
                  {THERAPY_DISCIPLINES.map((discipline) => (
                    <option key={discipline} value={discipline}>
                      {t(THERAPY_DISCIPLINE_LABEL_KEYS[discipline])}
                    </option>
                  ))}
                </select>
              </div>
              {therapyDiscipline === 'custom' ? (
                <div className="team-settings-field">
                  <label className="team-settings-label" htmlFor="member-edit-discipline-custom">
                    {t('teamInviteTherapyDisciplineCustom')}
                  </label>
                  <input
                    id="member-edit-discipline-custom"
                    className="team-settings-input team-settings-input--block"
                    value={therapyDisciplineCustom}
                    onChange={(e) => setTherapyDisciplineCustom(e.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          <section className="team-settings-drawer__section" aria-labelledby="member-permissions">
            <h3 id="member-permissions" className="team-settings-drawer__section-title">
              Zusätzliche Berechtigungen
            </h3>
            <ul className="team-settings-permission-list">
              {EDITABLE_MEMBER_PERMISSIONS.map((permission) => (
                <li key={permission}>
                  <label className="team-settings-permission-item">
                    <input
                      type="checkbox"
                      checked={permissionToggles[permission] ?? false}
                      onChange={(e) => handleTogglePermission(permission, e.target.checked)}
                    />
                    <span>{PERMISSION_LABELS_DE[permission]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="team-settings-drawer__section" aria-labelledby="member-ai-quota">
            <h3 id="member-ai-quota" className="team-settings-drawer__section-title">
              KI-Kontingent
            </h3>
            <p className="team-settings-section__sub team-settings-section__sub--tight">
              {effectiveQuota === null
                ? `${quotaUsed} Anfragen diesen Monat · Unbegrenzt`
                : `${quotaUsed} / ${effectiveQuota} Anfragen diesen Monat`}
            </p>
            {effectiveQuota !== null ? (
              <div
                className="team-settings-quota-bar"
                role="progressbar"
                aria-valuenow={quotaUsed}
                aria-valuemin={0}
                aria-valuemax={effectiveQuota}
                aria-label="KI-Nutzung diesen Monat"
              >
                <div
                  className="team-settings-quota-bar__fill"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            ) : null}

            <div className="team-settings-quota-options">
              <label className="team-settings-permission-item">
                <input
                  type="checkbox"
                  checked={unlimitedQuota}
                  onChange={(e) => {
                    setUnlimitedQuota(e.target.checked)
                    if (e.target.checked) setUseOrgDefaultQuota(false)
                  }}
                />
                <span>Unbegrenzt</span>
              </label>
              <label className="team-settings-permission-item">
                <input
                  type="checkbox"
                  checked={useOrgDefaultQuota && !unlimitedQuota}
                  disabled={unlimitedQuota}
                  onChange={(e) => setUseOrgDefaultQuota(e.target.checked)}
                />
                <span>
                  Praxis-Standard
                  {orgDefaultQuota != null ? ` (${orgDefaultQuota} / Monat)` : ' (kein Limit)'}
                </span>
              </label>
            </div>

            {!unlimitedQuota && !useOrgDefaultQuota ? (
              <div className="team-settings-field">
                <label className="team-settings-label" htmlFor="member-quota-monthly">
                  Anfragen pro Monat
                </label>
                <input
                  id="member-quota-monthly"
                  type="number"
                  min={0}
                  className="team-settings-input team-settings-input--block"
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                />
              </div>
            ) : null}
          </section>
        </div>

        <footer className="team-settings-drawer__footer">
          <button type="button" className="team-settings-btn" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button
            type="button"
            className="team-settings-btn team-settings-btn--primary"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
