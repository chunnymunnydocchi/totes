# 05 — AI Integration

> This document defines every AI call TOTES makes, the prompts used, the response shape, cost controls, and failure handling. It's the contract between the application and the AI provider.

**Core principle:** AI is a lever, not a foundation. Every feature described here degrades gracefully if the AI provider is unavailable.

---

## Overview

TOTES makes **exactly two types of AI calls**:

| #   | Operation            | Trigger                            | Frequency                    |
| --- | -------------------- | ---------------------------------- | ---------------------------- |
| 1   | Flashcard generation | User clicks "Generate cards"       | User-initiated, capped daily |
| 2   | Session analysis     | User clicks "Analyze this session" | User-initiated, capped daily |

**Nothing else.** No background AI calls, no auto-generation, no scheduled analysis, no chat.

Both calls share the same daily usage limit (`AI_DAILY_LIMIT`), tracked in `ai_usage_logs`.

---

## Provider

**Default:** Groq (Llama 3.3 70B Versatile)

| Attribute       | Value                                             |
| --------------- | ------------------------------------------------- |
| Endpoint        | `https://api.groq.com/openai/v1/chat/completions` |
| Model           | `llama-3.3-70b-versatile`                         |
| API Key env var | `GROQ_API_KEY`                                    |
| Response format | OpenAI-compatible JSON                            |

**Why Groq:** Fast inference (sub-second for short completions), generous free tier, OpenAI-compatible API shape (so swapping to OpenAI later is a config change, not a code rewrite).

**Abstraction:** All calls go through `App\Services\Ai\AiClientInterface`. The concrete implementation is `GroqClient`. Swapping providers means writing a new implementation and changing one binding in `AppServiceProvider`.

---

## Service Layer

```
app/Services/Ai/
├── AiClientInterface.php      # Contract
├── GroqClient.php             # Groq implementation
├── PromptBuilder.php          # Builds prompts for both operations
└── dto/
    ├── GeneratedCard.php      # Value object for one generated card
    └── SessionAnalysis.php    # Value object for analysis result
```

### `AiClientInterface`

```php
interface AiClientInterface
{
    /**
     * @return GeneratedCard[]
     * @throws AiException
     */
    public function generateCards(string $text, string $difficulty): array;

    /**
     * @throws AiException
     */
    public function analyzeSession(SessionSummary $summary): SessionAnalysis;
}
```

### `AiException`

A single custom exception type wraps:

- Network timeouts
- Non-2xx responses from Groq
- Malformed JSON responses
- JSON that doesn't match the expected shape

Controllers catch `AiException` and return a friendly error. The raw error is logged with context (user ID, operation, response body truncated).

---

## Operation 1: Flashcard Generation

### Input

| Field        | Type   | Constraints                         |
| ------------ | ------ | ----------------------------------- |
| `text`       | string | 50–5,000 characters                 |
| `difficulty` | enum   | `basic` \| `standard` \| `advanced` |

### Prompt

The prompt is built by `PromptBuilder::forCardGeneration($text, $difficulty)`. It has three parts.

**System message:**

```
You are a flashcard generator for a spaced-repetition study app.

Your job: read the provided study material and produce flashcards that test
understanding of the material.

Rules:
- Output ONLY valid JSON. No prose, no markdown fences, no explanation.
- Each card must have exactly three string fields: "front", "back", "explanation".
- "front" is a question or prompt (max 300 characters).
- "back" is the answer (max 300 characters).
- "explanation" is one sentence explaining why the answer is correct, drawn
  from the source material (max 400 characters).
- Generate between 5 and 30 cards, depending on how much content the material
  covers. Do not pad. Do not repeat cards.
- If the material is too short or unclear to generate at least 5 meaningful
  cards, output: {"error": "insufficient_material"}
```

**Difficulty modifier** (appended to the system message):

| Difficulty | Instruction                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `basic`    | Focus on recall of definitions, terms, and facts. Questions should be direct.                                          |
| `standard` | Focus on comprehension and application. Questions should require the reader to explain or apply a concept.             |
| `advanced` | Focus on analysis and synthesis. Questions should require connecting multiple concepts or reasoning through scenarios. |

**User message:**

```
Generate flashcards from the following material:

---
{text}
---
```

### Output

The model is expected to return a JSON array of objects. TOTES parses it as:

```json
{
  "cards": [
    {
      "front": "What is the derivative of ln(x)?",
      "back": "1/x",
      "explanation": "The derivative of the natural logarithm is the reciprocal of its argument, a standard result from calculus."
    }
  ]
}
```

**Note:** Some models wrap the array in an object, some return a bare array. `GroqClient` handles both by attempting `json_decode` and then normalizing the shape.

### Validation (in `GroqClient`)

Before returning, each card is validated:

- `front`, `back`, `explanation` must all be present and non-empty strings.
- Length limits enforced (truncated if over, not rejected — better to have a long card than fail the whole batch).
- Cards that fail validation are silently dropped. If fewer than 3 valid cards remain, the whole call is treated as a failure.
- If the response contains `{"error": "insufficient_material"}`, `GroqClient` throws `AiException` with a specific message the controller can map to a user-friendly error.

### Difficulty Hint — Not a Model Swap

The difficulty is a **prompt modifier**, not a change of model. Same model, same API call. Only the system message changes. This keeps the code simple and the cost predictable.

---

## Operation 2: Session Analysis

### Input

A `SessionSummary` DTO built from the review logs of one study session:

```php
class SessionSummary
{
    public function __construct(
        public int $cardsReviewed,
        public int $againCount,
        public int $hardCount,
        public int $goodCount,
        public int $easyCount,
        public array $struggledFronts,   // array of strings (front text)
        public array $masteredFronts,    // array of strings
        public int $elapsedMinutes,
    ) {}
}
```

### Prompt

**System message:**

```
You are a study coach for a spaced-repetition app.

Your job: read a summary of a student's study session and give them a short,
honest analysis of what to focus on next.

Rules:
- Output ONLY valid JSON. No prose, no markdown fences.
- Output shape: {"analysis": "string", "focus_card_ids": [int, ...]}
- "analysis" is 3–4 sentences, second person ("you"), direct, no cheerleading.
- Reference specific topics or card fronts when relevant.
- "focus_card_ids" contains the IDs of cards the student struggled with most
  (from the provided list), ranked by how much they need review. Max 5 IDs.
- Do not say "great job", "keep it up", or similar filler.
- If the session was very short (under 3 cards), note that and keep the
  analysis brief.
```

**User message:**

```
Session summary:
- Cards reviewed: {cardsReviewed}
- Elapsed time: {elapsedMinutes} minutes
- Ratings: {againCount} again, {hardCount} hard, {goodCount} good, {easyCount} easy

Cards struggled with (fronts and IDs):
{struggledFronts as "- [id] front text"}

Cards mastered:
{masteredFronts as "- front text"}
```

### Output

```json
{
  "analysis": "You struggled most with cards about logarithmic differentiation and the chain rule. Focus on those before moving forward. Try explaining each step out loud as you solve — it forces your brain to commit the reasoning to memory, not just the answer.",
  "focus_card_ids": [12, 15]
}
```

### Validation

- `analysis` must be a non-empty string, between 50 and 1,500 characters.
- `focus_card_ids` must be an array of integers. Any ID not in the original `struggledFronts` list is dropped (prevents hallucinated IDs).
- If validation fails, `AiException` is thrown.

---

## Cost Controls

### Daily Limit

- Env var: `AI_DAILY_LIMIT` (default `10`)
- Scope: per user, across all AI operations (generation + analysis share the cap)
- Enforced in `Api\V1\GenerateCardsController` and `Api\V1\SessionAnalysisController` before calling the AI

**Implementation:**

```php
$todayCount = AiUsageLog::where('user_id', $user->id)
    ->whereDate('created_at', today())
    ->count();

if ($todayCount >= config('totes.ai.daily_limit')) {
    return response()->json([
        'error' => 'rate_limited',
        'message' => 'You have reached today\'s AI limit.',
    ], 429);
}
```

### Input Size Cap

- Env var: `AI_MAX_INPUT_CHARS` (default `5,000`)
- Enforced in `GenerateCardsRequest` validation rules
- Files are extracted to text first, then truncated to the cap before reaching the AI

### Output Size Cap

- Prompt instructs the model to produce at most 30 cards per call
- If the model returns more, `GroqClient` takes the first 30 and ignores the rest

### Cost Tracking

Every successful call writes a row to `ai_usage_logs`:

| Column          | Value                                        |
| --------------- | -------------------------------------------- |
| `user_id`       | Authenticated user                           |
| `operation`     | `generate_cards` or `analyze_session`        |
| `input_chars`   | Length of input text                         |
| `output_tokens` | If Groq returns usage data; otherwise `null` |
| `created_at`    | `now()`                                      |

This lets us answer: "How many generations has User X made today?" (for rate limiting) and "What's our total AI cost this month?" (for reporting).

---

## Failure Handling

Every AI call is wrapped in a try/catch for `AiException`. The behavior on failure:

| Failure Type          | User Sees                                                              | Logged                                    |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Network timeout (10s) | "Something went wrong on our end. Please try again."                   | Yes — with user ID and operation          |
| Non-2xx from Groq     | "Something went wrong on our end. Please try again."                   | Yes — with status code and truncated body |
| Malformed JSON        | "Something went wrong on our end. Please try again."                   | Yes — with raw response                   |
| Insufficient material | "We couldn't generate cards from that material. Try a longer excerpt." | Yes — informational                       |
| Rate limit hit        | "You've reached today's generation limit. Try again tomorrow."         | No — expected                             |

**No retries in v1.** If the call fails, the user can click again. Retries add complexity (exponential backoff, idempotency keys) that isn't justified for this scale.

**Timeout:** 10 seconds. If Groq doesn't respond in 10s, abort and treat as a failure. This prevents the UI from hanging.

---

## What AI Is NOT Used For

Documented explicitly so future maintainers don't add scope:

- **Scheduling.** SM-2 is deterministic math. AI does not decide when cards are due.
- **Answer grading.** Users self-rate. AI does not judge correctness.
- **Scoring.** TOTES does not assign scores or percentages. Session stats are
  descriptive (cards reviewed, ratings breakdown), not evaluative. Scores would
  incentivize dishonest self-rating and imply a finality that contradicts
  spaced repetition.
- **Content moderation.** User-provided text is passed to the AI as-is. No moderation layer.
- **Search or filtering.** Standard SQL queries. No semantic search.
- **Recommendations beyond session analysis.** No "you should study X next week" features.
- **Chat.** No conversational interface. Every AI call is one-shot, stateless.

If any of these become desired features, they go through a new ADR.

---

## Configuration

```env
# Provider
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_TIMEOUT=10

# Limits
AI_DAILY_LIMIT=10
AI_MAX_INPUT_CHARS=5000
AI_MAX_OUTPUT_CARDS=30
```

All values are read via `config('totes.ai.*')`, which pulls from `config/totes.php`. This keeps `.env` clean and gives us a single place to define defaults.

---

## Testing Strategy

- **`PromptBuilder`** — Unit tested. Given input, produces the expected prompt string. Snapshot tests.
- **`GroqClient`** — Unit tested with a mocked HTTP client. Verify it parses valid JSON, rejects malformed JSON, drops invalid cards, and throws `AiException` on error.
- **Controllers** — Feature tested with a fake `AiClientInterface` bound in the container. Verify rate limiting, authorization, and DB persistence without hitting Groq.
- **No live API calls in tests.** Ever.

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — where the AI service layer sits in the request lifecycle
- **Features** ([`04-features.md`](04-features.md)) — the user-facing behavior these calls power
- **Database Schema** ([`03-database-schema.md`](03-database-schema.md)) — the `ai_usage_logs` table
- **API & Routes** ([`07-api-and-routes.md`](07-api-and-routes.md)) — the endpoints that trigger these calls
- **Security** ([`08-security.md`](08-security.md)) — how `AiException` errors are surfaced without leaking provider details
