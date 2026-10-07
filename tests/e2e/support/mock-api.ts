import type { Page, Route } from "@playwright/test";
import { MARKETS, PROPERTIES, byZpid, type Inputs } from "./cases";

/**
 * Stateful in-memory fake of the FastAPI service.
 *
 * Why a fake instead of the real API: tests must be deterministic and independent. The real
 * backend persists drafts and submissions, so attempts from one test would leak into the
 * dashboard and leaderboard of the next. Each test gets its own `MockApi` instance (see
 * fixtures.ts) with the six seed properties and nothing else.
 *
 * Fidelity: response shapes (decimals as strings, flat deal-tag booleans, `detail` errors,
 * 422 validation arrays) were captured from the real service, and the maths is an
 * independent implementation of the brief's formulas. tests/live/** runs the same user
 * path against the real API to catch drift between this fake and the real contract.
 */

// Wire-format JSON from a backend we imitate; modelling every field would only restate the API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
type FailureKey =
  | "GET dashboard"
  | "GET submissions"
  | "GET submission"
  | "POST start"
  | "GET underwriting"
  | "PUT underwriting"
  | "POST submit";

export interface RecordedRequest {
  method: string;
  path: string;
  body: Json | null;
  status: number;
}

const DEAL_TAGS = [
  "turnkey", "furnished", "luxury", "tax_efficient", "new_construction", "existing_airbnb", "arv",
  "high_cash_on_cash", "low_cash_on_cash", "add_inground_pool", "waterfront", "remote", "can_support_cohost",
];

const cents = (n: number) => Math.round(n * 100) / 100;
const fixed = (n: number, d = 2) => n.toFixed(d);

function monthlyPayment(loan: number, rate: number, years: number) {
  const r = rate / 12;
  const n = years * 12;
  if (loan <= 0) return 0;
  if (r === 0) return loan / n;
  const g = Math.pow(1 + r, n);
  return (loan * r * g) / (g - 1);
}

export class MockApi {
  underwritings = new Map<number, Json>();
  submissions: Json[] = [];
  /** Every API call the page made, for asserting on payloads (e.g. fractions, not whole numbers). */
  requests: RecordedRequest[] = [];

  private nextUw = 100;
  private nextSub = 500;
  private clock = Date.parse("2026-10-01T12:00:00Z");
  private failures = new Map<FailureKey, { status: number; detail: string; times: number }>();
  private offline = false;

  /* ------------------------------------------------------------ controls -- */

  /** Make the next `times` calls to an endpoint fail with the given HTTP status. */
  failNext(key: FailureKey, status: number, detail: string, times = 1) {
    this.failures.set(key, { status, detail, times });
  }
  setOffline(offline: boolean) {
    this.offline = offline;
  }

  /** Create a draft and fill it with a complete, valid set of inputs (as if saved earlier). */
  seedDraft(zpid: string, inputs?: Inputs): number {
    const uw = this.createDraft(zpid);
    if (inputs) this.applyPayload(uw, this.payloadFrom(zpid, inputs));
    return uw.id;
  }

  /** Create an already-graded attempt so dashboards and leaderboards have history. */
  seedSubmission(zpid: string, mid: number, inputs: Inputs): Json {
    const uw = this.createDraft(zpid);
    this.applyPayload(uw, this.payloadFrom(zpid, { ...inputs, mid }));
    return this.finalise(uw);
  }

  payloadFrom(zpid: string, i: Inputs): Json {
    return {
      purchase_details: {
        purchase_price: byZpid(zpid).price,
        down_payment_pct: i.downPaymentPct / 100,
        interest_rate: i.interestRate / 100,
        mortgage_years: i.years,
        closing_costs_pct: i.closingCostsPct / 100,
      },
      taxes: { land_assumptions_pct: 0.2, sla_multiplier_pct: 0.25, bonus_amount_pct: 0.6, tax_rate_pct: 0.37 },
      forecasted_revenue: {
        co_hosting_fee_pct: i.coHostPct / 100,
        annual_re_appreciation_pct: i.appreciationPct / 100,
        scenarios: {
          low: { forecasted_revenue: i.low },
          mid: { forecasted_revenue: i.mid },
          high: { forecasted_revenue: i.high },
        },
      },
      optimization_items: i.optimization.map((o) => ({ category: o.category, total_price: o.amount })),
      operating_expenses: i.opex.map((o) => ({ expense_name: o.name, monthly_amount: o.monthly })),
    };
  }

  /* -------------------------------------------------------------- install -- */

  async install(page: Page) {
    // Property photos come from picsum.photos; stub them so tests never depend on the network.
    await page.route("https://picsum.photos/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#cbd5e1"/></svg>',
      }),
    );
    await page.route("**/api/**", (route) => this.handle(route));
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = req.method();
    const body = method === "GET" ? null : safeJson(req.postData());

    if (this.offline) return route.abort("connectionrefused");

    const respond = (status: number, data: unknown) => {
      this.requests.push({ method, path, body, status });
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    };

    const key = failureKey(method, path);
    const failure = key && this.failures.get(key);
    if (failure && failure.times > 0) {
      failure.times -= 1;
      return respond(failure.status, { detail: failure.detail });
    }

    let m: RegExpMatchArray | null;
    try {
      if (method === "GET" && path === "/dashboard") return respond(200, this.dashboard());
      if (method === "GET" && (m = path.match(/^\/markets\/(\d+)$/))) {
        const market = MARKETS.find((x) => x.id === Number(m![1]));
        return market ? respond(200, { ...market, country: "US", is_active: true }) : respond(404, { detail: "Market not found" });
      }
      if (method === "GET" && (m = path.match(/^\/properties\/(\w+)$/))) {
        const prop = PROPERTIES.find((x) => x.zpid === m![1]);
        return prop ? respond(200, this.propertyJson(prop)) : respond(404, { detail: `Property ${m[1]} not found` });
      }
      if (method === "POST" && path === "/underwritings") {
        if (!PROPERTIES.some((x) => x.zpid === body?.zpid)) return respond(404, { detail: `Property ${body?.zpid} not found` });
        return respond(201, this.createDraft(body!.zpid));
      }
      if ((m = path.match(/^\/underwritings\/(\d+)$/))) {
        const uw = this.underwritings.get(Number(m[1]));
        if (!uw) return respond(404, { detail: `Underwriting ${m[1]} not found` });
        if (method === "GET") return respond(200, uw);
        if (method === "PUT") {
          const errors = validate(body ?? {});
          if (errors.length) return respond(422, { detail: errors });
          this.applyPayload(uw, body ?? {});
          return respond(200, uw);
        }
      }
      if (method === "POST" && (m = path.match(/^\/underwritings\/(\d+)\/submit$/))) {
        const uw = this.underwritings.get(Number(m[1]));
        if (!uw) return respond(404, { detail: `Underwriting ${m[1]} not found` });
        const errors = validate(body ?? {});
        if (errors.length) return respond(422, { detail: errors });
        if (body) this.applyPayload(uw, body);
        const missing = ["purchase_details", "forecasted_revenue"].filter((k) => !uw.detail[k]);
        if (!uw.taxes) missing.push("taxes");
        if (missing.length) return respond(422, { detail: `Missing required sections: ${missing.join(", ")}` });
        const submission = this.finalise(uw);
        return respond(200, { submission, underwriting: uw, dashboard: this.dashboard() });
      }
      if (method === "GET" && path === "/submissions") return respond(200, [...this.submissions].reverse());
      if (method === "GET" && (m = path.match(/^\/submissions\/(\d+)$/))) {
        const s = this.submissions.find((x) => x.id === Number(m![1]));
        return s ? respond(200, s) : respond(404, { detail: `Submission ${m[1]} not found` });
      }
    } catch (e) {
      return respond(500, { detail: `mock error: ${(e as Error).message}` });
    }
    return respond(404, { detail: `mock has no route for ${method} ${path}` });
  }

  /* -------------------------------------------------------------- domain -- */

  private propertyJson(prop: (typeof PROPERTIES)[number]) {
    const market = MARKETS.find((x) => x.id === prop.marketId)!;
    return {
      zpid: prop.zpid,
      img_src: `https://picsum.photos/seed/${prop.zpid}/640/420`,
      price: `$${prop.price.toLocaleString("en-US")}`,
      unformatted_price: String(prop.price),
      address: prop.address,
      beds: prop.beds,
      baths: prop.baths,
      area: prop.area,
      home_type: "SINGLE_FAMILY",
      time_on_zillow: "12 days",
      market_id: prop.marketId,
      market: { id: market.id, name: market.name, slug: market.slug, state: market.state },
    };
  }

  createDraft(zpid: string): Json {
    const prop = byZpid(zpid);
    const id = this.nextUw++;
    const uw: Json = {
      id,
      zpid,
      market_id: prop.marketId,
      is_reference: false,
      deal_status: "analyst_started",
      deal_submitted: null,
      property_address: prop.address,
      street: prop.street,
      city: prop.city,
      state: prop.state,
      bedrooms: prop.beds,
      bathrooms: fixed(prop.baths, 1),
      purchase_price: fixed(prop.price),
      total_oop: null,
      prr: null,
      budget_to_pp: null,
      low_gross_revenue: null,
      mid_gross_revenue: null,
      high_gross_revenue: null,
      l_cash_on_cash: null,
      m_cash_on_cash: null,
      h_cash_on_cash: null,
      optimization_total: null,
      operating_expense_total: null,
      ...Object.fromEntries(DEAL_TAGS.map((t) => [t, false])),
      detail: { purchase_details: null, y1_coc_incl_tax_savings: null, forecasted_revenue: null, zillow_property: {}, analyst_notes: null },
      taxes: null,
      optimization_items: [],
      operating_expenses: [],
      comp_set: [],
    };
    this.underwritings.set(id, uw);
    return uw;
  }

  /** Mirrors the real service: store what was sent, then derive numbers when the sections allow. */
  applyPayload(uw: Json, p: Json) {
    if (p.purchase_details) {
      uw.detail.purchase_details = { ...p.purchase_details, purchase_price: String(p.purchase_details.purchase_price) };
      uw.purchase_price = fixed(p.purchase_details.purchase_price);
    }
    if (p.forecasted_revenue) uw.detail.forecasted_revenue = JSON.parse(JSON.stringify(p.forecasted_revenue));
    if (p.taxes) uw.taxes = { ...p.taxes };
    if (p.optimization_items) {
      uw.optimization_items = p.optimization_items.map((o: Json, i: number) => ({ id: i + 1, category: o.category, total_price: fixed(o.total_price ?? 0) }));
    }
    if (p.operating_expenses) {
      uw.operating_expenses = p.operating_expenses.map((o: Json, i: number) => ({ id: i + 1, expense_name: o.expense_name, monthly_amount: fixed(o.monthly_amount ?? 0) }));
    }
    if (p.tags) for (const [k, v] of Object.entries(p.tags)) if (v !== null) uw[k] = v;
    if (uw.detail.purchase_details && uw.detail.forecasted_revenue && uw.taxes) this.recalculate(uw);
  }

  private recalculate(uw: Json) {
    const pd = uw.detail.purchase_details;
    const fr = uw.detail.forecasted_revenue;
    const price = Number(pd.purchase_price);
    const down = cents(price * Number(pd.down_payment_pct));
    const loan = cents(price - down);
    const closing = cents(price * Number(pd.closing_costs_pct));
    const optimization = uw.optimization_items.reduce((s: number, o: Json) => s + Number(o.total_price), 0);
    const opexMonthly = uw.operating_expenses.reduce((s: number, o: Json) => s + Number(o.monthly_amount), 0);
    const oop = cents(down + closing + optimization);
    const debt = monthlyPayment(loan, Number(pd.interest_rate), Number(pd.mortgage_years)) * 12;

    const scenarios: Json = {};
    const multipliers = { low: 0.96, mid: 1, high: 1.04 } as const;
    for (const k of ["low", "mid", "high"] as const) {
      const revenue = Number(fr.scenarios[k].forecasted_revenue);
      const opex = opexMonthly * 12 * multipliers[k];
      const coHost = revenue * Number(fr.co_hosting_fee_pct);
      const noi = revenue - opex - coHost;
      const fcf = noi - debt;
      scenarios[k] = {
        forecasted_revenue: fixed(revenue),
        operating_expenses_annual: fixed(opex),
        co_hosting_fee: fixed(coHost),
        net_operating_income: fixed(noi),
        debt_service_annual: fixed(debt),
        annual_free_cash_flow: fixed(fcf),
        cash_on_cash_pct: fixed(fcf / oop, 4),
      };
    }
    const t = uw.taxes;
    const basis = price * (1 - Number(t.land_assumptions_pct)) + optimization;
    const savings = basis * Number(t.sla_multiplier_pct) * Number(t.bonus_amount_pct) * Number(t.tax_rate_pct);

    pd.down_payment_amount = fixed(down);
    pd.loan_amount = fixed(loan);
    pd.closing_costs_amount = fixed(closing);
    uw.detail.forecasted_revenue = { ...fr, scenarios };
    uw.taxes = { ...t, tax_savings: fixed(savings) };
    uw.total_oop = fixed(oop);
    uw.optimization_total = fixed(optimization);
    uw.operating_expense_total = fixed(opexMonthly);
    uw.prr = fixed(Number(scenarios.mid.forecasted_revenue) / price, 4);
    uw.low_gross_revenue = scenarios.low.forecasted_revenue;
    uw.mid_gross_revenue = scenarios.mid.forecasted_revenue;
    uw.high_gross_revenue = scenarios.high.forecasted_revenue;
    uw.l_cash_on_cash = scenarios.low.cash_on_cash_pct;
    uw.m_cash_on_cash = scenarios.mid.cash_on_cash_pct;
    uw.h_cash_on_cash = scenarios.high.cash_on_cash_pct;
  }

  /** Grade against the brief's reference Mid: ≤10% → 100, ≤25% → 70, otherwise 40. */
  private finalise(uw: Json): Json {
    this.recalculate(uw);
    uw.deal_status = "analyst_completed";
    const reference = byZpid(uw.zpid).referenceMid;
    const candidate = Number(uw.mid_gross_revenue);
    const diff = Math.abs(candidate - reference);
    // Integer cross-multiplication: no float rounding at the exact 10% / 25% boundaries.
    const [rating, accuracy] = diff * 10 <= reference ? (["best", 100] as const) : diff * 4 <= reference ? (["medium", 70] as const) : (["low", 40] as const);
    this.clock += 60_000;
    const submission = {
      id: this.nextSub++,
      underwriting_id: uw.id,
      reference_underwriting_id: 1,
      zpid: uw.zpid,
      rating,
      accuracy: fixed(accuracy),
      breakdown: {
        rating,
        accuracy: fixed(accuracy),
        metric: "mid_gross_revenue",
        label: "Mid revenue forecast",
        candidate: fixed(candidate),
        reference: fixed(reference),
        deviation: fixed(diff / reference, 4),
        best_threshold: "0.10",
        medium_threshold: "0.25",
      },
      submitted_at: new Date(this.clock).toISOString(),
    };
    this.submissions.push(submission);
    return submission;
  }

  dashboard(): Json {
    const rows = PROPERTIES.map((prop) => {
      const subs = this.submissions.filter((s) => s.zpid === prop.zpid).reverse(); // newest first
      const draft = [...this.underwritings.values()].reverse().find((u) => u.zpid === prop.zpid && u.deal_status === "analyst_started");
      const best = subs.reduce<Json | null>((b, s) => (!b || Number(s.accuracy) > Number(b.accuracy) ? s : b), null);
      return {
        zpid: prop.zpid,
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zipcode: prop.zipcode,
        price: `$${prop.price.toLocaleString("en-US")}`,
        unformatted_price: String(prop.price),
        beds: prop.beds,
        baths: prop.baths,
        area: prop.area,
        img_src: `https://picsum.photos/seed/${prop.zpid}/640/420`,
        detail_url: null,
        home_type: "SINGLE_FAMILY",
        market_id: prop.marketId,
        market_name: MARKETS.find((x) => x.id === prop.marketId)!.name,
        status: draft ? "in_progress" : subs.length ? "submitted" : "not_started",
        attempts: subs.length,
        latest_accuracy: subs[0]?.accuracy ?? null,
        latest_rating: subs[0]?.rating ?? null,
        best_accuracy: best?.accuracy ?? null,
        best_rating: best?.rating ?? null,
        active_underwriting_id: draft?.id ?? null,
        latest_submission_id: subs[0]?.id ?? null,
      };
    });
    const scored = rows.filter((r) => r.latest_accuracy !== null).map((r) => Number(r.latest_accuracy));
    return {
      summary: {
        total_properties: rows.length,
        submitted: rows.filter((r) => r.status === "submitted").length,
        in_progress: rows.filter((r) => r.status === "in_progress").length,
        not_started: rows.filter((r) => r.status === "not_started").length,
        average_accuracy: scored.length ? fixed(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
      },
      properties: rows,
    };
  }
}

/** Same rules as the real Pydantic models: fractions in [0, 1], positive price/term, ≥0 revenue. */
function validate(p: Json): Json[] {
  const errors: Json[] = [];
  const bad = (loc: string[], msg: string) => errors.push({ loc: ["body", ...loc], msg, type: "value_error" });
  const frac = (section: string, obj: Json | undefined, keys: string[]) => {
    if (!obj) return;
    for (const k of keys) {
      const v = obj[k];
      if (typeof v !== "number") bad([section, k], "Input should be a valid number");
      else if (v < 0 || v > 1) bad([section, k], "Input should be between 0 and 1");
    }
  };
  if (p.purchase_details) {
    frac("purchase_details", p.purchase_details, ["down_payment_pct", "interest_rate", "closing_costs_pct"]);
    if (!(p.purchase_details.purchase_price > 0)) bad(["purchase_details", "purchase_price"], "Input should be greater than 0");
    if (!(p.purchase_details.mortgage_years > 0)) bad(["purchase_details", "mortgage_years"], "Input should be greater than 0");
  }
  frac("taxes", p.taxes, ["land_assumptions_pct", "sla_multiplier_pct", "bonus_amount_pct", "tax_rate_pct"]);
  if (p.forecasted_revenue) {
    frac("forecasted_revenue", p.forecasted_revenue, ["co_hosting_fee_pct", "annual_re_appreciation_pct"]);
    for (const k of ["low", "mid", "high"]) {
      if (!(p.forecasted_revenue.scenarios?.[k]?.forecasted_revenue >= 0)) bad(["forecasted_revenue", "scenarios", k], "Input should be greater than or equal to 0");
    }
  }
  return errors;
}

function failureKey(method: string, path: string): FailureKey | null {
  if (method === "GET" && path === "/dashboard") return "GET dashboard";
  if (method === "GET" && path === "/submissions") return "GET submissions";
  if (method === "GET" && /^\/submissions\/\d+$/.test(path)) return "GET submission";
  if (method === "POST" && path === "/underwritings") return "POST start";
  if (method === "GET" && /^\/underwritings\/\d+$/.test(path)) return "GET underwriting";
  if (method === "PUT" && /^\/underwritings\/\d+$/.test(path)) return "PUT underwriting";
  if (method === "POST" && /^\/underwritings\/\d+\/submit$/.test(path)) return "POST submit";
  return null;
}

function safeJson(text: string | null): Json | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
