# 11 — Future Work

> This document lists every feature, improvement, and fix that was deliberately deferred from v1. Each entry includes why it was cut, what it would require, and a rough effort estimate.

**Why this exists:** A senior engineer's job is not to build everything — it's to build the right things within the time available, and document what was left out. Every deferred feature here is a _deliberate_ scope decision, not an oversight.

---

## Features

### URL fetching for AI generation

- **What:** User pastes a URL, TOTES fetches the page, extracts readable text, and generates cards.
- **Why cut:** Legal/ToS concerns with scraping, JavaScript-rendered pages break server-side fetch, requires readability extraction + chunking before the AI even sees the content. Would consume 3 of 9 days.
- **Effort:** ~3 days.
- **Dependencies:** Headless browser (Playwright), readability library, chunking strategy.

### OCR for scanned PDFs and images

- **What:** Extract text from scanned documents or images via OCR.
- **Why cut:** Accuracy on handwriting is unreliable (50–70%). Even printed text OCR requires preprocessing (deskew, denoise, contrast). Would need Tesseract or a paid API.
- **Effort:** ~2 days.
- **Dependencies:** Tesseract or a cloud OCR service.

### Video/audio transcription

- **What:** User uploads a lecture video or audio recording, TOTES transcribes it and generates cards.
- **Why cut:** Entire sub-project. Requires Whisper API, transcript chunking, timestamp handling.
- **Effort:** ~2 days.
- **Dependencies:** Whisper API or self-hosted model.

### Custom color themes

- **What:** Beyond light/dark, users pick from themed palettes (e.g., sepia, high-contrast, solarized).
- **Why cut:** Requires CSS variable refactor across every component. Contrast testing multiplies per theme. Not justified for a portfolio demo.
- **Effort:** ~1.5 days.
- **Dependencies:** None, but invasive refactor.

### AI difficulty tiers (multi-model routing)

- **What:** Basic uses a small model, Advanced uses a larger model, with genuine cost difference.
- **Why cut:** Multi-pass prompts or multi-model routing adds 3× token cost and 5× complexity. The prompt-modifier approach delivers 80% of the value at 5% of the cost.
- **Effort:** ~1 day.
- **Dependencies:** Multiple AI provider accounts or model families.

### Drag-reorder cards within a deck

- **What:** Users drag cards to set a custom study order.
- **Why cut:** Requires a drag-and-drop library (dnd-kit), persistent ordering state, endpoint for reorder. ~1 day for pure UX polish.
- **Effort:** ~1 day.
- **Dependencies:** dnd-kit or similar.

### Hints system

- **What:** Per-card hints that reveal progressively before showing the full answer.
- **Why cut:** Adds hint content, generation (AI or manual), UI, tracking. The "Show answer" button already serves this need.
- **Effort:** ~0.5 day.
- **Dependencies:** None, but scope creep risk.

### Streaks and consistency tracking

- **What:** Display "You've studied X days in a row" and "Y cards reviewed this week."
- **Why cut:** Session summary already provides immediate feedback. Streaks are more meaningful once a user has a longer history. Computable from `review_logs` without schema changes.
- **Effort:** ~0.5 day.
- **Dependencies:** None.

### Soft deletes with recovery window

- **What:** Deleting a deck or card moves it to a "Trash" view for 30 days before permanent deletion.
- **Why cut:** Adds `deleted_at` to every model, requires every query to account for it, complicates cascades. Delete confirmation modal covers the common case.
- **Effort:** ~0.5 day.
- **Dependencies:** None.

### Deck search and filtering

- **What:** Search decks by name, filter by "due today" / "mastered" / "has no cards."
- **Why cut:** Not needed for a user with 5–20 decks. Would matter at 100+.
- **Effort:** ~0.5 day.
- **Dependencies:** None.

### Bulk card actions

- **What:** Select multiple cards, delete them or move them to another deck.
- **Why cut:** Not a v1 need. Adds UI complexity for a rare operation.
- **Effort:** ~0.5 day.
- **Dependencies:** None.

### FSRS scheduler migration

- **What:** Replace SM-2 with FSRS (Free Spaced Repetition Scheduler).
- **Why cut:** FSRS requires per-user training data to outperform SM-2. A new user gets nothing. Migration is complex (different state model: stability + difficulty).
- **Effort:** ~2 days.
- **Dependencies:** A training/fitting step, a new schema, careful migration of existing scheduling state.

### Social login (Google, GitHub)

- **What:** OAuth registration and login.
- **Why cut:** Adds an external dependency (Laravel Socialite), provider-specific setup, and account-linking logic. Not needed for a portfolio demo.
- **Effort:** ~1 day.
- **Dependencies:** Laravel Socialite, provider OAuth apps.

### Two-factor authentication

- **What:** TOTP-based 2FA for account security.
- **Why cut:** No sensitive data in TOTES. 2FA would add friction for demo users.
- **Effort:** ~1 day.
- **Dependencies:** A TOTP library (pragmarx/google2fa).

### Public API

- **What:** Expose deck/card CRUD via the REST API for external consumers.
- **Why cut:** No external consumers planned. The API exists for TOTES's own frontend.
- **Effort:** ~1 day.
- **Dependencies:** API documentation (OpenAPI spec).

---

## Infrastructure & Operations

### Database backups

- **What:** Automated daily MySQL dumps to external storage.
- **Why cut:** Railway's free tier doesn't include automatic backups. For a portfolio project with demo data, backups aren't critical.
- **Effort:** ~0.5 day.
- **Dependencies:** S3/Cloudflare R2 or similar, cron job.

### Monitoring and alerting

- **What:** Sentry for errors, external uptime monitoring.
- **Why cut:** Railway provides basic logs. Sentry adds an account, an SDK, and configuration.
- **Effort:** ~0.5 day.
- **Dependencies:** Sentry account.

### CI/CD pipeline

- **What:** GitHub Actions running tests on PR, blocking merge on failure.
- **Why cut:** Push-to-deploy is sufficient for a solo project. Tests are run locally.
- **Effort:** ~0.5 day.
- **Dependencies:** GitHub Actions, test suite.

### Redis caching

- **What:** Cache the deck list, deck detail, and study queue.
- **Why cut:** The app is not under load. Database queries are fast enough.
- **Effort:** ~0.5 day.
- **Dependencies:** Redis service on Railway.

### Queued AI generation

- **What:** Move AI generation to a background job, notify via polling or WebSocket.
- **Why cut:** Generation takes 1–5 seconds. Blocking the request is fine at this scale. Queues add complexity (worker process, job table, failure handling).
- **Effort:** ~1 day.
- **Dependencies:** Redis or database queue driver, a worker process on Railway.

### Secrets rotation

- **What:** Ability to rotate Groq API key, Resend API key, and Sanctum tokens without downtime.
- **Why cut:** Manual rotation is fine for a portfolio project.
- **Effort:** ~0.5 day.
- **Dependencies:** None.

---

## Content & Polish

### Deck templates (starter decks)

- **What:** Pre-built decks for common subjects (Spanish basics, Biology 101, etc.) that users can import.
- **Why cut:** Requires curated content authoring. Not a technical challenge.
- **Effort:** Variable (content work, not code).

### Deck sharing (read-only links)

- **What:** Generate a public link that shows a deck's cards (front only, or front+back).
- **Why cut:** Adds a public/private dimension to the schema, a sharing token system, and a public view.
- **Effort:** ~1 day.
- **Dependencies:** None.

### Keyboard shortcuts documentation

- **What:** A help modal listing all keyboard shortcuts.
- **Why cut:** The shortcuts are visible in the UI hints (`Space`, `1–4`). A full doc page is polish.
- **Effort:** ~2 hours.

### Onboarding flow

- **What:** First-time user walkthrough (create a deck, generate cards, study once).
- **Why cut:** Adds UI complexity and state tracking. The empty states are self-explanatory.
- **Effort:** ~1 day.

### Multi-language support (i18n)

- **What:** Interface translations beyond English.
- **Why cut:** No target audience. Would require extracting every string into a translation file.
- **Effort:** ~2 days.

### Accessibility audit

- **What:** WCAG AA compliance. Keyboard nav, screen reader support, focus management.
- **Why cut:** Basic accessibility is included (focus states, semantic HTML, keyboard shortcuts in study mode). A full audit is v2.
- **Effort:** ~1 day.

---

## What This Document Says About TOTES

Every cut above has a _reason_. That's the point. A v1 that ships with deliberate scope is a stronger portfolio signal than a v1 that tries everything and half-finishes.

The README points here so reviewers know: **nothing was forgotten. Everything was decided.**
