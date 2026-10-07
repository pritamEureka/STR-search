import { BROKEN_BOW, inputsFor } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Light / dark theming. Colours are CSS variables on :root and .dark (globals.css), so the test
 * checks behaviour, not hex values: the OS preference is honoured, the toggle flips it, the choice
 * survives navigation, and the semantic colours (e.g. a rating) actually change between themes.
 */
test.describe("theme", () => {
  test("follows the OS preference and can be toggled", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("switch", { name: "Toggle dark mode" }).click();
    await expect(html).not.toHaveClass(/dark/);
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.getByRole("switch", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveClass(/dark/);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).not.toBe(light);
  });

  test("the chosen theme persists across pages and applies to results", async ({ page, api }) => {
    const sub = api.seedSubmission(BROKEN_BOW.zpid, 96000, inputsFor(BROKEN_BOW, 96000));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("switch", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.goto(`/results/${sub.id}`);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const badge = page.getByTestId("score-card").locator('[data-rating="best"]');
    const dark = await badge.evaluate((el) => getComputedStyle(el).color);

    await page.getByRole("switch", { name: "Toggle dark mode" }).click();
    const light = await badge.evaluate((el) => getComputedStyle(el).color);
    expect(light).not.toBe(dark); // the success token has a separate value per theme
  });
});
