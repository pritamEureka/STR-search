"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export const keys = {
  dashboard: ["dashboard"] as const,
  submissions: ["submissions"] as const,
  submission: (id: number) => ["submission", id] as const,
  underwriting: (id: number) => ["underwriting", id] as const,
  property: (zpid: string) => ["property", zpid] as const,
  market: (id: number) => ["market", id] as const,
};

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
export const useSubmissions = () => useQuery({ queryKey: keys.submissions, queryFn: api.submissions });
export const useSubmission = (id: number) =>
  useQuery({ queryKey: keys.submission(id), queryFn: () => api.submission(id), enabled: Number.isFinite(id) });

/** Create a fresh draft for a property and open it in the workspace. */
export function useStartUnderwriting() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (zpid: string) => api.startUnderwriting(zpid),
    onSuccess: (uw) => {
      qc.invalidateQueries({ queryKey: keys.dashboard });
      router.push(`/underwriting/${uw.id}`);
    },
  });
}
