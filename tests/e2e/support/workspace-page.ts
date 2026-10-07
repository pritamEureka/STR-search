import { expect, type Page } from "@playwright/test";
import type { Inputs } from "./cases";

export type Step = "financials" | "analysis" | "tags" | "review";

/** Page object for the underwriting workspace. Locators go through labels and roles, as a user would. */
export class WorkspacePage {
  constructor(readonly page: Page) {}

  field = (label: string) => this.page.getByLabel(label, { exact: true });

  async fill(label: string, value: number | string) {
    await this.field(label).fill(String(value));
  }

  async step(id: Step) {
    await this.page.getByTestId(`step-${id}`).click();
  }

  async chooseCategory(row: number, category: string) {
    await this.field(`Optimization ${row} category`).click();
    await this.page.getByRole("option", { name: category, exact: true }).click();
  }

  async fillFinancials(i: Inputs) {
    await this.step("financials");
    await this.fill("Down payment", i.downPaymentPct);
    await this.fill("Interest rate", i.interestRate);
    await this.fill("Loan term", i.years);
    await this.fill("Closing costs", i.closingCostsPct);

    for (const [idx, item] of i.optimization.entries()) {
      if (idx > 0) await this.page.getByRole("button", { name: "Add item" }).click();
      await this.chooseCategory(idx + 1, item.category);
      await this.fill(`Optimization ${idx + 1} amount`, item.amount);
    }
    for (const [idx, e] of i.opex.entries()) {
      if (idx > 0) await this.page.getByRole("button", { name: "Add expense" }).click();
      await this.fill(`Expense ${idx + 1} name`, e.name);
      await this.fill(`Expense ${idx + 1} monthly amount`, e.monthly);
    }
  }

  async fillAnalysis(i: Pick<Inputs, "low" | "mid" | "high" | "coHostPct" | "appreciationPct">) {
    await this.step("analysis");
    await this.fill("Low revenue", i.low);
    await this.fill("Mid revenue", i.mid);
    await this.fill("High revenue", i.high);
    await this.fill("Co-hosting fee", i.coHostPct);
    await this.fill("Annual appreciation", i.appreciationPct);
  }

  async fillAll(i: Inputs) {
    await this.fillFinancials(i);
    await this.fillAnalysis(i);
  }

  /** Wait for the debounced autosave to land. */
  async waitForSaved() {
    await expect(this.page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
  }

  /** Review → submit → confirm. Resolves once the results page is showing. */
  async submit() {
    await this.step("review");
    await this.page.getByTestId("submit-button").click();
    await this.page.getByTestId("confirm-submit").click();
  }
}
