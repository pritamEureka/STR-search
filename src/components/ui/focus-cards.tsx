"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FocusCardsProps<T> {
  items: T[];
  getKey: (item: T) => string;
  children: (item: T) => ReactNode;
  className?: string;
}

/** Aceternity "Focus Cards": hovering (or focusing) one card blurs and shrinks the rest. */
export function FocusCards<T>({ items, getKey, children, className }: FocusCardsProps<T>) {
  const [focused, setFocused] = useState<number | null>(null);

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          onMouseEnter={() => setFocused(index)}
          onMouseLeave={() => setFocused(null)}
          onFocus={() => setFocused(index)}
          onBlur={() => setFocused(null)}
          className={cn(
            "transition-all duration-300 ease-out",
            focused !== null && focused !== index && "scale-[0.98] blur-sm",
          )}
        >
          {children(item)}
        </div>
      ))}
    </div>
  );
}
