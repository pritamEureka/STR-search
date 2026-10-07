"use client";

import { AlertCircle, CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money, pct } from "@/lib/format";
import type { Outputs } from "@/lib/underwriting/calc";
import type { FormIssue, SectionId, UnderwritingFormValues } from "@/lib/underwriting/schema";
import { SECTION_LABELS } from "./section-nav";

interface Props {
  issues: FormIssue[];
  values: UnderwritingFormValues;
  outputs: Outputs;
  onFix: (issue: FormIssue) => void;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  onRequestSubmit: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

const ORDER: SectionId[] = ["financials", "analysis", "tags"];

export function ReviewSection({
  issues,
  values,
  outputs,
  onFix,
  confirmOpen,
  onConfirmOpenChange,
  onRequestSubmit,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const { purchase, taxes, revenue } = values;
  const ready = issues.length === 0;
  const mid = outputs.scenarios.mid;

  const assumptions: [string, string][] = [
    ["Financing", `${purchase.downPaymentPct ?? "—"}% down, ${purchase.interestRate ?? "—"}% over ${purchase.years ?? "—"} years`],
    ["Closing costs", `${purchase.closingCostsPct ?? "—"}% of price`],
    ["Setup spend", `${money(outputs.optimizationTotal)} one-time`],
    ["Operating expenses", `${money(outputs.opexMonthly)}/mo (×0.96 Low, ×1.04 High)`],
    ["Co-hosting fee", `${revenue.coHostPct ?? "—"}% of revenue`],
    ["Appreciation", `${revenue.appreciationPct ?? "—"}% per year`],
    ["Taxes", `${taxes.landPct ?? "—"}% land · ${taxes.slaPct ?? "—"}% short-life · ${taxes.bonusPct ?? "—"}% bonus · ${taxes.taxRatePct ?? "—"}% rate`],
  ];

  return (
    <div className="space-y-4">
      <Card data-testid="review-checklist" data-ready={ready}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {ready ? <CheckCircle2 className="size-5 text-success" /> : <TriangleAlert className="size-5 text-warning" />}
            {ready ? "Ready to submit" : `${issues.length} thing${issues.length === 1 ? "" : "s"} to fix before submitting`}
          </CardTitle>
          <CardDescription>
            {ready
              ? "Every required field is filled in and valid."
              : "Incomplete fields are missing a value; invalid inputs have a value that doesn't make sense."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ORDER.map((section) => {
            const list = issues.filter((i) => i.section === section);
            return (
              <div key={section} data-testid={`review-group-${section}`}>
                <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  {list.length === 0 ? <CheckCircle2 className="size-4 text-success" /> : <AlertCircle className="size-4 text-warning" />}
                  {SECTION_LABELS[section]}
                </p>
                {list.length === 0 ? (
                  <p className="pl-6 text-sm text-muted-foreground">Complete</p>
                ) : (
                  <ul className="space-y-1 pl-6">
                    {list.map((i) => (
                      <li key={i.path} className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-sm" data-testid="review-issue" data-kind={i.kind}>
                        <span className="min-w-0">
                          <span className="font-medium">{i.label}</span>
                          <span className="text-muted-foreground"> — {i.message === "Required" ? "needs a value" : i.message}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className={i.kind === "invalid" ? "border-destructive/40 text-destructive" : "border-warning/40 text-warning"}>
                            {i.kind === "invalid" ? "Invalid" : "Incomplete"}
                          </Badge>
                          <Button type="button" variant="ghost" size="xs" onClick={() => onFix(i)}>
                            Fix
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key assumptions</CardTitle>
          <CardDescription>Sanity-check these before you submit.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {assumptions.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium">Your Mid revenue forecast: {money(revenue.mid)}</p>
            <p className="text-muted-foreground">
              Out of pocket {money(outputs.totalOutOfPocket)} · Mid cash-on-cash {pct(mid.cashOnCash)}
            </p>
          </div>
          <Button size="lg" onClick={onRequestSubmit} disabled={submitting} data-testid="submit-button">
            <Send /> Submit for grading
          </Button>
        </CardContent>
      </Card>

      {submitError && !confirmOpen && (
        <Alert variant="destructive" role="alert" data-testid="submit-error">
          <AlertCircle />
          <AlertTitle>Submission failed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this underwriting?</DialogTitle>
            <DialogDescription>
              The API will recalculate your numbers and grade your Mid revenue forecast ({money(revenue.mid)}) against the
              analyst&apos;s. You can try the case again afterwards.
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive" role="alert" data-testid="submit-error">
              <AlertCircle />
              <AlertTitle>Submission failed</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onConfirmOpenChange(false)} disabled={submitting}>
              Keep editing
            </Button>
            <Button onClick={onSubmit} disabled={submitting} data-testid="confirm-submit">
              {submitting ? <Loader2 className="animate-spin" /> : <Send />} {submitError ? "Retry submit" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
