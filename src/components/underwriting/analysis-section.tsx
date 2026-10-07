"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, pct } from "@/lib/format";
import { SCENARIOS, type Outputs, type ScenarioOutputs } from "@/lib/underwriting/calc";
import type { UnderwritingFormValues } from "@/lib/underwriting/schema";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import { signTone } from "./outputs-panel";

const ROWS: { label: string; hint?: string; value: (s: ScenarioOutputs) => string; tone?: (s: ScenarioOutputs) => number | null; strong?: boolean }[] = [
  { label: "Gross revenue", value: (s) => money(s.revenue) },
  { label: "Operating expenses", hint: "Low ×0.96 · High ×1.04", value: (s) => money(s.opexAnnual === null ? null : -s.opexAnnual) },
  { label: "Co-hosting fee", value: (s) => money(s.coHostFee === null ? null : -s.coHostFee) },
  { label: "Net operating income", value: (s) => money(s.noi), strong: true },
  { label: "Annual free cash flow", hint: "NOI − mortgage", value: (s) => money(s.freeCashFlow), tone: (s) => s.freeCashFlow, strong: true },
  { label: "Cash-on-cash", hint: "Free cash flow ÷ out of pocket", value: (s) => pct(s.cashOnCash), tone: (s) => s.cashOnCash, strong: true },
];

export function AnalysisSection({ outputs }: { outputs: Outputs }) {
  const { control, getValues, trigger } = useFormContext<UnderwritingFormValues>();
  const [low, high] = useWatch({ control, name: ["revenue.low", "revenue.high"] });
  useEffect(() => {
    // The "Low ≤ Mid ≤ High" error lives on Mid, but is caused by edits to Low or High too.
    // Re-check Mid when they change so a stale error clears (or appears) without touching Mid.
    if (getValues("revenue.mid") !== null) void trigger("revenue.mid");
  }, [low, high, getValues, trigger]);

  return (
    <div className="space-y-4">
      <Card id="revenue">
        <CardHeader>
          <CardTitle>Revenue forecast</CardTitle>
          <CardDescription>
            Three annual gross revenue forecasts: a cautious year, an expected year and a strong year. Your Mid forecast
            is what gets graded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {SCENARIOS.map(({ key, label, hint }) => (
              <NumberField key={key} name={`revenue.${key}`} label={`${label} revenue`} prefix="$" suffix="/yr" hint={hint} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField name="revenue.coHostPct" label="Co-hosting fee" suffix="%" hint="Share of revenue paid to a co-host (0 if self-managed)" />
            <NumberField name="revenue.appreciationPct" label="Annual appreciation" suffix="%" hint="Expected yearly growth in property value" />
          </div>
        </CardContent>
      </Card>

      <Card id="returns">
        <CardHeader>
          <CardTitle>Calculated returns</CardTitle>
          <CardDescription>
            {outputs.source === "api"
              ? "Calculated by the API from your last save."
              : "Live preview using the same formulas as the API; it recalculates on every save and submit."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table data-testid="returns-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Annual</TableHead>
                {SCENARIOS.map((s) => (
                  <TableHead key={s.key} className="text-right">
                    {s.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <span className={cn(row.strong && "font-medium")}>{row.label}</span>
                    {row.hint && <span className="block text-xs text-muted-foreground">{row.hint}</span>}
                  </TableCell>
                  {SCENARIOS.map((s) => {
                    const sc = outputs.scenarios[s.key];
                    return (
                      <TableCell
                        key={s.key}
                        className={cn("text-right tabular-nums", row.strong && "font-semibold", row.tone && signTone(row.tone(sc)))}
                      >
                        {row.value(sc)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <dl className="grid gap-3 rounded-lg bg-muted/60 p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Total out of pocket</dt>
              <dd className="font-semibold tabular-nums">{money(outputs.totalOutOfPocket)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Year-1 tax savings</dt>
              <dd className="font-semibold tabular-nums">{money(outputs.taxSavings)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PRR (Mid revenue ÷ price)</dt>
              <dd className="font-semibold tabular-nums">{outputs.prr === null ? "—" : `${(outputs.prr * 100).toFixed(1)}%`}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
