# 03 — Database Schema

> This document defines every table, column, relationship, and index in TOTES. It's the single source of truth for the database. When code and this doc disagree, one of them is wrong — fix both in the same commit.

---

## Overview

TOTES has **four tables**:

| Table         | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `users`       | Accounts (Breeze-provided + our custom `theme` column) |
| `decks`       | A user's collection of flashcards, grouped by subject  |
| `cards`       | Individual flashcards with SM-2 scheduling state       |
| `review_logs` | Immutable history of every review rating               |

Plus Laravel's default tables: `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `personal_access_tokens` (Sanctum). These are framework-managed and not detailed here.

### Entity Relationships

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
│ users │──1:N───▶│ decks │──1:N───▶│ cards │──1:N───▶│ review_logs │
└─────────┘ └─────────┘ └─────────┘ └──────────────┘
│ ▲
│ │
└──────────────────────1:N───────────────────────────────────┘
(users also have many review_logs)
```

- A **user** has many decks.
- A **deck** belongs to one user, and has many cards.
- A **card** belongs to one deck, and has many review logs.
- A **review log** belongs to one card and one user.

All foreign keys use `cascadeOnDelete()`. Deleting a user deletes their decks, cards, and logs. Deleting a deck deletes its cards and their logs. No orphaned rows, ever.

---

## Table: `users`

Provided by Laravel Breeze, with one custom column.

| Column              | Type              | Constraints                  | Notes                                                |
| ------------------- | ----------------- | ---------------------------- | ---------------------------------------------------- |
| `id`                | `bigint unsigned` | PK, auto-increment           |                                                      |
| `name`              | `varchar(255)`    | NOT NULL                     |                                                      |
| `email`             | `varchar(255)`    | NOT NULL, UNIQUE             |                                                      |
| `email_verified_at` | `timestamp`       | NULLABLE                     |                                                      |
| `password`          | `varchar(255)`    | NOT NULL                     | Bcrypt-hashed                                        |
| `theme`             | `varchar(20)`     | NOT NULL, DEFAULT `'system'` | **Custom column.** Values: `system`, `light`, `dark` |
| `remember_token`    | `varchar(100)`    | NULLABLE                     |                                                      |
| `created_at`        | `timestamp`       | NULLABLE                     |                                                      |
| `updated_at`        | `timestamp`       | NULLABLE                     |                                                      |

**Why `theme` lives on the user:** So the preference syncs across devices. The frontend also stores it in `localStorage` for instant application on page load (avoiding a flash of the wrong theme). The DB is the source of truth; localStorage is a cache.

**Why `varchar(20)` for `theme`:** Enough room for the three values plus future expansion (e.g., `"high-contrast"`). Could be an `enum`, but enums in MySQL are painful to migrate. Strings are fine, validated at the application layer.

---

## Table: `decks`

| Column            | Type              | Constraints                                      | Notes                     |
| ----------------- | ----------------- | ------------------------------------------------ | ------------------------- |
| `id`              | `bigint unsigned` | PK, auto-increment                               |                           |
| `user_id`         | `bigint unsigned` | FK → `users.id`, NOT NULL, `cascadeOnDelete`     | Owner                     |
| `name`            | `varchar(255)`    | NOT NULL                                         |                           |
| `description`     | `text`            | NULLABLE                                         | Optional                  |
| `icon`            | `varchar(100)`    | NOT NULL, DEFAULT `'mdi:book-open-page-variant'` | Iconify identifier        |
| `color`           | `varchar(20)`     | NOT NULL, DEFAULT `'blue'`                       | Palette name, not a class |
| `shuffle_default` | `boolean`         | NOT NULL, DEFAULT `true`                         | Per-deck study preference |
| `created_at`      | `timestamp`       | NULLABLE                                         |                           |
| `updated_at`      | `timestamp`       | NULLABLE                                         |                           |

**Indexes:**

- `INDEX (user_id, created_at)` — powers "my decks, newest first."

**Why `icon` stores a string, not an SVG:** Iconify identifiers like `mdi:atom` are rendered client-side by `@iconify/react`. Storing the identifier keeps the DB small, allows icon swaps without migrations, and avoids XSS risk from user-supplied SVG markup.

**Why `color` stores a name, not a Tailwind class:** The frontend maps `color: "blue"` to `bg-blue-100 dark:bg-blue-900/30` via `lib/deckColors.ts`. If we stored the class string and later wanted to change the shade, we'd have to migrate every row. Storing the name means the mapping lives in one file.

**Why `shuffle_default` is per-deck, not per-user:** A language vocabulary deck might benefit from shuffle; a sequential math curriculum deck might not. Per-deck matches how users think about study material.

---

## Table: `cards`

| Column             | Type              | Constraints                                  | Notes                       |
| ------------------ | ----------------- | -------------------------------------------- | --------------------------- |
| `id`               | `bigint unsigned` | PK, auto-increment                           |                             |
| `deck_id`          | `bigint unsigned` | FK → `decks.id`, NOT NULL, `cascadeOnDelete` | Parent deck                 |
| `front`            | `text`            | NOT NULL                                     | The question / prompt       |
| `back`             | `text`            | NOT NULL                                     | The answer                  |
| `explanation`      | `text`            | NULLABLE                                     | "Why this is the answer"    |
| `ease_factor`      | `float`           | NOT NULL, DEFAULT `2.5`                      | SM-2 variable               |
| `interval`         | `integer`         | NOT NULL, DEFAULT `0`                        | Days until next review      |
| `repetitions`      | `integer`         | NOT NULL, DEFAULT `0`                        | Consecutive correct recalls |
| `due_at`           | `timestamp`       | NULLABLE                                     | Next scheduled review       |
| `last_reviewed_at` | `timestamp`       | NULLABLE                                     | For history / analysis      |
| `created_at`       | `timestamp`       | NULLABLE                                     |                             |
| `updated_at`       | `timestamp`       | NULLABLE                                     |                             |

**Indexes:**

- `INDEX (deck_id, due_at)` — powers "cards due in this deck."

**Why `text` for `front`, `back`, `explanation`:** Flashcards can hold paragraphs. `varchar(255)` would truncate. `text` allows up to 65,535 bytes. If we ever need more, `mediumText` is a one-line migration.

**Why `explanation` is NULLABLE:** Manually-created cards don't require it. AI-generated cards always have it. Nullable lets both coexist without forcing users to write an explanation they don't have.

**Why the SM-2 columns live on the card, not a separate `card_schedules` table:** A separate table would be normalized further, but it would add a join to every study query. For 95% of use cases, the scheduling state is _part of the card_. The `review_logs` table holds the history; the card holds the _current_ state. This is the standard pattern in SRS apps.

**Why `ease_factor` is `float` and not `decimal`:** SM-2's math involves multiplication that doesn't need exact decimal precision. `float` is fine and faster. Default `2.5` matches the SM-2 spec.

**Why `interval` is in days, not seconds or hours:** SM-2 is a day-granular algorithm. Storing seconds would be over-engineering. If we ever support sub-day intervals (for "again" on new cards), we can compute it at runtime from `repetitions` and `due_at`.

---

## Table: `review_logs`

| Column            | Type              | Constraints                                  | Notes                           |
| ----------------- | ----------------- | -------------------------------------------- | ------------------------------- |
| `id`              | `bigint unsigned` | PK, auto-increment                           |                                 |
| `card_id`         | `bigint unsigned` | FK → `cards.id`, NOT NULL, `cascadeOnDelete` |                                 |
| `user_id`         | `bigint unsigned` | FK → `users.id`, NOT NULL, `cascadeOnDelete` |                                 |
| `rating`          | `varchar(10)`     | NOT NULL                                     | `again`, `hard`, `good`, `easy` |
| `interval_before` | `integer`         | NOT NULL                                     | For before/after analysis       |
| `interval_after`  | `integer`         | NOT NULL                                     |                                 |
| `reviewed_at`     | `timestamp`       | NOT NULL                                     | When the review happened        |
| `created_at`      | `timestamp`       | NULLABLE                                     |                                 |
| `updated_at`      | `timestamp`       | NULLABLE                                     |                                 |

**Indexes:**

- `INDEX (user_id, reviewed_at)` — powers "my recent reviews" and session analysis queries.

**Why a separate log table instead of just trusting card state:** The card holds _current_ state. The log holds _history_. The end-of-session AI analysis needs history: "What did the user struggle with _this session_?" Without logs, that query is impossible. Logs also enable future features (streaks, charts, retention curves) without schema changes.

**Why `rating` is a string, not an enum:** Strings are more portable and easier to extend. The values are validated at the application layer via a PHP enum (`App\Services\SpacedRepetition\ReviewRating`).

**Why store `interval_before` and `interval_after`:** It makes the log self-contained. If SM-2's implementation ever changes, the log still explains what happened. Debugging is much easier when the before/after is visible.

**Why `reviewed_at` is separate from `created_at`:** Normally they'd be the same. But separating them means we can import historical reviews later (e.g., from Anki) with their original timestamps, without lying about when the row was created. Small thing, but it's the correct design.

---

## Cascade Behavior — A Worked Example

Suppose:

- User A has Deck "Physics"
- Deck "Physics" has 30 cards
- Card #5 has been reviewed 12 times

Now User A deletes their account:

```
DELETE FROM users WHERE id = A;
├── Cascades to decks WHERE user_id = A
│ ├── Cascades to cards WHERE deck_id IN (...)
│ │ └── Cascades to review_logs WHERE card_id IN (...)
│ └── (also) review_logs WHERE user_id = A directly
```

All 30 cards and 12×30 = 360 (or however many) log rows are removed. No orphans. No manual cleanup.

Now suppose User A deletes just Deck "Physics" but keeps their account:

- The 30 cards are deleted.
- Their review logs are deleted (via card cascade).
- But logs for cards in _other_ decks remain, because those cards remain.
- The `user_id` foreign key on `review_logs` keeps the user association intact for the remaining logs.

This is exactly the behavior we want. Laravel's `cascadeOnDelete()` handles it at the database level — no application code needed.

---

## Migrations Order

Migrations must run in dependency order. This is the order they'll be created:

1. `0001_01_01_000000_create_users_table` (Breeze-provided)
2. `0001_01_01_000001_create_cache_table` (Breeze-provided)
3. `0001_01_01_000002_create_jobs_table` (Breeze-provided)
4. `xxxx_add_theme_to_users_table` (our addition)
5. `xxxx_create_decks_table`
6. `xxxx_create_cards_table`
7. `xxxx_create_review_logs_table`
8. `xxxx_create_ai_usage_logs_table` (see below)
9. Sanctum's `create_personal_access_tokens_table` (published on install)

**Why the order matters:** You can't create `cards` before `decks`, because `cards` has a foreign key to `decks`. Laravel timestamps the migration filenames, so it runs them in order.

---

## Table: `ai_usage_logs`

One more table we haven't discussed yet. It tracks AI usage per user for the daily rate limit.

| Column          | Type              | Constraints                                  | Notes                               |
| --------------- | ----------------- | -------------------------------------------- | ----------------------------------- |
| `id`            | `bigint unsigned` | PK, auto-increment                           |                                     |
| `user_id`       | `bigint unsigned` | FK → `users.id`, NOT NULL, `cascadeOnDelete` |                                     |
| `operation`     | `varchar(30)`     | NOT NULL                                     | `generate_cards`, `analyze_session` |
| `input_chars`   | `integer`         | NOT NULL                                     | For cost estimation                 |
| `output_tokens` | `integer`         | NULLABLE                                     | If the provider returns it          |
| `created_at`    | `timestamp`       | NOT NULL                                     |                                     |

**Indexes:**

- `INDEX (user_id, created_at)` — powers the "how many generations has this user made today?" query.

**Why a separate table:** The daily cap is enforced by counting rows where `user_id = X AND created_at >= today`. If we stored this elsewhere, we'd be abusing a generic log. A dedicated table is cleaner and lets us add columns later (cost in cents, model used, latency) without polluting other tables.

**Why no `updated_at`:** AI usage is append-only. Once a row is written, it never changes. Including `updated_at` would imply mutation is possible, which it isn't.

---

## Data Types — Quick Reference

Why each type was chosen, in one table:

| Type              | Used For                        | Why Not Something Else                                               |
| ----------------- | ------------------------------- | -------------------------------------------------------------------- |
| `bigint unsigned` | All IDs                         | Matches Laravel's default. `int` would work but limits future scale. |
| `varchar(N)`      | Short strings with a known max  | Smaller than `text` for indexed columns.                             |
| `text`            | Flashcard content, descriptions | Allows paragraphs. `varchar(255)` truncates.                         |
| `integer`         | Counts, intervals               | Standard.                                                            |
| `float`           | `ease_factor`                   | SM-2 math doesn't need exact decimal precision.                      |
| `boolean`         | `shuffle_default`               | MySQL stores as `tinyint(1)`. Readable.                              |
| `timestamp`       | All dates                       | Laravel's default. Timezone-aware.                                   |

---

## Conventions

These are the rules every migration in TOTES follows:

1. **Singular table names, snake_case, plural for collection.** `decks`, not `Deck`. Laravel's default.
2. **`id` is the primary key on every table.** No composite keys.
3. **Foreign keys are `{singular_table}_id`.** `user_id`, `deck_id`, `card_id`.
4. **Cascade delete on all FKs.** We never want orphaned rows.
5. **Timestamps (`created_at`, `updated_at`) on every table** unless the table is append-only (see `ai_usage_logs`).
6. **No soft deletes.** If a user deletes a card, it's gone. Soft deletes complicate queries and we don't have a product requirement for recovery.
7. **No JSON columns for core data.** JSON columns are fine for metadata (`deck.settings` in a future version), but anything queryable lives in its own column or table.

---

## What's Deliberately Missing (and Why)

| Missing                               | Why Not In V1                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `deck_tags` / `card_tags`             | Tagging is a feature, not a schema requirement. Deferred to v2.                             |
| `shared_decks` / `deck_collaborators` | Collaboration is out of scope.                                                              |
| `deck_settings` (JSON)                | The only setting we have is `shuffle_default`. If more appear, promote it to a JSON column. |
| `card_media`                          | Image/video attachments are out of scope.                                                   |
| `email_preferences`                   | No emails sent in v1 beyond Laravel's defaults.                                             |
| `streak_history`                      | Streaks can be computed from `review_logs`. No separate table needed.                       |

Every one of these is documented in [`11-future-work.md`](11-future-work.md) with the reasoning above.

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — how these tables fit into the request lifecycle
- **Features** ([`04-features.md`](04-features.md)) — what behaviors these tables power
- **Spaced Repetition** ([`06-spaced-repetition.md`](06-spaced-repetition.md)) — how the SM-2 columns on `cards` are used
- **Security** ([`08-security.md`](08-security.md)) — how foreign keys and cascades enforce data isolation
