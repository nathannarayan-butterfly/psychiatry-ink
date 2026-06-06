import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { creditsRouter } from './routes/credits'
import { cryptoRouter } from './routes/crypto'
import { workspaceVaultRouter } from './routes/workspaceVault'
import { generateRouter } from './routes/generate'
import { generationLogRouter } from './routes/generationLog'
import { transcribeRouter } from './routes/transcribe'

const app = express()
const port = Number(process.env.API_PORT ?? 3001)

app.use(cors({ origin: true }))
app.use('/api/transcribe', express.json({ limit: '25mb' }), transcribeRouter)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/generate', generateRouter)
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
