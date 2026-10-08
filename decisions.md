# Workflow decisions

A short explanation of the main workflow decisions and why the interface is organized the way it is.

## The idea behind the layout

The brief's chain is **what it costs → what it earns → how good the return is**. The whole interface follows it: inputs that set the cost come first, revenue second, then a deliberate review and a graded result that explains itself.

## Main workflow decisions

**1. Dashboard as the entry point.**
Six case cards show market, price, status, latest/best score and attempts, each with one clear action (Start, Resume, View results, Try again). Stats and a leaderboard sit beside them. Analysts scan numbers, so progress and scores are visible at a glance, and a consistent rating colour (emerald/amber/rose) means "Medium" looks the same everywhere.

**2. Four-step stepper: Financials → Analysis → Deal tags → Review & submit.**
- One section at a time, because ~40 fields on one page is intimidating and makes the review easy to skip.
- Each step shows ✓ or "N to do", so the trainee always knows what is left.
- Any step can be opened (non-linear), so experienced users are never forced through a strict wizard.
- Order follows the money: costs, then revenue and results, then optional labels, then review.

**3. Property and market context on top, read-only.**
Market name, region and description sit beside the property facts. They inform the revenue estimate, so they stay visible while the trainee works, with nothing to fill in.

**4. A sticky "Deal math" panel on every step.**
It shows the three-step chain (up-front cost → yearly earnings → return) plus tax savings and PRR, updating as the trainee types. This is the training value: seeing how each input moves the headline numbers. On mobile it sits below the form so it never covers inputs.

**5. Live preview, with the API as the source of truth.**
The API only calculates on save, and autosave is debounced, so API-only numbers would lag. A client-side port of the formulas gives instant feedback ("Live preview"). When the saved draft matches the screen, the panel switches to "Calculated by API". The badge says which numbers you are seeing, and a golden-value test keeps the two from drifting.

**6. Autosave that is honest.**
Edits save after ~0.8 s, one request at a time. Sections that fail validation are held back (the API rejects partial objects), and the header says "Not saved yet (incomplete)" instead of pretending. Failures show "Couldn't save" with Retry and never touch the user's input.

**7. Review step separates incomplete from invalid.**
One checklist grouped by section: **Incomplete** (needs a value) versus **Invalid** (a value that makes no sense). Each item has a **Fix** button that jumps to and focuses the field. Submission is blocked until the list is clean, then confirmed in a dialog, because submitting is graded and recorded.

**8. Results explain the score instead of just showing it.**
Score ring and rating, a plain sentence ("4.0% above the analyst's"), your number vs. the reference vs. the deviation, a bar showing where you landed across the Best/Medium/Low bands, the dollar range each band required, and your leaderboard rank. This lets the trainee calibrate next time. The reference is shown only after submission, so it cannot influence that attempt.

**9. Retries start a fresh draft; submitted drafts are locked.**
"Try again" creates a new blank underwriting, so each attempt stays its own record and history and best/latest scores stay truthful. A blank start also stops the trainee from nudging the previous answer.

**10. Leaderboard derived on the client.**
There is no leaderboard endpoint, so ranks come from all attempts in `GET /api/submissions`. Ties share a rank (100, 70, 70, 40 → #1, #2, #2, #4). The current attempt is always shown, even outside the top 5.

## Form and input decisions that shape the UI

- **Percentages are whole numbers in the form** (25, not 0.25), converted to fractions in one place (`mapping.ts`). This removes a common data-entry error.
- **Custom numeric inputs** (not `type="number"`): consistent decimal handling, thousands separators on dollar fields, and an empty value that counts as "Required".
- **Validation has one source of truth**, so inline errors, review checklist, step counters and submit guard always agree.
- **Sensible starting values:** taxes prefilled (20/25/60/37) to remove busywork; financing and revenue inputs blank so the trainee commits to every key assumption. At least one operating expense and Low ≤ Mid ≤ High are required, since both are training mistakes worth catching.

## Known limitations

- Half-filled sections live only in the browser until valid; a reload before then loses them (localStorage draft is the next step).
- The leaderboard is single-trainee with no identity.
- Optional API fields (comp set, sleeps, renovation level, notes) are not exposed.
