import { PROPERTIES, inputsFor, scoringCases } from "./support/cases";
import { expect, test } from "./support/fixtures";

/**
 * Evaluation behaviour, data-driven.
 *
 * Cases are generated from the seed table in the brief: for each of the six properties we probe
 * the exact edges of the Best (±10%) and Medium (±25%) bands, one dollar either side of each edge,
 * and two extremes. That is 6 × 11 = 66 tests produced from ~40 lines of data, so adding a seventh
 * property or a new band edge needs no new test code.
 *
 * Each test starts from a seeded, otherwise-complete draft and changes only the Mid forecast in the
 * UI, so what varies is exactly what the score depends on.
 */
for (const c of scoringCases()) {
  const { property: prop } = c;

  test(`${prop.street} · ${c.title} → ${c.expected} (${c.score})`, async ({ page, api, ws }) => {
    const id = api.seedDraft(prop.zpid, inputsFor(prop, prop.referenceMid));
    await page.goto(`/underwriting/${id}`);

    await ws.fillAnalysis(inputsFor(prop, c.mid));
    // An exact match changes nothing, so there is nothing to autosave; submit carries the full payload anyway.
    if (c.mid !== prop.referenceMid) await ws.waitForSaved();
    await ws.submit();

    // Score + band
    await expect(page).toHaveURL(/\/results\/\d+$/);
    await expect(page.getByTestId("score-value")).toHaveText(String(c.score));
    await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", c.expected);

    // Breakdown explains *why*: both numbers and the signed deviation.
    const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
    await expect(page.getByTestId("breakdown-candidate")).toHaveText(fmt(c.mid));
    await expect(page.getByTestId("breakdown-reference")).toHaveText(fmt(prop.referenceMid));

    const signed = (c.mid - prop.referenceMid) / prop.referenceMid;
    const size = (Math.abs(signed) * 100).toFixed(1);
    if (signed === 0) {
      await expect(page.getByTestId("breakdown-deviation")).toHaveText("0.0%");
      await expect(page.getByTestId("score-headline")).toContainText("exactly in line with the analyst");
    } else {
      await expect(page.getByTestId("breakdown-deviation")).toHaveText(`${signed > 0 ? "+" : "−"}${size}%`);
      await expect(page.getByTestId("score-headline")).toContainText(`${size}% ${signed > 0 ? "above" : "below"} the analyst`);
    }

    // The "what each band needed" panel shows the literal ranges from the brief.
    const [bestLo, bestHi] = prop.best;
    const [medLo, medHi] = prop.medium;
    await expect(page.getByText(`Best (100): ${fmt(bestLo)} – ${fmt(bestHi)}`)).toBeVisible();
    await expect(page.getByText(`Medium (70): ${fmt(medLo)} – ${fmt(medHi)}`)).toBeVisible();
  });
}

test("every seed property has scoring cases for all three outcomes", () => {
  // Guards the generator itself: a refactor that silently drops a band would otherwise pass.
  for (const prop of PROPERTIES) {
    const bands = new Set(scoringCases().filter((c) => c.property === prop).map((c) => c.expected));
    expect([...bands].sort()).toEqual(["best", "low", "medium"]);
  }
});
