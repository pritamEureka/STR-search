import { RATING_META } from "@/components/rating";
import type { Rating } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreRing({ score, rating }: { score: number; rating: Rating }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const m = RATING_META[rating];
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Score ${score} out of 100, rated ${m.label}`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", m.ring)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-bold leading-none tabular-nums" data-testid="score-value">
            {score}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
        </div>
      </div>
    </div>
  );
}
