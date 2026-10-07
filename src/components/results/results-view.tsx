"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RATING_META, RatingBadge } from "@/components/rating";
import { ErrorState } from "@/components/query-state";
import {
  buildLeaderboard,
  Leaderboard,
} from "@/components/dashboard/leaderboard";
import {
  useDashboard,
  useStartUnderwriting,
  useSubmission,
  useSubmissions,
} from "@/hooks/queries";
import { money, signedPct, toNum } from "@/lib/format";
import type { Rating, ScoreBreakdown } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeviationBar } from "./deviation-bar";
import { ScoreRing } from "./score-ring";

function explain(b: ScoreBreakdown): { headline: string; detail: string } {
  const candidate = toNum(b.candidate);
  const reference = toNum(b.reference);
  const best = toNum(b.best_threshold) ?? 0.1;
  const medium = toNum(b.medium_threshold) ?? 0.25;
  if (candidate === null || reference === null) {
    return {
      headline: "No Mid revenue forecast was found",
      detail:
        "Without a forecast there's nothing to compare, so the attempt scores Low.",
    };
  }
  const signed = reference === 0 ? 0 : (candidate - reference) / reference;
  const size = Math.abs(signed);
  const direction =
    size === 0
      ? "exactly in line with"
      : `${(size * 100).toFixed(1)}% ${signed > 0 ? "above" : "below"}`;
  const headline = `Your Mid forecast was ${direction} the analyst's`;
  const detail =
    size <= best
      ? "That's inside the Best band, so you earned full marks."
      : size <= medium
        ? `That's outside the Best band (±${best * 100}%) but inside Medium (±${medium * 100}%).`
        : `That's more than ${medium * 100}% away, outside both the Best and Medium bands.`;
  return { headline, detail };
}

const RATING_COPY: Record<Rating, string> = {
  best: "Excellent calibration",
  medium: "Close, but not there yet",
  low: "Worth another look",
};

export function ResultsView({ submissionId }: { submissionId: number }) {
  const submission = useSubmission(submissionId);
  const submissions = useSubmissions();
  const dashboard = useDashboard();
  const start = useStartUnderwriting();

  const entries = useMemo(
    () =>
      buildLeaderboard(
        submissions.data ?? [],
        dashboard.data?.properties ?? [],
      ),
    [submissions.data, dashboard.data],
  );

  if (submission.isPending)
    return <Skeleton className="h-[28rem] w-full rounded-xl" />;
  if (submission.isError) {
    return (
      <ErrorState
        title="Couldn't load this result"
        error={submission.error}
        onRetry={() => submission.refetch()}
      />
    );
  }

  const s = submission.data;
  const b = s.breakdown;
  const score = toNum(s.accuracy) ?? 0;
  const candidate = toNum(b.candidate);
  const reference = toNum(b.reference);
  const best = toNum(b.best_threshold) ?? 0.1;
  const medium = toNum(b.medium_threshold) ?? 0.25;
  const signed =
    candidate !== null && reference
      ? (candidate - reference) / reference
      : null;
  const { headline, detail } = explain(b);
  const meta = RATING_META[s.rating];

  const property = dashboard.data?.properties.find((p) => p.zpid === s.zpid);
  const nextCase = dashboard.data?.properties.find(
    (p) => p.status === "not_started" && p.zpid !== s.zpid,
  );
  const me = entries.find((e) => e.submission.id === s.id);
  const startNext = nextCase && nextCase.zpid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft /> Dashboard
        </Link>
        {property && (
          <p className="text-sm text-muted-foreground">{property.address}</p>
        )}
      </div>

      <Card data-testid="score-card" data-rating={s.rating}>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={score} rating={s.rating} />
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <RatingBadge rating={s.rating} />
              <span className="text-sm text-muted-foreground">
                {RATING_COPY[s.rating]}
              </span>
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              data-testid="score-headline"
            >
              {headline}
            </h1>
            <p className="text-muted-foreground">{detail}</p>
            {me && (
              <p
                className={cn("text-sm font-medium", meta.text)}
                data-testid="rank-summary"
              >
                You rank #{me.rank}
                {me.tied ? " (tied)" : ""} of {entries.length} graded attempt
                {entries.length === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How the score was worked out</CardTitle>
              <CardDescription>
                Scoring compares one number: your {b.label.toLowerCase()}{" "}
                against the analyst&apos;s.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-3 sm:grid-cols-3" data-testid="breakdown">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">
                    Your Mid forecast
                  </dt>
                  <dd
                    className="text-lg font-semibold tabular-nums"
                    data-testid="breakdown-candidate"
                  >
                    {money(candidate)}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">
                    Analyst reference
                  </dt>
                  <dd
                    className="text-lg font-semibold tabular-nums"
                    data-testid="breakdown-reference"
                  >
                    {money(reference)}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Deviation</dt>
                  <dd
                    className="text-lg font-semibold tabular-nums"
                    data-testid="breakdown-deviation"
                  >
                    {signed === null ? "—" : signedPct(signed)}
                  </dd>
                </div>
              </dl>

              {signed !== null && (
                <DeviationBar deviation={signed} best={best} medium={medium} />
              )}

              {reference !== null && (
                <div className="rounded-lg bg-muted/60 p-4 text-sm">
                  <p className="mb-2 font-medium">
                    What each band needed on this case
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Best (100):</strong>{" "}
                      {money(reference * (1 - best))} –{" "}
                      {money(reference * (1 + best))}
                    </li>
                    <li>
                      <strong className="text-foreground">Medium (70):</strong>{" "}
                      {money(reference * (1 - medium))} –{" "}
                      {money(reference * (1 + medium))}
                    </li>
                    <li>
                      <strong className="text-foreground">Low (40):</strong>{" "}
                      anything outside the Medium range
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="outline"
              disabled={start.isPending}
              onClick={() => start.mutate(s.zpid)}
              data-testid="try-again"
            >
              {start.isPending && start.variables === s.zpid ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}{" "}
              Try this case again
            </Button>
            {startNext && (
              <Button
                size="lg"
                disabled={start.isPending}
                onClick={() => start.mutate(startNext)}
              >
                Next case: {nextCase.address?.split(",")[0]} <ArrowRight />
              </Button>
            )}
            <Link
              href="/"
              className={buttonVariants({ size: "lg", variant: "ghost" })}
            >
              Back to dashboard
            </Link>
          </div>
          {start.isError && (
            <p role="alert" className="text-sm text-destructive">
              {start.error.message}
            </p>
          )}
        </div>

        <Leaderboard entries={entries} highlightId={s.id} />
      </div>
    </div>
  );
}
