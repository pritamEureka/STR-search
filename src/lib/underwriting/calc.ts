import { toNum } from "@/lib/format";
import type { Underwriting } from "@/lib/types";
import type { UnderwritingFormValues } from "./schema";

/**
 * Live preview of the API's calculator (see the "Underwriting Calculations" tab).
 * Every field is nullable so the panel can fill in progressively as the trainee types.
 * The API stays the source of truth: its numbers replace these once a save lands.
 */

export type ScenarioKey = "low" | "mid" | "high";
export const SCENARIOS: { key: ScenarioKey; label: string; hint: string; opexMultiplier: number }[] = [
  { key: "low", label: "Low", hint: "Cautious year", opexMultiplier: 0.96 },
  { key: "mid", label: "Mid", hint: "Expected year", opexMultiplier: 1 },
  { key: "high", label: "High", hint: "Strong year", opexMultiplier: 1.04 },
];

export interface ScenarioOutputs {
  revenue: number | null;
  opexAnnual: number | null;
  coHostFee: number | null;
  noi: number | null;
  freeCashFlow: number | null;
  cashOnCash: number | null;
}

export interface Outputs {
  downPayment: number | null;
  loanAmount: number | null;
  closingCosts: number | null;
  monthlyPayment: number | null;
  optimizationTotal: number;
  opexMonthly: number;
  totalOutOfPocket: number | null;
  taxSavings: number | null;
  prr: number | null;
  scenarios: Record<ScenarioKey, ScenarioOutputs>;
  source: "preview" | "api";
}

export function monthlyPayment(loan: number, annualRatePct: number, years: number): number {
  const n = years * 12;
  const r = annualRatePct / 100 / 12;
  if (loan <= 0 || n <= 0) return 0;
  if (r === 0) return loan / n;
  const growth = Math.pow(1 + r, n);
  return (loan * r * growth) / (growth - 1);
}

export function computeOutputs(v: UnderwritingFormValues): Outputs {
  const { price, downPaymentPct, interestRate, years, closingCostsPct } = v.purchase;
  const optimizationTotal = v.optimization.reduce((s, r) => s + (r.amount ?? 0), 0);
  const opexMonthly = v.opex.reduce((s, r) => s + (r.monthly ?? 0), 0);

  const downPayment = price !== null && downPaymentPct !== null ? (price * downPaymentPct) / 100 : null;
  const loanAmount = price !== null && downPayment !== null ? price - downPayment : null;
  const closingCosts = price !== null && closingCostsPct !== null ? (price * closingCostsPct) / 100 : null;
  const monthly =
    loanAmount !== null && interestRate !== null && years !== null
      ? monthlyPayment(loanAmount, interestRate, years)
      : null;

  const totalOutOfPocket =
    downPayment !== null && closingCosts !== null ? downPayment + closingCosts + optimizationTotal : null;

  const { landPct, slaPct, bonusPct, taxRatePct } = v.taxes;
  const taxSavings =
    price !== null && landPct !== null && slaPct !== null && bonusPct !== null && taxRatePct !== null
      ? ((price * (1 - landPct / 100) + optimizationTotal) * (slaPct / 100) * (bonusPct / 100) * taxRatePct) / 100
      : null;

  const scenarios = {} as Record<ScenarioKey, ScenarioOutputs>;
  for (const { key, opexMultiplier } of SCENARIOS) {
    const revenue = v.revenue[key];
    const coHostPct = v.revenue.coHostPct;
    const opexAnnual = opexMonthly * 12 * opexMultiplier;
    const coHostFee = revenue !== null && coHostPct !== null ? (revenue * coHostPct) / 100 : null;
    const noi = revenue !== null && coHostFee !== null ? revenue - opexAnnual - coHostFee : null;
    const freeCashFlow = noi !== null && monthly !== null ? noi - monthly * 12 : null;
    scenarios[key] = {
      revenue,
      opexAnnual,
      coHostFee,
      noi,
      freeCashFlow,
      cashOnCash:
        freeCashFlow !== null && totalOutOfPocket !== null && totalOutOfPocket > 0
          ? freeCashFlow / totalOutOfPocket
          : null,
    };
  }

  return {
    downPayment,
    loanAmount,
    closingCosts,
    monthlyPayment: monthly,
    optimizationTotal,
    opexMonthly,
    totalOutOfPocket,
    taxSavings,
    prr: price !== null && price > 0 && v.revenue.mid !== null ? v.revenue.mid / price : null,
    scenarios,
    source: "preview",
  };
}

/** Normalise an API response into the same shape so the UI renders either source. */
export function outputsFromApi(uw: Underwriting, preview: Outputs): Outputs | null {
  const rev = uw.detail?.forecasted_revenue?.scenarios;
  const pd = uw.detail?.purchase_details as Record<string, unknown> | null;
  if (!rev?.mid || uw.total_oop === null) return null;
  const scenarios = {} as Record<ScenarioKey, ScenarioOutputs>;
  for (const { key } of SCENARIOS) {
    const s = rev[key];
    scenarios[key] = {
      revenue: toNum(s?.forecasted_revenue),
      opexAnnual: toNum(s?.operating_expenses_annual),
      coHostFee: toNum(s?.co_hosting_fee),
      noi: toNum(s?.net_operating_income),
      freeCashFlow: toNum(s?.annual_free_cash_flow),
      cashOnCash: toNum(s?.cash_on_cash_pct),
    };
  }
  return {
    ...preview,
    downPayment: toNum(pd?.down_payment_amount) ?? preview.downPayment,
    loanAmount: toNum(pd?.loan_amount) ?? preview.loanAmount,
    closingCosts: toNum(pd?.closing_costs_amount) ?? preview.closingCosts,
    totalOutOfPocket: toNum(uw.total_oop),
    taxSavings: toNum(uw.taxes?.tax_savings),
    prr: toNum(uw.prr),
    scenarios,
    source: "api",
  };
}
