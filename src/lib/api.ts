import type {
  DashboardResult,
  Market,
  Property,
  SavePayload,
  SubmitResult,
  Submission,
  Underwriting,
} from "./types";

/** Error carrying the HTTP status and FastAPI's `detail` message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors: [{ loc: [...], msg: "..." }]
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) =>
        [d.loc?.filter((p) => p !== "body").join("."), d.msg].filter(Boolean).join(": "),
      )
      .join("; ");
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the training API. Check that it is running on port 8000.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, detailToMessage(body?.detail, `Request failed (${res.status})`));
  }
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardResult>("/dashboard"),
  property: (zpid: string) => request<Property>(`/properties/${zpid}`),
  market: (id: number) => request<Market>(`/markets/${id}`),
  startUnderwriting: (zpid: string) =>
    request<Underwriting>("/underwritings", { method: "POST", body: JSON.stringify({ zpid }) }),
  underwriting: (id: number) => request<Underwriting>(`/underwritings/${id}`),
  saveUnderwriting: (id: number, payload: SavePayload) =>
    request<Underwriting>(`/underwritings/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  submit: (id: number, payload: SavePayload) =>
    request<SubmitResult>(`/underwritings/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submissions: () => request<Submission[]>("/submissions"),
  submission: (id: number) => request<Submission>(`/submissions/${id}`),
};
