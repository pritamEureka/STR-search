import { test, expect } from "@playwright/test";
import { BROKEN_BOW, inputsFor } from "../e2e/support/cases";
import { WorkspacePage } from "../e2e/support/workspace-page";

/**
 * Contract check against the REAL FastAPI service (no mocks).
 *
 * The default suite runs against an in-memory fake so it is deterministic. A fake can drift from the
 * thing it imitates, so this opt-in spec runs the primary path against the real backend to prove the
 * fake's shapes and the scoring rules still match. It writes a draft + one graded submission to the
 * backend's database, which is why it is not part of the default run:
 *
 *     npm run test:e2e:live
 */
test.beforeAll(async ({ request }) => {
  const res = await request.get("http://localhost:8000/api/health").catch(() => null);
  test.skip(!res?.ok(), "Real API is not running on :8000");
});

test("real API: Broken Bow with the analyst's own number scores Best (100)", async ({ page }) => {
  const prop = BROKEN_BOW;
  const ws = new WorkspacePage(page);

  await page.goto("/");
  const card = page.getByTestId(`property-card-${prop.zpid}`);
  await expect(card).toBeVisible(); // `count()` doesn't wait, so let the dashboard load first
  // Start fresh, or resume if an earlier run left a draft behind.
  const start = card.getByRole("button", { name: /Start underwriting|Try again/ });
  if (await start.count()) await start.click();
  else await card.getByRole("link", { name: /Resume draft/ }).click();
  await expect(page).toHaveURL(/\/underwriting\/\d+$/);

  await ws.fillAll(inputsFor(prop, prop.referenceMid));
  await ws.waitForSaved();
  // After a real save, numbers on screen come from the real calculator.
  await expect(page.getByTestId("outputs-panel")).toHaveAttribute("data-source", "api");

  await ws.submit();
  await expect(page).toHaveURL(/\/results\/\d+$/);
  await expect(page.getByTestId("score-value")).toHaveText("100");
  await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
  await expect(page.getByTestId("breakdown-reference")).toHaveText("$96,000");
});
