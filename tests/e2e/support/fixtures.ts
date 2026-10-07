import { test as base, expect } from "@playwright/test";
import { MockApi } from "./mock-api";
import { WorkspacePage } from "./workspace-page";

/**
 * `api`  – a fresh in-memory backend per test (isolation; no shared state between tests).
 * `ws`   – page object for the underwriting workspace.
 *
 * On failure the full API request log is attached to the report next to the trace,
 * screenshot and video, so you can see exactly what the UI sent and received.
 */
export const test = base.extend<{ api: MockApi; ws: WorkspacePage }>({
  api: async ({ page }, provide, testInfo) => {
    const api = new MockApi();
    await api.install(page);
    await provide(api);
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("api-requests.json", {
        body: JSON.stringify(api.requests, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach("mock-state.json", {
        body: JSON.stringify(
          { underwritings: [...api.underwritings.values()], submissions: api.submissions },
          null,
          2,
        ),
        contentType: "application/json",
      });
    }
  },
  ws: async ({ page, api }, provide) => {
    void api; // ensure routes are installed before the page object is used
    await provide(new WorkspacePage(page));
  },
});

export { expect };
