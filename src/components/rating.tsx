import { CheckCircle2, CircleDashed, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Rating, TrainingStatus } from "@/lib/types";

export const RATING_META: Record<
  Rating,
  { label: string; tone: string; solid: string; text: string; ring: string; blurb: string }
> = {
  best: {
    label: "Best",
    tone: "bg-success/12 text-success",
    solid: "bg-success",
    text: "text-success",
    ring: "stroke-success",
    blurb: "Within 10% of the analyst's forecast",
  },
  medium: {
    label: "Medium",
    tone: "bg-warning/15 text-warning",
    solid: "bg-warning",
    text: "text-warning",
    ring: "stroke-warning",
    blurb: "Within 25% of the analyst's forecast",
  },
  low: {
    label: "Low",
    tone: "bg-destructive/12 text-destructive",
    solid: "bg-destructive",
    text: "text-destructive",
    ring: "stroke-destructive",
    blurb: "More than 25% away from the analyst's forecast",
  },
};

export function RatingBadge({ rating, className }: { rating: Rating; className?: string }) {
  const m = RATING_META[rating];
  return (
    <Badge variant="outline" className={cn("border-transparent", m.tone, className)} data-rating={rating}>
      {m.label}
    </Badge>
  );
}

const STATUS_META: Record<TrainingStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  not_started: { label: "Not started", icon: CircleDashed, className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", icon: PencilLine, className: "bg-primary/10 text-primary" },
  submitted: { label: "Submitted", icon: CheckCircle2, className: "bg-success/12 text-success" },
};

export function StatusBadge({ status }: { status: TrainingStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={cn("border-transparent", m.className)} data-status={status}>
      <Icon /> {m.label}
    </Badge>
  );
}
