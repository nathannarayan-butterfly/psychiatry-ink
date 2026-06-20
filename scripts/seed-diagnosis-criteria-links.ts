/**
 * Populates diagnosis_criteria_links from authored Butterfly criterion trees.
 * Links are optional — catalogue search/selection does not depend on them.
 *
 * Run after: npm run db:seed-catalogue
 *   npm run db:seed-criteria-links
 */
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { DISORDER_CRITERIA } from '../src/data/diagnosisCriteria/index.ts'
import { matchDisorderToCodes } from '../src/data/diagnosisCriteria/match.ts'
import type { Disorder } from '../src/data/diagnosisCriteria/schema.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const prisma = new PrismaClient()

function normCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

function anchorsFor(disorder: Disorder): { icd10: string[]; icd11: string[] } {
  const icd10 = [
    disorder.code,
    disorder.crosswalkKey,
    disorder.codingSystems.icd10?.code,
  ]
    .map(normCode)
    .filter((c) => /^F\d/.test(c))

  const icd11 = [disorder.codingSystems.icd11?.code]
    .map(normCode)
    .filter((c) => /^6[A-E]/.test(c))

  return {
    icd10: [...new Set(icd10)],
    icd11: [...new Set(icd11)],
  }
}

async function main() {
  const entries = await prisma.diagnosisEntry.findMany({
    include: { catalogue: true },
  })

  const bySystemCode = new Map<string, string>()
  for (const entry of entries) {
    bySystemCode.set(`${entry.catalogue.system}:${entry.codeNormalized}`, entry.id)
  }

  const links: Array<{
    diagnosisEntryId: string
    criteriaTreeId: string
    criteriaSystem: string
    supportStatus: string
  }> = []

  for (const disorder of DISORDER_CRITERIA) {
    const { icd10, icd11 } = anchorsFor(disorder)
    const hasNativeIcd11 = Boolean(disorder.icd11?.groups?.length)
    const supportStatus = hasNativeIcd11 ? 'native' : 'fallback'

    for (const code of icd10) {
      const entryId = bySystemCode.get(`ICD10GM:${code}`)
      if (entryId) {
        links.push({
          diagnosisEntryId: entryId,
          criteriaTreeId: disorder.id,
          criteriaSystem: 'ICD10',
          supportStatus: hasNativeIcd11 ? 'native' : 'fallback',
        })
      }
    }

    for (const code of icd11) {
      const entryId = bySystemCode.get(`ICD11MMS:${normCode(code)}`)
      if (entryId) {
        links.push({
          diagnosisEntryId: entryId,
          criteriaTreeId: disorder.id,
          criteriaSystem: 'ICD11',
          supportStatus,
        })
      }
    }

    // Stem / prefix matching for catalogue entries
    for (const entry of entries) {
      if (entry.catalogue.system === 'ICD10GM') {
        const matched = matchDisorderToCodes(entry.codeNormalized, undefined)
        if (matched?.id === disorder.id) {
          links.push({
            diagnosisEntryId: entry.id,
            criteriaTreeId: disorder.id,
            criteriaSystem: 'ICD10',
            supportStatus: hasNativeIcd11 ? 'native' : 'fallback',
          })
        }
      }
      if (entry.catalogue.system === 'ICD11MMS') {
        const matched11 = matchDisorderToCodes(undefined, entry.codeNormalized)
        if (matched11?.id === disorder.id) {
          links.push({
            diagnosisEntryId: entry.id,
            criteriaTreeId: disorder.id,
            criteriaSystem: 'ICD11',
            supportStatus,
          })
        }
      }
    }
  }

  const deduped = new Map<string, (typeof links)[number]>()
  for (const link of links) {
    deduped.set(`${link.diagnosisEntryId}:${link.criteriaTreeId}:${link.criteriaSystem}`, link)
  }
  const unique = [...deduped.values()]

  await prisma.diagnosisCriteriaLink.deleteMany()
  if (unique.length > 0) {
    const batchSize = 500
    for (let i = 0; i < unique.length; i += batchSize) {
      await prisma.diagnosisCriteriaLink.createMany({ data: unique.slice(i, i + batchSize) })
    }
  }

  console.log(`[seed-criteria-links] created ${unique.length} criteria links`)
}

main()
  .catch((error) => {
    console.error('[seed-criteria-links] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
