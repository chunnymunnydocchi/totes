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

**Time spent:** [fill in]

**Tomorrow (Day 2):** Deck CRUD, icon picker, color palette, dark mode toggle.

---

## Day 2 — Deck Management

**Date:** [fill in]

**Focus:** Full deck CRUD with Iconify icon picker and color palette.

_(... and so on. Each day follows the same template: what was built, what broke, what was learned, decisions, time spent, tomorrow.)_

---

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
