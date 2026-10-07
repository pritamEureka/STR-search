const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function money(v: unknown): string {
  const n = toNum(v);
  if (n === null) return "—";
  // Avoid "-$0".
  return usd.format(Math.abs(n) < 0.5 ? 0 : n);
}

/** Fraction → "5.2%". */
export function pct(v: unknown, digits = 1): string {
  const n = toNum(v);
  return n === null ? "—" : `${(n * 100).toFixed(digits)}%`;
}

/** Signed percentage for deviations: "+4.0%". */
export function signedPct(v: number, digits = 1): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(digits)}%`;
}

/** Whole-number form value → fraction for the API, without float noise. */
export const toFraction = (whole: number) => Math.round(whole * 1e6) / 1e8;
/** API fraction → whole-number form value. */
export const fromFraction = (f: unknown): number | null => {
  const n = toNum(f);
  return n === null ? null : Math.round(n * 1e8) / 1e6;
};
