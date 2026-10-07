import { signedPct } from "@/lib/format";

const RANGE = 0.4; // the bar spans -40% … +40% of the reference

const clamp = (n: number) => Math.max(-RANGE, Math.min(RANGE, n));
const pos = (dev: number) => `${((clamp(dev) + RANGE) / (2 * RANGE)) * 100}%`;

/**
 * Where the trainee's Mid forecast sits relative to the analyst's, drawn over the
 * Best (±10%) and Medium (±25%) bands.
 */
export function DeviationBar({
  deviation,
  best,
  medium,
}: {
  /** Signed: (candidate − reference) / reference. */
  deviation: number;
  best: number;
  medium: number;
}) {
  const clamped = Math.abs(deviation) > RANGE;
  return (
    <div className="space-y-2" data-testid="deviation-bar">
      <div className="relative h-4 overflow-hidden rounded-full bg-destructive/25">
        <div
          className="absolute inset-y-0 bg-warning/70"
          style={{ left: pos(-medium), width: `${(medium * 2 * 100) / (2 * RANGE)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-success/80"
          style={{ left: pos(-best), width: `${(best * 2 * 100) / (2 * RANGE)}%` }}
        />
      </div>
      <div className="relative h-7">
        <div
          // Near either end the label would overflow the bar, so anchor it inward while the tick stays put.
          className={
            "absolute -top-[22px] flex flex-col " +
            (deviation <= -RANGE * 0.75
              ? "items-start"
              : deviation >= RANGE * 0.75
                ? "-translate-x-full items-end"
                : "-translate-x-1/2 items-center")
          }
          style={{ left: pos(deviation) }}
          data-testid="deviation-marker"
        >
          <span className="h-6 w-1 rounded-full bg-foreground" />
          <span className="mt-0.5 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background">
            You {clamped ? "(off the scale) " : ""}
            {signedPct(deviation)}
          </span>
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>−40%</span>
        <span>Analyst</span>
        <span>+40%</span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-success" /> Best: within {best * 100}%
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-warning" /> Medium: within {medium * 100}%
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-destructive" /> Low: further away or no forecast
        </li>
      </ul>
    </div>
  );
}
