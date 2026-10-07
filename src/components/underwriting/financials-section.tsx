"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, get } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import { emptyOpexRow, emptyOptimizationRow } from "@/lib/underwriting/mapping";
import type { Outputs } from "@/lib/underwriting/calc";
import type { UnderwritingFormValues } from "@/lib/underwriting/schema";
import { NumberField, SelectField, TextField, FieldMessage } from "./fields";

export const OPTIMIZATION_CATEGORIES = [
  "Furniture",
  "Hot tub",
  "Game room",
  "Pool",
  "Sauna / cold plunge",
  "Landscaping & outdoor",
  "Renovation",
  "Photography & staging",
  "Smart home & tech",
  "Other",
];

export function Readout({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

function PurchaseCard({ outputs }: { outputs: Outputs }) {
  return (
    <Card id="purchase">
      <CardHeader>
        <CardTitle>Purchase &amp; financing</CardTitle>
        <CardDescription>Works out the loan, the monthly mortgage and the cash needed at closing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="purchase.price" label="Purchase price" prefix="$" hint="Prefilled from the listing" />
          <NumberField name="purchase.downPaymentPct" label="Down payment" suffix="%" placeholder="e.g. 25" />
          <NumberField name="purchase.interestRate" label="Interest rate" suffix="%" placeholder="e.g. 7.0" />
          <NumberField name="purchase.years" label="Loan term" suffix="yrs" placeholder="e.g. 30" />
          <NumberField name="purchase.closingCostsPct" label="Closing costs" suffix="%" placeholder="e.g. 3" />
        </div>
        <dl className="space-y-2 self-start rounded-lg bg-muted/60 p-4" aria-label="Financing summary">
          <Readout label="Down payment" value={money(outputs.downPayment)} />
          <Readout label="Loan amount" value={money(outputs.loanAmount)} />
          <Readout label="Closing costs" value={money(outputs.closingCosts)} />
          <div className="border-t pt-2">
            <Readout label="Monthly mortgage" value={money(outputs.monthlyPayment)} strong />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function OptimizationCard({ outputs }: { outputs: Outputs }) {
  const { control } = useFormContext<UnderwritingFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "optimization" });
  return (
    <Card id="optimization">
      <CardHeader>
        <CardTitle>Optimization list</CardTitle>
        <CardDescription>
          One-time setup costs before the first guest arrives. They add to Total Out of Pocket and to the depreciable
          value.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_9rem_auto] items-start gap-2 sm:grid-cols-[1fr_12rem_auto]" data-testid="optimization-row">
            <SelectField name={`optimization.${i}.category`} label={`Optimization ${i + 1} category`} options={OPTIMIZATION_CATEGORIES} srOnlyLabel placeholder="Category" />
            <NumberField name={`optimization.${i}.amount`} label={`Optimization ${i + 1} amount`} prefix="$" srOnlyLabel placeholder="Amount" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove optimization ${i + 1}`}
              onClick={() => {
                remove(i);
                if (fields.length === 1) append(emptyOptimizationRow());
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyOptimizationRow())}>
            <Plus /> Add item
          </Button>
          <p className="text-sm text-muted-foreground">
            Total <strong className="tabular-nums text-foreground">{money(outputs.optimizationTotal)}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function OpexCard({ outputs }: { outputs: Outputs }) {
  const { control, formState } = useFormContext<UnderwritingFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "opex" });
  const listError = get(formState.errors, "opex.root")?.message as string | undefined;
  return (
    <Card id="opex">
      <CardHeader>
        <CardTitle>Operating expenses</CardTitle>
        <CardDescription>
          Recurring monthly costs: utilities, internet, insurance, property tax, supplies, software. Low and High
          scenarios nudge this by ×0.96 and ×1.04.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_9rem_auto] items-start gap-2 sm:grid-cols-[1fr_12rem_auto]" data-testid="opex-row">
            <TextField name={`opex.${i}.name`} label={`Expense ${i + 1} name`} srOnlyLabel placeholder="Expense name" />
            <NumberField name={`opex.${i}.monthly`} label={`Expense ${i + 1} monthly amount`} prefix="$" suffix="/mo" srOnlyLabel placeholder="Monthly" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove expense ${i + 1}`}
              onClick={() => {
                remove(i);
                if (fields.length === 1) append(emptyOpexRow());
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {listError && <FieldMessage id="opex-list-error" error={listError === "Required" ? "Add at least one operating expense." : listError} />}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyOpexRow())}>
            <Plus /> Add expense
          </Button>
          <p className="text-sm text-muted-foreground">
            <strong className="tabular-nums text-foreground">{money(outputs.opexMonthly)}</strong>/mo ·{" "}
            <strong className="tabular-nums text-foreground">{money(outputs.opexMonthly * 12)}</strong>/yr
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxesCard({ outputs }: { outputs: Outputs }) {
  return (
    <Card id="taxes">
      <CardHeader>
        <CardTitle>Taxes</CardTitle>
        <CardDescription>Estimates the first-year tax savings from depreciation. Most training deals use 20 / 25 / 60 / 37.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="taxes.landPct" label="Land" suffix="%" hint="Share of price that isn't depreciable" />
          <NumberField name="taxes.slaPct" label="Short-life asset multiplier" suffix="%" />
          <NumberField name="taxes.bonusPct" label="Bonus depreciation" suffix="%" />
          <NumberField name="taxes.taxRatePct" label="Tax rate" suffix="%" />
        </div>
        <dl className="self-start rounded-lg bg-muted/60 p-4">
          <Readout label="Year-1 tax savings" value={money(outputs.taxSavings)} strong />
        </dl>
      </CardContent>
    </Card>
  );
}

export function FinancialsSection({ outputs }: { outputs: Outputs }) {
  return (
    <div className="space-y-4">
      <PurchaseCard outputs={outputs} />
      <OptimizationCard outputs={outputs} />
      <OpexCard outputs={outputs} />
      <TaxesCard outputs={outputs} />
    </div>
  );
}
