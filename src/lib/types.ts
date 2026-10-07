/** Types mirroring the FastAPI contract (decimals arrive as strings or numbers). */

export type Decimalish = string | number | null;
export type Rating = "best" | "medium" | "low";
export type TrainingStatus = "not_started" | "in_progress" | "submitted";

export interface MarketSummary {
  id: number;
  name: string;
  slug: string;
  state: string | null;
}

export interface Market extends MarketSummary {
  region: string | null;
  description: string | null;
  property_count: number;
}

export interface DashboardProperty {
  zpid: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  price: string | null;
  unformatted_price: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  img_src: string | null;
  detail_url: string | null;
  home_type: string | null;
  market_id: number | null;
  market_name: string | null;
  status: TrainingStatus;
  attempts: number;
  latest_accuracy: Decimalish;
  latest_rating: Rating | null;
  best_accuracy: Decimalish;
  best_rating: Rating | null;
  active_underwriting_id: number | null;
  latest_submission_id: number | null;
}

export interface DashboardSummary {
  total_properties: number;
  submitted: number;
  in_progress: number;
  not_started: number;
  average_accuracy: Decimalish;
}

export interface DashboardResult {
  summary: DashboardSummary;
  properties: DashboardProperty[];
}

export interface Property {
  zpid: string;
  img_src: string | null;
  price: string | null;
  unformatted_price: string | null;
  address: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  home_type: string | null;
  time_on_zillow: string | null;
  market_id: number | null;
  market: MarketSummary | null;
}

export interface ScenarioResult {
  forecasted_revenue: Decimalish;
  operating_expenses_annual: Decimalish;
  co_hosting_fee: Decimalish;
  net_operating_income: Decimalish;
  debt_service_annual: Decimalish;
  annual_free_cash_flow: Decimalish;
  cash_on_cash_pct: Decimalish;
}

export interface OptimizationItem {
  id?: number;
  category: string | null;
  total_price: Decimalish;
}

export interface OperatingExpense {
  id?: number;
  expense_name: string | null;
  monthly_amount: Decimalish;
}

export const DEAL_TAG_KEYS = [
  "turnkey",
  "furnished",
  "luxury",
  "tax_efficient",
  "new_construction",
  "existing_airbnb",
  "arv",
  "high_cash_on_cash",
  "low_cash_on_cash",
  "add_inground_pool",
  "waterfront",
  "remote",
  "can_support_cohost",
] as const;
export type DealTagKey = (typeof DEAL_TAG_KEYS)[number];

export interface Underwriting {
  id: number;
  zpid: string | null;
  market_id: number | null;
  deal_status: string | null;
  property_address: string | null;
  bedrooms: number | null;
  bathrooms: Decimalish;
  purchase_price: Decimalish;
  total_oop: Decimalish;
  prr: Decimalish;
  m_cash_on_cash: Decimalish;
  l_cash_on_cash: Decimalish;
  h_cash_on_cash: Decimalish;
  optimization_items: OptimizationItem[];
  operating_expenses: OperatingExpense[];
  detail: {
    purchase_details: Record<string, unknown> | null;
    forecasted_revenue: {
      co_hosting_fee_pct?: Decimalish;
      annual_re_appreciation_pct?: Decimalish;
      scenarios?: Partial<Record<"low" | "mid" | "high", Partial<ScenarioResult>>>;
    } | null;
    zillow_property: Record<string, unknown> | null;
  } | null;
  taxes: {
    land_assumptions_pct: Decimalish;
    sla_multiplier_pct: Decimalish;
    bonus_amount_pct: Decimalish;
    tax_rate_pct: Decimalish;
    tax_savings: Decimalish;
  } | null;
  // Deal tags are flat booleans on the row.
  [tag: string]: unknown;
}

export interface ScoreBreakdown {
  rating: Rating;
  accuracy: Decimalish;
  metric: string;
  label: string;
  candidate: Decimalish;
  reference: Decimalish;
  deviation: Decimalish;
  best_threshold: Decimalish;
  medium_threshold: Decimalish;
}

export interface Submission {
  id: number;
  underwriting_id: number;
  zpid: string;
  rating: Rating;
  accuracy: Decimalish;
  breakdown: ScoreBreakdown;
  submitted_at: string;
}

export interface SubmitResult {
  submission: Submission;
  underwriting: Underwriting;
  dashboard: DashboardResult;
}

/** Payload for PUT /underwritings/:id and POST .../submit. Percentages are fractions. */
export interface SavePayload {
  purchase_details?: {
    purchase_price: number;
    down_payment_pct: number;
    interest_rate: number;
    mortgage_years: number;
    closing_costs_pct: number;
  };
  forecasted_revenue?: {
    co_hosting_fee_pct: number;
    annual_re_appreciation_pct: number;
    scenarios: Record<"low" | "mid" | "high", { forecasted_revenue: number }>;
  };
  taxes?: {
    land_assumptions_pct: number;
    sla_multiplier_pct: number;
    bonus_amount_pct: number;
    tax_rate_pct: number;
  };
  optimization_items?: { category: string | null; total_price: number | null }[];
  operating_expenses?: { expense_name: string | null; monthly_amount: number | null }[];
  tags?: Partial<Record<DealTagKey, boolean>>;
}
