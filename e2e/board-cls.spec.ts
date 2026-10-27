import { expect, test } from "@playwright/test"

declare global {
  interface Window {
    __boardShifts?: { value: number; startTime: number }[]
  }
}

test.use({ viewport: { width: 390, height: 844 } })

test("Board at a station holds its layout while live data loads", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__boardShifts = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number
        hadRecentInput: boolean
      })[]) {
        if (entry.hadRecentInput) continue
        window.__boardShifts?.push({
          value: entry.value,
          startTime: entry.startTime,
        })
      }
    }).observe({ type: "layout-shift", buffered: true })
  })

  await page.goto("/board/view#stop=940GZZLUOXC")

  // Settled: arrivals and line status have both left their loading state.
  await expect(
    page.locator('[data-slot="arrivals-board"] [data-slot="arrivals-group"]')
      .first()
  ).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: 20_000,
  })
  await page.waitForTimeout(2_000)

  // CLS = the worst session window (shifts < 1s apart, window ≤ 5s).
  const cls = await page.evaluate(() => {
    let worst = 0
    let current = 0
    let first = 0
    let last = 0
    for (const shift of window.__boardShifts ?? []) {
      if (
        current > 0 &&
        shift.startTime - last < 1_000 &&
        shift.startTime - first < 5_000
      ) {
        current += shift.value
      } else {
        current = shift.value
        first = shift.startTime
      }
      last = shift.startTime
      worst = Math.max(worst, current)
    }
    return worst
  })

  expect(cls).toBeLessThan(0.1)
})
