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

---

## Day 3 — Dark Sweep, Mobile Toggle, Welcome Reduction, Dashboard Removal, and Card CRUD

**Date:** 2026-09-22/23 (session crossed midnight)

**Focus:** Two halves. First half (3a): the dark-mode sweep across the whole frontend, mobile theme toggle move, Welcome page reduction, Dashboard removal verification, and four §7 fixes discovered during verification. Second half (3b): full card CRUD — backend, tests, and frontend.

### Day 3a — Dark sweep and frontend cleanup

**What was built:**

- Dark-mode sweep across **25 files**: 14 components, 1 layout, 10 pages/partials
    - 14 components: `Checkbox`, `ColorPicker`, `DangerButton`, `Dropdown`, `IconPicker`, `InputError`, `InputLabel`, `Modal`, `NavLink`, `PrimaryButton`, `ResponsiveNavLink`, `SecondaryButton`, `TextInput`, `ThemeToggle`
    - `Layouts/AuthenticatedLayout.tsx` — full sweep, plus mobile theme toggle move (ThemeToggle to the left of the hamburger, `gap-1` on the container)
    - 10 pages/partials: `Decks/Index`, `Decks/Create`, `Decks/Edit`, `Decks/Show`, `Decks/Partials/DeckForm`, `Profile/Edit`, `Profile/Partials/DeleteUserForm`, `Profile/Partials/UpdatePasswordForm`, `Profile/Partials/UpdateProfileInformationForm`, `Welcome`
- `Welcome.tsx` — full reduction. Header wordmark, hero title, open-ended slogan, nav. Logged-in branch shows the user's name truncated at 12 characters. Laravel marketing content deleted.
- Dashboard removal — applied in an earlier commit (`30ed2c4`), verified not re-executed. The `/dashboard` route redirects to `/decks`; the route name was kept so Breeze's post-auth controllers still resolve.

**§7 fixes discovered during manual verification (in the same commit `87dfe4d`):**

- **`ResponsiveNavLink` active state was too saturated.** `dark:bg-indigo-950` read as a solid block on `gray-900` — visually loud. Changed to `dark:bg-indigo-950/50` (50% opacity). Same treatment for the focus state.
- **`ThemeToggle` had no focus ring.** It had `focus:outline-none` but no replacement, so keyboard focus was invisible. Added `focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800`. `focus-visible` (not `focus`) so the ring only appears on Tab, not on mouse click. Offset matches the nav surface, not the page.
- **`IconPicker` search input's focus indicator was on the wrong element.** The input had `focus:ring-0`. First fix attempt (`focus:ring-1 focus:ring-inset` on the input) rendered as "the text inside is focused" instead of "the box is focused." Correct fix: move the indicator to the **container** via `focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400`, and revert the input to `focus:ring-0`. Now matches every other input in the app.
- **`Decks/Show.tsx` description read as filler.** The description was a bare `<p>` on the page background, reading as a sub-header instead of content. Wrapped in a surface panel (`rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm sm:p-6`), matching the visual language of the stat cards. Also fixed mobile horizontal padding on the parent: `sm:px-6 lg:px-8` → `px-4 sm:px-6 lg:px-8`. The stat cards and cards panel were touching the mobile edge; one class fixed all three.

### Day 3b — Card CRUD

**What was built:**

- `app/Http/Requests/StoreCardRequest.php` — validation for front, back, explanation. Reused for store and update. `due_at` is not user input; the controller sets it.
- `app/Policies/CardPolicy.php` — ownership via `$card->deck->user_id`. `create` takes a `Deck`, not a `Card`, because there's no card yet when authorizing creation.
- `app/Http/Controllers/Web/CardController.php` — `create`, `store`, `edit`, `update`, `destroy`. No `index`/`show`, per shallow `except`.
- Shallow nested card routes in `routes/web.php`, with a `->names()` override (see "What broke" below).
- `app/Models/Card.php` — added `isDue()` (read-only check; scheduling writes are Day 5's `Sm2Scheduler`).
- `app/Http/Controllers/Web/DeckController.php` — `show` now paginates cards (20/page, `orderBy('due_at')` asc) and passes a `cards` prop.
- `app/Http/Middleware/HandleInertiaRequests.php` — shares `flash.success` via closure (lazy evaluation).
- `resources/js/types/index.d.ts` — extended `PageProps` with `flash`.
- `database/factories/CardFactory.php` — SM-2 defaults hardcoded, `deck_id => Deck::factory()` so parent is inferred if not given.
- `tests/Feature/Cards/CardCrudTest.php` — 16 tests.
- `tests/Feature/Cards/CardFactoryTest.php` — 3 tests.
- `resources/js/Pages/Cards/Partials/CardForm.tsx` — three raw `<textarea>`s, inline dark classes matching `DeckForm`'s post-sweep textarea exactly.
- `resources/js/Pages/Cards/Create.tsx` — create page, with inline flash banner for "Card added. Add another?"
- `resources/js/Pages/Cards/Edit.tsx` — edit page, pre-filled, with `card.explanation ?? ''` handling the nullable column.
- `resources/js/Pages/Decks/Show.tsx` — added `CardType`/`Paginated<T>` types, `cards` prop, card list with per-row Edit/Delete, pagination footer, card delete modal, and a `formatDue` helper.
- `docs/04-features.md` §3.1 — authorization line corrected: `CardPolicy@create`, not `DeckPolicy@update`.
- `.gitignore` — added `storage/framework/lsp-*.php` to ignore IDE language-server temp files.

**What broke / what was slow:**

- **Route-name asymmetry under `->shallow()`.** `Route::resource('decks.cards', ...)->shallow()` names non-shallow routes `decks.cards.create` / `decks.cards.store`, but shallow routes get the short `cards.edit` / `cards.update` / `cards.destroy`. This is documented Laravel behavior but non-obvious. First test run failed 7 tests with `Route [cards.create] not defined`. Fixed by adding `->names(['create' => 'cards.create', 'store' => 'cards.store'])` to the resource, plus a comment so the override doesn't look like cargo cult.
- **`ease_factor` cast was mis-documented in the manual.** The `day-03b` manual said the `decimal(4,2)` cast returns a string, and the test assertions used `assertSame('2.50', ...)`. The actual `Card` model uses `'ease_factor' => 'float'`, returning a PHP float. Three test assertions would have failed. Fixed by changing assertions to `assertSame(2.5, ...)` and `assertSame(2.3, ...)`. The model's cast is correct and stays.
- **419 during the manual authorization test.** First attempt to test User B's DELETE against User A's card returned 419 (CSRF mismatch). The test recipe used `document.querySelector('meta[name="csrf-token"]')`, which doesn't exist in Breeze's default layout. The correct approach reads the `XSRF-TOKEN` cookie. The 419 actually proved CSRF was working. The follow-up returned 404, which is the correct authorization response.
- **Amended commit before push.** The first commit and the `.gitignore` change ended up as two commits with the same message. Rewrote via `git reset --soft HEAD~1` + `git commit --amend` before pushing. Safe because the push hadn't happened yet — a rewrite after push would have required a force push.

**What I learned:**

- **Shallow nesting in Laravel has a naming asymmetry.** URIs are shallow (no `{deck}` prefix on the shallow routes), but names are not — non-shallow routes keep the full parent prefix. `->names()` overrides this. This is the kind of thing that's only obvious after you've hit it.
- **`abort_unless($user->can(...), 404)` isn't just "return the error code I picked."** 404 vs 403 is a deliberate information-disclosure decision. 403 says "this exists but it's not yours" — enumerable. 404 says nothing — not enumerable. Consistent with `08-security.md`.
- **`CardPolicy@create` taking a `Deck`, not a `Card`, is the non-obvious piece.** The call is `$user->can('create', [Card::class, $deck])`. Laravel resolves this against the policy's `create(User, Deck)` method. There's no card to authorize yet — you're authorizing "add to this deck."
- **Inertia shared props should be closures when they read from the session.** `'success' => fn () => $request->session()->get('success')` defers evaluation. Without the closure, the session read runs on every request including ones where the session may not be fully booted.
- **`preserveScroll` on pagination links.** Normally Inertia resets scroll to the top on navigation. For pagination — same page, different subset of content — that's wrong. One prop, `preserveScroll`, keeps the viewport where it is. Small thing, big UX difference.
- **`->shallow()` is what makes the controller method signatures legal.** `edit`, `update`, and `destroy` in `CardController` accept only `Card $card`, not `Deck $deck, Card $card`. Without shallow, route model binding would demand both parameters. Shallow isn't just cleaner URLs — it's structural.
- **CSS `truncate` clips at container width, not a character count.** The doc says "truncated to 80 chars"; the code uses `truncate`. Both work, but they're different. Recorded as a deferred doc/code reconciliation.
- **`git commit --amend` rewrites the commit hash.** The old hash is gone. Safe before push; a rewrite after push would have required `--force` and published history rewriting.
- **CSRF and authorization are different gates.** 419 fires at middleware (provenance check — "did this request come from my own pages?"). 404 fires at the controller (authorization check — "is this resource yours?"). Same 4xx family, completely different meaning.

**Decisions made today:**

- **Card authorization uses `CardPolicy`, not `DeckPolicy`.** `04-features.md` §3.1 contradicted itself — §3.1 said `DeckPolicy@update`, §3.2/§3.3 said `CardPolicy@update`/`CardPolicy@delete`. Resolved in favor of `CardPolicy`, doc corrected in the same commit. Reasons: a card route has a `Card`, ownership is transitive via `$card->deck->user_id`, and consistency with `DeckController`'s `abort_unless(..., 404)` pattern.
- **Card store redirects back to the create form, not the deck page.** Rapid manual entry is the use case. Flash message "Card added. Add another?" appears inline above the form.
- **New cards get `due_at => now()`.** The migration is nullable, but every card created through normal flows is immediately due. This is what makes new cards show up in study mode on Day 5. `due_at` is never trusted from client input.
- **Card list paginates 20 per page, sorted `due_at` asc.** Per `04-features.md` §3.4. Page size hardcoded, not query-configurable (a query-string page size is a DoS vector).
- **Flash delivered as an inline banner, not a toast.** Behavior ships; mechanism (toast system) is a later day. The `04-features.md` §8.3 toast system is still deferred.
- **The card list uses CSS `truncate`, not a server-side 80-char slice.** Spec drift noted in SESSION-STATE for Day 7 reconciliation.
- **`CardForm` uses raw `<textarea>`, not `TextInput`.** Cards are long-form (up to 2,000 characters). `TextInput` wraps `<input type="text">`, which can't wrap. Extracting a `TextArea` component is a Day 7 refactor (three usages threshold; we're at two).
- **`isDue()` added to the `Card` model.** Read-only check. Scheduling writes stay in `Sm2Scheduler` (Day 5).
- **`.gitignore` extended for IDE language-server temp files.** The LSP files appeared under `storage/framework/` during the session. Small hygiene fix, included in the amended commit.

**Manual verification:**

Day 3a (§7.2–§7.5):

- [x] `npm run build` clean
- [x] `php artisan test` — 45 passed, 157 assertions
- [x] Light-mode pass (8 checks)
- [x] Dark-mode pass (8 checks + six-page list)
- [x] Mobile pass — theme toggle in top bar, no second toggle in hamburger menu
- [x] Welcome and Dashboard pass (5 checks)
- [x] Deferred audit: `/decks/{id}/edit` and account-delete modal confirmed in dark mode

Day 3b (§8.2–§8.5):

- [x] `npm run build` clean (1025 modules, no type errors)
- [x] `php artisan test` — **63 passed, 227 assertions**
- [x] Manual card lifecycle: create, flash message appears, edit saves and returns to deck, delete works, cancel works, empty state returns — all green
- [x] Dark mode: card list, delete modal, create form, edit form all render correctly; backdrop correct; focus rings appear on Tab for all inputs and buttons — all green
- [x] Authorization as User B: deck page (404), card create form (404), card edit page (404), raw `DELETE /cards/{id}` via console with `XSRF-TOKEN` cookie (404) — all correct
- [x] Pagination: 26 cards in deck 5, 20 per page, page transitions work, `preserveScroll` confirmed (viewport stays put) — all green
- [x] No console errors anywhere

**Known gaps (deliberate):**

- **`GuestLayout.tsx` and `Auth/*` pages are not dark-swept.** The outer chrome renders light while form components inside render dark. Incoherent mixed-theme result. Day 7.
- **Mobile horizontal padding is not standardized.** `Decks/Show` got `px-4` on its parent; every other page (including the new `Cards/Create` and `Cards/Edit`) uses Breeze's default `sm:px-6 lg:px-8`, so content touches the mobile edge. Day 7, one pass, one commit.
- **No toast system.** Inline flash is used for both "Deck created" and "Card added." `04-features.md` §8.3 specs a real toast (position, 3-second duration, dismissible). Deferred. User preference recorded: toasts should auto-dismiss at ~3–5 seconds.
- **§3.4 truncation spec drift.** `04-features.md` says "truncated to 80 chars"; `Show.tsx` uses CSS `truncate` (container-based). Day 7 reconciliation.
- **`/dashboard` route cleanup.** Six Breeze post-auth controllers still `route('dashboard', ...)`. Works via redirect. Day 7.
- **Logo replacement.** Day 7.
- **Deck description hierarchy** may still read as filler. If so, the next step is making the field optional in the form (not re-styling). Day 7.
- **Pre-paint theme script placement.** One-frame light flash for `system`-theme users on cold load. Confirmed benign; Day 7 polish if noticeable.

**Time spent:** [fill in]

**Tomorrow (Day 4):** AI flashcard generation — Groq integration, text + PDF/DOCX input, rate limiting, the Generate modal replacing the disabled stub on `Decks/Show`.

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
