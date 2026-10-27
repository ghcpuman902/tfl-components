import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  },
  // Layout Instability API (layout-shift entries) is Chromium-only.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
