import { BROKEN_BOW, inputsFor } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Review & submission: incomplete fields, invalid inputs, and how the trainee recovers.
 * These are the states that frustrate people most when they're handled badly, so they get
 * explicit coverage rather than being left to the happy path.
 */
test.describe("validation", () => {
  test.beforeEach(async ({ page, api }) => {
    const id = api.seedDraft(BROKEN_BOW.zpid); // blank draft: only price + typical taxes are prefilled
    await page.goto(`/underwriting/${id}`);
  });

  test("a blank draft lists every incomplete field and blocks submission", async ({ page, api, ws }) => {
    await ws.step("review");
    const checklist = page.getByTestId("review-checklist");
    await expect(checklist).toHaveAttribute("data-ready", "false");

    const issues = page.getByTestId("review-issue");
    const labels = await issues.locator("span.min-w-0 > span.font-medium").allTextContents();
    expect(labels).toEqual(
      expect.arrayContaining([
        "Down payment %",
        "Interest rate",
        "Loan term",
        "Closing costs %",
        "Operating expenses",
        "Low revenue forecast",
        "Mid revenue forecast",
        "High revenue forecast",
      ]),
    );
    // Prefilled / defaulted fields are not nagged about.
    expect(labels).not.toContain("Purchase price");
    expect(labels).not.toContain("Tax rate %");
    await expect(issues.first()).toHaveAttribute("data-kind", "incomplete");

    // Each section tab says how much is left, and the review group is grouped by section.
    await expect(page.getByTestId("step-financials")).toContainText("5 to do");
    await expect(page.getByTestId("step-analysis")).toContainText("3 to do");
    await expect(page.getByTestId("step-tags")).toContainText("Label the deal");

    // The header is honest about what has not been saved yet.
    await expect(page.getByTestId("held-back")).toContainText("Purchase & financing, Revenue forecast");

    // Submitting is refused client-side: no dialog, and no submit call ever reaches the API.
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("confirm-submit")).toHaveCount(0);
    expect(api.requests.filter((r) => r.path.endsWith("/submit"))).toHaveLength(0);
  });

  test("invalid values are flagged inline, marked invalid on review, and never sent to the API", async ({ page, api, ws }) => {
    await ws.fill("Down payment", 150);
    await ws.fill("Interest rate", 45);
    await ws.fill("Loan term", 0);
    await ws.fill("Closing costs", 3);
    await expect(page.getByText("Must be 0–100%").first()).toBeVisible();
    await expect(page.getByText("Interest rate above 30% looks like a typo")).toBeVisible();
    await expect(page.getByText("At least 1 year")).toBeVisible();
    await expect(ws.field("Down payment")).toHaveAttribute("aria-invalid", "true");

    await ws.fill("Loan term", 2.5);
    await expect(page.getByText("Use whole years")).toBeVisible();

    await ws.fill("Optimization 1 amount", -5);
    await expect(page.getByText("Amount can't be negative")).toBeVisible();

    await ws.step("review");
    const invalid = page.locator('[data-testid="review-issue"][data-kind="invalid"]');
    await expect(invalid.filter({ hasText: "Down payment %" })).toBeVisible();
    await expect(invalid.filter({ hasText: "Interest rate" })).toBeVisible();
    await expect(invalid.filter({ hasText: "Loan term" })).toBeVisible();

    // Invalid sections are held back from autosave, so the API never sees an out-of-range fraction.
    await page.waitForTimeout(1200); // longer than the autosave debounce
    for (const r of api.requests.filter((x) => x.method === "PUT")) {
      expect(r.body!.purchase_details).toBeUndefined();
      expect(r.status).toBe(200);
    }
    expect(api.requests.filter((r) => r.status === 422)).toHaveLength(0);
  });

  test("revenue forecasts must rise from Low to Mid to High", async ({ page, ws }) => {
    await ws.step("analysis");
    await ws.fill("Low revenue", 100000);
    await ws.fill("Mid revenue", 90000);
    await ws.fill("High revenue", 120000);
    await expect(page.getByText("Revenue should rise from Low to Mid to High")).toBeVisible();

    await ws.fill("Mid revenue", 110000);
    await expect(page.getByText("Revenue should rise from Low to Mid to High")).toHaveCount(0);
  });

  test("non-numeric characters are ignored rather than accepted", async ({ page, ws }) => {
    await ws.fill("Down payment", "abc");
    await expect(ws.field("Down payment")).toHaveValue("");
    await ws.fill("Down payment", "2a5");
    await expect(ws.field("Down payment")).toHaveValue("25");
    await ws.step("review");
    await expect(page.getByTestId("review-issue").filter({ hasText: "Down payment %" })).toHaveCount(0);
  });

  test("'Fix' jumps to the offending field, and fixing everything unlocks submission", async ({ page, ws }) => {
    await ws.step("review");
    await page.getByTestId("review-issue").filter({ hasText: "Mid revenue forecast" }).getByRole("button", { name: "Fix" }).click();
    await expect(page.getByTestId("step-analysis")).toHaveAttribute("aria-current", "step");
    await expect(ws.field("Mid revenue")).toBeFocused();

    // Complete everything from the same page.
    await ws.fillAll(inputsFor(BROKEN_BOW, BROKEN_BOW.referenceMid));
    await ws.step("review");
    await expect(page.getByTestId("review-checklist")).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("review-issue")).toHaveCount(0);
    await expect(page.getByText("Ready to submit")).toBeVisible();
  });
});
