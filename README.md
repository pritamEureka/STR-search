# STR Seacrh: frontend

Training platform where a trainee picks a short-term-rental property, fills in the underwriting, submits it, and is graded against an analyst's reference. Built with **Next.js 16 (App Router) Â· React 19 Â· TypeScript Â· Tailwind CSS 4 Â· shadcn/ui Â· TanStack Query Â· react-hook-form Â· zod Â· Playwright**.

The video workflow drive link is attached in `workflow-recording.txt`.

## Setup

Prerequisites: Node 20+, the FastAPI backend running on `http://localhost:8000` (`cd backend/strs_fe_assessment_v1/backend && docker compose up -d --build`).

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

The browser only calls same-origin `/api/*`; `next.config.ts` proxies that to the backend (`API_URL`, default `http://localhost:8000`). This avoids CORS and lets tests intercept `/api/**`.

Other scripts: `npm run build && npm start`, `npm run lint`, `npm run typecheck`.

## Theming (light / dark)

All colours are CSS variables in [`src/app/globals.css`](src/app/globals.css): `:root` holds the light values and `.dark` the dark ones. Components use only semantic Tailwind classes (`bg-card`, `text-muted-foreground`, `text-success`, `bg-warning/15`, `bg-destructive`, â€¦), never raw palette colours, so **re-skinning the whole app means editing that one file** (palette sampled from strsearch.com: forest green `--brand-green` #0A4B39 and gold `--brand-gold` #E9A753, with green as the action colour in light mode and gold in dark mode; status colours: status colours: `--success`, `--warning`, `--destructive`; corner radius: `--radius`). The theme follows the OS by default; the header toggle overrides it and `next-themes` remembers the choice.

## Tests (Playwright)

```bash
npx playwright install chromium   # once
npm run test:e2e                  # unattended; builds + starts the app itself; no backend needed
npm run test:e2e:report           # open the HTML report
npm run test:e2e:live             # optional: same user path against the REAL API (writes a draft + submission to its DB)
```

`npm run test:e2e` runs **90 tests in ~2 min** with no manual steps and no external services.
