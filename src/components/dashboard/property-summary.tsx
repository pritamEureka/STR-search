import { Bath, BedDouble, Ruler } from "lucide-react";
import { RatingBadge } from "@/components/rating";
import { toNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardProperty } from "@/lib/types";

export function PropertyFacts({ property: p }: { property: DashboardProperty }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <BedDouble className="size-4" /> {p.beds} bd
      </li>
      <li className="flex items-center gap-1.5">
        <Bath className="size-4" /> {p.baths} ba
      </li>
      <li className="flex items-center gap-1.5">
        <Ruler className="size-4" /> {p.area?.toLocaleString()} sqft
      </li>
    </ul>
  );
}

export function AttemptSummary({ property: p }: { property: DashboardProperty }) {
  const best = toNum(p.best_accuracy);
  const latest = toNum(p.latest_accuracy);
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
        p.attempts === 0 && "border-dashed text-muted-foreground",
      )}
    >
      {p.attempts === 0 ? (
        <span>No attempts yet</span>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {p.latest_rating && <RatingBadge rating={p.latest_rating} />}
            <span className="tabular-nums">
              Latest <strong>{latest}</strong>
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            Best {best} · {p.attempts} attempt{p.attempts === 1 ? "" : "s"}
          </span>
        </>
      )}
    </div>
  );
}
