"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import moneyRain from "@/assets/money-rain.json";

// lottie-react touches `document` on import, so it must only load in the browser.
const Lottie = dynamic(() => import("lottie-react").then((m) => m.Lottie), { ssr: false });

/** Decorative, non-interactive falling-money animation behind the whole app. */
export function MoneyBackground() {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-50 dark:opacity-30">
      <Lottie
        src={moneyRain}
        loop
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
        className="size-full"
      />
    </div>
  );
}
