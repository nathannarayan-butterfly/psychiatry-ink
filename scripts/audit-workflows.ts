import { auditWorkflowCases } from '../src/utils/workflowMatrix'

const { passed, failed } = auditWorkflowCases()

if (failed.length > 0) {
  console.error(`Workflow audit: ${passed} passed, ${failed.length} failed`)
  for (const testCase of failed) {
    console.error(`  FAIL ${testCase.id}: expected ${testCase.expectTool}`)
  }
  process.exit(1)
}

console.log(`Workflow audit: ${passed}/${passed} passed`)
