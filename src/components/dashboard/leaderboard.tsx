"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Medal, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingBadge } from "@/components/rating";
import { money, signedPct, toNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardProperty, Submission } from "@/lib/types";

export interface LeaderboardEntry {
  submission: Submission;
  rank: number;
  tied: boolean;
  address: string;
}

/**
 * The API exposes attempts but no leaderboard endpoint, so ranking is derived here:
 * attempts are ordered by score, and equal scores share a rank (standard competition
 * ranking: 100, 100, 70 → #1, #1, #3). Within a tie the earlier attempt is listed first.
 */
export function buildLeaderboard(submissions: Submission[], properties: DashboardProperty[]): LeaderboardEntry[] {
  const byZpid = new Map(properties.map((p) => [p.zpid, p]));
  const score = (s: Submission) => toNum(s.accuracy) ?? 0;
  const sorted = [...submissions].sort(
    (a, b) => score(b) - score(a) || a.submitted_at.localeCompare(b.submitted_at) || a.id - b.id,
  );
  return sorted.map((submission) => {
    const rank = 1 + sorted.filter((o) => score(o) > score(submission)).length;
    const tied = sorted.filter((o) => score(o) === score(submission)).length > 1;
    const p = byZpid.get(submission.zpid);
    return { submission, rank, tied, address: p?.address?.split(",")[0] ?? `Property ${submission.zpid}` };
  });
}

export function Leaderboard({
  entries,
  highlightId,
  limit = 5,
  title = "Leaderboard",
}: {
  entries: LeaderboardEntry[];
  highlightId?: number;
  limit?: number;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  // Always keep the highlighted attempt visible, even if it ranks below the cut-off.
  const top = entries.slice(0, limit);
  const mine = highlightId ? entries.find((e) => e.submission.id === highlightId) : undefined;
  const shown = mine && !top.includes(mine) ? [...top, mine] : top;

  return (
    <>
    <Card
      data-testid="leaderboard"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          setOpen(true);
        }
      }}
      className="cursor-pointer transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-warning" /> {title}
        </CardTitle>
        <CardDescription>All graded attempts, ranked by score. Click for details.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No graded attempts yet. Submit your first underwriting to appear here.
          </p>
        ) : (
          <ol className="divide-y">
            {shown.map((e) => {
              const isMine = e.submission.id === highlightId;
              return (
                <li
                  key={e.submission.id}
                  data-testid="leaderboard-row"
                  data-highlight={isMine || undefined}
                  className={cn("flex items-center gap-3 py-2.5 text-sm", isMine && "-mx-2 rounded-lg bg-primary/8 px-2")}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                      e.rank === 1 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.rank === 1 ? <Medal className="size-3.5" /> : e.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {e.address} {isMine && <span className="text-primary">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{e.rank}
                      {e.tied && " (tied)"} ·{" "}
                      {new Date(e.submission.submitted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <RatingBadge rating={e.submission.rating} />
                  <span className="w-9 text-right font-semibold tabular-nums">{toNum(e.submission.accuracy)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
    <LeaderboardModal open={open} onOpenChange={setOpen} entries={entries} highlightId={highlightId} title={title} />
    </>
  );
}

function LeaderboardModal({
  open,
  onOpenChange,
  entries,
  highlightId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: LeaderboardEntry[];
  highlightId?: number;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="leaderboard-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-warning" /> {title}
          </DialogTitle>
          <DialogDescription>
            {entries.length} graded {entries.length === 1 ? "attempt" : "attempts"}, ranked by score. Ties share a rank.
          </DialogDescription>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No graded attempts yet.</p>
        ) : (
          <ol className="divide-y">
            {entries.map((e) => {
              const b = e.submission.breakdown;
              const candidate = toNum(b.candidate);
              const reference = toNum(b.reference);
              const signed = candidate !== null && reference ? (candidate - reference) / reference : null;
              const isMine = e.submission.id === highlightId;
              return (
                <li key={e.submission.id} data-testid="leaderboard-modal-row">
                  <Link
                    href={`/results/${e.submission.id}`}
                    className={cn(
                      "-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 text-sm hover:bg-muted/60",
                      isMine && "bg-primary/8",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                        e.rank === 1 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.rank === 1 ? <Medal className="size-4" /> : e.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {e.address} {isMine && <span className="text-primary">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{e.rank}
                        {e.tied && " (tied)"} · {b.label} · {money(candidate)} vs {money(reference)}
                        {signed !== null && ` (${signedPct(signed)})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.submission.submitted_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <RatingBadge rating={e.submission.rating} />
                    <span className="w-9 text-right font-semibold tabular-nums">{toNum(e.submission.accuracy)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
