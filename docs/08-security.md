# 08 — Security

> This document defines how TOTES protects user data, prevents unauthorized access, and mitigates cheating. It ties together security decisions that appear in the architecture, schema, features, and API docs.

**Core principle:** Security is layered. No single mechanism is trusted to do everything. Auth handles identity, policies handle authorization, database constraints handle data integrity, and the API design handles information disclosure.

---

## 1. Threat Model

Before defenses, the threats. TOTES assumes three classes of adversary:

### 1.1 Curious User (Most Common)

A legitimate user who wonders:

- "Can I see another user's decks?"
- "Can I see the answer before I reveal the card?"
- "Can I get more AI generations than my daily limit?"

**Motivation:** curiosity, mild convenience. **Sophistication:** low. **Defense:** server-side authorization and validation. Nothing meaningful happens client-side.

### 1.2 Scraper (Occasional)

An automated script that tries to:

- Enumerate user IDs or deck IDs
- Extract flashcard content without studying
- Abuse the AI generation endpoint

**Motivation:** content extraction. **Sophistication:** moderate. **Defense:** rate limiting, token auth, and the fact that answers aren't in the initial payload.

### 1.3 Targeted Attacker (Rare)

Someone specifically trying to access another user's data or compromise an account.

**Motivation:** targeted. **Sophistication:** high. **Defense:** HTTPS, hashed passwords, CSRF tokens, HttpOnly session cookies, Sanctum tokens. Beyond the scope of what a portfolio app can fully defend against, but the standard defenses are in place.

**Not in scope:** Denial of service at scale, physical server access, supply chain attacks, social engineering. These require infrastructure beyond a portfolio project.

---

## 2. Authentication

TOTES has two authentication paths. Both authenticate the same `User` model.

### 2.1 Session Auth (Web)

Used by: all Inertia routes.

| Aspect                 | Implementation                                                |
| ---------------------- | ------------------------------------------------------------- |
| Credential             | Session cookie (`laravel_session`)                            |
| Cookie flags           | `HttpOnly`, `Secure` (production), `SameSite=Lax`             |
| Lifetime               | Configurable via `config/session.php` (default: 2 hours idle) |
| Password hashing       | Bcrypt, cost factor 12 (Laravel default)                      |
| Rate limit on login    | 5 attempts per minute per email+IP                            |
| Rate limit on register | 5 attempts per minute per IP                                  |

**Why session auth for the web layer:** Laravel's default. Breeze scaffolds it. No tokens to manage in the browser. The session cookie is HttpOnly, so JavaScript cannot read it — XSS can't steal the session directly.

### 2.2 Token Auth (API)

Used by: all `/api/v1/` routes.

| Aspect                 | Implementation                                                  |
| ---------------------- | --------------------------------------------------------------- |
| Credential             | Sanctum personal access token (`Authorization: Bearer <token>`) |
| Token storage (server) | Hashed in `personal_access_tokens` table                        |
| Token storage (client) | In-memory only (JavaScript variable)                            |
| Token lifetime         | 30 days                                                         |
| Token revocation       | On logout, all user tokens are revoked                          |

**Why the token isn't stored in localStorage:** localStorage is accessible to any JavaScript on the page. If a malicious script gets injected (XSS), it can read localStorage and steal the token. Storing in memory means the token dies when the tab closes, and no XSS payload can read it without running in the same page context (in which case the token is already in memory and readable — but the window for exploitation is much smaller).

**The tradeoff:** On page reload, the token is gone. The SPA re-authenticates by calling `POST /api/v1/tokens` (session-protected) to mint a new one. This adds one request per reload. For TOTES, that's acceptable.

### 2.3 Password Reset

Standard Laravel flow:

1. User submits email.
2. Laravel generates a signed, time-limited token (default: 60 minutes).
3. Email is sent via Resend.
4. User clicks the link and sets a new password.
5. The reset token is invalidated on use.

**Security notes:**

- The reset endpoint is rate-limited (Breeze default: 6/min per email).
- The token is hashed in the `password_reset_tokens` table — a database leak doesn't expose usable tokens.
- The email says "If you didn't request this, ignore this email" — the standard anti-phishing line.

### 2.4 Email Verification

Built and functional. **Enforcement is conditional** (`ENFORCE_EMAIL_VERIFICATION`, default `false`).

When enforced:

- Unverified users are redirected to `/verify-email`.
- Signed URLs prevent tampering — the hash is derived from the user's email, so changing the ID in the URL invalidates the signature.
- The verification link expires after 60 minutes (Laravel default).

---

## 3. Authorization

Every request that touches a resource goes through a **policy**. Policies are the single source of truth for "can this user do this thing?"

### 3.1 DeckPolicy

```php
namespace App\Policies;

use App\Models\Deck;
use App\Models\User;

class DeckPolicy
{
    public function view(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
    }

    public function update(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
    }

    public function delete(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
    }
}
```

**Why three methods and not one:** Laravel's policy system calls the specific method for the specific action. `view` is used for `GET /decks/{deck}`, `update` for `PUT /decks/{deck}`, `delete` for `DELETE /decks/{deck}`. Having them separate means if we ever add a "share deck" feature that allows non-owners to _view_ but not _edit_, we change `view` and leave `update` alone.

### 3.2 CardPolicy

```php
namespace App\Policies;

use App\Models\Card;
use App\Models\User;

class CardPolicy
{
    public function view(User $user, Card $card): bool
    {
        return $user->id === $card->deck->user_id;
    }

    public function update(User $user, Card $card): bool
    {
        return $user->id === $card->deck->user_id;
    }

    public function delete(User $user, Card $card): bool
    {
        return $user->id === $card->deck->user_id;
    }
}
```

**Why `$card->deck->user_id` instead of `$card->user_id`:** Cards don't have a `user_id` column. Ownership is derived from the parent deck. This is deliberate — it means a card can never belong to a different user than its deck.

### 3.3 Policy Enforcement Points

| Layer          | How it's enforced                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web controller | `$this->authorize('view', $deck)` at the top of each action                                                                                                                                       |
| API controller | Same — `$this->authorize('view', $card)`                                                                                                                                                          |
| Form Request   | Not used for authorization (only validation).                                                                                                                                                     |
| Blade/Inertia  | Authorization is _also_ checked when building the response (e.g., the deck's Edit button only renders if the user owns it) — but this is UX, not security. The server re-checks on every request. |

**Critical rule:** Never trust the client for authorization. A hidden button is not a security measure. Every server endpoint verifies ownership independently.

---

## 4. The 403 vs. 404 Decision

When a user tries to access a resource they don't own, what does TOTES return?

**Answer: 404, not 403.**

Consider: User A (ID 5) tries `GET /decks/42`, where deck 42 belongs to User B.

**Option 1 — Return 403:**

> "You don't have access to that deck."

This confirms the deck _exists_. An attacker can enumerate IDs and map out how many decks exist in the system.

**Option 2 — Return 404:**

> "We couldn't find that page. It may have been deleted."

This reveals nothing. The deck might exist, might not. The attacker gains no information.

**TOTES returns 404 in the web layer** for any unauthorized access. In the API layer, it returns **403 with a generic message** (since the API is token-authenticated and the token's owner is known, there's less enumeration risk).

**Implementation:** In the web controller, the policy check throws `AuthorizationException`, which Laravel converts to 403 by default. We override this in `app/Exceptions/Handler.php`:

```php
public function register(): void
{
    $this->renderable(function (AuthorizationException $e, Request $request) {
        if ($request->expectsJson()) {
            return response()->json(['error' => 'forbidden'], 403);
        }
        abort(404);
    });
}
```

**Why this is worth the complexity:** It's a small change with a real security benefit. It's also the kind of detail a senior engineer notices.

---

## 5. Cheat Mitigation — The Full Picture

The core concern: how do we prevent users from seeing card answers before they attempt recall?

**Truth:** We can't prevent it fully. In a browser, anything the client can display can be inspected via DevTools. The goal is to make casual cheating _inconvenient_ and to remove incentives for cheating.

### 5.1 Layer 1 — Answers Not in Initial Payload

When `GET /decks/{deck}/study` renders the study page, the Inertia props contain only:

```php
Inertia::render('Study/Session', [
    'deck' => $deck->only('id', 'name'),
    'card' => [
        'id' => $card->id,
        'front' => $card->front,
        // back and explanation deliberately excluded
    ],
    'progress' => ['current' => 1, 'total' => 20],
]);
```

The `back` and `explanation` fields are **never** included in the page load. This means:

- Viewing the page source reveals nothing.
- The initial HTML/JSON response has no answers.
- DevTools Network tab on the initial load shows no answers.

### 5.2 Layer 2 — Answers Fetched On-Demand

The answer arrives only when the user clicks "Show answer":

```
GET /api/v1/cards/{card}/answer
Authorization: Bearer <sanctum-token>
```

Returns:

```json
{
  "back": "1/x",
  "explanation": "The derivative of the natural logarithm is the reciprocal of its argument."
}
```

This endpoint:

- Requires a valid Sanctum token.
- Runs `CardPolicy@view`.
- Is rate-limited (60/min per user).

**DevTools is still visible.** A determined user can open the Network tab and see the response. But:

- They have to actively click "Show answer" first.
- They have to know to look.
- The rate limit prevents bulk scraping.

### 5.3 Layer 3 — Rate Limit the Answer Endpoint

60 requests per minute per user. Enough for legitimate study (a fast user might hit 15–20 cards per minute). Not enough to scrape a 10,000-card deck in a reasonable time.

**What the rate limit doesn't stop:** A patient attacker with a script that fetches one answer every second. But at that rate, they're spending more time than just studying.

### 5.4 Layer 4 — No Leaderboards, No Scores

The highest-leverage defense: **there's nothing to gain from cheating.**

TOTES doesn't have:

- Leaderboards
- Public scores
- Comparison with other users
- Unlockables
- Any competitive element

Cheating in TOTES only hurts the user. If they scrape answers, they don't learn the material, and their session analysis will be inaccurate. There is no extrinsic reward.

**This is why section 8.6 of [`04-features.md`](04-features.md) codifies "no scores" as a voice rule.** It's not just about tone — it's a security decision.

### 5.5 What We Deliberately Don't Do

| Technique                     | Why we skip it                                           |
| ----------------------------- | -------------------------------------------------------- |
| Obfuscating answer text       | Security theater. Anyone reading the JS can decode it.   |
| Detecting DevTools open       | Brittle. False positives. Annoying for legitimate users. |
| Preventing right-click / copy | User-hostile. Trivial to bypass.                         |
| Anti-debugging code           | Escalating arms race. Pointless for a portfolio app.     |

**Documented in the README:** "Answers are fetched on-demand and not embedded in initial payloads. Determined users with DevTools can still inspect network requests — this is a fundamental web limitation."

That sentence is the senior-engineer move. It says: "I know exactly what my mitigation does and doesn't do."

---

## 6. Token Storage — The Full Tradeoff

Where should the Sanctum token live in the browser?

| Storage                     | XSS Risk                    | UX                          | Complexity                        |
| --------------------------- | --------------------------- | --------------------------- | --------------------------------- |
| **localStorage**            | High — any script reads it  | Survives reload             | Low                               |
| **sessionStorage**          | Medium — persists per tab   | Survives reload in same tab | Low                               |
| **In-memory (JS variable)** | Low — no persistent storage | Lost on reload              | Medium — must re-mint             |
| **httpOnly cookie**         | Lowest — JS can't read      | Survives reload             | High — requires CORS, CSRF config |

**TOTES uses in-memory storage.**

Reasons:

- **XSS resistance.** A script injection can't read a variable that doesn't exist outside the React runtime. Even if XSS occurs, the token isn't persistent.
- **Bounded exposure.** The token exists only while the SPA is running. Closing the tab discards it.
- **The UX cost is small.** On reload, the SPA calls `POST /api/v1/tokens` once (session-cookie authenticated) to mint a fresh token. That's one extra request per page reload — imperceptible.

**Why not httpOnly cookies:** They'd require CORS + Sanctum's SPA authentication mode, which adds significant configuration and reduces the API's "API-ness" (a pure REST API with cookie auth is unusual). We're keeping the API as a token-auth API.

**Documented in ADR 0001** as a deliberate security-vs-complexity tradeoff.

---

## 7. CSRF

**Web routes:** Protected by Laravel's default `VerifyCsrfToken` middleware. Every POST/PUT/PATCH/DELETE from Inertia includes the CSRF token, which is read from the `XSRF-TOKEN` cookie automatically.

**API routes:** No CSRF. Stateless, token-authenticated. CSRF is a session-cookie attack; since the API uses bearer tokens, CSRF doesn't apply.

**Why this split is safe:** The web layer's state changes are CSRF-protected. The API layer's state changes require a bearer token, which a malicious cross-origin request can't forge.

---

## 8. XSS

TOTES's primary XSS defenses:

1. **React escapes by default.** Any user content rendered in JSX is HTML-escaped unless `dangerouslySetInnerHTML` is used. We never use it.
2. **No raw HTML rendering.** Flashcard content (front, back, explanation) is rendered as text, not markup.
3. **Content Security Policy** (production only). Adds a `Content-Security-Policy` header restricting script sources. See §11.
4. **Token storage in memory.** Even if XSS occurs, no long-lived credential is available in `localStorage`.

**What XSS could still do if injected:** Read the in-memory token, make authenticated requests on the user's behalf. But the attack window is limited by the tab's lifetime and the token's in-memory nature.

**User content validation:** Card fronts, backs, and explanations are validated as `string` in Form Requests. Length caps prevent denial-of-service via giant payloads. No HTML is stripped — because we never render it as HTML, stripping isn't needed.

---

## 9. SQL Injection

**Not a concern** — Laravel's Eloquent ORM uses parameterized queries by default. Raw SQL is used nowhere in TOTES. Every query goes through Eloquent or the query builder, both of which bind parameters.

**Rule for future work:** If raw SQL is ever added, it must use bindings. No string interpolation in queries.

---

## 10. Mass Assignment

**Protected by `$fillable`.** Every Eloquent model explicitly declares which attributes can be mass-assigned:

```php
// Deck.php
protected $fillable = ['name', 'description', 'icon', 'color', 'shuffle_default'];

// Card.php
protected $fillable = ['deck_id', 'front', 'back', 'explanation'];
```

**Critical detail:** `user_id` on `Deck` and `deck_id` on `Card` are **not** in `$fillable`. They're set explicitly by the controller from the authenticated context:

```php
$deck = $user->decks()->create($request->validated());
$card = $deck->cards()->create($request->validated());
```

This means a client can't submit `user_id: 999` and create a deck owned by someone else.

---

## 11. Headers (Production Only)

In production, TOTES sets these HTTP headers. They're configured at Railway's edge (preferred, since TLS terminates there). If Railway's config fails or we migrate hosts, a Laravel middleware fallback is documented in 09-deployment.md.

| Header                      | Value                                      | Purpose                       |
| --------------------------- | ------------------------------------------ | ----------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`      | Force HTTPS for 1 year        |
| `X-Content-Type-Options`    | `nosniff`                                  | Prevent MIME sniffing         |
| `X-Frame-Options`           | `DENY`                                     | Prevent clickjacking          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`          | Limit referrer leakage        |
| `Content-Security-Policy`   | See below                                  | Restrict script/asset sources |
| `Permissions-Policy`        | `geolocation=(), microphone=(), camera=()` | Disable unused browser APIs   |

**CSP policy (initial):**

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://api.iconify.design;
connect-src 'self';
font-src 'self';
```

**Note:** `'unsafe-inline'` for scripts and styles is required by Vite's build output in some configurations. If we can remove it in a later pass, we will. Documented as a TODO.

**Iconify CDN:** `img-src` must allow `https://api.iconify.design` because the icon picker fetches icon SVGs on-demand.

---

## 12. Secrets Management

| Secret           | Storage                                  | Notes                                                       |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `APP_KEY`        | `.env`                                   | Laravel's encryption key. Never changes after first deploy. |
| `DB_PASSWORD`    | `.env`                                   | Never committed.                                            |
| `GROQ_API_KEY`   | `.env`                                   | Server-side only. Never exposed to the client.              |
| `RESEND_API_KEY` | `.env`                                   | Server-side only.                                           |
| Sanctum tokens   | Hashed in `personal_access_tokens` table | Not in `.env`.                                              |

**`.env` is never committed.** `.env.example` contains placeholder values only. The `README.md` documents how to obtain each key.

**Rotation:** In a real production scenario, all keys would be rotatable. Documented in [`11-future-work.md`](11-future-work.md) as a v2 improvement.

---

## 13. Logging & Monitoring

**What's logged:**

- Authentication events (login, logout, failed login attempts).
- AI exceptions (with truncated response bodies, user ID, operation).
- Validation failures on API endpoints (informational).
- 500-level exceptions (full stack trace in dev, truncated in production).

**What's NOT logged:**

- Passwords, ever.
- Full request bodies containing user content (flashcard text).
- API tokens (even hashed, they're never logged).
- Session IDs.

**Where logs go:** Laravel's default — `storage/logs/laravel.log` locally, stdout in production (Railway captures it).

**Not in scope for v1:** Centralized logging, error tracking (Sentry), alerting. Documented in [`11-future-work.md`](11-future-work.md).

---

## 14. What Security Is NOT In Scope

Documented explicitly:

- **Two-factor authentication.** v2.
- **OAuth / social login.** v2.
- **API rate limiting by IP.** Only by user and by endpoint. IP-based limits are easy to defeat with proxies; not worth the complexity for a portfolio app.
- **Encryption at rest.** Depends entirely on the hosting provider (Railway encrypts its volumes). Not implemented in the app.
- **Audit logs.** v2.
- **Penetration testing.** Out of scope for a 9-day build.
- **GDPR/CCPA compliance tooling.** Out of scope.

---

## 15. Security Checklist (For Reviewers)

A quick summary of what TOTES does:

- [x] Passwords hashed with Bcrypt
- [x] Session cookies are HttpOnly + Secure + SameSite=Lax
- [x] CSRF protection on all web state-changing routes
- [x] API tokens stored hashed server-side, in-memory client-side
- [x] Authorization enforced by policies on every resource
- [x] 404 (not 403) for unauthorized web access — no resource enumeration
- [x] Answers fetched on-demand, never in initial payload
- [x] Rate limiting on login, register, AI generation, and answer fetching
- [x] Mass-assignment protection via `$fillable`
- [x] SQL injection prevented via Eloquent's parameterized queries
- [x] XSS prevented via React's default escaping
- [x] Security headers (HSTS, CSP, X-Frame-Options, etc.) in production
- [x] Secrets in `.env`, never committed
- [x] No scores or leaderboards — no extrinsic motivation to cheat

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — where auth and policies fit in the request lifecycle
- **Database Schema** ([`03-database-schema.md`](03-database-schema.md) — the `personal_access_tokens` table and cascade behavior
- **Features** ([`04-features.md`](04-features.md)) — the study mode flow that the cheat mitigation protects
- **API & Routes** ([`07-api-and-routes.md`](07-api-and-routes.md)) — the endpoints these defenses apply to
- **Future Work** ([`11-future-work.md`](11-future-work.md)) — 2FA, OAuth, audit logs, and other deferred security features
