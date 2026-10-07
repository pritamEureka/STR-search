/**
 * Seed data and case generation.
 *
 * The six properties and their reference Mid forecasts / score ranges are copied verbatim
 * from the assessment brief ("How scoring works"). The Best/Medium ranges are written out
 * literally rather than computed, so the expectations are independent of the scoring maths
 * that the mock (and the real API) implement.
 */

export type Band = "best" | "medium" | "low";

export interface SeedProperty {
  zpid: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  beds: number;
  baths: number;
  area: number;
  marketId: number;
  /** Analyst reference Mid forecast, never shown to the trainee before they submit. */
  referenceMid: number;
  best: [number, number];
  medium: [number, number];
}

export const MARKETS = [
  { id: 1, name: "Smoky & Blue Ridge Mountains", slug: "smoky-blue-ridge-mountains", state: null, region: "Southern Appalachia", description: "Drive-to cabin market spanning the Tennessee Smokies and the north Georgia mountains. Year-round demand; views and hot tubs carry ADR.", property_count: 3 },
  { id: 2, name: "Broken Bow", slug: "broken-bow", state: "OK", region: "Ouachita Mountains", description: "Hochatown / Broken Bow luxury cabin market fed by DFW and OKC. New-build heavy, light regulation, weekend-weighted occupancy.", property_count: 1 },
  { id: 3, name: "Central Florida", slug: "central-florida", state: "FL", region: "Orlando Metro", description: "Theme-park resort communities around Kissimmee and Davenport. Large themed homes, HOA-governed, cohost-friendly, steady year-round.", property_count: 1 },
  { id: 4, name: "Texas Gulf Coast", slug: "texas-gulf-coast", state: "TX", region: "Coastal Bend", description: "Port Aransas and Mustang Island beach market. Heavy summer seasonality and windstorm insurance, offset by top-decile peak ADR.", property_count: 1 },
];

const p = (
  zpid: string,
  street: string,
  city: string,
  state: string,
  zipcode: string,
  price: number,
  beds: number,
  baths: number,
  area: number,
  marketId: number,
  referenceMid: number,
  best: [number, number],
  medium: [number, number],
): SeedProperty => ({
  zpid,
  street,
  city,
  state,
  zipcode,
  address: `${street}, ${city}, ${state} ${zipcode}`,
  price,
  beds,
  baths,
  area,
  marketId,
  referenceMid,
  best,
  medium,
});

export const PROPERTIES: SeedProperty[] = [
  p("41234567", "1240 Ski View Dr", "Gatlinburg", "TN", "37738", 675000, 3, 3, 2150, 1, 125000, [112500, 137500], [93750, 156250]),
  p("52345678", "88 Lakeshore Ln", "Broken Bow", "OK", "74728", 540000, 2, 2, 1600, 2, 96000, [86400, 105600], [72000, 120000]),
  p("63456789", "3402 Palm Isle Ct", "Kissimmee", "FL", "34747", 895000, 6, 5.5, 3400, 3, 165000, [148500, 181500], [123750, 206250]),
  p("74567890", "215 Aspen Ridge Rd", "Blue Ridge", "GA", "30513", 725000, 4, 3.5, 2600, 1, 128000, [115200, 140800], [96000, 160000]),
  p("85678901", "9 Dune Walk", "Port Aransas", "TX", "78373", 1150000, 5, 4, 2900, 4, 192000, [172800, 211200], [144000, 240000]),
  p("96789012", "47 Cedar Hollow Rd", "Sevierville", "TN", "37876", 449000, 2, 2, 1350, 1, 80000, [72000, 88000], [60000, 100000]),
];

export const byZpid = (zpid: string) => PROPERTIES.find((x) => x.zpid === zpid)!;
export const BROKEN_BOW = PROPERTIES[1];

/* ----------------------------------------------------------- scoring cases -- */

export interface ScoringCase {
  title: string;
  property: SeedProperty;
  mid: number;
  expected: Band;
  score: 100 | 70 | 40;
}

const round = (n: number) => Math.round(n);

/**
 * For every property, probe the edges of each band. Because the ranges in the brief are
 * inclusive ("a forecast exactly 10% off is still Best"), the boundary values land in the
 * *better* band and one dollar further lands in the next one.
 */
export function scoringCases(): ScoringCase[] {
  const cases: ScoringCase[] = [];
  for (const prop of PROPERTIES) {
    const [bestLo, bestHi] = prop.best;
    const [medLo, medHi] = prop.medium;
    const add = (title: string, mid: number, expected: Band) =>
      cases.push({ title, property: prop, mid, expected, score: expected === "best" ? 100 : expected === "medium" ? 70 : 40 });

    add("exact match", prop.referenceMid, "best");
    add("top of Best range (+10%)", bestHi, "best");
    add("bottom of Best range (-10%)", bestLo, "best");
    add("just above Best (+$1)", bestHi + 1, "medium");
    add("just below Best (-$1)", bestLo - 1, "medium");
    add("top of Medium range (+25%)", medHi, "medium");
    add("bottom of Medium range (-25%)", medLo, "medium");
    add("just above Medium (+$1)", medHi + 1, "low");
    add("just below Medium (-$1)", medLo - 1, "low");
    add("far too optimistic (2x)", round(prop.referenceMid * 2), "low");
    add("far too pessimistic (0.3x)", round(prop.referenceMid * 0.3), "low");
  }
  return cases;
}

/** A complete, valid set of inputs. Only `mid` varies between scoring cases. */
export interface Inputs {
  downPaymentPct: number;
  interestRate: number;
  years: number;
  closingCostsPct: number;
  optimization: { category: string; amount: number }[];
  opex: { name: string; monthly: number }[];
  low: number;
  mid: number;
  high: number;
  coHostPct: number;
  appreciationPct: number;
}

export function inputsFor(prop: SeedProperty, mid: number): Inputs {
  return {
    downPaymentPct: 25,
    interestRate: 7,
    years: 30,
    closingCostsPct: 3,
    optimization: [
      { category: "Furniture", amount: 40000 },
      { category: "Hot tub", amount: 12000 },
    ],
    opex: [
      { name: "Utilities", monthly: 900 },
      { name: "Insurance", monthly: 700 },
    ],
    low: Math.round(mid * 0.8),
    mid,
    high: Math.round(mid * 1.2),
    coHostPct: 10,
    appreciationPct: 3,
  };
}
