import './loadEnv'
import cors from 'cors'
import express from 'express'
import { prisma } from './db'
import { optionalAuth } from './middleware/auth'
import { accountRouter } from './routes/account'
import { creditsRouter } from './routes/credits'
import { cryptoRouter } from './routes/crypto'
import { workspaceVaultRouter } from './routes/workspaceVault'
import { generateRouter } from './routes/generate'
import { pharmaGenerateRouter } from './routes/pharmaGenerate'
import { pharmaAskRouter } from './routes/pharmaAsk'
import { generationLogRouter } from './routes/generationLog'
import { diagnosisCodesRouter } from './routes/diagnosisCodes'
import { icdTitleRouter } from './routes/icdTitle'
import { accountBackupRouter } from './routes/accountBackup'
import { kbAdminRouter } from './routes/kbAdmin'
import { kbContributionsRouter } from './routes/kbContributions'
import { patientsRouter } from './routes/patients'
import { transcribeRouter } from './routes/transcribe'
import { inlineEditRouter } from './routes/inlineEdit'
import { discussCaseRouter } from './routes/discussCase'
import { butterflyRouter } from './routes/butterfly'
import { clinicalMetadataRouter } from './routes/clinicalMetadata'
import { consultationRouter } from './routes/consultation'
import { orgRouter } from './routes/org'
import { auditRouter } from './routes/audit'
import { integrationRouter } from './routes/integration'
import { enterpriseRouter } from './routes/enterprise'
import { calendarRouter } from './routes/calendar'
import { combinationCheckRouter } from './routes/combinationCheck'
import { labMedicationCorrelationRouter } from './routes/labMedicationCorrelation'
import { prepAiCheckRouter } from './routes/prepAiCheck'
import { medicationPriorTherapiesRouter } from './routes/medicationPriorTherapies'
import { demoPatientRouter } from './routes/demoPatient'
import { aiBudgetRouter, aiUsageRouter } from './routes/aiUsage'
import { liveKitMissingEnvVars } from './services/livekitVoice'
import { isEnterpriseOrgHierarchyEnabled } from './utils/featureFlags'

const app = express()
const port = Number(process.env.API_PORT ?? 3001)

app.use(cors({ origin: true }))
app.use(optionalAuth)
app.use('/api/transcribe', express.json({ limit: '25mb' }), transcribeRouter)
// Inline AI edit: the /transcribe sub-route carries base64 audio, so it needs a
// larger JSON limit than the global parser.
app.use('/api/inline-edit', express.json({ limit: '25mb' }), inlineEditRouter)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/health/voice', (_req, res) => {
    const missing = liveKitMissingEnvVars()
    res.json({ configured: missing.length === 0, missing })
  })
}

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
app.use('/api/icd', icdTitleRouter)
app.use('/api/generation-logs', generationLogRouter)
app.use('/api/kb-admin', kbAdminRouter)
app.use('/api/kb-contributions', kbContributionsRouter)
app.use('/api/discuss-case', discussCaseRouter)
app.use('/api/butterfly', butterflyRouter)
app.use('/api/clinical-metadata', clinicalMetadataRouter)
app.use('/api/consultation', consultationRouter)
app.use('/api/org', orgRouter)
app.use('/api/audit', auditRouter)
app.use('/api/integration', integrationRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/combination-check', combinationCheckRouter)
app.use('/api/lab-med-correlation', labMedicationCorrelationRouter)
app.use('/api/medication/prep-ai-check', prepAiCheckRouter)
app.use('/api/medication/prior-therapies', medicationPriorTherapiesRouter)
app.use('/api/demo-patient', demoPatientRouter)
app.use('/api/ai-usage', aiUsageRouter)
app.use('/api/ai-budget', aiBudgetRouter)
if (isEnterpriseOrgHierarchyEnabled()) {
  app.use('/api/enterprise', enterpriseRouter)
}

app.listen(port, () => {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  const livekitMissing = liveKitMissingEnvVars()
  const livekit = livekitMissing.length === 0
  console.log(`[api] listening on http://127.0.0.1:${port}`)
  console.log(`[api] keys: OPENAI=${openai ? 'yes' : 'no'} DEEPSEEK=${deepseek ? 'yes' : 'no'} LIVEKIT=${livekit ? 'yes' : 'no'}`)
  if (livekit) {
    console.log('[api] LiveKit: configured')
  } else {
    console.log(`[api] LiveKit: missing ${livekitMissing.join(', ')}`)
  }

  // Diagnosis-code self-check: an empty crosswalk table is the silent failure
  // mode behind "Diagnosen widget shows a short/wrong label" — WHO ICD-10 German
  // is English-only on the API, so German titles depend on this seeded table.
  // Surface it loudly at startup with the exact remediation command instead of
  // failing invisibly at request time (resolver returns source:'none').
  void prisma.diagnosisCode
    .count()
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
