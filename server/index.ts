import './loadEnv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { getSupabaseAdmin } from './services/supabaseAdmin'
import { countDiagnosisCodes } from './data/diagnosis'
import { configureClientServing } from './serveClient'
import { optionalAuth } from './middleware/auth'
import { requestId } from './middleware/requestContext'
import { apiNotFound, errorHandler } from './middleware/errorHandler'
import {
  buildCorsOptions,
  buildGlobalLimiter,
  buildHelmet,
  buildSensitiveLimiter,
} from './config/security'
import { installGracefulShutdown, installProcessGuards } from './lifecycle'
import { accountRouter } from './routes/account'
import { creditsRouter } from './routes/credits'
import { cryptoRouter } from './routes/crypto'
import { workspaceVaultRouter } from './routes/workspaceVault'
import { generateRouter } from './routes/generate'
import { pharmaGenerateRouter } from './routes/pharmaGenerate'
import { pharmaAskRouter } from './routes/pharmaAsk'
import { generationLogRouter } from './routes/generationLog'
import { diagnosisCodesRouter } from './routes/diagnosisCodes'
import { diagnosesRouter } from './routes/diagnoses'
import { icdTitleRouter } from './routes/icdTitle'
import { accountBackupRouter } from './routes/accountBackup'
import { kbAdminRouter } from './routes/kbAdmin'
import { kbContributionsRouter } from './routes/kbContributions'
import { patientsRouter } from './routes/patients'
import { transcribeRouter } from './routes/transcribe'
import { inlineEditRouter } from './routes/inlineEdit'
import { discussCaseRouter } from './routes/discussCase'
import { butterflyRouter } from './routes/butterfly'
import { askButterflyRouter } from './routes/askButterfly'
import { documentImportMappingRouter } from './routes/documentImportMapping'
import { psychopathExtractRouter } from './routes/psychopathExtract'
import { clinicalIntelligenceRouter } from './routes/clinicalIntelligence'
import { arztbriefRouter } from './routes/arztbrief'
import { dischargeSummaryRouter } from './routes/dischargeSummary'
import { medicationEducationRouter } from './routes/medicationEducation'
import { templateAiRouter } from './routes/templateAi'
import { patientEducationGenericRouter } from './routes/patientEducationGeneric'
import { clinicalMetadataRouter } from './routes/clinicalMetadata'
import { consultationRouter } from './routes/consultation'
import { orgRouter } from './routes/org'
import { auditRouter } from './routes/audit'
import { integrationRouter } from './routes/integration'
import { enterpriseRouter } from './routes/enterprise'
import { calendarRouter } from './routes/calendar'
import { todosRouter } from './routes/todos'
import { combinationCheckRouter } from './routes/combinationCheck'
import { criteriaGenerateDraftRouter } from './routes/criteriaGenerateDraft'
import { labMedicationCorrelationRouter } from './routes/labMedicationCorrelation'
import { prepAiCheckRouter } from './routes/prepAiCheck'
import { medicationPriorTherapiesRouter } from './routes/medicationPriorTherapies'
import { aiBudgetRouter, aiUsageRouter } from './routes/aiUsage'
import { aiCreditsRouter } from './routes/aiCredits'
import { stripeWebhookRouter } from './routes/stripeWebhook'
import {
  isClinicalIntelligenceV1Enabled,
  isEnterpriseOrgHierarchyEnabled,
  isPsychopathExtractAiEnabled,
} from './utils/featureFlags'

const app = express()
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8080)
const host = process.env.API_HOST ?? '0.0.0.0'

// Log the boot environment immediately so Cloud Run logs show what PORT/host the
// process will bind to even if something later in startup is slow. Cloud Run
// only injects PORT (+ whatever env you configure); there is no .env.local in
// prod, so every other var is intentionally optional at boot.
console.log(
  `[api] boot: PORT=${process.env.PORT ?? '(unset)'} -> binding ${host}:${port} (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'})`,
)

// Behind a load balancer / reverse proxy in cloud deploys: trust the first proxy
// hop so req.ip / X-Forwarded-* (used by rate limiting) reflect the real client.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))

// Correlation id first so even early failures are traceable.
app.use(requestId)
// Security headers (CSP suited to the served SPA).
app.use(buildHelmet())
// Env-driven CORS allowlist (replaces the previous reflect-any-origin config).
app.use(cors(buildCorsOptions()))
app.use(optionalAuth)

// ── Health checks (registered BEFORE rate limiting so probes are never throttled).
// Liveness: cheap, no I/O — "is the process up?".
app.get('/api/health', (req, res) => {
  res.json({ ok: true, requestId: req.requestId })
})
// Readiness: pings the database so orchestrators only route traffic when the API
// can actually serve it.
app.get('/api/health/ready', async (req, res) => {
  try {
    // Lightweight DB probe via the supabase-js seam — a single-row read confirms
    // the service-role connection can actually serve before routing traffic.
    const { error } = await getSupabaseAdmin().from('app_settings').select('key').limit(1)
    if (error) throw new Error(error.message)
    res.json({ ok: true, db: 'up', requestId: req.requestId })
  } catch (error) {
    console.error(`[health] readiness check failed (req ${req.requestId})`, error)
    res.status(503).json({ ok: false, db: 'down', requestId: req.requestId })
  }
})

// Global coarse rate limit on the API surface.
app.use('/api', buildGlobalLimiter())

// Tight rate limit on expensive / abuse-prone routes (AI, transcription, and
// auth-bearing credit mutations). Single insertion keyed by path prefix.
const sensitiveLimiter = buildSensitiveLimiter()
const SENSITIVE_PREFIXES = [
  '/api/generate',
  '/api/pharma-generate',
  '/api/pharma-ask',
  '/api/transcribe',
  '/api/inline-edit',
  '/api/discuss-case',
  '/api/ask-butterfly',
  '/api/butterfly',
  '/api/psychopath',
  '/api/clinical-intelligence',
  '/api/arztbrief',
  '/api/discharge-summary',
  '/api/medication-education',
  '/api/template-ai',
  '/api/patient-education-generic',
  '/api/clinical-metadata',
  '/api/combination-check',
  '/api/lab-med-correlation',
  '/api/medication/prep-ai-check',
  '/api/medication/prior-therapies',
  '/api/criteria',
  '/api/ai-credits',
]
app.use((req, res, next) => {
  if (SENSITIVE_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    sensitiveLimiter(req, res, next)
    return
  }
  next()
})

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter)
app.use('/api/transcribe', express.json({ limit: '25mb' }), transcribeRouter)
// Inline AI edit: the /transcribe sub-route carries base64 audio, so it needs a
// larger JSON limit than the global parser.
app.use('/api/inline-edit', express.json({ limit: '25mb' }), inlineEditRouter)
// Voice message uploads carry base64 audio — needs a larger JSON limit than the global parser.
app.use('/api/discuss-case', express.json({ limit: '15mb' }), discussCaseRouter)
app.use(express.json({ limit: '2mb' }))

app.use('/api/generate', generateRouter)
app.use('/api/pharma-generate', pharmaGenerateRouter)
app.use('/api/pharma-ask', pharmaAskRouter)
app.use('/api/account', accountRouter)
app.use('/api/credits', creditsRouter)
app.use('/api/crypto', cryptoRouter)
app.use('/api/workspace', workspaceVaultRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/account-backup', accountBackupRouter)
app.use('/api/diagnosis-codes', diagnosisCodesRouter)
app.use('/api/diagnoses', diagnosesRouter)
app.use('/api/criteria', criteriaGenerateDraftRouter)
app.use('/api/icd', icdTitleRouter)
app.use('/api/generation-logs', generationLogRouter)
app.use('/api/kb-admin', kbAdminRouter)
app.use('/api/kb-contributions', kbContributionsRouter)
app.use('/api/butterfly', butterflyRouter)
app.use('/api/ask-butterfly', askButterflyRouter)
app.use('/api/document-import', documentImportMappingRouter)
app.use('/api/psychopath', psychopathExtractRouter)
app.use('/api/clinical-intelligence', clinicalIntelligenceRouter)
app.use('/api/arztbrief', arztbriefRouter)
app.use('/api/discharge-summary', dischargeSummaryRouter)
app.use('/api/medication-education', medicationEducationRouter)
app.use('/api/template-ai', templateAiRouter)
app.use('/api/patient-education-generic', patientEducationGenericRouter)
app.use('/api/clinical-metadata', clinicalMetadataRouter)
app.use('/api/consultation', consultationRouter)
app.use('/api/org', orgRouter)
app.use('/api/audit', auditRouter)
app.use('/api/integration', integrationRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/todos', todosRouter)
app.use('/api/combination-check', combinationCheckRouter)
app.use('/api/lab-med-correlation', labMedicationCorrelationRouter)
app.use('/api/medication/prep-ai-check', prepAiCheckRouter)
app.use('/api/medication/prior-therapies', medicationPriorTherapiesRouter)
app.use('/api/ai-usage', aiUsageRouter)
app.use('/api/ai-budget', aiBudgetRouter)
app.use('/api/ai-credits', aiCreditsRouter)
if (isEnterpriseOrgHierarchyEnabled()) {
  app.use('/api/enterprise', enterpriseRouter)
}

// 404 for any unmatched /api route (before the SPA fallback claims everything).
app.use('/api', apiNotFound)

// Serve the built Vite client (dist/) from the same service with SPA fallback so
// same-origin /api/* works in the single-service Cloud Run topology. Registered
// after all /api routers. No-op (never throws) when dist/ is absent.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const servingClient = configureClientServing(app, distDir)

// Global error handler — MUST be last.
app.use(errorHandler)

installProcessGuards()

const server = app.listen(port, host, () => {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  // Exact phrase Cloud Run / deploy checks grep for to confirm the bind.
  console.log(`Psychiatry.Ink server listening on ${host}:${port}`)
  console.log(`[api] listening on http://${host}:${port}`)
  console.log(
    `[api] client build: ${servingClient ? `served from ${distDir}` : 'not served (dist/ absent — split deploy or dev)'}`,
  )
  console.log(`[api] keys: OPENAI=${openai ? 'yes' : 'no'} DEEPSEEK=${deepseek ? 'yes' : 'no'}`)
  console.log(`[api] psychopath extract AI: ${isPsychopathExtractAiEnabled() ? 'enabled' : 'disabled (set ENABLE_PSYCHOPATH_EXTRACT_AI=true in .env.local and restart api)'}`)
  console.log(`[api] clinical intelligence V1: ${isClinicalIntelligenceV1Enabled() ? 'enabled' : 'disabled (set CLINICAL_INTELLIGENCE_V1_ENABLED=true in .env.local and restart api)'}`)

  // Diagnosis-code self-check: an empty crosswalk table is the silent failure
  // mode behind "Diagnosen widget shows a short/wrong label" — WHO ICD-10 German
  // is English-only on the API, so German titles depend on this seeded table.
  // Surface it loudly at startup with the exact remediation command instead of
  // failing invisibly at request time (resolver returns source:'none').
  void countDiagnosisCodes()
    .then((count) => {
      if (count === 0) {
        console.warn(
          '[api] diagnosisCode table is EMPTY — ICD/DSM titles will resolve to empty (source:none). ' +
            'Run `npm run db:seed-diagnoses` (or `npm run db:import-diagnoses`) to seed the crosswalk.',
        )
      } else {
        console.log(`[api] diagnosis crosswalk: ${count} codes seeded`)
      }
    })
    .catch((error) => {
      console.warn('[api] diagnosisCode self-check skipped (DB unreachable)', error)
    })
})

installGracefulShutdown(server)
