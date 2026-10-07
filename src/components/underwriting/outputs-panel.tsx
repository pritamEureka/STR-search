import { ArrowDown, Calculator, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, pct } from "@/lib/format";
import { SCENARIOS, type Outputs } from "@/lib/underwriting/calc";
import { cn } from "@/lib/utils";

export const signTone = (n: number | null) =>
  n === null ? "text-muted-foreground" : n < 0 ? "text-destructive" : "text-success";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="grid size-4 place-items-center rounded-full bg-primary/10 text-[10px] text-primary">{n}</span>
        {title}
      </p>
      {children}
    </div>
  );
}

const Connector = () => (
  <div className="flex justify-center text-muted-foreground/60" aria-hidden>
    <ArrowDown className="size-4" />
  </div>
);

/**
 * The deal chain from the brief — what it costs, what it earns, how good the return is —
 * kept visible while the trainee edits any section.
 */
export function OutputsPanel({ outputs }: { outputs: Outputs }) {
  const mid = outputs.scenarios.mid;
  return (
    <Card data-testid="outputs-panel" data-source={outputs.source} className="lg:sticky lg:top-20">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Deal math</CardTitle>
        <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
          {outputs.source === "api" ? <Cloud /> : <Calculator />}
          {outputs.source === "api" ? "Calculated by API" : "Live preview"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step n={1} title="What it costs up front">
          <p className="text-2xl font-semibold tabular-nums" data-testid="total-oop">
            {money(outputs.totalOutOfPocket)}
          </p>
          <p className="text-xs text-muted-foreground">
            Total out of pocket: down payment {money(outputs.downPayment)} + closing {money(outputs.closingCosts)} + setup{" "}
            {money(outputs.optimizationTotal)}
          </p>
        </Step>
        <Connector />
        <Step n={2} title="What it earns each year">
          <p className={cn("text-2xl font-semibold tabular-nums", signTone(mid.freeCashFlow))} data-testid="mid-fcf">
            {money(mid.freeCashFlow)}
          </p>
          <p className="text-xs text-muted-foreground">
            Mid annual free cash flow. NOI {money(mid.noi)} minus {money(outputs.monthlyPayment === null ? null : outputs.monthlyPayment * 12)} of mortgage.
          </p>
        </Step>
        <Connector />
        <Step n={3} title="How good the return is">
          <div className="grid grid-cols-3 gap-2">
            {SCENARIOS.map(({ key, label }) => {
              const coc = outputs.scenarios[key].cashOnCash;
              return (
                <div key={key} className="rounded-lg border p-2 text-center" data-testid={`coc-${key}`}>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className={cn("text-sm font-semibold tabular-nums", signTone(coc))}>{pct(coc)}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Cash-on-cash: free cash flow ÷ total out of pocket.</p>
        </Step>
        <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Year-1 tax savings</dt>
            <dd className="font-medium tabular-nums">{money(outputs.taxSavings)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">PRR (Mid ÷ price)</dt>
            <dd className="font-medium tabular-nums">{outputs.prr === null ? "—" : `${(outputs.prr * 100).toFixed(1)}%`}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
