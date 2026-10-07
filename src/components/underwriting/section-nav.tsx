import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormIssue, SectionId } from "@/lib/underwriting/schema";

export type StepId = SectionId | "review";

export const SECTION_LABELS: Record<SectionId, string> = {
  financials: "Financials",
  analysis: "Analysis",
  tags: "Deal tags",
};

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "financials", label: "Financials", hint: "What the deal costs" },
  { id: "analysis", label: "Analysis", hint: "What the deal earns" },
  { id: "tags", label: "Deal tags", hint: "Label the deal" },
  { id: "review", label: "Review & submit", hint: "Check and grade" },
];

export const STEP_ORDER = STEPS.map((s) => s.id);

export function SectionNav({
  active,
  issues,
  onChange,
}: {
  active: StepId;
  issues: FormIssue[];
  onChange: (id: StepId) => void;
}) {
  return (
    <nav aria-label="Underwriting sections" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const count = s.id === "review" ? issues.length : issues.filter((x) => x.section === s.id).length;
        const done = count === 0;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-current={isActive ? "step" : undefined}
            data-testid={`step-${s.id}`}
            data-complete={done}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50",
            )}
          >
            <span className={cn("shrink-0", done ? "text-success" : "text-muted-foreground")}>
              {done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {i + 1}. {s.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {done ? s.hint : `${count} to do`}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
