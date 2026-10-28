import { defineConfig } from '@playwright/test'

/** Test de bout en bout du scénario, joué sur la version construite (npm run build && npm run preview). */
export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE ?? 'http://localhost:5181/',
    viewport: { width: 1920, height: 1080 },
    trace: 'retain-on-failure',
  },
  webServer: process.env.BASE
    ? undefined
    : { command: 'npm run build && npm run preview', url: 'http://localhost:5181/', reuseExistingServer: true, timeout: 180_000 },
})
