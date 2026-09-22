# Session State

> This file tracks where we are in the TOTES build. Update it at the end of
> every session. It's a lightweight handoff — not a replacement for the
> development log, just a quick "where we are right now" reference.

**Last updated:** 2026-09-23 (Day 3 complete; Day 4 pending)

---

## Current Status

- **Current day:** Day 3 complete. Both halves shipped: `day-03a`
  (commit `87dfe4d`) and `day-03b` (commit `5851d2c`). Day 4 (AI
  generation) has not started.
- **Phase:** Card CRUD is done end-to-end — backend (`StoreCardRequest`,
  `CardPolicy`, `CardController`, shallow nested routes), factory and
  tests, and frontend (`CardForm`, `Cards/Create`, `Cards/Edit`, card
  list with pagination and delete modal on `Decks/Show`). All 63 tests
  pass; manual verification cleared on all five passes.
- **Repo:** https://github.com/chunnymunnydocchi/totes.git
- **Local path:** `~/Desktop/main works/totes`
- **HEAD:** `5851d2c` — "Day 3b: card CRUD" (the amended commit; original
  was rewritten before push to fold in the `.gitignore` change)

---

## What's Done

### Day 0 — Documentation

- [x] All 13 project docs written and committed
- [x] README.md with product overview
- [x] ADR 0001 (hybrid Inertia + REST API decision)
- [x] Database schema defined (5 tables)
- [x] AI integration plan documented (Groq, 2 operations only)
- [x] Spaced-repetition algorithm documented (SM-2 + learning steps)
- [x] API contract defined (6 endpoints)
- [x] Security posture documented (policies, cheat mitigation, 404-not-403)
- [x] Deployment plan documented (Railway trial → decide Day 25)
- [x] Voice rules locked (no emojis, "TOTES" as pun once only)
- [x] GitHub repo created, first commit pushed
- [x] `.gitignore` in place

### Day 1 — Foundation

- [x] PHP upgraded to 8.4.25 (standalone at `C:\php84`, ZTS VC++ 2022 x64)
- [x] Composer 2.10.2 confirmed
- [x] Node 24.18.1, npm 11.16.0 confirmed
- [x] Laravel 12.69.2 installed via temp-folder merge (safe route)
- [x] MariaDB 10.4.32 (XAMPP) confirmed, `totes` DB created (`utf8mb4_unicode_ci`)
- [x] `.env` configured for MariaDB (`127.0.0.1`, not `localhost`)
- [x] Breeze installed (React + TypeScript, PHPUnit)
- [x] Tailwind dark mode set to `class` strategy
- [x] 5 migrations written and run:
    - `add_theme_to_users_table`
    - `create_decks_table`
    - `create_cards_table`
    - `create_review_logs_table`
    - `create_ai_usage_logs_table`
- [x] 4 models written + User extended (`Deck`, `Card`, `ReviewLog`, `AiUsageLog`)
- [x] Folder scaffold: `Controllers/Web`, `Controllers/Api/V1`, `Services/Ai/DTO`,
      `Services/SpacedRepetition`, `Support`
- [x] Placeholder stubs: `AiClientInterface.php`, `Sm2Scheduler.php`, `ReviewRating.php`
- [x] End-to-end verified: register, login, session persistence, route protection
- [x] 25 tests passing (61 assertions)
- [x] Tinker model wiring confirmed (users: 2, decks: 0, cards: 0)

### Day 2 — Deck Management

- [x] `StoreDeckRequest`, `UpdateDeckRequest`, `UpdateAppearanceRequest`
- [x] `DeckPolicy` (viewAny, view, create, update, delete) — owner-only
- [x] `Web\DeckController` — 7 resource methods
- [x] `Web\Settings\AppearanceController@update`
- [x] `Deck::dueCards()` relation
- [x] `DeckFactory` with hardcoded icon/color pools
- [x] `resources/js/Constants/deckIcons.ts` — curated list of 277 Iconify names
- [x] `resources/js/Constants/deckColors.ts` — 8-color palette with Tailwind classes
- [x] `IconPicker.tsx` — inline search, 200ms debounce, local filter, no API calls
- [x] `ColorPicker.tsx` — 8 swatches, neutral ring on selection
- [x] `ThemeToggle.tsx` — hybrid localStorage + server persistence
- [x] `Pages/Decks/Index.tsx`, `Create.tsx`, `Edit.tsx`, `Show.tsx`
- [x] `Pages/Decks/Partials/DeckForm.tsx`
- [x] `AuthenticatedLayout.tsx` — Decks nav link, ThemeToggle in desktop nav
- [x] `app.blade.php` — pre-paint theme script
- [x] `types/index.d.ts` — `theme` on User
- [x] `RegisteredUserController` redirects to `/decks`
- [x] `tailwind.config.js` — content glob includes `.ts` files
- [x] `RegistrationTest.php` — updated for the new redirect target
- [x] 15 deck CRUD tests + 5 factory sanity tests
- [x] All tests green: **45 tests, 157 assertions**
- [x] Manual verification pass (10 checks, all green)
- [x] `docs/10-development-log.md` — Day 2 entry written
- [x] `build-notes/day-02-*.md` — three manuals committed, then corrected

### Day 3 — Planning (complete)

- [x] `build-notes/day-03a-dark-sweep.md` written and committed
- [x] `build-notes/day-03b-card-crud.md` written and committed
- [x] Audit revealed the dark sweep was **not** done on Day 2. `grep -L "dark:"`
      returned all 15 component files — including the three built on Day 2
      (`IconPicker`, `ColorPicker`, `ThemeToggle`). The sweep is a real
      Day 3 task, not a no-op.
- [x] **Dashboard removal applied and committed ahead of the sweep.** Commit
      `30ed2c4`. Three files: `AuthenticatedLayout.tsx` (two nav links
      removed), `routes/web.php` (route redirects to `/decks`), `Welcome.tsx`
      (logged-in link points at `decks.index`). This was §6 of `day-03a`;
      **§6 does not need re-executing.**
- [x] Design decisions resolved during planning:
    - Dark palette: `gray-900` page / `gray-800` surface / `gray-700`
      structural border / `gray-600` interactive border / `gray-100`
      primary text / `gray-400` muted / `gray-500` placeholder
    - Mobile theme toggle: top bar, not inside the hamburger dropdown.
      Single instance, one source of truth.
    - Page-level sweep folded into `day-03a` as §4. Components sweep alone
      is insufficient — pages render wrong even when their components are
      correct.
    - `Welcome.tsx` reduced to header wordmark, hero title, open-ended
      slogan, and nav. Laravel marketing content deleted.
    - Logged-in Welcome nav shows the user's name (truncated at 12
      characters, full name in `title`), linking to `/decks`.
    - Card authorization: `CardPolicy`, not `DeckPolicy`. Ownership checked
      via `$card->deck->user_id`. `create` takes a `Deck`. 404-not-403
      preserved.
    - Card store redirects back to the create form (rapid manual entry).
      Spec copy: "Card added. Add another?" rendered as an inline flash
      message above the form.
- [x] Known misstep, recorded for honesty: an earlier session produced two
      commits with the identical message "Day 3: planning complete…"
      (`575f7a2` and `0affe11`). Harmless, no fix planned — rewriting
      pushed history for a cosmetic reason is not worth the risk on a
      solo project. **Kept in the record deliberately: the time spent
      planning is part of the honest timeline.**

### Day 3a — Dark Sweep, Mobile Toggle, Welcome Reduction (complete)

**Commit:** `87dfe4d` — "Day 3a: dark mode sweep, mobile theme toggle,
Welcome reduction, Dashboard removal"

**Files touched (25 modified, 0 created, 0 deleted):**

- [x] 14 components swept: `Checkbox`, `ColorPicker`, `DangerButton`,
      `Dropdown`, `IconPicker`, `InputError`, `InputLabel`, `Modal`,
      `NavLink`, `PrimaryButton`, `ResponsiveNavLink`, `SecondaryButton`,
      `TextInput`, `ThemeToggle`
- [x] `ApplicationLogo.tsx` — **not edited.** §2.10: the logo's dark
      variant lives in the layout (`dark:text-gray-100` on the wrapper).
- [x] `Layouts/AuthenticatedLayout.tsx` — full sweep + §3.4 mobile
      toggle move (ThemeToggle to the left of the hamburger, `gap-1` on
      the container) + §3.5 mobile dropdown name/email block
- [x] 10 pages/partials swept: `Decks/Index`, `Create`, `Edit`, `Show`,
      `Partials/DeckForm`, `Profile/Edit`, `Profile/Partials/DeleteUserForm`,
      `UpdatePasswordForm`, `UpdateProfileInformationForm`, `Welcome`
- [x] `Welcome.tsx` — full reduction. Header wordmark, hero title,
      open-ended slogan, nav. Logged-in branch shows the user's name
      truncated at 12 characters. Laravel marketing content deleted.
- [x] §6 Dashboard removal — already in `30ed2c4`, verified not
      re-executed.

**§7 fixes discovered during verification (in the same commit):**

- [x] `ResponsiveNavLink.tsx` active state — `dark:bg-indigo-950` →
      `dark:bg-indigo-950/50`. The full-saturation indigo block was too
      loud on `gray-900`; 50% opacity reads as a tint. Same treatment on
      `dark:focus:bg-indigo-900` → `dark:focus:bg-indigo-900/50`.
- [x] `ThemeToggle.tsx` — added `focus-visible:ring-2
  focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400
  focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800`.
      The component had `focus:outline-none` and no ring replacement.
      `focus-visible` (not `focus`) so the ring appears on Tab, not on
      mouse click. Offset matches the nav surface (`gray-800`), not the
      page (`gray-900`).
- [x] `IconPicker.tsx` — the search input had `focus:ring-0`, inherited
      from the pre-sweep state. First fix attempt put the ring on the
      input itself (`focus:ring-1 focus:ring-inset`), which rendered as
      "the text inside is focused" instead of "the box is focused."
      Correct fix: move the focus indicator to the **container** with
      `focus-within:border-indigo-500 dark:focus-within:border-indigo-400
  focus-within:ring-1 focus-within:ring-indigo-500
  dark:focus-within:ring-indigo-400`, and revert the input to
      `focus:ring-0`. Now matches every other input in the app.
- [x] `Decks/Show.tsx` — description was a bare `<p>` on the page
      background, reading as filler/sub-header. Wrapped in a surface
      panel (`rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm
  sm:p-6`), matching the existing visual language of the stat cards.
      Also fixed mobile horizontal padding on the parent container:
      `sm:px-6 lg:px-8` → `px-4 sm:px-6 lg:px-8`. The stat cards and
      cards panel were also touching the mobile edge; one class fixed
      all three.

**Verification:**

- [x] `npm run build` clean
- [x] `php artisan test` — 45 passed, 157 assertions
- [x] Manual light-mode pass (§7.2, 8 checks)
- [x] Manual dark-mode pass (§7.3, 8 checks + §4.3 six-page list)
- [x] Mobile pass (§7.4, toggle in top bar, no second toggle in menu)
- [x] Welcome and Dashboard pass (§7.5, 5 checks)
- [x] §4.3 deferred audit: `/decks/{id}/edit` and account-delete modal
      confirmed in dark mode

**Session-discovery note:** `git grep -n "dashboard"` returns six
references in `app/Http/Controllers/Auth/*` — Breeze's post-auth
redirects still point at `route('dashboard')`. This is **not a
regression**: those redirects resolve to `/dashboard`, which
`30ed2c4` made redirect to `decks.index`. One extra hop. The route
name was kept specifically so these wouldn't 404. Cleanup (rewrite the
six redirects, delete the route) is deferred to Day 7 — see below.

**Session-discovery note:** `http://127.0.0.1:8000` and
`http://localhost:8000` are different origins to the browser. A session
cookie set on one is not sent to the other. During §6 verification this
produced a false-positive "bug" — `/dashboard` redirected to `/login` at
`127.0.0.1`, worked at `localhost`. Not a code bug. **Standardize on
`localhost` in the browser for the rest of the build.** `DB_HOST` stays
`127.0.0.1` (separate concern, PHP-side only).

### Day 3b — Card CRUD (complete)

**Commit:** `5851d2c` — "Day 3b: card CRUD" (amended before push to fold
in the `.gitignore` change; original was `1e4a20f`-class pre-amend commit,
rewritten with `--amend` and then pushed — safe because push hadn't
happened yet)

**Files created (9):**

- [x] `app/Http/Requests/StoreCardRequest.php` — validation for create and
      update, reused for both
- [x] `app/Policies/CardPolicy.php` — ownership via `$card->deck->user_id`;
      `create` takes a `Deck`, not a `Card`
- [x] `app/Http/Controllers/Web/CardController.php` — `create`, `store`,
      `edit`, `update`, `destroy`; no `index`/`show`, per shallow `except`
- [x] `database/factories/CardFactory.php` — SM-2 defaults hardcoded,
      `deck_id => Deck::factory()` so parent is inferred if not given
- [x] `tests/Feature/Cards/CardCrudTest.php` — 16 tests
- [x] `tests/Feature/Cards/CardFactoryTest.php` — 3 tests
- [x] `resources/js/Pages/Cards/Partials/CardForm.tsx` — three raw
      `<textarea>`s (front, back, explanation), inline dark classes
      matching `DeckForm`'s post-sweep textarea exactly
- [x] `resources/js/Pages/Cards/Create.tsx` — create page, with inline
      flash banner for "Card added. Add another?"
- [x] `resources/js/Pages/Cards/Edit.tsx` — edit page, pre-filled, with
      `card.explanation ?? ''` handling the nullable column

**Files modified (7):**

- [x] `routes/web.php` — shallow nested card routes, plus `->names()`
      override (see "session-discovery" below)
- [x] `app/Models/Card.php` — added `isDue()` (read-only check; scheduling
      writes are Day 5's `Sm2Scheduler`)
- [x] `app/Http/Controllers/Web/DeckController.php` — `show` now paginates
      cards (20/page, `orderBy('due_at')` asc) and passes a `cards` prop
- [x] `app/Http/Middleware/HandleInertiaRequests.php` — shares
      `flash.success` via closure (lazy evaluation, not optional)
- [x] `resources/js/types/index.d.ts` — extended `PageProps` with `flash`
- [x] `resources/js/Pages/Decks/Show.tsx` — added `CardType`/`Paginated<T>`
      types, `cards` prop, card list with per-row Edit/Delete, pagination
      footer, card delete modal, `formatDue` helper
- [x] `docs/04-features.md` §3.1 — authorization line corrected:
      `CardPolicy@create`, not `DeckPolicy@update`
- [x] `.gitignore` — added `storage/framework/lsp-*.php` to ignore IDE
      language-server temp files (appeared during the session)

**Session-discovery note (route-name asymmetry):** `Route::resource(...)->shallow()`
names non-shallow routes `decks.cards.create` / `decks.cards.store`, but
shallow routes get the short `cards.edit` / `cards.update` / `cards.destroy`.
This asymmetry is not obvious and is not documented next to `shallow()`.
7 tests failed on first run with `Route [cards.create] not defined`. Fixed
by adding `->names(['create' => 'cards.create', 'store' => 'cards.store'])`
to the resource, plus an explanatory comment. **Do not remove the
`->names()` override without re-checking the test suite.**

**Session-discovery note (419 during manual auth test):** during §8.4, the
first attempt to test User B's DELETE against User A's card returned 419
(CSRF token mismatch). This was **not a bug** — the test recipe used
`document.querySelector('meta[name="csrf-token"]')`, which doesn't exist
in Breeze's default layout. The correct approach reads the `XSRF-TOKEN`
cookie instead. The 419 actually _proved_ CSRF is active. The follow-up
with the cookie approach returned 404, which is the correct authorization
response. **Lesson for future manual auth tests: use the cookie, not the
meta tag.**

**Session-discovery note (`ease_factor` cast):** the `day-03b` manual said
`ease_factor` uses a `decimal(4,2)` cast and returns a string. The actual
`Card` model uses `'ease_factor' => 'float'`, which returns a PHP float.
The manual's assertions (`assertSame('2.50', ...)`) would have failed.
Fixed by changing assertions to `assertSame(2.5, ...)` and `assertSame(2.3, ...)`.
**The model's `'float'` cast is correct and stays. Do not "fix" it to
`'decimal:2'` — that would change frontend rendering on Day 6.**

**Verification:**

- [x] `npm run build` clean (1025 modules, no type errors)
- [x] `php artisan test` — **63 passed, 227 assertions**
- [x] §8.2 manual lifecycle: create, flash, edit, delete, cancel, empty
      state — all green
- [x] §8.3 dark mode + light mode + focus rings on Tab — all green
- [x] §8.4 authorization: 4 checks as User B, all returned 404 — correct
- [x] §8.5 pagination: 26 cards in deck 5, 20/page, `preserveScroll`
      confirmed working — all green
- [x] Manual auth test using `XSRF-TOKEN` cookie — 404 (correct)

---

## What's Next

**Day 4 — AI flashcard generation.** No manual written yet; that's the
first task of the next session.

### Scope (from `docs/04-features.md` §4)

- Generate Cards modal on `/decks/{deck}` — replaces the currently
  disabled "Generate with AI" stub
- Text paste tab + PDF/DOCX upload tab
- `POST /api/v1/decks/{deck}/generate` endpoint (REST, not Inertia)
- Groq API integration via `AiClientInterface`
- Rate limiting via `ai_usage_logs` table (daily cap, default 10)
- Input size cap (default 5,000 chars)
- Response handling: insert cards, update usage footer

### Pre-conditions before Day 4 work

- `.env` needs `GROQ_API_KEY` (currently absent). Get one from
  console.groq.com before starting.
- `AiClientInterface.php` exists as a stub — the concrete implementation
  will be written Day 4.
- `GenerateCardsRequest` doesn't exist yet.
- `Api\V1\GenerateCardsController` doesn't exist yet.
- The disabled "Generate with AI" button on `Decks/Show.tsx` is the
  hook point — it currently has `title="Available on Day 4"`.

### Deferred items that touch Day 4

- **None.** Day 4 has no dependencies on the Day 7 deferred list. The
  toast system is still deferred, which means "Generated {n} cards."
  will be delivered as an inline flash, not a toast — same pattern as
  "Card added. Add another?" on Day 3b.

---

## Current Blockers

None.

---

## Notes for Next Session

### Session startup

1. XAMPP Control Panel → start MySQL.
2. Terminal 1: `npm run dev`
3. Terminal 2: `php artisan serve`
4. Browser: **`http://localhost:8000`** (not `127.0.0.1` — see the
   origin-mismatch note in Day 3a's "What's Done").
5. **Before running tests: `npm run build`.** The Vite manifest is
   gitignored and goes stale when frontend files change. One test in
   `DeckCrudTest` renders a real Inertia page and fails without it.
   This bit us on Day 2 and again on Day 3b; don't skip it.

### Day 4 planning notes

- **The "Generate with AI" button is currently disabled** with
  `title="Available on Day 4"` in `Decks/Show.tsx`. Day 4 enables it
  and wires it to the modal. Locate via `grep -n "Available on Day 4"`.
- **AI client is Groq, not OpenAI.** `05-ai-integration.md` specifies
  Groq. Rate limit and cost controls are based on Groq's free tier.
- **Two AI operations only:** card generation and session analysis.
  Day 4 does generation. Session analysis is Day 6.
- **The API route lives under `/api/v1/`,** not the Inertia web routes.
  This is the hybrid architecture from ADR 0001. Day 4 is the first
  time the REST side gets used — pay attention to CORS, Sanctum, and
  how the frontend calls the API without a page reload.
- **PDF/DOCX extraction** is server-side. `smalot/pdfparser` for PDFs,
  `phpoffice/phpword` for DOCX (or equivalent) — check
  `05-ai-integration.md` for the exact libraries. No OCR for scanned
  PDFs.

### Environment facts

- **PHP 8.4 standalone** at `C:\php84`. Git Bash `php` resolves there.
- **Laravel 12**, not 11. Day 0 docs say 11; update
  `02-architecture.md`'s stack table when convenient (Day 9).
- **MariaDB, not MySQL.** XAMPP's bundled DB. Behaves compatibly.
- **`DB_HOST=127.0.0.1`**, not `localhost`. Windows IPv6 resolution
  gotcha. **Browser must use `localhost`, not `127.0.0.1` — see the
  origin-mismatch note above.**
- **PsySH pinned to 0.12.19** in `composer.json`.
- **`@types/node` bumped to `^22.0.0`** (Vite 7 requirement).
- **Tailwind resolved version is 3.4.19.** `indigo-950` is available.
  The `indigo-950/50` opacity variant is used in `ResponsiveNavLink`.
- **`The User::query()->delete()` cleanup command** cascades to decks,
  cards, and review logs. If you have real development accounts you
  want to keep, avoid it or scope it narrowly.
- **`public/build/` is gitignored.** Confirmed again during the Day 3b
  commit. `npm run build` before tests is mandatory, not optional.
- **`storage/framework/lsp-*.php` is gitignored** as of Day 3b. IDE
  language-server temp files won't clutter `git status`.

### Known deferred items (do not fix during Day 4)

**From Day 2, still deferred:**

- **`DeckForm.tsx` and `CardForm.tsx` use raw `<textarea>` and
  `<input type="checkbox">` instead of `TextInput` and `Checkbox`.**
  Their dark variants are inline (applied in `day-03a` §2.16 and
  `day-03b` §5.1 respectively). Refactor to use the components is
  Day 7. Noted because it's a drift hazard.
- **`@tailwindcss/vite` is a dead dependency** in `package.json`,
  pulled in by Laravel 12's default. **Verified inert 2026-09-22:**
  `vite.config.js` does not import it, `postcss.config.js` uses the
  v3 `tailwindcss` plugin. Two Tailwind majors are installed (v3.4.19
  used, v4.3.3 pulled in by the v4 plugin but never imported). Do not
  `npm update` casually until this is cleaned up. Day 7.
- **Two migrations share identical timestamps** (`add_theme` /
  `create_decks` pair, `ai_usage_logs` / `review_logs` pair). Harmless
  because file-name ordering saves us. Fragile if a future migration
  depends on order. Note only; no fix needed.
- **Two commits with identical messages** in the log (`575f7a2`,
  `0affe11` — both "Day 3: planning complete…"). Harmless. No rewrite
  planned. **Kept deliberately** as an honest record of planning time.

**From Day 3a, still deferred:**

- **`GuestLayout.tsx` and `Auth/*` pages are not dark-swept.**
  Confirmed visually during §7: the outer page background and form
  card render light while the form _components_ inside them render
  dark. Incoherent mixed-theme result. Deferred to Day 7.
  Symptom recorded so Day 7 doesn't re-diagnose: "light chrome around
  dark form components."
- **Mobile horizontal padding is not standardized across pages.**
  `Decks/Show` got `px-4 sm:px-6 lg:px-8` on its parent in `day-03a`
  §4.2's §7 follow-up. The other pages still use Breeze's default
  `sm:px-6 lg:px-8`, so their content touches the mobile edge:
    - `Decks/Index.tsx`
    - `Decks/Create.tsx`
    - `Decks/Edit.tsx`
    - `Profile/Edit.tsx`
    - `Cards/Create.tsx` and `Cards/Edit.tsx` (built on Day 3b with
      the same `sm:px-6 lg:px-8` pattern — same drift)
      Day 7 task: one pass, all pages, one commit.
- **Deck description hierarchy.** Wrapped in a surface panel during
  Day 3a §7 fixes. If after living with it, it still reads as filler,
  the next step is making the field optional in the form (not
  re-styling). Day 7 conversation.
- **`/dashboard` route cleanup.** Six Breeze post-auth controllers
  still `route('dashboard', ...)`. Every flow works via the redirect
  in `routes/web.php`. Cleanup: rewrite those six to
  `route('decks.index', ...)`, then delete the `/dashboard` route.
  Day 7.
- **Logo replacement.** Replace `ApplicationLogo`'s Laravel wordmark
  SVG with a custom `?`+lightbulb mark — the `?` represents recall,
  the lightbulb represents insight, and fused they represent the
  study loop. Also thematically ties to TOTES' secondary reading as
  "thoughts." **Single navbar instance**, brand mark alongside the
  wordmark. Decisions to make on Day 7: (1) monochrome (inherits
  `fill-current`, matches every theme) vs. two-color (distinctive,
  needs per-theme treatment); (2) favicon update to match. **Do not
  start this mid-sweep or mid-CRUD.**
- **No toast system.** Still deferred after Day 3b. The inline flash
  pattern is now used twice (`Decks/Create`'s "Deck created." and
  `Cards/Create`'s "Card added. Add another?"). The toast system
  (`04-features.md` §8.3) is a Day 7 or later item. **User preference
  noted 2026-09-23: toasts should auto-dismiss at ~3–5 seconds.**
- **`laravelVersion` and `phpVersion` props** still passed to the
  Welcome route closure. After `day-03a` §5, `Welcome.tsx` no longer
  destructures them. Harmless unused props, pruned when
  `routes/web.php` is next edited for another reason.
- **Pre-paint theme script placement.** `app.blade.php` runs the
  `<script>` after `</body>` and only sets `class="dark"` server-side
  for `dark`, not for `system`. There is a one-frame flash of light
  theme for `system`-theme users on cold load. Observed during
  `day-03a`, confirmed benign for the current page structure.
  Day 7 polish if it becomes noticeable.

**From Day 3b, new:**

- **§3.4 doc drift: "front column is truncated to 80 chars" vs CSS-based
  truncation.** `04-features.md` §3.4 says the card list front column is
  truncated to 80 chars with ellipsis. The actual `Decks/Show.tsx` uses
  Tailwind's `truncate` class, which clips at the container width — more
  than 80 chars on desktop, less on mobile. Both approaches are defensible;
  they differ. The doc's own header says "when code and this doc disagree,
  fix both in the same commit," but this is spec drift, not a bug. **Day 7
  decision: either change the code to slice at 80, or change the doc to
  describe container-based truncation.** Note only; do not fix mid-Day 4.
- **Route-name asymmetry override in `routes/web.php`.** `->names()`
  override was added to make `cards.create` and `cards.store` match the
  short form. If anyone touches the card route block later, don't drop
  the override without running the test suite — the asymmetry will
  reappear silently.
- **`.gitignore` now includes `storage/framework/lsp-*.php`.** IDE
  language-server temp files appear under `storage/framework/` on some
  setups and would otherwise clutter `git status`. Harmless entry; no
  action needed.

### Voice rules (enforced throughout)

- No emojis, ever — UI, code, commits, docs.
- No exclamation marks except "Session complete." (Study mode summary.)
- No patronizing copy ("Oops!", "Great job!").
- Sentence case for headings. Title case for buttons.
- "TOTES" appears as wordplay exactly once: the rate limit message.
- When in doubt, shorter. When still in doubt, quieter.

---

## Starting a New Conversation

If this session moves to a fresh conversation, the new assistant has no
memory of this one. To get productive fast, paste these in order:

1. **This file** (`docs/SESSION-STATE.md`) — the current state.
2. **`docs/04-features.md`** — the spec for whatever Day 4 feature is
   being built (AI generation, §4).
3. **`docs/05-ai-integration.md`** — the AI service design, prompts,
   cost controls, library choices.

That is enough to resume. If the assistant needs to see a source file, it
should ask for the path and you `cat` it — **do not let it guess at
file contents.** The pull model is: the assistant names a path, you
paste the contents. This has caught real errors this project: a stale
dark-mode assumption, a spec that contradicted itself, a test failure
caused by a stale Vite manifest, an origin mismatch masquerading as a
routing bug, a route-name asymmetry that failed 7 tests, and a cast
mismatch that would have failed 3 more.

**Opening message for the new conversation, in the assistant's terms:**

> I'm continuing a 9-day portfolio project called TOTES. Day 3 is
> complete (dark sweep, mobile toggle, Welcome reduction, Dashboard
> removal, card CRUD). Today is Day 4: AI flashcard generation.
>
> Attached are `SESSION-STATE.md`, `04-features.md`, and
> `05-ai-integration.md`.
>
> Act as a senior engineer. Explain _why_ for Laravel 12- and Inertia-2-
> specific things; I know PHP but I'm new to Laravel, Inertia, and REST.
> Push back on scope creep. Flag tradeoffs.
>
> Work pattern: pull model. I paste files up front, then you ask for
> specific paths and I `cat` them. Don't guess at file contents.
>
> When giving me markdown file content, wrap the ENTIRE file in a single
> fenced code block using four backticks on the outside, with inner code
> blocks using three backticks.
>
> Ready when you are. Where do we start?

**If the new assistant drifts** — tries to re-plan Day 4, re-litigate
a frozen decision, or prescribe edits to a file it has not seen — point
it at the section of this file or the relevant doc. The plan is
written; execution is the task.

---

## Day Counter

| Day | Status  | Focus                                            |
| --- | ------- | ------------------------------------------------ |
| 0   | Done    | Documentation                                    |
| 1   | Done    | Foundation                                       |
| 2   | Done    | Deck CRUD + Icon picker + Theme toggle           |
| 3   | Done    | Dark sweep + Mobile toggle + Welcome + Card CRUD |
| 4   | Pending | AI generation (text + PDF/DOCX)                  |
| 5   | Pending | Study mode + SM-2                                |
| 6   | Pending | Session analysis                                 |
| 7   | Pending | Polish + Security + Responsiveness pass          |
| 8   | Pending | Deployment                                       |
| 9   | Pending | Buffer + Final docs                              |

---

## Update Protocol

At the end of each session, change:

1. **Last updated** date and day marker.
2. **Current Status** (day, phase).
3. **What's Done** — check off completed items.
4. **What's Next** — set the next session's goal.
5. **Current Blockers** — anything unresolved.
6. **Notes for Next Session** — anything the next session should know.
7. **Day Counter** — mark the current day.

Then commit:

```bash
git add docs/SESSION-STATE.md
git commit -m "Update session state: end of Day X"
git push
```
