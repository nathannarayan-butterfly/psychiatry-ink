#!/usr/bin/env tsx
/**
 * Write src/demo/demoPatient.fixture.json from the programmatic builder.
 * DeepSeek regen: extend this script to call AI → validate → diff → write.
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoPatientFixture } from '../src/demo/buildDemoFixture.ts'

const fixture = buildDemoPatientFixture()
const outPath = resolve(process.cwd(), 'src/demo/demoPatient.fixture.json')
writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outPath} (${Object.keys(fixture.workspace.documents).length} documents, ${fixture.verlaufFeed.length} verlauf entries)`)
