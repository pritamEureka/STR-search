import { PROPERTIES, inputsFor } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Leaderboard + retry. The API has no leaderboard endpoint, so ranking is derived in the client from
 * /api/submissions. Ties share a rank (100, 70, 70, 40 → #1, #2, #2, #4); that rule is easy to get wrong,
 * so it is pinned down here with a seeded history.
 */
test.describe("leaderboard and retries", () => {
  test("a new attempt is ranked against existing history, with ties sharing a rank", async ({ page, api, ws }) => {
    const [a, b, c, d] = PROPERTIES;
    api.seedSubmission(a.zpid, a.referenceMid, inputsFor(a, a.referenceMid)); // 100
    api.seedSubmission(b.zpid, Math.round(b.referenceMid * 1.2), inputsFor(b, Math.round(b.referenceMid * 1.2))); // 70
    api.seedSubmission(c.zpid, Math.round(c.referenceMid * 2), inputsFor(c, Math.round(c.referenceMid * 2))); // 40

    // Dashboard: ranked list in score order, average of latest scores = (100+70+40)/3 = 70.
    await page.goto("/");
    const rows = page.getByTestId("leaderboard-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("1240 Ski View Dr");
    await expect(rows.nth(2)).toContainText("3402 Palm Isle Ct");
    await expect(page.getByText("Average score").locator("..")).toContainText("70");

    // New attempt on a fourth property scoring 70 → ties with the existing 70, ranks #2 of 4.
    const mid = Math.round(d.referenceMid * 0.8); // exactly −20% → Medium
    const id = api.seedDraft(d.zpid, inputsFor(d, d.referenceMid));
    await page.goto(`/underwriting/${id}`);
    await ws.fillAnalysis(inputsFor(d, mid));
    await ws.waitForSaved();
    await ws.submit();

    await expect(page.getByTestId("score-value")).toHaveText("70");
    await expect(page.getByTestId("rank-summary")).toContainText("You rank #2 (tied) of 4 graded attempts");
    const mine = page.locator('[data-testid="leaderboard-row"][data-highlight]');
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText("215 Aspen Ridge Rd");
    await expect(mine).toContainText("(you)");
  });

  test("'Try this case again' starts a fresh draft and keeps the earlier attempt on record", async ({ page, api, ws }) => {
    const prop = PROPERTIES[4];
    const first = api.seedSubmission(prop.zpid, prop.referenceMid * 2, inputsFor(prop, prop.referenceMid * 2)); // Low
    await page.goto(`/results/${first.id}`);
    await expect(page.getByTestId("score-value")).toHaveText("40");
    await expect(page.getByTestId("score-headline")).toContainText("100.0% above");

    await page.getByTestId("try-again").click();
    await expect(page).toHaveURL(/\/underwriting\/\d+$/);
    await expect(ws.field("Purchase price")).toHaveValue("1,150,000");
    await expect(ws.field("Down payment")).toHaveValue(""); // a clean slate, not the old attempt

    // Second attempt lands in Best.
    await ws.fillAll(inputsFor(prop, prop.referenceMid));
    await ws.waitForSaved();
    await ws.submit();
    await expect(page.getByTestId("score-value")).toHaveText("100");

    // Dashboard keeps both attempts: latest 100, best 100, two attempts.
    await page.getByRole("link", { name: "Back to dashboard" }).click();
    const card = page.getByTestId(`property-card-${prop.zpid}`);
    await expect(card).toContainText("Latest 100");
    await expect(card).toContainText("2 attempts");
    await expect(page.getByTestId("leaderboard-row")).toHaveCount(2);
  });
});
