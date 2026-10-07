"use client";

import Link from "next/link";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardProperty } from "@/lib/types";

export interface PropertyActionProps {
  property: DashboardProperty;
  starting: boolean;
  disabled: boolean;
  onStart: (zpid: string) => void;
}

export function PropertyActions({ property: p, starting, disabled, onStart }: PropertyActionProps) {
  if (p.status === "in_progress" && p.active_underwriting_id) {
    return (
      <Link href={`/underwriting/${p.active_underwriting_id}`} className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
        Resume draft <ArrowRight />
      </Link>
    );
  }
  if (p.status === "submitted") {
    return (
      <>
        {p.latest_submission_id && (
          <Link
            href={`/results/${p.latest_submission_id}`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1")}
          >
            View results
          </Link>
        )}
        <Button size="lg" className="flex-1" disabled={disabled} onClick={() => onStart(p.zpid)}>
          {starting ? <Loader2 className="animate-spin" /> : <RotateCcw />} Try again
        </Button>
      </>
    );
  }
  return (
    <Button size="lg" className="flex-1" disabled={disabled} onClick={() => onStart(p.zpid)}>
      {starting ? <Loader2 className="animate-spin" /> : null} Start underwriting
      {!starting && <ArrowRight />}
    </Button>
  );
}
