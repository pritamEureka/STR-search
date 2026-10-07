import { fromFraction, toFraction, toNum } from "@/lib/format";
import { DEAL_TAG_KEYS, type DealTagKey, type SavePayload, type Underwriting } from "@/lib/types";
import { collectIssues, sectionSchemas, type UnderwritingFormValues } from "./schema";

/** Typical training-deal assumptions (the assessment brief: 20 / 25 / 60 / 37). */
export const DEFAULT_TAXES = { landPct: 20, slaPct: 25, bonusPct: 60, taxRatePct: 37 };

export const emptyOptimizationRow = () => ({ category: "", amount: null as number | null });
export const emptyOpexRow = () => ({ name: "", monthly: null as number | null });

export function underwritingToForm(uw: Underwriting): UnderwritingFormValues {
  const pd = (uw.detail?.purchase_details ?? {}) as Record<string, unknown>;
  const fr = uw.detail?.forecasted_revenue;
  const scenario = (k: "low" | "mid" | "high") => toNum(fr?.scenarios?.[k]?.forecasted_revenue);

  const tags = Object.fromEntries(DEAL_TAG_KEYS.map((k) => [k, uw[k] === true])) as Record<DealTagKey, boolean>;

  return {
    purchase: {
      price: toNum(pd.purchase_price) ?? toNum(uw.purchase_price),
      downPaymentPct: fromFraction(pd.down_payment_pct),
      interestRate: fromFraction(pd.interest_rate),
      years: toNum(pd.mortgage_years),
      closingCostsPct: fromFraction(pd.closing_costs_pct),
    },
    optimization: uw.optimization_items.length
      ? uw.optimization_items.map((i) => ({ category: i.category ?? "", amount: toNum(i.total_price) }))
      : [emptyOptimizationRow()],
    opex: uw.operating_expenses.length
      ? uw.operating_expenses.map((e) => ({ name: e.expense_name ?? "", monthly: toNum(e.monthly_amount) }))
      : [emptyOpexRow()],
    taxes: uw.taxes && toNum(uw.taxes.land_assumptions_pct) !== null
      ? {
          landPct: fromFraction(uw.taxes.land_assumptions_pct),
          slaPct: fromFraction(uw.taxes.sla_multiplier_pct),
          bonusPct: fromFraction(uw.taxes.bonus_amount_pct),
          taxRatePct: fromFraction(uw.taxes.tax_rate_pct),
        }
      : { ...DEFAULT_TAXES },
    revenue: {
      low: scenario("low"),
      mid: scenario("mid"),
      high: scenario("high"),
      coHostPct: fr ? fromFraction(fr.co_hosting_fee_pct) : 0,
      appreciationPct: fr ? fromFraction(fr.annual_re_appreciation_pct) : 0,
    },
    tags,
  };
}

export interface PayloadResult {
  payload: SavePayload;
  /** Sections the API requires that can't be sent yet because they're incomplete/invalid. */
  skipped: ("purchase_details" | "taxes" | "forecasted_revenue")[];
  /** True when the whole form passes validation and every section is in the payload. */
  complete: boolean;
}

/**
 * Build the API payload. Sections that fail validation are left out (the API rejects
 * partial purchase/tax/revenue objects), so autosave never fails because of a half-typed field.
 */
export function formToPayload(v: UnderwritingFormValues): PayloadResult {
  const payload: SavePayload = {};
  const skipped: PayloadResult["skipped"] = [];

  const purchase = sectionSchemas.purchase.safeParse(v.purchase);
  if (purchase.success) {
    const p = purchase.data;
    payload.purchase_details = {
      purchase_price: p.price,
      down_payment_pct: toFraction(p.downPaymentPct),
      interest_rate: toFraction(p.interestRate),
      mortgage_years: p.years,
      closing_costs_pct: toFraction(p.closingCostsPct),
    };
  } else skipped.push("purchase_details");

  const taxes = sectionSchemas.taxes.safeParse(v.taxes);
  if (taxes.success) {
    const t = taxes.data;
    payload.taxes = {
      land_assumptions_pct: toFraction(t.landPct),
      sla_multiplier_pct: toFraction(t.slaPct),
      bonus_amount_pct: toFraction(t.bonusPct),
      tax_rate_pct: toFraction(t.taxRatePct),
    };
  } else skipped.push("taxes");

  const revenue = sectionSchemas.revenue.safeParse(v.revenue);
  if (revenue.success) {
    const r = revenue.data;
    payload.forecasted_revenue = {
      co_hosting_fee_pct: toFraction(r.coHostPct),
      annual_re_appreciation_pct: toFraction(r.appreciationPct),
      scenarios: {
        low: { forecasted_revenue: r.low },
        mid: { forecasted_revenue: r.mid },
        high: { forecasted_revenue: r.high },
      },
    };
  } else skipped.push("forecasted_revenue");

  // Lists: send only fully-filled rows with valid numbers.
  payload.optimization_items = v.optimization
    .filter((r) => r.category && r.amount !== null && r.amount >= 0)
    .map((r) => ({ category: r.category, total_price: r.amount }));
  payload.operating_expenses = v.opex
    .filter((r) => r.name.trim() && r.monthly !== null && r.monthly >= 0)
    .map((r) => ({ expense_name: r.name.trim(), monthly_amount: r.monthly }));
  payload.tags = v.tags;

  return { payload, skipped, complete: collectIssues(v).length === 0 };
}
