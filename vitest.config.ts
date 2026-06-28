import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

function resolveAppVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string }
    if (pkg.version) return pkg.version
  } catch {
    // ignore — fall back to sentinel below.
  }
  return '0.0.0'
}

export default defineConfig({
  // Mirror the build-time version/build defines so components that read them
  // (e.g. the Settings → About section) render real values under test.
  define: {
    __APP_BUILD_ID__: JSON.stringify('test'),
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.tsx',
      'server/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    globals: false,
  },
})
