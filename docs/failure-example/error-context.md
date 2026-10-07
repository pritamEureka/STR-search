# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\demo-failure.spec.ts >> DEMO: wrong expectation on purpose (Mid +30% should NOT be Best)
- Location: tests\e2e\demo-failure.spec.ts:10:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('score-card')
Expected: "best"
Received: "low"
Timeout:  7000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('score-card') with timeout 7000ms
  - waiting for getByTestId('score-card')
    15 × locator resolved to <div data-slot="card" data-rating="low" data-size="default" data-testid="score-card" class="group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl">…</div>
       - unexpected value "low"

```

```yaml
- img "Score 40 out of 100, rated Low":
  - img
  - paragraph: "40"
  - paragraph: out of 100
- text: Low Worth another look
- heading "Your Mid forecast was 30.0% above the analyst's" [level=1]
- paragraph: That's more than 25% away, outside both the Best and Medium bands.
- paragraph: "You rank #1 of 1 graded attempt."
```

# Test source

```ts
  1  | import { BROKEN_BOW, inputsFor } from "./support/cases";
  2  | import { expect, test } from "./support/fixtures";
  3  | 
  4  | /**
  5  |  * Deliberately failing test used only to produce a sample failure report (see docs/failure-example/).
  6  |  * Skipped unless E2E_DEMO_FAILURE=1, so it never affects a normal run.
  7  |  */
  8  | test.skip(!process.env.E2E_DEMO_FAILURE, "demo only: set E2E_DEMO_FAILURE=1");
  9  | 
  10 | test("DEMO: wrong expectation on purpose (Mid +30% should NOT be Best)", async ({ page, api, ws }) => {
  11 |   const id = api.seedDraft(BROKEN_BOW.zpid, inputsFor(BROKEN_BOW, BROKEN_BOW.referenceMid));
  12 |   await page.goto(`/underwriting/${id}`);
  13 |   await ws.fillAnalysis(inputsFor(BROKEN_BOW, 124800)); // +30% → really Low
  14 |   await ws.submit();
> 15 |   await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
     |                                                ^ Error: expect(locator).toHaveAttribute(expected) failed
  16 | });
  17 | 
```