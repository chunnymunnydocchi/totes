# 10 — Development Log

> This document is a running log of TOTES's 9-day build. Each entry records what was built, what broke, what was learned. It's not a changelog — it's a thinking log. The goal is to document decisions, dead ends, and lessons, not just outcomes.

**Why this exists:** Anyone can read finished code. Very few portfolio projects show the process. This log is the process. It's updated daily during the build, then left as a permanent artifact.

---

## Day 0 — Planning

**Date:** [fill in]

**Focus:** Project documentation and architecture decisions.

**What was done:**

- Wrote 11 project docs covering product vision, architecture, schema, features, AI integration, spaced repetition, API, security, deployment, and future work.
- Wrote ADR 0001 documenting the Inertia vs. REST API decision.
- Wrote README.md.
- Created GitHub repository.

**Key decisions made today:**

- **Hybrid architecture:** Inertia for the main app, REST API for AI generation and on-demand answer fetching. Documented in ADR 0001.
- **Provider: Groq (Llama 3.3 70B).** Fast inference, generous free tier, OpenAI-compatible API. Swappable behind `AiClientInterface`.
- **Provider: Resend for email.** EmailJS was ruled out — it's client-side and unsuitable for server-generated verification emails.
- **Two-phase scheduling:** Learning steps (minute intervals) for new cards, SM-2 (day intervals) after graduation. Matches Anki's behavior.
- **No soft deletes.** Delete confirmation modals instead. Soft deletes documented for v2.
- **No scores.** Session stats are descriptive, not evaluative. Prevents dishonest self-rating.
- **Rate limit wording:** The word "TOTES" appears as a pun exactly once — in the rate limit message. Reserved for impact.
- **Token storage in memory only.** Re-minted via session-protected endpoint on page reload.

**What was cut:**

- URL fetching for AI generation
- File OCR for scanned PDFs
- Video/audio transcription
- Custom color themes
- AI difficulty tiers (replaced by prompt modifier)
- Drag-reorder cards
- Hints system
- FSRS scheduler (deferred to v2)
- Streaks (deferred to v2)
- Scoring system (rejected, replaced by descriptive stats)

**Challenges anticipated for the build week:**

- Inertia + TypeScript type generation on Day 1–2
- Sanctum token setup on Day 4
- Railway deployment config on Day 8

**Time spent:** [fill in]

**Notes:** Starting Day 1 tomorrow with the foundation setup.

---

## Day 1 — Foundation

**Date:** [fill in]

**Focus:** Laravel + Inertia + React + TypeScript + MySQL running locally.

**What was built:**

- [ ] Laravel 11 project created
- [ ] MySQL database configured
- [ ] Breeze (React + TypeScript) installed
- [ ] Auth flows working (register, login, logout)
- [ ] Migrations created: users (theme column), decks, cards, review_logs, ai_usage_logs
- [ ] Models with relationships defined
- [ ] Tailwind dark mode configured
- [ ] Folder structure scaffolded
- [ ] Deck list page rendering (empty state)

**What broke / what was slow:**

_(Fill in as you go. Examples: "Breeze install failed because..." / "Migrations failed because..." / "Type generation didn't work until I...")_

**What I learned:**

_(Fill in. Examples: "Inertia passes props as JSON, so dates come as strings and need casting on the frontend." / "Laravel 11's bootstrap/app.php replaces the old Kernel.php.")_

**Decisions made today:**

_(Any deviations from the docs. If none, write "None.")_

**Time spent:** 1 hour

**Tomorrow (Day 2):** Deck CRUD, icon picker, color palette, dark mode toggle.

---

## Day 2 — Deck Management

**Date:** 2026-09-13

**Focus:** Full deck CRUD with Iconify icon picker and color palette. Theme toggle.

**What was built:**

- `DeckController` (7 resource methods) at `app/Http/Controllers/Web/`
- `AppearanceController@update` for theme persistence
- `StoreDeckRequest`, `UpdateDeckRequest`, `UpdateAppearanceRequest`
- `DeckPolicy` enforcing owner-only access (view, update, delete)
- `Deck::dueCards()` relation (`due_at` set and past)
- `DeckFactory` with hardcoded icon and color pools
- `resources/js/Constants/deckIcons.ts` — curated list of 277 Iconify names
- `resources/js/Constants/deckColors.ts` — 8-color palette with Tailwind classes
- `IconPicker.tsx` — inline search with 200ms debounce, local filtering, no API calls
- `ColorPicker.tsx` — 8 swatches, neutral ring on selection
- `ThemeToggle.tsx` — hybrid localStorage + server persistence, cycles light → dark → system
- `Pages/Decks/Index.tsx`, `Create.tsx`, `Edit.tsx`, `Show.tsx`
- `Pages/Decks/Partials/DeckForm.tsx` — shared form body for Create and Edit
- `AuthenticatedLayout.tsx` — Decks nav link, ThemeToggle in desktop nav
- `app.blade.php` — pre-paint theme script (prevents flash of wrong theme)
- `types/index.d.ts` — `theme: 'light' | 'dark' | 'system'` on User
- Post-registration redirect changed from `/dashboard` to `/decks`
- 15 deck CRUD tests + 5 factory sanity tests

**What broke / what was slow:**

- **`truncate` on `decks` failed** with FK constraint error. `decks` has a foreign key from `cards`, so MySQL refuses to truncate. Fix: use `delete()` (which respects FKs and cascades) instead of `truncate()`.
- **A Tinker cleanup command I provided silently deleted all user accounts.** The command included `User::query()->delete()`, which cascades to decks and everything else. Should have carried an explicit warning. Re-registered the account.
- **Color swatches rendered white** because Tailwind's content glob only included `**/*.tsx`, not `**/*.ts`. The palette literals live in `deckColors.ts`, which wasn't scanned. Fix: change the glob to `**/*.{ts,tsx}`.
- **`RegistrationTest` failed** after the redirect change. Breeze's shipped test asserts `/dashboard`. Updated the test to assert `/decks` — the test was doing its job.
- **Duplicate migration timestamps** on Day 1 (pairs of files sharing the same second). Harmless at current schema but noted as fragile.

**What I learned:**

- **Form requests run before the controller method.** By the time the controller body executes, input is already validated. `$request->validated()` returns a whitelist of fields with rules.
- **Policies run on every method that touches a resource.** Route middleware can't do this because it runs before model binding; form requests can't because they don't run on GET. The policy is the only layer with both the user and the resource.
- **`abort_unless($user->can(...), 404)` produces 404 instead of 403.** This is deliberate: `$this->authorize()` throws 403, which reveals that a resource exists. 404 reveals nothing, preventing resource enumeration.
- **`withCount(['cards', 'dueCards'])` collapses N+1 queries into 3.** The deck list would otherwise run 41 queries for 20 decks.
- **Tailwind's JIT only sees literal class strings in scanned files.** Dynamic class construction (`bg-${value}-500`) is invisible to it and produces no CSS. Full literals in a file that's covered by the content glob are required.
- **`prepareForValidation` normalizes checkboxes.** Unchecked checkboxes aren't sent at all; `$this->boolean(...)` converts missing/null/`'on'` into a real bool.
- **Inertia's `useForm` + TypeScript narrows literal defaults.** `DEFAULT_DECK_COLOR` typed as `'blue'` would make `setData('color', 'purple')` a type error. Cast to `string` at the call site.
- **`localStorage` + server hybrid for theme.** localStorage prevents flash on reload; `users.theme` is the source of truth. The pre-paint script in `app.blade.php` resolves localStorage before first paint; Inertia props reconcile on mount.

**Decisions made today:**

- **Icon validation is shape-only.** Server accepts any `set:name`-shaped string, not just members of `DECK_ICONS`. Documented in `StoreDeckRequest`. Cosmetic failure mode for shaped-but-nonexistent names.
- **Two identical form request classes** (`StoreDeckRequest` and `UpdateDeckRequest`) instead of one shared class. Deliberate: future divergence is easier with two.
- **Icon picker is inline, not a modal.** Matches `04-features.md` §2.2. Debounced local filter instead of live Iconify API search.
- **`Deck::dueCards()` requires `due_at` set and past.** New cards (`due_at = null`) are "new," not "due." Distinct concepts with different UI treatments later.
- **Mastered count and Last studied date are hardcoded placeholders** on the deck show page. Computable only after review logs exist (Day 5).
- **Mobile theme toggle deferred to Day 3.** Part of the dark-mode sweep — one file touched for both.
- **Systematic mobile responsiveness pass scheduled for Day 7.** Every page checked at mobile viewport sizes, not just the toggle.

**Manual verification (Step 17, all 10 checks passed):**

- [x] Register lands on `/decks`
- [x] Empty state copy matches `04-features.md` §2.1
- [x] Icon picker: local search filters, selection updates preview
- [x] Color picker: 8 swatches, ring on selected
- [x] Create, show, edit, delete all work end-to-end
- [x] Delete modal: Escape closes, Cancel closes, Confirm deletes
- [x] Theme toggle flips `<html class="dark">`; `users.theme` updates
- [x] No flash of light theme on reload after dark toggle
- [x] No console errors

**Known gaps (deliberate):**

- **Breeze components render light on dark `<html>`.** The dark sweep across 12 components is Day 3, committed.
- **Mobile theme toggle missing** below 640px. Day 3, alongside the dark sweep.
- **Mastered / Last studied** hardcoded on deck show page. Day 5.
- **`line-clamp-2`** behavior depends on Tailwind version; resolved via config glob fix. Verified working.

**Time spent:** [fill in]

**Tomorrow (Day 3):** Dark-mode sweep across Breeze components + mobile theme toggle + flashcard CRUD.

## Day 3 — Flashcard Management

**Date:** [fill in]

**Focus:** Manual card CRUD.

_(...)_

---

## Day 4 — AI Flashcard Generation

**Date:** [fill in]

**Focus:** Groq integration, text generation, PDF/DOCX extraction.

_(...)_

---

## Day 5 — Study Mode and SM-2

**Date:** [fill in]

**Focus:** Study session flow, learning steps, SM-2 scheduler, answer gating.

_(...)_

---

## Day 6 — Session Analysis

**Date:** [fill in]

**Focus:** End-of-session AI analysis, review log aggregation.

_(...)_

---

## Day 7 — Polish and Security

**Date:** [fill in]

**Focus:** Responsive pass, error handling, rate limiting, cheat mitigation verification.

_(...)_

---

## Day 8 — Deployment

**Date:** [fill in]

**Focus:** Railway setup, environment variables, deployment, post-deploy verification.

_(...)_

---

## Day 9 — Buffer and Final Documentation

**Date:** [fill in]

**Focus:** Final polish, documentation review, README screenshots.

_(...)_

---

## Retrospective (To be written after Day 9)

**What went well:**

_(...)_

**What didn't go well:**

_(...)_

**What I'd do differently:**

_(...)_

**Biggest technical lesson:**

_(...)_

**What I'm most proud of:**

_(...)_

**Time spent overall:** [fill in]

**Final notes:**

_(...)_
