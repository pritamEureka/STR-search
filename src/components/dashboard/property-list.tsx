"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, X } from "lucide-react";
import { StatusBadge } from "@/components/rating";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";
import type { DashboardProperty } from "@/lib/types";
import { PropertyActions } from "./property-actions";
import { AttemptSummary, PropertyFacts } from "./property-summary";

interface Props {
  properties: DashboardProperty[];
  startingZpid: string | null;
  disabled: boolean;
  onStart: (zpid: string) => void;
}

const street = (p: DashboardProperty) => p.address?.split(",")[0] ?? p.zpid;

function Thumb({ p, className }: { p: DashboardProperty; className: string }) {
  return p.img_src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.img_src} alt="" className={className} />
  ) : (
    <div className={cn("bg-muted", className)} />
  );
}

/** Aceternity "Expandable Card" as a list: a row opens into a detail card in place. */
export function PropertyList({ properties, startingZpid, disabled, onStart }: Props) {
  const [activeZpid, setActiveZpid] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  // Looked up from live data so the open card reflects refreshed dashboard state.
  const current = properties.find((p) => p.zpid === activeZpid) ?? null;
  const close = useCallback(() => setActiveZpid(null), []);

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [current, close]);

  useOutsideClick(ref, close);

  return (
    <>
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 size-full bg-black/40"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {current && (
          <div className="fixed inset-0 z-[100] grid place-items-center">
            <motion.div
              layoutId={`card-${current.zpid}-${id}`}
              ref={ref}
              role="dialog"
              aria-label={street(current)}
              data-testid={`property-expanded-${current.zpid}`}
              className="flex size-full max-w-[500px] flex-col overflow-auto bg-card text-card-foreground sm:size-auto sm:max-h-[90%] sm:rounded-3xl"
            >
              <motion.div layoutId={`image-${current.zpid}-${id}`} className="relative">
                <Thumb p={current} className="h-64 w-full object-cover sm:rounded-t-3xl" />
                <div className="absolute left-3 top-3">
                  <StatusBadge status={current.status} />
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-background/90 shadow-sm"
                >
                  <X className="size-4" />
                </button>
              </motion.div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <motion.h3 layoutId={`title-${current.zpid}-${id}`} className="text-lg font-semibold leading-snug">
                      {street(current)}
                    </motion.h3>
                    <motion.p
                      layoutId={`place-${current.zpid}-${id}`}
                      className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"
                    >
                      <MapPin className="size-3.5 shrink-0" /> {current.city}, {current.state}
                    </motion.p>
                  </div>
                  <motion.span layoutId={`price-${current.zpid}-${id}`} className="text-lg font-semibold tabular-nums">
                    {current.price}
                  </motion.span>
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <p className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {current.market_name}
                  </p>
                  <PropertyFacts property={current} />
                  <AttemptSummary property={current} />
                  <div className="flex flex-wrap gap-2">
                    <PropertyActions
                      property={current}
                      starting={startingZpid === current.zpid}
                      disabled={disabled}
                      onStart={onStart}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ul className="space-y-1" data-testid="property-list">
        {properties.map((p) => (
          <motion.li
            key={p.zpid}
            layoutId={`card-${p.zpid}-${id}`}
            data-testid={`property-row-${p.zpid}`}
            data-status={p.status}
            className="rounded-xl hover:bg-muted"
          >
            <button
              type="button"
              onClick={() => setActiveZpid(p.zpid)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-4">
                <motion.span layoutId={`image-${p.zpid}-${id}`} className="shrink-0">
                  <Thumb p={p} className="size-14 rounded-lg object-cover" />
                </motion.span>
                <span className="min-w-0">
                  <motion.h3 layoutId={`title-${p.zpid}-${id}`} className="truncate font-medium">
                    {street(p)}
                  </motion.h3>
                  <motion.p layoutId={`place-${p.zpid}-${id}`} className="truncate text-sm text-muted-foreground">
                    {p.city}, {p.state}
                  </motion.p>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusBadge status={p.status} />
                <motion.span layoutId={`price-${p.zpid}-${id}`} className="w-24 text-right font-semibold tabular-nums">
                  {p.price}
                </motion.span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </>
  );
}
