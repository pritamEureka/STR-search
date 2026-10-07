import { BROKEN_BOW, inputsFor } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Deliberately failing test used only to produce a sample failure report (see docs/failure-example/).
 * Skipped unless E2E_DEMO_FAILURE=1, so it never affects a normal run.
 */
test.skip(!process.env.E2E_DEMO_FAILURE, "demo only: set E2E_DEMO_FAILURE=1");

test("DEMO: wrong expectation on purpose (Mid +30% should NOT be Best)", async ({ page, api, ws }) => {
  const id = api.seedDraft(BROKEN_BOW.zpid, inputsFor(BROKEN_BOW, BROKEN_BOW.referenceMid));
  await page.goto(`/underwriting/${id}`);
  await ws.fillAnalysis(inputsFor(BROKEN_BOW, 124800)); // +30% → really Low
  await ws.submit();
  await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
});
