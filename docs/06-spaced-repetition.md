# 06 — Spaced Repetition

> This document defines how TOTES schedules card reviews. It covers the SM-2 algorithm, the learning steps used for new cards, the exact math for each rating, and the edge cases. It's the reference for `app/Services/SpacedRepetition/`.

**Core principle:** Scheduling is deterministic math. AI does not decide when cards are due. This makes the schedule testable, predictable, and independent of any external service.

---

## Why Spaced Repetition

The **spacing effect** is one of the most replicated findings in cognitive psychology: information reviewed at increasing intervals is retained far better than information reviewed in a single sitting. This is the difference between _cramming_ (short-term recall, fast decay) and _spaced repetition_ (long-term retention).

TOTES implements this with two mechanisms:

1. **Learning steps** — short, minute-based intervals for brand-new cards.
2. **SM-2** — the long-term day-based scheduler, applied once a card has been reviewed a few times.

Both write to the same `cards` table. The distinction is _which_ algorithm runs, decided by the card's `repetitions` count.

---

## The Two Phases

Every card moves through two phases over its lifetime:

```
Phase 1: Learning Steps              Phase 2: SM-2 Long-Term
(short intervals, minutes)            (long intervals, days)
────────────────────────              ──────────────────────
New card                              After 2 repetitions
repetitions: 0 → 1 → 2                repetitions: 2, 3, 4, ...
interval: minutes                     interval: days
ease_factor: unused                   ease_factor: drives growth
```

**The transition:** when a card's `repetitions` reaches 2, it graduates to SM-2. From that point on, intervals are in days and grow according to the SM-2 formula.

**Why two phases:** SM-2's day-based math is not suited for a card the user saw 30 seconds ago and forgot. Learning steps handle that — a "Again" on a new card means "show it again in 1 minute," not "show it again tomorrow." This matches how Anki (the reference implementation) behaves, and it's what makes sessions feel right.

---

## Phase 1: Learning Steps

A card is in the learning phase when `repetitions < 2`.

### Rating → Next Interval

| Rating | `repetitions` change  | Next `due_at`                                         |
| ------ | --------------------- | ----------------------------------------------------- |
| Again  | reset to `0`          | `now() + 1 minute`                                    |
| Hard   | `+1`                  | `now() + 5 minutes`                                   |
| Good   | `+1`                  | `now() + 10 minutes`                                  |
| Easy   | set to `2` (graduate) | `now() + 4 days`, `interval = 4`, `ease_factor = 2.5` |

**Notes:**

- **"Again" resets `repetitions` to 0.** This is intentional. If the user forgot a card they just saw, the card is not "learned." It restarts the learning sequence.
- **"Hard" and "Good" advance by one.** After two of these in a row, the card graduates.
- **"Easy" graduates immediately.** A user who marks a brand-new card "Easy" is signaling they already know it. Skipping the learning steps respects that.
- **`ease_factor` is not modified during learning.** It stays at its default (2.5) until the card enters SM-2. This keeps the transition clean.

### Worked Example: A New Card Through Learning

User creates card, `repetitions = 0`, `due_at = now()`.

| Step | User action                | repetitions | interval                        | due_at    |
| ---- | -------------------------- | ----------- | ------------------------------- | --------- |
| 1    | Card appears               | 0           | 0                               | now       |
| 2    | Rates Again                | 0 (reset)   | 0                               | now + 1m  |
| 3    | Card reappears             | 0           | 0                               | —         |
| 4    | Rates Good                 | 1           | 0                               | now + 10m |
| 5    | Card reappears             | 1           | 0                               | —         |
| 6    | Rates Good                 | **2**       | 0                               | now + 10m |
| 7    | Card reappears (graduated) | 2           | 4 (SM-2 applies on next rating) | —         |

**Important:** The `interval` column stays at `0` during learning. Only when SM-2 runs does `interval` become a day count. The `due_at` timestamp is what actually drives the schedule.

---

## Phase 2: SM-2 Long-Term Scheduling

A card is in the SM-2 phase when `repetitions >= 2`.

### The Algorithm

The SM-2 algorithm uses two values to compute the next interval:

- **`ease_factor` (`EF`)** — starts at `2.5`, adjusted per review based on how the user rated the card. Higher EF = intervals grow faster.
- **`interval` (`I`)** — the previous interval in days. Starts at `4` (the "Easy graduation" value) or the value set when the card graduated from learning.

### The Rating Scale

SM-2 uses a 0–5 scale. TOTES maps our four ratings onto it:

| TOTES rating | SM-2 quality (`q`) |
| ------------ | ------------------ |
| Again        | `2`                |
| Hard         | `3`                |
| Good         | `4`                |
| Easy         | `5`                |

**Why these mappings:**

- SM-2's original spec says `q < 3` is a failure. Our "Again" (`q = 2`) triggers that failure path — interval resets.
- "Hard" (`q = 3`) is the pass threshold. Minimum passing grade.
- "Good" (`q = 4`) is the default successful review.
- "Easy" (`q = 5`) is the highest quality, growing intervals fastest.

### The Math

For each SM-2 review, given the user's rating `q` and the card's current `EF`, `I`, and `repetitions`:

**Step 1: Update ease factor.**

```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
```

Minimum EF is `1.3`. If `EF' < 1.3`, clamp it to `1.3`.

**Step 2: Update repetitions.**

| Condition                   | `repetitions` |
| --------------------------- | ------------- |
| `q < 3` (Again)             | reset to `0`  |
| `q >= 3` (Hard, Good, Easy) | `+1`          |

**Step 3: Update interval.**

| Condition          | `interval`       |
| ------------------ | ---------------- |
| `q < 3`            | reset to `1`     |
| `repetitions == 1` | `1`              |
| `repetitions == 2` | `6`              |
| `repetitions > 2`  | `round(I * EF')` |

**Step 4: Compute `due_at`.**

```
due_at = now() + interval days
```

**Step 5: Save.**

Persist `ease_factor`, `interval`, `repetitions`, `due_at`, `last_reviewed_at`.

### Worked Example: A Graduated Card Through SM-2

Card graduates with `EF = 2.5`, `I = 4`, `repetitions = 2`.

| Review | Rating | q   | EF before | EF after | Reps before | Reps after | I before | I after                  | Next due  |
| ------ | ------ | --- | --------- | -------- | ----------- | ---------- | -------- | ------------------------ | --------- |
| 1      | Good   | 4   | 2.5       | 2.5      | 2           | 3          | 4        | `round(4 * 2.5) = 10`    | +10 days  |
| 2      | Good   | 4   | 2.5       | 2.5      | 3           | 4          | 10       | `round(10 * 2.5) = 25`   | +25 days  |
| 3      | Hard   | 3   | 2.5       | 2.36     | 4           | 5          | 25       | `round(25 * 2.36) = 59`  | +59 days  |
| 4      | Good   | 4   | 2.36      | 2.36     | 5           | 6          | 59       | `round(59 * 2.36) = 139` | +139 days |
| 5      | Again  | 2   | 2.36      | 1.96     | 6           | **0**      | 139      | **1**                    | +1 day    |
| 6      | Good   | 4   | 1.96      | 1.96     | 0→1         | 1          | 1        | **1**                    | +1 day    |
| 7      | Good   | 4   | 1.96      | 1.96     | 1→2         | 2          | 1        | **6**                    | +6 days   |

**Observations:**

- Intervals grow multiplicatively. That's the "spacing" in spaced repetition.
- One "Again" resets repetitions and interval. The user has to rebuild the schedule. That's the cost of forgetting — and it's correct.
- EF drifts down slowly after Hard ratings, up slowly after Easy ones. The default (2.5) is a "neutral" rating (Good).

### EF Adjustment Table (For Reference)

Every rating's effect on EF, given a starting EF of `2.5`:

| Rating | q   | EF change | EF after |
| ------ | --- | --------- | -------- |
| Again  | 2   | `-0.54`   | 1.96     |
| Hard   | 3   | `-0.14`   | 2.36     |
| Good   | 4   | `0`       | 2.50     |
| Easy   | 5   | `+0.10`   | 2.60     |

**Notice:** "Good" is neutral. It leaves EF alone. This is by design — a "Good" review means the card is at the right difficulty. Only sustained "Easy" ratings speed up intervals, and only "Hard"/"Again" slow them down.

---

## How Learning and SM-2 Connect

The scheduler's entry point is `Sm2Scheduler::apply(Card $card, ReviewRating $rating)`.

```php
public function apply(Card $card, ReviewRating $rating): void
{
    if ($card->repetitions < 2) {
        $this->applyLearningStep($card, $rating);
    } else {
        $this->applySm2($card, $rating);
    }

    $card->last_reviewed_at = now();
    $card->save();
}
```

The controller that handles a review posts to `POST /api/v1/cards/{card}/review`, which:

1. Authorizes the request (the card belongs to a deck the user owns).
2. Calls `Sm2Scheduler::apply()`.
3. Writes a `review_logs` row with `interval_before` and `interval_after`.
4. Returns the updated card state.

**The log is written every time.** Even "Again" ratings are logged. The end-of-session analysis depends on this history.

---

## Edge Cases

### Case 1: A card reviewed twice in the same minute

Cannot happen in normal use — the study flow advances to the next card after each rating. But if a user mashes the rating button, the second request could arrive while the first is still saving.

**Handling:** The rating request is idempotent per second. If a duplicate request arrives within 1 second of the previous one for the same card, ignore it. This is enforced in the controller via a short cache lock (`Cache::lock("review:{$card->id}", 1)`).

### Case 2: A card rated "Again" during learning, then rated "Again" again

The interval stays at 1 minute. `repetitions` stays at 0. The card will keep coming back until the user rates it "Hard", "Good", or "Easy".

**This is correct behavior.** If the user genuinely doesn't know a card, showing it every minute until they get it right is the point.

### Case 3: A card's `interval` grows beyond a year

After many successful reviews, `I * EF` can exceed 365. This is fine — the card is genuinely learned. Cap at `365 * 5 = 1825 days` (5 years) as a sanity limit. Beyond that, the card is effectively retired.

### Case 4: A user rates "Easy" on a card that's been rated "Again" 5 times

The card jumps to SM-2 with `interval = 4` days. It will come back after 4 days.

**Is this a bug?** No. The user is telling us they know it. Respect that. If they're wrong, the card will rate "Again" again, and the cycle restarts.

### Case 4b: "Again" on a long-term card — the redemption loop

When a card in SM-2 is rated "Again," it re-enters the learning phase:

- `repetitions` → 0
- `interval` → 1
- `due_at` → `now() + 1 minute`

If the user is still studying, the card will reappear in the same session once
its due time has passed (usually within 2–5 minutes, depending on how many other
cards are in the queue). If the session ends before the 1-minute mark, the card
appears at the top of the next session's queue.

This is the "redemption loop" — the user gets another chance at the card before
it sinks into long-term scheduling. It matches the behavior of Quizizz, Anki,
and every modern SRS: a wrong answer means immediate retry, not a week away.

### Case 5: A card's `ease_factor` bottoms out at 1.3

If EF clamps at 1.3, intervals grow very slowly (by ~30% per review). This is a card the user genuinely struggles with. It stays in frequent rotation. That's the algorithm working correctly.

---

## Storage

All scheduling state lives on the `cards` table:

| Column             | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `ease_factor`      | SM-2 EF. Float. Default 2.5. Min 1.3.                         |
| `interval`         | Days until next review. Integer. Default 0 (during learning). |
| `repetitions`      | Consecutive successful reviews. Integer. Default 0.           |
| `due_at`           | Timestamp of next scheduled review.                           |
| `last_reviewed_at` | Timestamp of the most recent review.                          |

No separate table. No JSON column. These five columns are queried together on every study session — keeping them on the card avoids a join.

History lives in `review_logs`, which records `interval_before`, `interval_after`, and `rating` for every review. The card holds _current_ state; the log holds _history_.

---

## Querying Due Cards

The study session needs all cards in a deck where `due_at <= now()`. The query:

```php
$dueCards = $deck->cards()
    ->where('due_at', '<=', now())
    ->orWhereNull('due_at')
    ->orderBy('due_at')
    ->get();
```

`orWhereNull('due_at')` handles cards that were just created and haven't been scheduled yet. In practice, new cards are created with `due_at = now()`, so this clause is defensive.

**With shuffle enabled:**

```php
$dueCards = $dueCards->shuffle();
```

This runs in PHP after the query, not in MySQL. `ORDER BY RAND()` on a large table is slow, and our due-card sets are small (dozens, not thousands).

**Index used:** `(deck_id, due_at)` — added in the `cards` migration.

---

## Session Flow — How the Scheduler Is Invoked

A full study session:

```
1. GET /decks/{deck}/study
   → Server fetches due cards
   → Renders Study/Session with the FIRST card only (no back, no explanation)

2. User clicks "Show answer"
   → GET /api/v1/cards/{card}/answer
   → Returns { back, explanation }

3. User rates
   → POST /api/v1/cards/{card}/review  { rating: "good" }
   → Controller calls Sm2Scheduler::apply(card, rating)
   → Scheduler updates card, writes review log
   → Response includes updated card + session progress

4. Client advances to next card
   → If more cards due: display next front
   → If no more due: navigate to session summary

5. Session summary
   → GET /api/v1/sessions/{reviewLogIds}/summary  (or client-side)
   → Displays stats
   → Optional "Analyze this session" calls AI
```

Note that the _card's back is never sent to the client until the user reveals it_. This is the cheat mitigation discussed in [`08-security.md`](08-security.md).

---

## Why SM-2 and Not FSRS or SM-18

**FSRS (Free Spaced Repetition Scheduler)** is the modern successor to SM-2. It's more accurate, uses machine learning to model memory decay, and is what Anki uses by default now.

**Why we're not using it:**

1. **FSRS requires training data.** It has parameters that need to be fit per-user based on review history. A new user has no history — the algorithm falls back to defaults anyway.
2. **FSRS is more complex to implement.** Its formulas involve power laws and stability/difficulty state. For a 9-day project, that's a lot of surface area for bugs.
3. **SM-2 is well-documented and verifiable.** A reader can check our math against the original 1987 paper. That's a portfolio signal: we know the algorithm, we chose it deliberately, and we can defend the choice.

**SM-18** is a newer variant that reduces SM-2's "ease hell" (cards stuck at EF 1.3 forever). It's a good improvement but less documented. Same reasoning as FSRS.

**Documented in [`11-future-work.md`](11-future-work.md)** as a possible v2 upgrade:
"Migrate to FSRS once users have review history to fit the model parameters."

---

## Testing Strategy

The scheduler is the most-tested component in TOTES.

**Unit tests for `Sm2Scheduler`:**

- Learning phase: each rating produces the correct `due_at` and `repetitions` change.
- Graduation: a card with `repetitions = 2` enters SM-2.
- SM-2 math: EF adjustments match the formula, clamped at 1.3.
- Interval growth: the worked example above is a test case, verbatim.
- "Again" reset: `repetitions` → 0, `interval` → 1.
- Edge: EF at minimum stays at minimum.

**Feature tests:**

- Post a review, verify the card row is updated and a `review_logs` row is created.
- Verify `interval_before` and `interval_after` in the log match the card's transition.

**Not tested:**

- The AI session analysis (uses a fake in tests).
- The exact `now()` timestamp (tests inject a frozen clock).

**Every test uses a frozen clock** (`Carbon::setTestNow()`). Otherwise tests are flaky near minute/day boundaries.

---

## Relationship to Other Docs

- **Features** ([`04-features.md`](04-features.md)) — the UI flow this algorithm powers
- **Database Schema** ([`03-database-schema.md`](03-database-schema.md)) — the columns the scheduler reads and writes
- **API & Routes** ([`07-api-and-routes.md`](07-api-and-routes.md)) — the `review` endpoint that invokes the scheduler
- **Future Work** ([`11-future-work.md`](11-future-work.md)) — FSRS migration, streaks, and other scheduling-related deferrals
