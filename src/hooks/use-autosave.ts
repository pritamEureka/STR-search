"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SavePayload, Underwriting } from "@/lib/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface State {
  status: SaveStatus;
  error: string | null;
  savedAt: Date | null;
  /** Latest API response, i.e. the API-calculated numbers for what was saved. */
  data: Underwriting;
}

/**
 * Debounced draft autosave. Saves are serialised: while one request is in flight, edits
 * only update `latest`, and the loop sends the newest payload as soon as it returns, so
 * responses can never land out of order and overwrite newer input.
 */
export function useAutosave({
  id,
  payload,
  initial,
  delayMs = 800,
}: {
  id: number;
  payload: SavePayload;
  initial: Underwriting;
  delayMs?: number;
}) {
  const key = JSON.stringify(payload);
  const latest = useRef({ key, payload });
  useEffect(() => {
    latest.current = { key, payload };
  });
  // The form starts in sync with the server, so the initial payload counts as saved.
  const savedKey = useRef(key);
  const inFlight = useRef(false);
  const [state, setState] = useState<State>({ status: "idle", error: null, savedAt: null, data: initial });
  const [syncedKey, setSyncedKey] = useState(key);

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (latest.current.key !== savedKey.current) {
        const { key: sending, payload: body } = latest.current;
        setState((s) => ({ ...s, status: "saving", error: null }));
        try {
          const data = await api.saveUnderwriting(id, body);
          savedKey.current = sending;
          setSyncedKey(sending);
          setState({ status: "saved", error: null, savedAt: new Date(), data });
        } catch (e) {
          setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "Save failed" }));
          return;
        }
      }
    } finally {
      inFlight.current = false;
    }
  }, [id]);

  useEffect(() => {
    if (key === savedKey.current) return;
    const t = setTimeout(flush, delayMs);
    return () => clearTimeout(t);
  }, [key, flush, delayMs]);

  return {
    ...state,
    /** True when the form matches what the API last saved/calculated. */
    inSync: key === syncedKey,
    dirty: key !== syncedKey,
    flush,
  };
}
