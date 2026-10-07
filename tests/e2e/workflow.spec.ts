import { BROKEN_BOW, PROPERTIES, byZpid, inputsFor, type Inputs } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Primary path: dashboard → pick a property → underwrite → review → submit → results.
 *
 * This is the one flow every trainee runs, so it gets the most thorough single test: it checks
 * what the trainee *sees* at each stage and what the UI *sends* to the API.
 */
test.describe("primary workflow", () => {
  test("a trainee completes a case end to end", async ({ page, api, ws }) => {
    const prop = BROKEN_BOW;
    const inputs = inputsFor(prop, prop.referenceMid);

    // 1. Dashboard lists all six cases, none started.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Training dashboard" })).toBeVisible();
    await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(6);
    await expect(page.getByTestId("progress-card")).toContainText("0 of 6 cases submitted");

    // 2. Start the case → workspace opens with property + market context and a prefilled price.
    const card = page.getByTestId(`property-card-${prop.zpid}`);
    await expect(card).toContainText("88 Lakeshore Ln");
    await card.getByRole("button", { name: /Start underwriting/ }).click();
    await expect(page).toHaveURL(/\/underwriting\/\d+$/);
    await expect(page.getByTestId("property-header")).toContainText("88 Lakeshore Ln");
    await expect(page.getByTestId("market-info")).toContainText("Hochatown / Broken Bow luxury cabin market");
    await expect(ws.field("Purchase price")).toHaveValue("540,000");
    // Taxes arrive prefilled with the typical training assumptions.
    await expect(ws.field("Land")).toHaveValue("20");
    await expect(ws.field("Tax rate")).toHaveValue("37");

    // 3. Fill both sections; the live preview reacts as the trainee types.
    await ws.fillAll(inputs);
    await ws.waitForSaved();

    // Deal tags are optional; flip one to prove the toggle works and is saved.
    await ws.step("tags");
    await page.getByRole("switch", { name: /Waterfront/ }).click();
    await expect(page.getByRole("switch", { name: /Waterfront/ })).toBeChecked();

    // 4. Review: nothing outstanding.
    await ws.step("review");
    await expect(page.getByTestId("review-checklist")).toHaveAttribute("data-ready", "true");
    await expect(page.getByText("Key assumptions")).toBeVisible();

    // The UI must send percentages as fractions (25 → 0.25), never whole numbers.
    await expect.poll(() => api.requests.some((r) => r.method === "PUT" && r.body?.tags?.waterfront === true)).toBe(true);
    const lastPut = api.requests.filter((r) => r.method === "PUT").at(-1)!;
    expect(lastPut.status).toBe(200);
    expect(lastPut.body!.purchase_details).toMatchObject({
      purchase_price: 540000,
      down_payment_pct: 0.25,
      interest_rate: 0.07,
      mortgage_years: 30,
      closing_costs_pct: 0.03,
    });
    expect(lastPut.body!.taxes).toEqual({
      land_assumptions_pct: 0.2,
      sla_multiplier_pct: 0.25,
      bonus_amount_pct: 0.6,
      tax_rate_pct: 0.37,
    });
    expect(lastPut.body!.forecasted_revenue.co_hosting_fee_pct).toBe(0.1);

    // 5. Submit → results page with a perfect score and an explanation, not just a number.
    await ws.submit();
    await expect(page).toHaveURL(/\/results\/\d+$/);
    await expect(page.getByTestId("score-value")).toHaveText("100");
    await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
    await expect(page.getByTestId("score-headline")).toContainText("exactly in line with the analyst");
    await expect(page.getByTestId("breakdown-candidate")).toHaveText("$96,000");
    await expect(page.getByTestId("breakdown-reference")).toHaveText("$96,000");
    await expect(page.getByTestId("rank-summary")).toContainText("You rank #1 of 1 graded attempt");
    await expect(page.getByTestId("leaderboard-row").first()).toContainText("(you)");

    // 6. Back on the dashboard the case is marked submitted with its score.
    await page.getByRole("link", { name: "Back to dashboard" }).click();
    const done = page.getByTestId(`property-card-${prop.zpid}`);
    await expect(done).toHaveAttribute("data-status", "submitted");
    await expect(done).toContainText("Latest 100");
    await expect(page.getByTestId("progress-card")).toContainText("1 of 6 cases submitted");
  });

  test("live preview matches the API's numbers (golden values from the real service)", async ({ page, api, ws }) => {
    // Golden case captured from the real backend for 9 Dune Walk:
    //   out of pocket $374,000 · Mid FCF $82,941.19 · CoC 12.76% / 22.18% / 31.60% · tax savings $53,946 · PRR 16.52%
    const prop = byZpid("85678901");
    const inputs: Inputs = {
      ...inputsFor(prop, 190000),
      low: 150000,
      high: 230000,
    };
    const id = api.seedDraft(prop.zpid);
    await page.goto(`/underwriting/${id}`);
    await ws.fillAll(inputs);

    // Preview first (before the debounced save lands)…
    const panel = page.getByTestId("outputs-panel");
    await expect(panel.getByTestId("total-oop")).toHaveText("$374,000");
    await expect(panel.getByTestId("mid-fcf")).toHaveText("$82,941");
    await expect(panel.getByTestId("coc-low")).toContainText("12.8%");
    await expect(panel.getByTestId("coc-mid")).toContainText("22.2%");
    await expect(panel.getByTestId("coc-high")).toContainText("31.6%");
    await expect(panel).toContainText("$53,946");
    await expect(panel).toContainText("16.5%");

    // …then the API-calculated values must agree with the preview exactly.
    await ws.waitForSaved();
    await expect(panel).toHaveAttribute("data-source", "api");
    await expect(panel.getByTestId("total-oop")).toHaveText("$374,000");
    await expect(panel.getByTestId("mid-fcf")).toHaveText("$82,941");
    await expect(panel.getByTestId("coc-mid")).toContainText("22.2%");

    await ws.step("analysis");
    const table = page.getByTestId("returns-table");
    await expect(table).toContainText("$116,568"); // Low NOI
    await expect(table).toContainText("$151,800"); // Mid NOI
    await expect(table).toContainText("$187,032"); // High NOI
  });

  test("a saved draft can be resumed from the dashboard with its values intact", async ({ page, api, ws }) => {
    const prop = PROPERTIES[0];
    const inputs = inputsFor(prop, prop.referenceMid);
    const id = api.seedDraft(prop.zpid, inputs);

    await page.goto("/");
    const card = page.getByTestId(`property-card-${prop.zpid}`);
    await expect(card).toHaveAttribute("data-status", "in_progress");
    await card.getByRole("link", { name: /Resume draft/ }).click();

    await expect(page).toHaveURL(new RegExp(`/underwriting/${id}$`));
    // Fractions from the API come back as whole-number percentages in the form.
    await expect(ws.field("Down payment")).toHaveValue("25");
    await expect(ws.field("Interest rate")).toHaveValue("7");
    await expect(ws.field("Loan term")).toHaveValue("30");
    await expect(ws.field("Optimization 1 amount")).toHaveValue("40,000");
    await expect(ws.field("Expense 2 name")).toHaveValue("Insurance");
    await ws.step("analysis");
    await expect(ws.field("Mid revenue")).toHaveValue("125,000");
    // A complete, previously-saved draft shows the API's numbers straight away.
    await expect(page.getByTestId("outputs-panel")).toHaveAttribute("data-source", "api");
  });
});
