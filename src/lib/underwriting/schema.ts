import { get, set, type FieldErrors, type Resolver } from "react-hook-form";
import { z } from "zod";
import { DEAL_TAG_KEYS, type DealTagKey } from "@/lib/types";
export interface UnderwritingFormValues {
  purchase: {
    price: number | null;
    downPaymentPct: number | null;
    interestRate: number | null;
    years: number | null;
    closingCostsPct: number | null;
  };
  optimization: { category: string; amount: number | null }[];
  opex: { name: string; monthly: number | null }[];
  taxes: {
    landPct: number | null;
    slaPct: number | null;
    bonusPct: number | null;
    taxRatePct: number | null;
  };
  revenue: {
    low: number | null;
    mid: number | null;
    high: number | null;
    coHostPct: number | null;
    appreciationPct: number | null;
  };
  tags: Record<DealTagKey, boolean>;
}

export const REQUIRED_MESSAGE = "Required";

const required = { error: REQUIRED_MESSAGE } as const;
const money = (label: string) =>
  z
    .number(required)
    .min(0, `${label} can't be negative`)
    .max(1e9, `${label} is unrealistically large`);
const percent = z
  .number(required)
  .min(0, "Must be 0–100%")
  .max(100, "Must be 0–100%");

const purchaseSchema = z.object({
  price: z
    .number(required)
    .gt(0, "Must be greater than $0")
    .max(1e9, "Purchase price is unrealistically large"),
  downPaymentPct: percent,
  interestRate: percent.max(30, "Interest rate above 30% looks like a typo"),
  years: z
    .number(required)
    .int("Use whole years")
    .min(1, "At least 1 year")
    .max(50, "At most 50 years"),
  closingCostsPct: percent,
});

const optimizationRowSchema = z
  .object({ category: z.string(), amount: z.number().nullable() })
  .superRefine((row, ctx) => {
    const blank = !row.category && row.amount === null;
    if (blank) return; // untouched rows are ignored, not errors
    if (!row.category)
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: REQUIRED_MESSAGE,
      });
    if (row.amount === null) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: REQUIRED_MESSAGE,
      });
    } else if (row.amount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount can't be negative",
      });
    }
  });

const opexRowSchema = z
  .object({ name: z.string().trim(), monthly: z.number().nullable() })
  .superRefine((row, ctx) => {
    const blank = !row.name && row.monthly === null;
    if (blank) return;
    if (!row.name)
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: REQUIRED_MESSAGE,
      });
    if (row.monthly === null) {
      ctx.addIssue({
        code: "custom",
        path: ["monthly"],
        message: REQUIRED_MESSAGE,
      });
    } else if (row.monthly < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["monthly"],
        message: "Amount can't be negative",
      });
    }
  });

const taxesSchema = z.object({
  landPct: percent,
  slaPct: percent,
  bonusPct: percent,
  taxRatePct: percent,
});

const revenueSchema = z.object({
  low: money("Revenue"),
  mid: money("Revenue"),
  high: money("Revenue"),
  coHostPct: percent,
  appreciationPct: percent,
});

export const sectionSchemas = {
  purchase: purchaseSchema,
  taxes: taxesSchema,
  revenue: revenueSchema,
} as const;

export const underwritingSchema = z.object({
  purchase: purchaseSchema,
  optimization: z.array(optimizationRowSchema),
  opex: z.array(opexRowSchema),
  taxes: taxesSchema,
  revenue: revenueSchema,
  tags: z.record(z.enum(DEAL_TAG_KEYS), z.boolean()),
});

interface RawIssue {
  path: string;
  message: string;
}

/**
 * Rules that span several fields. They live outside the zod schema on purpose: zod skips
 * object-level refinements whenever any field fails its own type check, which would hide
 * "Low should not exceed Mid" until every other field in the form happened to be valid.
 */
function crossFieldIssues(v: UnderwritingFormValues): RawIssue[] {
  const issues: RawIssue[] = [];
  if (!v.opex.some((r) => r.name.trim() && r.monthly !== null)) {
    issues.push({ path: "opex", message: REQUIRED_MESSAGE });
  }
  const { low, mid, high } = v.revenue;
  if (
    low !== null &&
    mid !== null &&
    high !== null &&
    !(low <= mid && mid <= high)
  ) {
    issues.push({
      path: "revenue.mid",
      message: "Revenue should rise from Low to Mid to High",
    });
  }
  return issues;
}

export function validateValues(v: UnderwritingFormValues): RawIssue[] {
  const parsed = underwritingSchema.safeParse(v);
  const base = parsed.success
    ? []
    : parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
  return [...base, ...crossFieldIssues(v)];
}

/** react-hook-form resolver. List-level errors go on `<list>.root`, RHF's convention for field arrays. */
export const underwritingResolver: Resolver<UnderwritingFormValues> = async (
  values,
) => {
  const issues = validateValues(values);
  if (issues.length === 0) return { values, errors: {} };
  const errors: FieldErrors<UnderwritingFormValues> = {};
  for (const { path, message } of issues) {
    const target = path === "opex" ? "opex.root" : path;
    if (!get(errors, target))
      set(errors, target, { type: "validation", message });
  }
  return { values: {}, errors };
};

/* ----------------------------------------------------------------- issues -- */

export type SectionId = "financials" | "analysis" | "tags";

export interface FormIssue {
  /** Dotted RHF path, e.g. `purchase.downPaymentPct` or `opex.2.monthly`. */
  path: string;
  message: string;
  kind: "incomplete" | "invalid";
  section: SectionId;
  /** Human label for the review checklist. */
  label: string;
}

const FIELD_LABELS: Record<string, string> = {
  "purchase.price": "Purchase price",
  "purchase.downPaymentPct": "Down payment %",
  "purchase.interestRate": "Interest rate",
  "purchase.years": "Loan term",
  "purchase.closingCostsPct": "Closing costs %",
  "taxes.landPct": "Land %",
  "taxes.slaPct": "Short-life asset multiplier %",
  "taxes.bonusPct": "Bonus depreciation %",
  "taxes.taxRatePct": "Tax rate %",
  "revenue.low": "Low revenue forecast",
  "revenue.mid": "Mid revenue forecast",
  "revenue.high": "High revenue forecast",
  "revenue.coHostPct": "Co-hosting fee %",
  "revenue.appreciationPct": "Annual appreciation %",
  opex: "Operating expenses",
};

function labelFor(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const m = path.match(/^(optimization|opex)\.(\d+)\.(\w+)$/);
  if (m) {
    const [, list, idx, field] = m;
    const row = Number(idx) + 1;
    return list === "optimization"
      ? `Optimization item ${row} ${field === "category" ? "category" : "amount"}`
      : `Expense ${row} ${field === "name" ? "name" : "monthly amount"}`;
  }
  return path;
}

export function sectionOf(path: string): SectionId {
  const root = path.split(".")[0];
  if (root === "revenue") return "analysis";
  if (root === "tags") return "tags";
  return "financials";
}

/** Run the full schema and return flat, labelled issues for the review step. */
export function collectIssues(values: UnderwritingFormValues): FormIssue[] {
  const seen = new Set<string>();
  const issues: FormIssue[] = [];
  for (const { path, message } of validateValues(values)) {
    if (seen.has(path)) continue;
    seen.add(path);
    issues.push({
      path,
      message,
      kind: message === REQUIRED_MESSAGE ? "incomplete" : "invalid",
      section: sectionOf(path),
      label: labelFor(path),
    });
  }
  return issues;
}
