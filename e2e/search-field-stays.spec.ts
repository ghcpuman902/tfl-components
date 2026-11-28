import { expect, test, type Page } from "@playwright/test"

/**
 * Where a user taps the search field is where it stays: opening the search view must
 * not move or resize the input (x, y, width, height), at any width, in either theme.
 */
const widths = [390, 320, 240]
const schemes = ["light", "dark"] as const
const TOLERANCE_PX = 1

const inputRect = (page: Page) =>
  page.evaluate(() => {
    const input = [
      ...document.querySelectorAll<HTMLInputElement>("input[role=combobox]"),
    ].find((el) => el.getBoundingClientRect().width > 0)
    const { x, y, width, height } = input!.getBoundingClientRect()
    return { x, y, width, height }
  })

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width}px ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 844 },
        colorScheme,
        hasTouch: true,
      })

      test("opening search leaves the input where it was", async ({ page }) => {
        await page.goto("/")
        const field = page
          .getByPlaceholder("Station, stop or postcode")
          .locator("visible=true")
        await expect(field).toBeVisible({ timeout: 30_000 })
        await page.evaluate(() => document.fonts.ready)
        const before = await inputRect(page)

        // A tap before hydration is lost, so tap again until the view opens.
        await expect(async () => {
          await field.tap()
          await expect(page.locator("[data-search-map]")).toBeVisible({
            timeout: 2_000,
          })
        }).toPass({ timeout: 30_000 })
        await page.waitForTimeout(500)
        const after = await inputRect(page)

        for (const key of ["x", "y", "width", "height"] as const)
          expect(
            Math.abs(after[key] - before[key]),
            `${key}: ${before[key]} -> ${after[key]}`
          ).toBeLessThanOrEqual(TOLERANCE_PX)
      })
    })
  }
}
