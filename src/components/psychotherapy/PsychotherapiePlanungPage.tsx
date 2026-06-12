import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  translateGoalStatus,
  translatePlannedSessionStatus,
  translatePsychotherapyStatus,
  translatePsychotherapyUi as tp,
  translateSessionSetting,
  translateStageStatus,
  translateTherapyMethod,
  translateTherapyStage,
} from '../../data/psychotherapyUiTranslations'
import { usePsychotherapyPlan } from '../../hooks/usePsychotherapyPlan'
import {
  THERAPY_METHOD_IDS,
  THERAPY_STAGE_IDS,
  type Goal,
  type GoalStatus,
  type PlannedSession,
  type PlannedSessionStatus,
  type PsychotherapyPlan,
  type PsychotherapyStatus,
  type SessionNote,
  type StageStatus,
  type TherapyStageId,
} from '../../types/psychotherapy'
import { SessionNoteForm } from './SessionNoteForm'

interface PsychotherapiePlanungPageProps {
  caseId: string
  onClose: () => void
  focusNewSession?: boolean
}

const PT_STATUSES: PsychotherapyStatus[] = ['not-started', 'active', 'paused', 'completed']
const GOAL_STATUSES: GoalStatus[] = ['open', 'in-progress', 'achieved', 'deferred']
const STAGE_STATUSES: StageStatus[] = ['planned', 'active', 'done', 'skipped']
const PLANNED_STATUSES: PlannedSessionStatus[] = ['planned', 'completed', 'cancelled', 'moved']

type GoalBucket = 'shortTerm' | 'mediumTerm' | 'longTerm'

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="pt-section">
      <button type="button" className="pt-section__head" onClick={() => setOpen((o) => !o)}>
        <span className={`pt-section__chevron ${open ? 'is-open' : ''}`}>▸</span>
        <h3 className="pt-section__title">{title}</h3>
      </button>
      {open && <div className="pt-section__body">{children}</div>}
    </section>
  )
}

export function PsychotherapiePlanungPage({
  caseId,
  onClose,
  focusNewSession = false,
}: PsychotherapiePlanungPageProps) {
  const { language } = useTranslation()
  const { plan, update } = usePsychotherapyPlan(caseId)
  const [sessionFormOpen, setSessionFormOpen] = useState(focusNewSession)
  const [editingSession, setEditingSession] = useState<SessionNote | null>(null)

  useEffect(() => {
    if (focusNewSession) setSessionFormOpen(true)
  }, [focusNewSession])

  const patch = (producer: (p: PsychotherapyPlan) => PsychotherapyPlan) => update(producer)

  // ── Overview ──────────────────────────────────────────────────────
  const setOverview = (field: keyof PsychotherapyPlan['overview'], value: string) =>
    patch((p) => ({ ...p, overview: { ...p.overview, [field]: value } }))

  // ── Goals ─────────────────────────────────────────────────────────
  const addGoal = (bucket: GoalBucket) =>
    patch((p) => ({
      ...p,
      goals: {
        ...p.goals,
        [bucket]: [...p.goals[bucket], { id: crypto.randomUUID(), text: '', status: 'open' } as Goal],
      },
    }))

  const updateGoal = (bucket: GoalBucket, id: string, field: keyof Goal, value: string) =>
    patch((p) => ({
      ...p,
      goals: {
        ...p.goals,
        [bucket]: p.goals[bucket].map((g) => (g.id === id ? { ...g, [field]: value } : g)),
      },
    }))

  const removeGoal = (bucket: GoalBucket, id: string) =>
    patch((p) => ({
      ...p,
      goals: { ...p.goals, [bucket]: p.goals[bucket].filter((g) => g.id !== id) },
    }))

  // ── Stages ────────────────────────────────────────────────────────
  const usedStageIds = new Set(plan.stages.map((s) => s.stageId))
  const availableStages = THERAPY_STAGE_IDS.filter((id) => !usedStageIds.has(id))

  const addStage = (stageId: TherapyStageId) =>
    patch((p) => ({
      ...p,
      stages: [
        ...p.stages,
        { id: crypto.randomUUID(), stageId, status: 'planned' as StageStatus, notes: '', order: p.stages.length },
      ],
    }))

  const updateStage = (id: string, field: 'status' | 'notes', value: string) =>
    patch((p) => ({
      ...p,
      stages: p.stages.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }))

  const removeStage = (id: string) =>
    patch((p) => ({ ...p, stages: p.stages.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })) }))

  const moveStage = (id: string, dir: -1 | 1) =>
    patch((p) => {
      const ordered = [...p.stages].sort((a, b) => a.order - b.order)
      const idx = ordered.findIndex((s) => s.id === id)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= ordered.length) return p
      ;[ordered[idx], ordered[target]] = [ordered[target], ordered[idx]]
      return { ...p, stages: ordered.map((s, i) => ({ ...s, order: i })) }
    })

  // ── Methods ───────────────────────────────────────────────────────
  const toggleMethod = (methodId: (typeof THERAPY_METHOD_IDS)[number]) =>
    patch((p) => {
      const existing = p.methods.find((m) => m.methodId === methodId)
      if (existing) {
        return { ...p, methods: p.methods.map((m) => (m.methodId === methodId ? { ...m, selected: !m.selected } : m)) }
      }
      return { ...p, methods: [...p.methods, { id: crypto.randomUUID(), methodId, selected: true, notes: '' }] }
    })

  const updateMethodNotes = (methodId: (typeof THERAPY_METHOD_IDS)[number], notes: string) =>
    patch((p) => ({ ...p, methods: p.methods.map((m) => (m.methodId === methodId ? { ...m, notes } : m)) }))

  // ── Planned sessions ──────────────────────────────────────────────
  const addPlannedSession = () =>
    patch((p) => ({
      ...p,
      plannedSessions: [
        ...p.plannedSessions,
        {
          id: crypto.randomUUID(),
          topic: '',
          goal: '',
          intervention: '',
          homework: '',
          date: '',
          status: 'planned' as PlannedSessionStatus,
        },
      ],
    }))

  const updatePlanned = (id: string, field: keyof PlannedSession, value: string) =>
    patch((p) => ({
      ...p,
      plannedSessions: p.plannedSessions.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }))

  const removePlanned = (id: string) =>
    patch((p) => ({ ...p, plannedSessions: p.plannedSessions.filter((s) => s.id !== id) }))

  // ── Sessions ──────────────────────────────────────────────────────
  const saveSession = (note: SessionNote) => {
    patch((p) => {
      const exists = p.sessions.some((s) => s.id === note.id)
      return {
        ...p,
        sessions: exists ? p.sessions.map((s) => (s.id === note.id ? note : s)) : [note, ...p.sessions],
      }
    })
    setSessionFormOpen(false)
    setEditingSession(null)
  }

  const removeSession = (id: string) =>
    patch((p) => ({ ...p, sessions: p.sessions.filter((s) => s.id !== id) }))

  // ── Review ────────────────────────────────────────────────────────
  const setReview = (field: keyof PsychotherapyPlan['review'], value: string) =>
    patch((p) => ({ ...p, review: { ...p.review, [field]: value } }))

  const sortedSessions = [...plan.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))
  const orderedStages = [...plan.stages].sort((a, b) => a.order - b.order)

  const renderGoalBucket = (bucket: GoalBucket, label: string) => (
    <div className="pt-goal-bucket">
      <div className="pt-goal-bucket__head">
        <span className="pt-goal-bucket__title">{label}</span>
        <button type="button" className="pt-link-btn" onClick={() => addGoal(bucket)}>
          {tp(language, 'ptAddGoal')}
        </button>
      </div>
      {plan.goals[bucket].length === 0 ? (
        <p className="pt-muted">{tp(language, 'ptNoGoals')}</p>
      ) : (
        plan.goals[bucket].map((goal) => (
          <div key={goal.id} className="pt-goal-row">
            <input
              type="text"
              className="pt-input"
              value={goal.text}
              placeholder={tp(language, 'ptGoalPlaceholder')}
              onChange={(e) => updateGoal(bucket, goal.id, 'text', e.target.value)}
            />
            <select
              className="pt-input pt-input--compact"
              value={goal.status ?? 'open'}
              onChange={(e) => updateGoal(bucket, goal.id, 'status', e.target.value)}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {translateGoalStatus(language, s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pt-icon-btn"
              onClick={() => removeGoal(bucket, goal.id)}
              aria-label={tp(language, 'ptDelete')}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="pt-planung-overlay" role="dialog" aria-modal="true">
      <div className="pt-planung">
        <header className="pt-planung__header">
          <h2 className="pt-planung__title">{tp(language, 'ptPlanTitle')}</h2>
          <button type="button" className="pt-btn pt-btn--ghost" onClick={onClose}>
            {tp(language, 'ptClose')}
          </button>
        </header>

        <p className="pt-disclaimer">{tp(language, 'ptDisclaimer')}</p>

        <div className="pt-planung__scroll">
          {/* Overview */}
          <Section title={tp(language, 'ptSectionOverview')}>
            <div className="pt-form-grid">
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptStatus')}</span>
                <select
                  className="pt-input"
                  value={plan.overview.status}
                  onChange={(e) => setOverview('status', e.target.value)}
                >
                  {PT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {translatePsychotherapyStatus(language, s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptTherapist')}</span>
                <input
                  type="text"
                  className="pt-input"
                  value={plan.overview.therapist ?? ''}
                  onChange={(e) => setOverview('therapist', e.target.value)}
                />
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptSetting')}</span>
                <input
                  type="text"
                  className="pt-input"
                  value={plan.overview.setting ?? ''}
                  onChange={(e) => setOverview('setting', e.target.value)}
                />
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptFrequency')}</span>
                <input
                  type="text"
                  className="pt-input"
                  value={plan.overview.frequency ?? ''}
                  onChange={(e) => setOverview('frequency', e.target.value)}
                />
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptPlannedDuration')}</span>
                <input
                  type="text"
                  className="pt-input"
                  value={plan.overview.plannedDuration ?? ''}
                  onChange={(e) => setOverview('plannedDuration', e.target.value)}
                />
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptStartDate')}</span>
                <input
                  type="date"
                  className="pt-input"
                  value={plan.overview.startDate ?? ''}
                  onChange={(e) => setOverview('startDate', e.target.value)}
                />
              </label>
              <label className="pt-field">
                <span className="pt-field__label">{tp(language, 'ptReviewDate')}</span>
                <input
                  type="date"
                  className="pt-input"
                  value={plan.overview.reviewDate ?? ''}
                  onChange={(e) => setOverview('reviewDate', e.target.value)}
                />
              </label>
            </div>
          </Section>

          {/* Indication & rationale */}
          <Section title={tp(language, 'ptSectionIndication')}>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptIndication')}</span>
              <textarea
                className="pt-textarea"
                rows={2}
                value={plan.indication ?? ''}
                onChange={(e) => patch((p) => ({ ...p, indication: e.target.value }))}
              />
            </label>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptClinicalRationale')}</span>
              <textarea
                className="pt-textarea"
                rows={3}
                value={plan.clinicalRationale ?? ''}
                onChange={(e) => patch((p) => ({ ...p, clinicalRationale: e.target.value }))}
              />
            </label>
          </Section>

          {/* Goals */}
          <Section title={tp(language, 'ptSectionGoals')}>
            {renderGoalBucket('shortTerm', tp(language, 'ptGoalsShort'))}
            {renderGoalBucket('mediumTerm', tp(language, 'ptGoalsMedium'))}
            {renderGoalBucket('longTerm', tp(language, 'ptGoalsLong'))}
          </Section>

          {/* Stages */}
          <Section title={tp(language, 'ptSectionStages')}>
            {orderedStages.length === 0 ? (
              <p className="pt-muted">{tp(language, 'ptNoStages')}</p>
            ) : (
              orderedStages.map((stage, idx) => (
                <div key={stage.id} className="pt-stage-row">
                  <div className="pt-stage-row__head">
                    <span className="pt-stage-row__name">{translateTherapyStage(language, stage.stageId)}</span>
                    <div className="pt-stage-row__controls">
                      <select
                        className="pt-input pt-input--compact"
                        value={stage.status}
                        onChange={(e) => updateStage(stage.id, 'status', e.target.value)}
                      >
                        {STAGE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {translateStageStatus(language, s)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="pt-icon-btn"
                        disabled={idx === 0}
                        onClick={() => moveStage(stage.id, -1)}
                        aria-label={tp(language, 'ptMoveUp')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="pt-icon-btn"
                        disabled={idx === orderedStages.length - 1}
                        onClick={() => moveStage(stage.id, 1)}
                        aria-label={tp(language, 'ptMoveDown')}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="pt-icon-btn"
                        onClick={() => removeStage(stage.id)}
                        aria-label={tp(language, 'ptDelete')}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="pt-input"
                    placeholder={tp(language, 'ptStageNotesPlaceholder')}
                    value={stage.notes ?? ''}
                    onChange={(e) => updateStage(stage.id, 'notes', e.target.value)}
                  />
                </div>
              ))
            )}
            {availableStages.length > 0 && (
              <select
                className="pt-input pt-add-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) addStage(e.target.value as TherapyStageId)
                }}
              >
                <option value="">{tp(language, 'ptAddStage')}</option>
                {availableStages.map((id) => (
                  <option key={id} value={id}>
                    {translateTherapyStage(language, id)}
                  </option>
                ))}
              </select>
            )}
          </Section>

          {/* Methods */}
          <Section title={tp(language, 'ptSectionMethods')}>
            <div className="pt-chips">
              {THERAPY_METHOD_IDS.map((methodId) => {
                const selected = plan.methods.find((m) => m.methodId === methodId)?.selected ?? false
                return (
                  <button
                    key={methodId}
                    type="button"
                    className={`pt-chip ${selected ? 'is-selected' : ''}`}
                    onClick={() => toggleMethod(methodId)}
                  >
                    {translateTherapyMethod(language, methodId)}
                  </button>
                )
              })}
            </div>
            {plan.methods
              .filter((m) => m.selected)
              .map((m) => (
                <label key={m.id} className="pt-field pt-method-note">
                  <span className="pt-field__label">{translateTherapyMethod(language, m.methodId)}</span>
                  <input
                    type="text"
                    className="pt-input"
                    placeholder={tp(language, 'ptMethodNotesPlaceholder')}
                    value={m.notes ?? ''}
                    onChange={(e) => updateMethodNotes(m.methodId, e.target.value)}
                  />
                </label>
              ))}
          </Section>

          {/* Planned sessions */}
          <Section title={tp(language, 'ptSectionPlannedSessions')} defaultOpen={false}>
            {plan.plannedSessions.length === 0 ? (
              <p className="pt-muted">{tp(language, 'ptNoPlannedSessions')}</p>
            ) : (
              plan.plannedSessions.map((s) => (
                <div key={s.id} className="pt-planned-row">
                  <div className="pt-form-grid">
                    <label className="pt-field">
                      <span className="pt-field__label">{tp(language, 'ptDate')}</span>
                      <input
                        type="date"
                        className="pt-input"
                        value={s.date}
                        onChange={(e) => updatePlanned(s.id, 'date', e.target.value)}
                      />
                    </label>
                    <label className="pt-field">
                      <span className="pt-field__label">{tp(language, 'ptStatus')}</span>
                      <select
                        className="pt-input"
                        value={s.status}
                        onChange={(e) => updatePlanned(s.id, 'status', e.target.value)}
                      >
                        {PLANNED_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {translatePlannedSessionStatus(language, st)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="pt-field">
                    <span className="pt-field__label">{tp(language, 'ptTopic')}</span>
                    <input
                      type="text"
                      className="pt-input"
                      value={s.topic}
                      onChange={(e) => updatePlanned(s.id, 'topic', e.target.value)}
                    />
                  </label>
                  <label className="pt-field">
                    <span className="pt-field__label">{tp(language, 'ptGoal')}</span>
                    <input
                      type="text"
                      className="pt-input"
                      value={s.goal}
                      onChange={(e) => updatePlanned(s.id, 'goal', e.target.value)}
                    />
                  </label>
                  <label className="pt-field">
                    <span className="pt-field__label">{tp(language, 'ptIntervention')}</span>
                    <input
                      type="text"
                      className="pt-input"
                      value={s.intervention}
                      onChange={(e) => updatePlanned(s.id, 'intervention', e.target.value)}
                    />
                  </label>
                  <label className="pt-field">
                    <span className="pt-field__label">{tp(language, 'ptHomework')}</span>
                    <input
                      type="text"
                      className="pt-input"
                      value={s.homework}
                      onChange={(e) => updatePlanned(s.id, 'homework', e.target.value)}
                    />
                  </label>
                  <div className="pt-form-actions">
                    <button type="button" className="pt-link-btn pt-link-btn--danger" onClick={() => removePlanned(s.id)}>
                      {tp(language, 'ptDelete')}
                    </button>
                  </div>
                </div>
              ))
            )}
            <button type="button" className="pt-link-btn" onClick={addPlannedSession}>
              {tp(language, 'ptAddPlannedSession')}
            </button>
          </Section>

          {/* Session documentation */}
          <Section title={tp(language, 'ptSectionSessions')}>
            {sessionFormOpen || editingSession ? (
              <SessionNoteForm
                editing={editingSession}
                onSave={saveSession}
                onCancel={() => {
                  setSessionFormOpen(false)
                  setEditingSession(null)
                }}
              />
            ) : (
              <button type="button" className="pt-btn pt-btn--primary" onClick={() => setSessionFormOpen(true)}>
                {tp(language, 'ptDocumentSession')}
              </button>
            )}

            <div className="pt-session-list">
              {sortedSessions.length === 0 ? (
                <p className="pt-muted">{tp(language, 'ptNoSessions')}</p>
              ) : (
                sortedSessions.map((note) => (
                  <article key={note.id} className="pt-session-item">
                    <header className="pt-session-item__head">
                      <span className="pt-session-item__meta">
                        {note.date} · {translateSessionSetting(language, note.setting)}
                        {note.duration ? ` · ${note.duration}` : ''}
                      </span>
                      <span className="pt-session-item__actions">
                        <button
                          type="button"
                          className="pt-link-btn"
                          onClick={() => {
                            setEditingSession(note)
                            setSessionFormOpen(false)
                          }}
                        >
                          {tp(language, 'ptEdit')}
                        </button>
                        <button
                          type="button"
                          className="pt-link-btn pt-link-btn--danger"
                          onClick={() => removeSession(note.id)}
                        >
                          {tp(language, 'ptDelete')}
                        </button>
                      </span>
                    </header>
                    <p className="pt-session-item__text">{note.generatedParagraph}</p>
                  </article>
                ))
              )}
            </div>
          </Section>

          {/* Review */}
          <Section title={tp(language, 'ptSectionReview')} defaultOpen={false}>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptReviewProgress')}</span>
              <textarea
                className="pt-textarea"
                rows={2}
                value={plan.review.progress ?? ''}
                onChange={(e) => setReview('progress', e.target.value)}
              />
            </label>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptReviewBarriers')}</span>
              <textarea
                className="pt-textarea"
                rows={2}
                value={plan.review.barriers ?? ''}
                onChange={(e) => setReview('barriers', e.target.value)}
              />
            </label>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptReviewAdjustment')}</span>
              <textarea
                className="pt-textarea"
                rows={2}
                value={plan.review.planAdjustment ?? ''}
                onChange={(e) => setReview('planAdjustment', e.target.value)}
              />
            </label>
            <label className="pt-field">
              <span className="pt-field__label">{tp(language, 'ptReviewDischargePrep')}</span>
              <textarea
                className="pt-textarea"
                rows={2}
                value={plan.review.dischargeSummaryPrep ?? ''}
                onChange={(e) => setReview('dischargeSummaryPrep', e.target.value)}
              />
            </label>
          </Section>
        </div>
      </div>
    </div>
  )
}
