import { BROKEN_BOW, PROPERTIES, inputsFor } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Failure and edge states. A training tool is used by people who are mid-thought; a lost draft or a
 * silent failure is worse than any visual flaw. Every API failure mode the UI can hit is exercised here
 * by telling the mock to fail the next call.
 */
test.describe("API failures", () => {
  test("dashboard load failure shows an error with a working retry", async ({ page, api }) => {
    // React Query retries a 5xx once, so the failure has to outlast the retry to surface.
    api.failNext("GET dashboard", 500, "Failed to build dashboard", 2);
    await page.goto("/");
    const alert = page.getByRole("alert").filter({ hasText: "Couldn't load the training dashboard" });
    await expect(alert).toContainText("Failed to build dashboard");

    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(6);
  });

  test("an unreachable API produces a human message, not a blank page", async ({ page, api }) => {
    api.setOffline(true);
    await page.goto("/");
    await expect(page.getByRole("alert").filter({ hasText: "Can't reach" })).toContainText("Can't reach the training API");
  });

  test("starting a case that the API rejects keeps the trainee on the dashboard with the reason", async ({ page, api }) => {
    api.failNext("POST start", 404, `Property ${BROKEN_BOW.zpid} not found`);
    await page.goto("/");
    await page.getByTestId(`property-card-${BROKEN_BOW.zpid}`).getByRole("button", { name: /Start underwriting/ }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Couldn't start that underwriting" });
    await expect(alert).toContainText("not found");
    await expect(page).toHaveURL("/");
  });

  test("a failed autosave is surfaced and can be retried without losing input", async ({ page, api, ws }) => {
    const id = api.seedDraft(BROKEN_BOW.zpid);
    await page.goto(`/underwriting/${id}`);
    api.failNext("PUT underwriting", 500, "Failed to save underwriting");

    // Tags are always savable, so toggling one is a reliable way to trigger a save.
    await ws.step("tags");
    await page.getByRole("switch", { name: /Luxury/ }).click();
    const status = page.getByTestId("save-status");
    await expect(status).toHaveAttribute("data-status", "error");
    await expect(status).toContainText("Failed to save underwriting");
    await expect(page.getByRole("switch", { name: /Luxury/ })).toBeChecked(); // input untouched

    await status.getByRole("button", { name: "Retry" }).click();
    await expect(status).toHaveAttribute("data-status", "saved");
    expect(api.underwritings.get(id)!.luxury).toBe(true);
  });

  test("a failed submit explains itself, keeps all input, and succeeds on retry", async ({ page, api, ws }) => {
    const id = api.seedDraft(BROKEN_BOW.zpid, inputsFor(BROKEN_BOW, 100000));
    await page.goto(`/underwriting/${id}`);
    api.failNext("POST submit", 500, "Failed to submit underwriting");

    await ws.submit();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toContainText("Failed to submit underwriting");
    await expect(page).toHaveURL(new RegExp(`/underwriting/${id}$`));

    await dialog.getByTestId("confirm-submit").click(); // "Retry submit"
    await expect(page).toHaveURL(/\/results\/\d+$/);
    await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
  });

  test("a server-side validation error (422) is shown in plain text", async ({ page, api, ws }) => {
    const id = api.seedDraft(BROKEN_BOW.zpid, inputsFor(BROKEN_BOW, 100000));
    await page.goto(`/underwriting/${id}`);
    api.failNext("POST submit", 422, "Missing required sections: taxes");
    await ws.submit();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Missing required sections: taxes");
  });
});

test.describe("unusual routes and states", () => {
  test("opening an underwriting that doesn't exist shows an error, not a crash", async ({ page }) => {
    await page.goto("/underwriting/999");
    const alert = page.getByRole("alert").filter({ hasText: "Couldn't open this underwriting" });
    await expect(alert).toContainText("Underwriting 999 not found");
  });

  test("a non-numeric id is a 404", async ({ page }) => {
    const res = await page.goto("/underwriting/abc");
    expect(res?.status()).toBe(404);
  });

  test("a submitted underwriting is locked and points back to the dashboard", async ({ page, api }) => {
    const sub = api.seedSubmission(BROKEN_BOW.zpid, 96000, inputsFor(BROKEN_BOW, 96000));
    await page.goto(`/underwriting/${sub.underwriting_id}`);
    await expect(page.getByTestId("already-submitted")).toBeVisible();
    await expect(page.getByRole("form", { name: "Underwriting form" })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to dashboard" }).click();
    await expect(page).toHaveURL("/");
  });

  test("results for an unknown submission show an error", async ({ page }) => {
    await page.goto("/results/12345");
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't load this result" })).toContainText("Submission 12345 not found");
  });

  test("dashboard filter narrows the case list and has an empty state", async ({ page, api }) => {
    api.seedSubmission(PROPERTIES[0].zpid, PROPERTIES[0].referenceMid, inputsFor(PROPERTIES[0], PROPERTIES[0].referenceMid));
    await page.goto("/");
    await page.getByRole("tab", { name: "Submitted" }).click();
    await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(1);
    await page.getByRole("tab", { name: "In progress" }).click();
    await expect(page.getByText("No cases match your search or filter.")).toBeVisible();
    await page.getByRole("tab", { name: "Not started" }).click();
    await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(5);
  });
});
