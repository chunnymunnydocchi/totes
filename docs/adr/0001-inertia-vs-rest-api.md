# ADR 0001 — Hybrid Architecture: Inertia for the App, REST for AI

- **Status:** Accepted
- **Date:** Sep 9, 2026
- **Deciders:** Author
- **Context:** Architecture choice for frontend-backend communication in TOTES

---

## Context

TOTES needs a communication model between its React frontend and Laravel backend. Two main options exist in the Laravel ecosystem:

1. **Inertia.js** — Laravel routes return React pages with props, session-based auth, no separate API.
2. **REST API + SPA** — Laravel exposes JSON endpoints, React is a standalone SPA, token-based auth via Sanctum.

Each has tradeoffs. A full SPA + REST API is the industry-standard pattern for large apps but requires significant boilerplate (token management, CORS, error handling on both ends). Inertia is faster to build with and Laravel-native but doesn't demonstrate classic API design skills.

TOTES has a 9-day build window. Feature velocity matters, but so does the portfolio signal — the codebase will be read by engineers, and API design is a valuable skill to demonstrate.

---

## Decision

TOTES will use a **hybrid architecture**:

- **Inertia.js** powers the main application: authentication, deck CRUD, card CRUD, and study mode.
- **A versioned REST API (`/api/v1/`)** with Sanctum token auth powers exactly two operations:
  1. AI flashcard generation (`POST /api/v1/decks/{deck}/generate`)
  2. On-demand card answer fetching for cheat mitigation (`GET /api/v1/cards/{card}/answer`)

---

## Reasoning

### Why Inertia for the main app

- **Faster to build.** No separate SPA, no token refresh logic, no CORS config.
- **Session auth is trivial.** Laravel Breeze scaffolds it.
- **Inertia's `<Link>` and `useForm`** handle navigation and form submission cleanly.
- **Laravel-native.** The framework is designed for this pattern in 2025+.

### Why REST for AI generation

- **Stateless by nature.** Takes text in, returns cards out. No session state needed.
- **Slow operation.** AI calls take 1–5 seconds. REST + explicit loading states is the correct UX pattern.
- **Rate limiting is cleaner.** Per-user daily caps on AI usage fit naturally in an API middleware.
- **Worth versioning.** Response shape may evolve; `/api/v1/` allows future `/api/v2/` without breaking clients.
- **Demonstrates API design.** The project can showcase JSON resources, status codes, error shapes, and Sanctum tokens — all standard backend skills.

### Why not full Inertia

- Loses the opportunity to demonstrate REST API design.
- Inertia is Laravel-specific; a portfolio signal that doesn't generalize.
- The AI operation genuinely benefits from being an API call (see above).

### Why not full REST + SPA

- **Too slow.** Auth alone would consume 1.5–2 days of the 9-day build.
- **Boilerplate-heavy.** Token storage, refresh, CORS, error interceptors — all plumbing, no product.
- **Not what the app needs.** The main app is not a "platform" that external consumers call. It's a self-contained web app. Inertia is the right tool for that.

---

## Consequences

### Positive

- **Fast feature delivery** for the main app (Days 2–6 stay focused on product).
- **Real REST API** to demonstrate in the portfolio, documented in `07-api-and-routes.md`.
- **Two auth paths** (session + token) from one user model — a genuinely interesting technical note.
- **A clear architecture rationale** to discuss in interviews.

### Negative

- **Two patterns to maintain.** Developers reading the code need to know when to use Inertia vs. the API. This is documented, but it's cognitive overhead.
- **Sanctum setup cost.** ~2 hours of work on Day 1 to configure Sanctum, issue tokens, and wire the SPA's axios instance.
- **Token storage decision.** We store the token in memory only (re-authenticated via session on reload). This trades a bit of UX (a re-fetch on reload) for a bit of security (no localStorage XSS risk).

### Neutral

- **The `api.php` routes file becomes meaningful** — not just a placeholder. This is a small but real benefit: most Laravel projects scaffold `api.php` and never use it.

---

## Alternatives Considered

### Full Inertia

Rejected. Loses the REST signal. The AI operation is a legitimate API use case, and building it as one is more correct than cramming it into an Inertia form submission.

### Full REST + SPA

Rejected. Too much boilerplate for 9 days. Would cut features (PDF/DOCX upload, dark mode persistence, one animation) to fit.

### GraphQL

Rejected. Overkill for this app. GraphQL's strengths (client-driven queries, schema federation) don't apply here. It would add tooling (Apollo, schema definition) without solving a real problem.

### Livewire (Laravel's PHP-only reactive framework)

Rejected. The author wants to demonstrate React skills, not Livewire. Livewire is excellent but wrong for this portfolio goal.

---

## References

- Laravel Inertia docs: https://laravel.com/docs/11.x/frontend#inertia
- Laravel Sanctum docs: https://laravel.com/docs/11.x/sanctum
- Inertia.js docs: https://inertiajs.com/
