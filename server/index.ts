import dotenv from 'dotenv'

// Match Vite precedence: .env then .env.local (local overrides). Never load .env.example.
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import cors from 'cors'
import express from 'express'
import { optionalAuth } from './middleware/auth'
import { accountRouter } from './routes/account'
import { creditsRouter } from './routes/credits'
import { cryptoRouter } from './routes/crypto'
import { workspaceVaultRouter } from './routes/workspaceVault'
import { generateRouter } from './routes/generate'
import { generationLogRouter } from './routes/generationLog'
import { transcribeRouter } from './routes/transcribe'

const app = express()
const port = Number(process.env.API_PORT ?? 3001)

app.use(cors({ origin: true }))
app.use(optionalAuth)
app.use('/api/transcribe', express.json({ limit: '25mb' }), transcribeRouter)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/generate', generateRouter)
app.use('/api/account', accountRouter)
app.use('/api/credits', creditsRouter)
app.use('/api/crypto', cryptoRouter)
app.use('/api/workspace', workspaceVaultRouter)
app.use('/api/generation-logs', generationLogRouter)

app.listen(port, () => {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  console.log(`[api] listening on http://127.0.0.1:${port}`)
  console.log(`[api] keys: OPENAI=${openai ? 'yes' : 'no'} DEEPSEEK=${deepseek ? 'yes' : 'no'}`)
})
