# 02 — Architecture

> This document explains how TOTES is technically structured and why each choice was made. It's the bridge between the product vision ([`01-product-vision.md`](01-product-vision.md)) and the actual code.

---

## High-Level Stack

| Layer              | Technology                  | Version | Why                                                                           |
| ------------------ | --------------------------- | ------- | ----------------------------------------------------------------------------- |
| Runtime            | PHP                         | 8.2+    | Required by Laravel 11.                                                       |
| Backend framework  | Laravel                     | 11      | Convention-driven. Auth, ORM, validation, queues, and routing out of the box. |
| Frontend framework | React                       | 18      | Component model, huge ecosystem, familiar to the author.                      |
| Frontend language  | TypeScript                  | 5+      | Type safety across props, API responses, and shared types.                    |
| Main app bridge    | Inertia.js                  | 2       | Renders React pages from Laravel routes without a separate SPA API.           |
| API layer          | Laravel REST + Sanctum      | 4       | Token-authenticated JSON endpoints for AI generation and answer fetching.     |
| Build tool         | Vite                        | 5+      | Fast dev server, HMR, ships with Laravel.                                     |
| Styling            | Tailwind CSS                | 3+      | Utility-first, `dark:` variants built in.                                     |
| Icons              | Iconify (`@iconify/react`)  | latest  | 200,000+ icons, string identifiers, no file storage.                          |
| Database           | MySQL                       | 8+      | Relational data, `utf8mb4`, excellent Laravel support.                        |
| AI provider        | Groq (Llama 3.3 70B)        | via API | Fast inference, free tier, strong on structured extraction.                   |
| Auth scaffolding   | Laravel Breeze (React + TS) | latest  | Minimal, official, includes register/login/logout.                            |
| Deployment         | Railway                     | —       | Laravel-friendly, GitHub deploys, free tier.                                  |

---

## Why a Hybrid Architecture

TOTES uses **two communication paths** between the React frontend and the Laravel backend:

1. **Inertia.js** — for the main application (auth, decks, cards, study mode)
2. **REST API (Sanctum)** — for AI generation and on-demand answer fetching

This is a deliberate choice. The full reasoning lives in [`adr/0001-inertia-vs-rest-api.md`](adr/0001-inertia-vs-rest-api.md). In short:

- **Inertia is fast to build with and session-authenticated.** Auth, CRUD, and page rendering use it.
- **REST is the right tool for stateless, potentially long-running, or independently-versionable operations.** AI generation is exactly that: it takes seconds, has a rate limit, and its response shape is worth versioning.

Using both is not indecision — it's picking the right tool per feature. A senior engineer's job is to know when each applies.

---

## Why These Choices (The Reasoning)

### Why Laravel over Node/Express, Django, or Rails?

Laravel is **opinionated in the right places.** For a 9-day project, the framework should _carry_ you, not make you architect everything from scratch.

Specifically, Laravel gives us:

- **Eloquent ORM** — relationships, eager loading, and query building are one-liners.
- **Migrations** — schema is version-controlled code, not manual SQL.
- **Form Requests** — validation lives in a class, not in a controller.
- **Policies** — authorization is declarative (`$this->authorize('update', $deck)`).
- **Sanctum** — token auth for the API endpoints, session auth for Inertia, both from one package.
- **Breeze** — auth scaffolding in one command.

Express would give us flexibility — and we'd spend Day 1 building auth, Day 2 building an ORM layer, Day 3 building validation. Laravel gives us all of that for free.

### Why Inertia for the main app instead of a full SPA + REST?

See [`adr/0001-inertia-vs-rest-api.md`](adr/0001-inertia-vs-rest-api.md) for the full decision record. Short version:

- **One codebase.** No separate API server, no separate React server.
- **Session auth for free.** Laravel's built-in auth works with Inertia out of the box.
- **Less boilerplate.** No axios interceptors, no token refresh logic, no CORS config for the main app.
- **Faster feature delivery.** Days 2–6 stay focused on product, not plumbing.

### Why a REST API for AI generation specifically?

- **It's stateless.** The AI endpoint doesn't need session state — it takes text and returns cards.
- **It's potentially slow.** AI calls take 1–5 seconds. A REST call with proper loading states is the right UX pattern.
- **It benefits from rate limiting.** Sanctum tokens + a per-user daily cap protect the AI budget.
- **It's worth versioning.** If the response shape of AI generation changes, `/api/v1/generate` can evolve independently of the main app.

### Why React + TypeScript over Vue or plain JS?

- **React** — the author is most familiar with it. Familiarity compounds over 9 days.
- **TypeScript** — catches entire categories of bugs (wrong prop names, missing fields, bad API shapes). For a project of this size, TS pays for itself by Day 4.
- **Not Vue** — Vue is excellent, but switching frameworks mid-project would waste the familiarity advantage.

### Why MySQL over MongoDB or SQLite?

**Over MongoDB:** Our data is fundamentally relational. Users own Decks. Decks contain Cards. Cards have Review Logs. These are foreign-key relationships, and the queries we need are joins and aggregates ("how many cards are due in this deck for this user?"). Eloquent + MySQL makes this trivial.

**Over SQLite:** We want dev and production environments to match. Railway's default is MySQL. Using the same engine locally prevents "works on my machine" bugs at deploy time.

### Why Groq over OpenAI or Anthropic?

- **Speed.** Groq's inference is dramatically faster than standard cloud inference — often sub-second for short completions.
- **Cost.** Groq's free tier is generous. OpenAI's free tier requires data-sharing opt-in. Anthropic has no free tier.
- **Sufficient accuracy.** Flashcard generation is a structured extraction task. It doesn't need a frontier model. Llama 3.3 70B handles it well.

**The interface is abstracted** (see "Service Layer" below), so swapping Groq for OpenAI later is a config change, not a refactor.

---

## Folder Structure

```
totes/
├── app/
│ ├── Http/
│ │ ├── Controllers/
│ │ │ ├── Web/ # Inertia-rendered pages
│ │ │ │ ├── DeckController.php
│ │ │ │ ├── CardController.php
│ │ │ │ ├── StudyController.php
│ │ │ │ └── SessionAnalysisController.php
│ │ │ └── Api/
│ │ │ └── V1/ # Versioned REST API
│ │ │ ├── GenerateCardsController.php
│ │ │ └── CardAnswerController.php
│ │ ├── Requests/
│ │ │ ├── StoreDeckRequest.php
│ │ │ ├── UpdateDeckRequest.php
│ │ │ ├── StoreCardRequest.php
│ │ │ └── GenerateCardsRequest.php
│ │ ├── Resources/ # API JSON transformers
│ │ │ ├── CardResource.php
│ │ │ └── DeckResource.php
│ │ └── Middleware/
│ ├── Models/
│ │ ├── User.php
│ │ ├── Deck.php
│ │ ├── Card.php
│ │ └── ReviewLog.php
│ ├── Policies/
│ │ ├── DeckPolicy.php
│ │ └── CardPolicy.php
│ ├── Services/
│ │ ├── Ai/
│ │ │ ├── AiClientInterface.php
│ │ │ ├── GroqClient.php
│ │ │ ├── PromptBuilder.php
│ │ │ └── DTO/
│ │ │ ├── GeneratedCard.php
│ │ │ └── SessionAnalysis.php
│ │ └── SpacedRepetition/
│ │ ├── Sm2Scheduler.php
│ │ └── ReviewRating.php
│ └── Support/
│ └── DocumentExtractor.php
│
├── resources/js/
│ ├── Components/
│ │ ├── ui/
│ │ ├── decks/
│ │ └── study/
│ ├── Layouts/
│ │ └── AuthenticatedLayout.tsx
│ ├── Pages/
│ │ ├── Decks/
│ │ ├── Study/
│ │ └── Auth/
│ ├── lib/
│ │ ├── deckColors.ts
│ │ ├── inertia.ts # Inertia helpers
│ │ └── api.ts # Axios instance for REST calls
│ ├── types/
│ │ └── index.d.ts
│ └── app.tsx
│
├── routes/
│ ├── web.php # Inertia routes
│ ├── api.php # REST API routes (versioned)
│ └── auth.php # Breeze-generated
│
├── docs/
│ ├── adr/
│ │ └── 0001-inertia-vs-rest-api.md
│ └── (other docs)
│
├── tests/
│ ├── Feature/
│ │ ├── Web/
│ │ └── Api/
│ └── Unit/
│
├── .env.example
├── composer.json
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

### Why This Structure

**Controllers split by Web vs. API** — `Controllers/Web/` holds Inertia-rendering controllers. `Controllers/Api/V1/` holds REST controllers. The versioning (`V1`) signals the API is stable and future changes go to `V2`.

**API Resources for JSON transformers** — `CardResource` defines exactly what a Card looks like over the API. This is a Laravel-native way to control API response shape without leaking internal columns (like `ease_factor`) to the client.

**Services are HTTP-agnostic** — SM-2 and AI logic live in `Services/`. Both Web and API controllers can call them. This means the same `GroqClient` powers the API endpoint _and_ (potentially) a future queued job.

**Routes split by protocol** — `web.php` for Inertia, `api.php` for REST. Laravel handles these separately (different middleware groups). The `api` prefix and `auth:sanctum` middleware are applied automatically to `api.php` routes.

---

## Request Lifecycle — Two Examples

### Example A: Studying a card (Inertia path)

```
User clicks "Next card" in React
│
▼

Inertia sends GET /study/{deck}/next (session cookie auto-attached)
│
▼

Laravel routes to StudyController@next
│
▼

Controller authorizes via DeckPolicy
│
▼

Controller fetches next due card via SM-2 ordering
│
▼

Inertia::render('Study/Session', ['card' => $card])
│
▼

React receives new page props, renders the card

No tokens. No CORS. Session cookie does the auth.
```

### Example B: Generating flashcards (REST path)

```
User clicks "Generate Flashcards" in React
│
▼

Axios sends POST /api/v1/decks/{deck}/generate
Headers: Authorization: Bearer <sanctum-token>
Body: { text, difficulty }
│
▼

Laravel routes to Api\V1\GenerateCardsController@store
│
▼

auth:sanctum middleware verifies the token
│
▼

GenerateCardsRequest validates input
│
▼

Controller authorizes via DeckPolicy
│
▼

Controller checks AI daily rate limit
│
▼

Controller calls AiClientInterface::generateCards(...)
│
▼

GroqClient builds prompt, calls Groq, parses JSON into DTOs
│
▼

Controller persists cards inside a DB transaction
│
▼

Controller logs usage to ai_usage_logs
│
▼

Returns JSON: { cards: [...] } with 201 Created
│
▼

React updates local state (or refetches deck)

Note the differences: bearer token instead of session cookie, JSON response instead of Inertia props, explicit 201 status code.
```

---

## The AI Boundary

AI calls happen in **exactly three places**, all inside `app/Services/Ai/`:

1. `GroqClient::generateCards()` — flashcard generation
2. `GroqClient::analyzeSession()` — end-of-session analysis
3. **Nothing else.**

Both are called from controllers (Web or API), never directly from React. This keeps the AI provider swappable and the API key server-side only.

---

## Authentication — Two Paths, One User Table

- **Inertia path:** session cookie (Laravel's default). Set on login, cleared on logout.
- **API path:** Sanctum personal access token. Issued on login or via a dedicated `/api/v1/tokens` endpoint. Stored in the SPA's memory (not localStorage, to reduce XSS risk — see [`08-security.md`](08-security.md)).

Both authenticate the same `User` model. A user logged in via Inertia can also make API calls if they hold a token.

**For v1 simplicity:** The SPA stores the token in memory only. On page reload, it re-authenticates via session (since the user is already logged in via Inertia) and gets a fresh token. This means API calls require an active session — which is fine for a web app.

---

## Configuration & Secrets

All secrets live in `.env`. The `.env.example` file is committed (with placeholder values). The `.env` file is never committed.

Required environment variables:

```
APP_NAME=TOTES
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=totes
DB_USERNAME=
DB_PASSWORD=

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

AI_DAILY_LIMIT=10
AI_MAX_INPUT_CHARS=5000

SANCTUM_STATEFUL_DOMAINS=localhost

`AI_DAILY_LIMIT` and `AI_MAX_INPUT_CHARS` are configurable so we can tighten them in production without a code change.
```

---

## Testing Strategy

We test:

- **SM-2 algorithm** (Unit) — it's math, it's deterministic, it's the heart of the app.
- **AI response parsing** (Unit) — DTO construction from potentially malformed JSON.
- **Deck policy** (Feature) — does User A really not see User B's decks?
- **Card generation flow** (Feature, API) — end-to-end: POST text, receive JSON, verify DB state.
- **Study next-card flow** (Feature, Web) — verify SM-2 ordering.

We _don't_ test:

- Inertia page rendering (visual, not logic)
- Groq API responses (external, flaky, expensive)
- Tailwind class names (not behavior)

---

## Relationship to Other Docs

- **Product Vision** ([`01-product-vision.md`](01-product-vision.md)) — why TOTES exists
- **ADR 0001** ([`adr/0001-inertia-vs-rest-api.md`](adr/0001-inertia-vs-rest-api.md)) — the hybrid decision in detail
- **Database Schema** ([`03-database-schema.md`](03-database-schema.md)) — the tables this architecture uses
- **AI Integration** ([`05-ai-integration.md`](05-ai-integration.md)) — details on the AI service layer
- **API & Routes** ([`07-api-and-routes.md`](07-api-and-routes.md)) — every endpoint, documented
- **Security** ([`08-security.md`](08-security.md)) — how policies, tokens, and answer gating work
