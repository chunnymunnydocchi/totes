# 07 — API & Routes

> This document is the formal specification of every route in TOTES. It covers the Inertia (web) routes, the REST (API) routes, and the auth scaffolding. When code and this doc disagree, one of them is wrong — fix both in the same commit.

**Two route files:** `routes/web.php` for Inertia, `routes/api.php` for REST. Laravel applies different middleware to each automatically.

---

## Conventions

### Web Routes (Inertia)

- **Path prefix:** none (`/decks`, `/settings/profile`)
- **Auth:** session cookie (Laravel default)
- **Responses:** Inertia page renders, redirects, or 302 on validation failure
- **Middleware group:** `web` (CSRF, session, cookies)

### API Routes (REST)

- **Path prefix:** `/api/v1/`
- **Auth:** Sanctum bearer token (`Authorization: Bearer <token>`)
- **Responses:** JSON only
- **Middleware group:** `api` (no CSRF, stateless)
- **Versioning:** every endpoint lives under `/v1/` so future changes go to `/v2/` without breaking clients

### Status Codes

| Code                        | When                                            |
| --------------------------- | ----------------------------------------------- |
| `200 OK`                    | Successful GET, PUT, PATCH, DELETE              |
| `201 Created`               | Successful POST that creates a resource         |
| `204 No Content`            | Successful DELETE with no response body         |
| `302 Found`                 | Web redirect (post-form, post-login)            |
| `401 Unauthorized`          | Missing or invalid token (API)                  |
| `403 Forbidden`             | Authenticated but not authorized (policy fails) |
| `404 Not Found`             | Resource doesn't exist                          |
| `422 Unprocessable Entity`  | Validation failed                               |
| `429 Too Many Requests`     | Rate limit hit (AI daily cap, login throttle)   |
| `500 Internal Server Error` | Unhandled exception                             |

### Error Response Shape (API)

Every API error returns the same JSON shape:

```json
{
  "error": "error_code",
  "message": "Human-readable message.",
  "errors": {
    "field_name": ["Specific field error."]
  }
}
```

- `error` is a snake_case machine-readable code (`rate_limited`, `unauthorized`, `validation_failed`, `ai_failed`, `not_found`).
- `message` is the user-facing string.
- `errors` is present only on 422 validation failures.

---

## 1. Web Routes (Inertia)

### 1.1 Auth Routes

Provided by Laravel Breeze. Registered in `routes/auth.php`.

| Method | Path                               | Name                  | Controller                                           | Auth                       |
| ------ | ---------------------------------- | --------------------- | ---------------------------------------------------- | -------------------------- |
| GET    | `/register`                        | `register`            | `Auth\RegisteredUserController@create`               | guest                      |
| POST   | `/register`                        | —                     | `Auth\RegisteredUserController@store`                | guest                      |
| GET    | `/login`                           | `login`               | `Auth\AuthenticatedSessionController@create`         | guest                      |
| POST   | `/login`                           | —                     | `Auth\AuthenticatedSessionController@store`          | guest                      |
| POST   | `/logout`                          | `logout`              | `Auth\AuthenticatedSessionController@destroy`        | auth                       |
| GET    | `/forgot-password`                 | `password.request`    | `Auth\PasswordResetLinkController@create`            | guest                      |
| POST   | `/forgot-password`                 | `password.email`      | `Auth\PasswordResetLinkController@store`             | guest                      |
| GET    | `/reset-password/{token}`          | `password.reset`      | `Auth\NewPasswordController@create`                  | guest                      |
| POST   | `/reset-password`                  | `password.store`      | `Auth\NewPasswordController@store`                   | guest                      |
| GET    | `/verify-email`                    | `verification.notice` | `Auth\EmailVerificationPromptController`             | auth                       |
| GET    | `/verify-email/{id}/{hash}`        | `verification.verify` | `Auth\VerifyEmailController`                         | auth, signed, throttle:6,1 |
| POST   | `/email/verification-notification` | `verification.send`   | `Auth\EmailVerificationNotificationController@store` | auth, throttle:6,1         |
| GET    | `/confirm-password`                | `password.confirm`    | `Auth\ConfirmablePasswordController@show`            | auth                       |
| POST   | `/confirm-password`                | —                     | `Auth\ConfirmablePasswordController@store`           | auth                       |
| PUT    | `/password`                        | `password.update`     | `Auth\PasswordController@update`                     | auth                       |

**Behavior notes:**

- `POST /login` is throttled: 5 attempts per minute per email+IP.
- `verify-email/{id}/{hash}` uses a signed URL — the hash is derived from the user's email, so tampering invalidates it.
- Whether `verified` middleware blocks app routes depends on `ENFORCE_EMAIL_VERIFICATION`. See [`04-features.md §1.5`](04-features.md).

### 1.2 Deck Routes

Registered in `routes/web.php`. All require `auth`. Ownership enforced by `DeckPolicy`.

| Method | Path                 | Name            | Controller                   | Policy   |
| ------ | -------------------- | --------------- | ---------------------------- | -------- |
| GET    | `/decks`             | `decks.index`   | `Web\DeckController@index`   | —        |
| GET    | `/decks/create`      | `decks.create`  | `Web\DeckController@create`  | —        |
| POST   | `/decks`             | `decks.store`   | `Web\DeckController@store`   | —        |
| GET    | `/decks/{deck}`      | `decks.show`    | `Web\DeckController@show`    | `view`   |
| GET    | `/decks/{deck}/edit` | `decks.edit`    | `Web\DeckController@edit`    | `update` |
| PUT    | `/decks/{deck}`      | `decks.update`  | `Web\DeckController@update`  | `update` |
| DELETE | `/decks/{deck}`      | `decks.destroy` | `Web\DeckController@destroy` | `delete` |

**Route model binding:** `{deck}` binds to `App\Models\Deck` by ID. Laravel throws 404 if not found.

**Policy failure:** throws 403. The frontend renders the 403 error page.

### 1.3 Card Routes

| Method | Path                         | Name            | Controller                   | Policy              |
| ------ | ---------------------------- | --------------- | ---------------------------- | ------------------- |
| GET    | `/decks/{deck}/cards/create` | `cards.create`  | `Web\CardController@create`  | `update` (via deck) |
| POST   | `/decks/{deck}/cards`        | `cards.store`   | `Web\CardController@store`   | `update` (via deck) |
| GET    | `/cards/{card}/edit`         | `cards.edit`    | `Web\CardController@edit`    | `update`            |
| PUT    | `/cards/{card}`              | `cards.update`  | `Web\CardController@update`  | `update`            |
| DELETE | `/cards/{card}`              | `cards.destroy` | `Web\CardController@destroy` | `delete`            |

**Note:** `CardPolicy` delegates to the parent deck's owner. A card is accessible if its `deck.user_id` matches the authenticated user.

### 1.4 Study Routes

| Method | Path                          | Name            | Controller                    | Policy            |
| ------ | ----------------------------- | --------------- | ----------------------------- | ----------------- |
| GET    | `/decks/{deck}/study`         | `study.show`    | `Web\StudyController@show`    | `view` (via deck) |
| GET    | `/decks/{deck}/study/summary` | `study.summary` | `Web\StudyController@summary` | `view` (via deck) |

**Behavior:**

- `study.show` fetches due cards and renders the first one. The back and explanation are **not** included in the props.
- `study.summary` displays session stats. The session is identified by review log IDs passed as query params (or a session token — see §2.6).

### 1.5 Settings Routes

| Method | Path                   | Name                         | Controller                                 |
| ------ | ---------------------- | ---------------------------- | ------------------------------------------ |
| GET    | `/settings/profile`    | `settings.profile`           | `Auth\ProfileController@edit`              |
| PATCH  | `/settings/profile`    | `settings.profile.update`    | `Auth\ProfileController@update`            |
| DELETE | `/settings/profile`    | `settings.profile.destroy`   | `Auth\ProfileController@destroy`           |
| GET    | `/settings/password`   | `settings.password`          | `Auth\PasswordController@edit`             |
| PUT    | `/settings/password`   | `settings.password.update`   | `Auth\PasswordController@update`           |
| GET    | `/settings/appearance` | `settings.appearance`        | `Web\Settings\AppearanceController@edit`   |
| PATCH  | `/settings/appearance` | `settings.appearance.update` | `Web\Settings\AppearanceController@update` |

**Note:** Profile and password routes are Breeze-provided. Appearance is our addition.

---

## 2. API Routes (REST)

All API routes live in `routes/api.php` under the `/api` prefix (Laravel default) and are further prefixed with `/v1/`.

**Full path pattern:** `/api/v1/{resource}`

**Middleware:** `auth:sanctum` on every authenticated endpoint.

### 2.1 Generate Cards

| Field      | Value                                |
| ---------- | ------------------------------------ |
| Method     | `POST`                               |
| Path       | `/api/v1/decks/{deck}/generate`      |
| Auth       | Required (Sanctum)                   |
| Policy     | `DeckPolicy@update`                  |
| Rate limit | `AI_DAILY_LIMIT` (per user, per day) |

**Request:**

```json
{
  "text": "The derivative of ln(x) is 1/x. ...",
  "difficulty": "standard"
}
```

For file uploads, the request uses `multipart/form-data`:

```
Content-Type: multipart/form-data

file: <binary>
difficulty: "standard"
```

**Validation rules** (`GenerateCardsRequest`):

| Field        | Rules                                                 |
| ------------ | ----------------------------------------------------- |
| `text`       | required_without:file, string, min:50, max:5000       |
| `file`       | required_without:text, file, mimes:pdf,docx, max:5120 |
| `difficulty` | required, in:basic,standard,advanced                  |

**Success response (201):**

```json
{
  "cards": [
    {
      "id": 42,
      "front": "What is the derivative of ln(x)?",
      "back": "1/x",
      "explanation": "The derivative of the natural logarithm is the reciprocal of its argument."
    }
  ],
  "usage": {
    "generations_today": 3,
    "generations_limit": 10
  }
}
```

**Error responses:**

| Status | `error`                 | When                               |
| ------ | ----------------------- | ---------------------------------- |
| 401    | `unauthorized`          | No/invalid token                   |
| 403    | `forbidden`             | User doesn't own the deck          |
| 404    | `not_found`             | Deck doesn't exist                 |
| 422    | `validation_failed`     | Input invalid                      |
| 422    | `insufficient_material` | AI couldn't extract enough content |
| 429    | `rate_limited`          | Daily cap reached                  |
| 500    | `ai_failed`             | AI provider error                  |

### 2.2 Fetch Card Answer

| Field      | Value                                             |
| ---------- | ------------------------------------------------- |
| Method     | `GET`                                             |
| Path       | `/api/v1/cards/{card}/answer`                     |
| Auth       | Required (Sanctum)                                |
| Policy     | `CardPolicy@view`                                 |
| Rate limit | 60/min per user (generous, but prevents scraping) |

**Success response (200):**

```json
{
  "back": "1/x",
  "explanation": "The derivative of the natural logarithm is the reciprocal of its argument."
}
```

**Why this endpoint exists:** The back and explanation are **never** included in the initial page props for the study page. They arrive via this endpoint only after the user clicks "Show answer." This is the cheat mitigation described in [`08-security.md`](08-security.md).

**Error responses:** 401, 403, 404, 429.

### 2.3 Submit Review Rating

| Field      | Value                            |
| ---------- | -------------------------------- |
| Method     | `POST`                           |
| Path       | `/api/v1/cards/{card}/review`    |
| Auth       | Required (Sanctum)               |
| Policy     | `CardPolicy@update`              |
| Rate limit | 1 req/sec per card (idempotency) |

**Request:**

```json
{
  "rating": "good"
}
```

**Validation:**

| Field    | Rules                             |
| -------- | --------------------------------- |
| `rating` | required, in:again,hard,good,easy |

**Success response (200):**

```json
{
  "card": {
    "id": 42,
    "due_at": "2025-01-15T14:30:00Z",
    "interval": 10,
    "repetitions": 3,
    "ease_factor": 2.5
  },
  "review_log_id": 128
}
```

**Behavior:**

- Invokes `Sm2Scheduler::apply($card, $rating)`.
- Writes a row to `review_logs`.
- The `review_log_id` is returned so the client can accumulate IDs for the session summary.

**Error responses:** 401, 403, 404, 422, 429.

### 2.4 Session Analysis

| Field      | Value                                     |
| ---------- | ----------------------------------------- |
| Method     | `POST`                                    |
| Path       | `/api/v1/sessions/analyze`                |
| Auth       | Required (Sanctum)                        |
| Rate limit | `AI_DAILY_LIMIT` (shared with generation) |

**Request:**

```json
{
  "review_log_ids": [128, 129, 130, 131]
}
```

**Validation:**

| Field              | Rules                           |
| ------------------ | ------------------------------- |
| `review_log_ids`   | required, array, min:1, max:100 |
| `review_log_ids.*` | integer, exists:review_logs,id  |

**Behavior:**

- Fetches the review logs, verifies they belong to the authenticated user.
- Builds a `SessionSummary` DTO.
- Calls `AiClientInterface::analyzeSession($summary)`.
- Returns the analysis.

**Success response (200):**

```json
{
  "analysis": "You struggled most with cards about logarithmic differentiation...",
  "focus_cards": [
    { "id": 12, "front": "What is the derivative of ln(x^2)?" },
    {
      "id": 15,
      "front": "How do you apply the chain rule to nested functions?"
    }
  ],
  "usage": {
    "analyses_today": 1,
    "analyses_limit": 10
  }
}
```

**Error responses:** 401, 403, 422, 429, 500 (`ai_failed`).

**Note on session identity:** There is no `sessions` table. A "session" is a collection of review log IDs the client has accumulated. This avoids a schema addition and keeps the client in control of what counts as one session (a reload doesn't lose the session; a new tab doesn't merge sessions).

### 2.5 Issue API Token

| Field  | Value                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| Method | `POST`                                                                              |
| Path   | `/api/v1/tokens`                                                                    |
| Auth   | Required (session cookie — this endpoint is session-protected, not token-protected) |

**Why this endpoint exists:** The SPA stores its Sanctum token **in memory only**. On page reload, the token is gone. The SPA calls this endpoint (authenticated via session cookie, since the user is already logged in) to mint a fresh token.

**Success response (201):**

```json
{
  "token": "1|abcdef...",
  "expires_at": "2025-02-15T00:00:00Z"
}
```

**Behavior:**

- Revokes any existing tokens for the user (to prevent token accumulation).
- Issues a new Sanctum token with a 30-day expiry.
- Returns the plaintext token (this is the only time it's visible — Sanctum hashes it in the DB).

### 2.6 Session Summary Data

| Field  | Value                      |
| ------ | -------------------------- |
| Method | `GET`                      |
| Path   | `/api/v1/sessions/summary` |
| Auth   | Required (Sanctum)         |

**Query params:**

```
?review_log_ids[]=128&review_log_ids[]=129&review_log_ids[]=130
```

**Success response (200):**

```json
{
  "cards_reviewed": 3,
  "again_count": 1,
  "hard_count": 0,
  "good_count": 2,
  "easy_count": 0,
  "elapsed_minutes": 4,
  "review_log_ids": [128, 129, 130]
}
```

**Behavior:**

- Validates that all provided log IDs belong to the authenticated user.
- Computes stats from the logs.
- Returns the summary.

The client uses this to render the session summary page without needing server-side session state.

---

## 3. Rate Limits Summary

| Endpoint                             | Limit           | Scope    | Response when exceeded      |
| ------------------------------------ | --------------- | -------- | --------------------------- |
| `POST /login`                        | 5/min           | email+IP | 429 (Breeze default)        |
| `POST /register`                     | 5/min           | IP       | 429 (Breeze default)        |
| `POST /api/v1/decks/{deck}/generate` | 10/day          | user     | 429 + `rate_limited`        |
| `POST /api/v1/sessions/analyze`      | 10/day (shared) | user     | 429 + `rate_limited`        |
| `GET /api/v1/cards/{card}/answer`    | 60/min          | user     | 429                         |
| `POST /api/v1/cards/{card}/review`   | 1/sec           | card     | Silent ignore (idempotency) |

**AI daily limit** is enforced in application code (counting `ai_usage_logs` rows), not via Laravel's `throttle:` middleware. Laravel's rate limiter is time-window based (per minute/hour), not calendar-day based. We need "since midnight today," so we count log rows.

---

## 4. Middleware Groups

### `web` group (applied to `routes/web.php`)

- `EncryptCookies`
- `AddQueuedCookiesToResponse`
- `StartSession`
- `ShareErrorsFromSession`
- `VerifyCsrfToken`
- `SubstituteBindings`

### `api` group (applied to `routes/api.php`)

- `ThrottleRequests:api` (60/min default)
- `SubstituteBindings`

**Note:** The `api` group does **not** include session or CSRF middleware. Sanctum tokens handle auth instead.

### `auth:sanctum` middleware

Applied to all `/api/v1/` routes except `/api/v1/tokens` (which is session-authenticated).

**Behavior:** checks the `Authorization: Bearer` header, validates the token against `personal_access_tokens`, resolves the user.

---

## 5. Route Model Binding

Laravel's route model binding automatically fetches models by ID and throws 404 if not found.

| Route param | Binds to          | Behavior on missing |
| ----------- | ----------------- | ------------------- |
| `{deck}`    | `App\Models\Deck` | 404                 |
| `{card}`    | `App\Models\Card` | 404                 |

**No scoped binding.** We do _not_ use `->scopeBindings()` to nest `{card}` under `{deck}` because the card routes (`/cards/{card}`) don't include the deck in the path. Instead, ownership is checked via policies after the model is resolved.

**Why this is safe:** If a user guesses another user's card ID, the model resolves (200-level fetch), then `CardPolicy@view` runs and throws 403. The user can't access the resource, and the response doesn't leak whether the ID exists.

---

## 6. CSRF & CORS

### CSRF

- **Web routes:** CSRF token required on all POST/PUT/PATCH/DELETE. Handled by Inertia automatically (reads from the `XSRF-TOKEN` cookie).
- **API routes:** No CSRF (stateless, token-authenticated).

### CORS

**TOTES does not require CORS configuration.**

The React app and the API are served from the **same origin**:

- Development: `http://localhost:8000` (Laravel serves both pages and API)
- Production: `https://totes-production.up.railway.app` (same)

Because both live on the same origin, browser CORS checks never trigger.

**If TOTES were ever split into two deployments** (e.g., SPA on Vercel, API on
Railway), CORS would need to be configured. The steps would be:

1. Publish `config/cors.php` (`php artisan config:publish cors`).
2. Set `allowed_origins` to the SPA's domain (e.g., `https://totes.vercel.app`).
3. Set `supports_credentials` to `true` (required for session cookies).
4. Move the SPA's domain into `SANCTUM_STATEFUL_DOMAINS` in `.env`.

This is deliberately avoided in v1 — splitting the app would defeat the purpose
of using Inertia for the main application (see
[`adr/0001-inertia-vs-rest-api.md`](adr/0001-inertia-vs-rest-api.md)).

---

## 7. Naming Conventions

- **Route names** (web): `resource.action` — `decks.index`, `decks.store`, `study.show`.
- **Route paths** (web): kebab-case, plural resources — `/decks`, `/settings/profile`.
- **API paths**: kebab-case, versioned, resource-oriented — `/api/v1/decks/{deck}/generate`.
- **Controller methods**: standard REST verbs — `index`, `store`, `show`, `update`, `destroy`.

---

## 8. What's NOT in the API

Documented explicitly so the API surface stays intentional:

| Not in API                       | Why                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Deck CRUD                        | Web routes only (Inertia). No external consumers need deck CRUD.                         |
| Card CRUD (create/edit/delete)   | Web routes only.                                                                         |
| User settings                    | Web routes only.                                                                         |
| Search/filter                    | Not a v1 feature. If added, would be a web route with query params, not an API endpoint. |
| Bulk operations                  | Not a v1 feature.                                                                        |
| Webhooks                         | Not a v1 feature.                                                                        |
| Public/unauthenticated endpoints | Every API endpoint requires a token.                                                     |

The API exists to power two things: the AI generation modal, and the study session's on-demand answer fetch. Anything else stays on Inertia.

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — why we have both web and API routes
- **Features** ([`04-features.md`](04-features.md)) — the UI flows these routes power
- **AI Integration** ([`05-ai-integration.md`](05-ai-integration.md)) — the endpoints that call AI
- **Spaced Repetition** ([`06-spaced-repetition.md`](06-spaced-repetition.md)) — the review endpoint's math
- **Security** ([`08-security.md`](08-security.md)) — policies, tokens, and cheat mitigation in detail
