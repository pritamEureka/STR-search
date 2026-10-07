"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CloudOff, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/query-state";
import { keys } from "@/hooks/queries";
import { useAutosave } from "@/hooks/use-autosave";
import { api } from "@/lib/api";
import type { Property, Underwriting } from "@/lib/types";
import { computeOutputs, outputsFromApi } from "@/lib/underwriting/calc";
import { formToPayload, underwritingToForm } from "@/lib/underwriting/mapping";
import { collectIssues, underwritingResolver, type FormIssue, type UnderwritingFormValues } from "@/lib/underwriting/schema";
import { cn } from "@/lib/utils";
import { AnalysisSection } from "./analysis-section";
import { FinancialsSection } from "./financials-section";
import { OutputsPanel } from "./outputs-panel";
import { PropertyHeader } from "./property-header";
import { ReviewSection } from "./review-section";
import { SectionNav, STEP_ORDER, type StepId } from "./section-nav";
import { TagsSection } from "./tags-section";

export function Workspace({ id }: { id: number }) {
  const uw = useQuery({ queryKey: keys.underwriting(id), queryFn: () => api.underwriting(id), staleTime: Infinity });

  if (uw.isPending) return <Skeleton className="h-128 w-full rounded-xl" />;
  if (uw.isError) {
    return <ErrorState title="Couldn't open this underwriting" error={uw.error} onRetry={() => uw.refetch()} />;
  }
  if (uw.data.deal_status === "analyst_completed") {
    return (
      <Alert className="max-w-xl" data-testid="already-submitted">
        <CheckCircle2 />
        <AlertTitle>This attempt was already submitted</AlertTitle>
        <AlertDescription>
          <p>Submitted underwritings are locked. Start a new attempt from the dashboard to try the case again.</p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
            <ArrowLeft /> Back to dashboard
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  return <WorkspaceForm underwriting={uw.data} />;
}

const HELD_LABELS = {
  purchase_details: "Purchase & financing",
  taxes: "Taxes",
  forecasted_revenue: "Revenue forecast",
} as const;

function SaveStatus({
  status,
  savedAt,
  error,
  heldBack,
  onRetry,
}: {
  status: "idle" | "saving" | "saved" | "error";
  savedAt: Date | null;
  error: string | null;
  /** Sections the API can't accept yet because they're incomplete or invalid. */
  heldBack: (keyof typeof HELD_LABELS)[];
  onRetry: () => void;
}) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" role="status" data-testid="save-status" data-status={status}>
      {status === "saving" && (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="size-3.5 text-success" /> Draft saved
          {savedAt && ` at ${savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
        </>
      )}
      {status === "idle" && (
        <>
          <Save className="size-3.5" /> Changes save automatically
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff className="size-3.5 text-destructive" />
          <span className="text-destructive">Couldn&apos;t save{error ? `: ${error}` : ""}</span>
          <Button variant="outline" size="xs" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
      {heldBack.length > 0 && status !== "error" && (
        <span className="text-warning" data-testid="held-back">
          · Not saved yet (incomplete): {heldBack.map((k) => HELD_LABELS[k]).join(", ")}
        </span>
      )}
    </p>
  );
}

function WorkspaceForm({ underwriting }: { underwriting: Underwriting }) {
  const router = useRouter();
  const qc = useQueryClient();
  const id = underwriting.id;

  const property = useQuery({
    queryKey: keys.property(underwriting.zpid ?? ""),
    queryFn: () => api.property(underwriting.zpid!),
    enabled: !!underwriting.zpid,
  });
  const marketId = underwriting.market_id ?? property.data?.market_id ?? null;
  const market = useQuery({
    queryKey: keys.market(marketId ?? 0),
    queryFn: () => api.market(marketId!),
    enabled: marketId !== null,
  });

  const defaultValues = useMemo(() => underwritingToForm(underwriting), [underwriting]);
  const form = useForm<UnderwritingFormValues>({
    defaultValues,
    resolver: underwritingResolver,
    mode: "onChange",
  });
  const values = useWatch({ control: form.control }) as UnderwritingFormValues;

  const { payload, skipped } = useMemo(() => formToPayload(values), [values]);
  const autosave = useAutosave({ id, payload, initial: underwriting });

  const issues = useMemo(() => collectIssues(values), [values]);
  const preview = useMemo(() => computeOutputs(values), [values]);
  const outputs = useMemo(() => {
    // Prefer the API's numbers whenever they describe exactly what's on screen.
    const fromApi = autosave.inSync && issues.length === 0 ? outputsFromApi(autosave.data, preview) : null;
    return fromApi ?? preview;
  }, [autosave.inSync, autosave.data, issues.length, preview]);

  const [step, setStep] = useState<StepId>("financials");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const goToStep = useCallback(
    (next: StepId) => {
      setStep(next);
      // Surface every inline error as soon as the trainee reaches the review step.
      if (next === "review") void form.trigger();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [form],
  );

  const fixIssue = useCallback(
    (issue: FormIssue) => {
      setStep(issue.section);
      void form.trigger();
      const target = issue.path === "opex" ? "opex.0.name" : issue.path;
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field-path="${target}"]`);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
      }, 60);
    },
    [form],
  );

  const submit = useMutation({
    mutationFn: () => api.submit(id, formToPayload(form.getValues()).payload),
    onSuccess: (res) => {
      qc.setQueryData(keys.dashboard, res.dashboard);
      qc.setQueryData(keys.submission(res.submission.id), res.submission);
      qc.invalidateQueries({ queryKey: keys.submissions });
      router.push(`/results/${res.submission.id}`);
    },
  });

  const requestSubmit = () => {
    void form.trigger();
    if (issues.length > 0) return;
    submit.reset();
    setConfirmOpen(true);
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const prev = STEP_ORDER[stepIndex - 1];
  const next = STEP_ORDER[stepIndex + 1];

  return (
    <FormProvider {...form}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft /> Dashboard
          </Link>
          <SaveStatus
            status={autosave.status}
            savedAt={autosave.savedAt}
            error={autosave.error}
            heldBack={skipped}
            onRetry={autosave.flush}
          />
        </div>

        <PropertyHeader address={underwriting.property_address} property={property.data as Property | undefined} market={market.data} />

        <SectionNav active={step} issues={issues} onChange={goToStep} />

        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]"
          aria-label="Underwriting form"
        >
          <div className="space-y-4">
            {step === "financials" && <FinancialsSection outputs={outputs} />}
            {step === "analysis" && <AnalysisSection outputs={outputs} />}
            {step === "tags" && <TagsSection />}
            {step === "review" && (
              <ReviewSection
                issues={issues}
                values={values}
                outputs={outputs}
                onFix={fixIssue}
                confirmOpen={confirmOpen}
                onConfirmOpenChange={setConfirmOpen}
                onRequestSubmit={requestSubmit}
                onSubmit={() => submit.mutate()}
                submitting={submit.isPending}
                submitError={submit.isError ? submit.error.message : null}
              />
            )}

            {issues.length > 0 && step !== "review" && Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive" role="alert">
                <AlertCircle />
                <AlertTitle>Some inputs need attention</AlertTitle>
                <AlertDescription>Fix the highlighted fields. Invalid sections are held back from autosave.</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-2">
              {prev ? (
                <Button type="button" variant="outline" onClick={() => goToStep(prev)}>
                  <ArrowLeft /> Back
                </Button>
              ) : (
                <span />
              )}
              {next && (
                <Button type="button" onClick={() => goToStep(next)} data-testid="next-step">
                  {next === "review" ? "Review" : "Continue"} <ArrowRight />
                </Button>
              )}
            </div>
          </div>

          <OutputsPanel outputs={outputs} />
        </form>
      </div>
    </FormProvider>
  );
}
