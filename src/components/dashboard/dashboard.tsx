"use client";

import { useMemo, useState } from "react";
import { Gauge, LayoutGrid, List, PencilLine, Target } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { FocusCards } from "@/components/ui/focus-cards";
import { GooeyInput } from "@/components/ui/gooey-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/query-state";
import { useDashboard, useStartUnderwriting, useSubmissions } from "@/hooks/queries";
import { toNum } from "@/lib/format";
import type { DashboardProperty, TrainingStatus } from "@/lib/types";
import { buildLeaderboard, Leaderboard } from "./leaderboard";
import { PropertyCard } from "./property-card";
import { PropertyList } from "./property-list";

type Filter = "all" | TrainingStatus;
type View = "cards" | "list";

function matchesQuery(p: DashboardProperty, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.address, p.city, p.state, p.zipcode, p.market_name, p.zpid].some((v) => v?.toLowerCase().includes(q));
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Gauge; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const dashboard = useDashboard();
  const submissions = useSubmissions();
  const start = useStartUnderwriting();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("cards");
  const [query, setQuery] = useState("");

  const entries = useMemo(
    () => buildLeaderboard(submissions.data ?? [], dashboard.data?.properties ?? []),
    [submissions.data, dashboard.data],
  );

  if (dashboard.isError) {
    return <ErrorState title="Couldn't load the training dashboard" error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }

  const summary = dashboard.data?.summary;
  const properties = (dashboard.data?.properties ?? []).filter(
    (p) => (filter === "all" || p.status === filter) && matchesQuery(p, query),
  );
  const avg = toNum(summary?.average_accuracy);
  const completion = summary ? Math.round((summary.submitted / Math.max(summary.total_properties, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training dashboard</h1>
        <p className="text-muted-foreground">
          Pick a property, underwrite it, and see how close you land to the analyst&apos;s forecast.
        </p>
      </div>

      {start.isError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Couldn&apos;t start that underwriting</AlertTitle>
          <AlertDescription>{start.error.message}</AlertDescription>
        </Alert>
      )}

      <section aria-label="Progress" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2" data-testid="progress-card">
          <CardContent>
            {summary ? (
              <Progress value={completion}>
                <ProgressLabel>
                  Training progress — {summary.submitted} of {summary.total_properties} cases submitted
                </ProgressLabel>
                <ProgressValue />
              </Progress>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
          </CardContent>
        </Card>
        <Stat icon={Target} label="Average score" value={avg === null ? "—" : String(Math.round(avg))} hint="Latest attempt per case" />
        <Stat
          icon={PencilLine}
          label="In progress"
          value={summary ? String(summary.in_progress) : "—"}
          hint={summary ? `${summary.not_started} not started` : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Training cases" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Training cases</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="not_started">Not started</TabsTrigger>
                  <TabsTrigger value="in_progress">In progress</TabsTrigger>
                  <TabsTrigger value="submitted">Submitted</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList aria-label="View">
                  <TabsTrigger value="cards" aria-label="Card view">
                    <LayoutGrid /> Cards
                  </TabsTrigger>
                  <TabsTrigger value="list" aria-label="List view">
                    <List /> List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <GooeyInput
            placeholder="Search properties..."
            collapsedWidth={150}
            expandedWidth={260}
            value={query}
            onValueChange={setQuery}
            className="justify-start"
          />

          {dashboard.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              No cases match your search or filter.
            </p>
          ) : view === "cards" ? (
            <FocusCards items={properties} getKey={(p) => p.zpid}>
              {(p) => (
                <PropertyCard
                  property={p}
                  starting={start.isPending && start.variables === p.zpid}
                  disabled={start.isPending}
                  onStart={(zpid) => start.mutate(zpid)}
                />
              )}
            </FocusCards>
          ) : (
            <PropertyList
              properties={properties}
              startingZpid={start.isPending ? (start.variables ?? null) : null}
              disabled={start.isPending}
              onStart={(zpid) => start.mutate(zpid)}
            />
          )}
        </section>

        <aside className="space-y-4">
          <Leaderboard entries={entries} />
        </aside>
      </div>
    </div>
  );
}
