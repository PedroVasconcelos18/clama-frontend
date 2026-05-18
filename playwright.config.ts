import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config pra smoke tests e2e do blog (Story 6.8).
 *
 * Modo dev local: `npm run test:e2e` (server precisa rodar separado em
 * http://localhost:3000 — Vike+Vite default).
 * Modo staging/prod: `BASE_URL=https://clama.me npm run test:e2e`.
 *
 * Browsers precisam ser baixados uma vez: `npx playwright install --with-deps chromium`.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
