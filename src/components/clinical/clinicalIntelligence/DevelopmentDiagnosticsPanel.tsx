import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalSection } from '../ClinicalSection'
import type {
  ClinicalIntelligenceLayerDiagnostics,
  ClinicalIntelligenceRunResponse,
  CompactEvidencePayload,
} from '../../../types/clinicalIntelligence'

interface DevelopmentDiagnosticsPanelProps {
  evidence: CompactEvidencePayload | null
  evidenceErrorCode: string | null
  evidenceErrorMessage: string | null
  latestRun: ClinicalIntelligenceRunResponse | null
  runError: { code: string; message: string } | null
}

function LayerDiagnosticsBlock({
  label,
  diag,
}: {
  label: string
  diag: ClinicalIntelligenceLayerDiagnostics | null
}) {
  if (!diag) {
    return (
      <details className="ci-dev__block">
        <summary>{label}</summary>
        <p className="ci-dev__empty">No diagnostics</p>
      </details>
    )
  }
  return (
    <details className="ci-dev__block">
      <summary>{label}</summary>
      <dl className="ci-dev__dl">
        <dt>provider/model</dt>
        <dd>
          {diag.provider} · <code>{diag.modelId}</code>{' '}
          {diag.mock ? <span className="ci-dev__mock">(mock)</span> : null}
        </dd>
        <dt>tier</dt>
        <dd>{diag.tier}</dd>
        <dt>tokens (in / out / total)</dt>
        <dd>
          {diag.inputTokens ?? '—'} / {diag.outputTokens ?? '—'} / {diag.totalTokens ?? '—'}
        </dd>
        <dt>latency</dt>
        <dd>{diag.latencyMs} ms</dd>
        <dt>prompt chars</dt>
        <dd>{diag.promptCharCount.toLocaleString()}</dd>
        <dt>truncated</dt>
        <dd>{diag.truncated ? 'yes' : 'no'}</dd>
        <dt>validation</dt>
        <dd>
          salvaged {diag.validation.salvagedCount} · quarantined{' '}
          {diag.validation.quarantinedCount}
          {diag.validation.issues.length > 0 ? (
            <ul className="ci-dev__issues">
              {diag.validation.issues.map((iss, idx) => (
                <li key={`${idx}-${iss.slice(0, 20)}`}>{iss}</li>
              ))}
            </ul>
          ) : null}
        </dd>
        {diag.error ? (
          <>
            <dt>error</dt>
            <dd className="ci-dev__error">{diag.error}</dd>
          </>
        ) : null}
        <dt>raw response (truncated)</dt>
        <dd>
          <pre className="ci-dev__pre">{diag.rawResponseSnippet || '—'}</pre>
        </dd>
      </dl>
    </details>
  )
}

export function DevelopmentDiagnosticsPanel({
  evidence,
  evidenceErrorCode,
  evidenceErrorMessage,
  latestRun,
  runError,
}: DevelopmentDiagnosticsPanelProps) {
  const { t } = useTranslation()

  const itemCount = evidence?.items.length ?? 0
  const totalChars = evidence?.items.reduce((sum, it) => sum + (it.text?.length ?? 0), 0) ?? 0

  return (
    <ClinicalSection eyebrow={t('ciDevPanelTitle')} className="ci-dev">
      <p className="ci-dev__warning">{t('ciDevPanelWarning')}</p>
      <dl className="ci-dev__dl">
        <dt>{t('ciDevEvidenceCount')}</dt>
        <dd>
          {itemCount} · {totalChars.toLocaleString()} chars
        </dd>
        <dt>{t('ciDevDeidentifiedFlag')}</dt>
        <dd>{evidence ? (evidence.isDeidentified ? 'true' : 'false') : '—'}</dd>
        {evidenceErrorCode ? (
          <>
            <dt>{t('ciDevEvidenceError')}</dt>
            <dd className="ci-dev__error">
              [{evidenceErrorCode}] {evidenceErrorMessage}
            </dd>
          </>
        ) : null}
        {runError ? (
          <>
            <dt>{t('ciDevRunError')}</dt>
            <dd className="ci-dev__error">
              [{runError.code}] {runError.message}
            </dd>
          </>
        ) : null}
      </dl>

      <details className="ci-dev__block">
        <summary>{t('ciDevRequestPayload')}</summary>
        <pre className="ci-dev__pre">
          {JSON.stringify(
            evidence
              ? {
                  caseId: evidence.caseId,
                  builtAt: evidence.builtAt,
                  isDeidentified: evidence.isDeidentified,
                  patientLabel: evidence.patientLabel,
                  itemCount: evidence.items.length,
                  itemIds: evidence.items.map((i) => i.id),
                }
              : null,
            null,
            2,
          )}
        </pre>
      </details>

      <LayerDiagnosticsBlock
        label={`${t('ciCardDimensional')} — ${t('ciDevDiagnosticsLabel')}`}
        diag={latestRun?.diagnostics.dimensional ?? null}
      />
      <LayerDiagnosticsBlock
        label={`${t('ciCardMechanism')} — ${t('ciDevDiagnosticsLabel')}`}
        diag={latestRun?.diagnostics.mechanism ?? null}
      />

      <details className="ci-dev__block">
        <summary>{`${t('ciCardDimensional')} JSON`}</summary>
        <pre className="ci-dev__pre">
          {JSON.stringify(latestRun?.dimensional ?? null, null, 2)}
        </pre>
      </details>
      <details className="ci-dev__block">
        <summary>{`${t('ciCardMechanism')} JSON`}</summary>
        <pre className="ci-dev__pre">
          {JSON.stringify(latestRun?.mechanism ?? null, null, 2)}
        </pre>
      </details>
    </ClinicalSection>
  )
}
