"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Light/dark slider. Shows only the icon for the current mode (sun in light, moon in dark) on a thumb
 * that slides across the track. The initial theme is dark (see ThemeProvider); clicking overrides it.
 * Everything is driven by the `dark:` variant instead of React state, so the first paint is correct,
 * there is no hydration mismatch, and CSS transitions animate the change.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted && resolvedTheme === "dark"}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border bg-muted outline-none transition-colors duration-300 ease-in-out focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-primary/25"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0.5 top-0.5 size-6 translate-x-0 rounded-full bg-background shadow ring-1 ring-border transition-transform duration-300 ease-in-out dark:translate-x-6"
      >
        <Sun className="absolute inset-0 m-auto size-4 rotate-0 scale-100 text-warning opacity-100 transition-all duration-300 ease-in-out dark:-rotate-90 dark:scale-50 dark:opacity-0" />
        <Moon className="absolute inset-0 m-auto size-4 rotate-90 scale-50 text-primary opacity-0 transition-all duration-300 ease-in-out dark:rotate-0 dark:scale-100 dark:opacity-100" />
      </span>
    </button>
  );
}
