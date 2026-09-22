# 04 — Features

> This document defines every user-facing behavior in TOTES. It's the document you code against. When code and this doc disagree, one of them is wrong — fix both in the same commit.

**Rule:** No emojis anywhere in TOTES. Not in UI copy, not in docs, not in commit messages. Icons come from Iconify. Words come from words.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Deck Management](#2-deck-management)
3. [Flashcard Management](#3-flashcard-management)
4. [AI Flashcard Generation](#4-ai-flashcard-generation)
5. [Study Mode](#5-study-mode)
6. [Session Analysis](#6-session-analysis)
7. [Settings](#7-settings)
8. [Global Behaviors](#8-global-behaviors)

---

## 1. Authentication

### 1.1 Register

**Route:** `GET /register`, `POST /register`
**Controller:** Breeze-provided

| Element                | UI Copy                         |
| ---------------------- | ------------------------------- |
| Page title             | Create your account             |
| Subtitle               | Start studying smarter.         |
| Name field label       | Name                            |
| Name placeholder       | Your name                       |
| Email field label      | Email                           |
| Email placeholder      | you@example.com                 |
| Password field label   | Password                        |
| Confirm password label | Confirm password                |
| Submit button          | Create account                  |
| Footer link            | Already have an account? Log in |

**Behavior:**

- Validates: name required, email valid + unique, password min 8 chars + confirmed.
- On success: user is logged in, redirected to `/decks`.
- On failure: validation errors shown under each field. Password is never re-filled.

### 1.2 Login

**Route:** `GET /login`, `POST /login`
**Controller:** Breeze-provided

| Element              | UI Copy                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| Page title           | Welcome back                                                               |
| Subtitle             | The only time education sucks is when you can't remember what you studied. |
| Email field label    | Email                                                                      |
| Password field label | Password                                                                   |
| Remember me          | Remember me                                                                |
| Forgot password link | Forgot your password?                                                      |
| Submit button        | Log in                                                                     |
| Footer link          | Don't have an account? Register                                            |

**Behavior:**

- Standard Laravel auth. Rate-limited: 5 attempts per minute per email+IP.
- On success: redirect to `/decks`.
- On failure: "These credentials do not match our records."

### 1.3 Forgot Password

**Route:** `GET /forgot-password`, `POST /forgot-password`
**Controller:** Breeze-provided

| Element           | UI Copy                                       |
| ----------------- | --------------------------------------------- |
| Page title        | Reset your password                           |
| Subtitle          | We'll email you a reset link.                 |
| Email field label | Email                                         |
| Submit button     | Email reset link                              |
| Success message   | We've emailed a reset link. Check your inbox. |

### 1.4 Reset Password

**Route:** `GET /reset-password/{token}`, `POST /reset-password`
**Controller:** Breeze-provided

| Element                | UI Copy                             |
| ---------------------- | ----------------------------------- |
| Page title             | Set a new password                  |
| New password label     | New password                        |
| Confirm password label | Confirm new password                |
| Submit button          | Reset password                      |
| Success message        | Password reset. You can log in now. |

### 1.5 Email Verification

**Route:** `GET /verify-email`, `GET /verify-email/{id}/{hash}`, `POST /email/verification-notification`
**Controller:** Breeze-provided

**Behavior:**

- Verification emails are **sent** on registration regardless of enforcement setting.
- Whether users are **blocked** until verified depends on `ENFORCE_EMAIL_VERIFICATION` env flag.
- Default: `false`. The verification system exists; enforcement is off.

| Element        | UI Copy                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| Page title     | Verify your email                                                                |
| Body           | We've emailed a verification link to {email}. Click it to activate your account. |
| Resend button  | Resend verification email                                                        |
| Resend success | A new verification link has been sent.                                           |
| Logout button  | Log out                                                                          |

**Why conditional enforcement:** Portfolio demoers can try the app without checking email. Setting `ENFORCE_EMAIL_VERIFICATION=true` in a real deployment turns on the block.

### 1.6 Logout

**Route:** `POST /logout`

**Behavior:** Session invalidated, Sanctum token revoked, redirect to `/`.

---

## 2. Deck Management

### 2.1 Deck List

**Route:** `GET /decks`
**Controller:** `Web\DeckController@index`

**Layout:** Grid of deck cards, responsive (1 column mobile, 2 tablet, 3 desktop).

| Element                | UI Copy                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Page title             | My Decks                                                                                    |
| Empty state heading    | No decks yet                                                                                |
| Empty state body       | The only time education sucks is when you sit down to review and don't know where to start. |
| Empty state CTA        | Create your first deck                                                                      |
| New deck button        | New deck                                                                                    |
| Deck card — card count | {n} cards                                                                                   |
| Deck card — due count  | {n} due                                                                                     |
| Deck card — no cards   | Empty                                                                                       |

**Behavior:**

- Decks sorted by `created_at` desc.
- Due count computed via `dueCards()->count()`.
- Clicking a deck card opens `/decks/{id}`.
- A deck with 0 due cards still opens; the study page shows a "nothing due" state.

### 2.2 Create Deck

**Route:** `GET /decks/create`, `POST /decks`
**Controller:** `Web\DeckController@create`, `@store`
**Request:** `StoreDeckRequest`

| Element                 | UI Copy                                      |
| ----------------------- | -------------------------------------------- |
| Page title              | Create a deck                                |
| Name label              | Deck name                                    |
| Name placeholder        | e.g., Physics — Chapter 3                    |
| Description label       | Description (optional)                       |
| Description placeholder | What's this deck for?                        |
| Icon label              | Icon                                         |
| Icon search placeholder | Search icons...                              |
| Icon empty result       | No icons match that search.                  |
| Color label             | Color                                        |
| Shuffle label           | Shuffle cards by default                     |
| Shuffle help            | Off keeps cards in the order you added them. |
| Submit button           | Create deck                                  |
| Cancel button           | Cancel                                       |

**Validation:**

- `name`: required, string, max 255
- `description`: nullable, string, max 1000
- `icon`: required, string, must be a valid Iconify identifier (validated against a whitelist of fetched names, or trusted client-side with a fallback)
- `color`: required, in the 8-color palette: `blue, purple, green, amber, rose, teal, indigo, slate`
- `shuffle_default`: boolean

**Behavior:**

- On success: redirect to `/decks/{id}` with toast "Deck created."
- Icon picker loads Iconify icons client-side. Selection previews live before submit.
- Color swatches render the actual palette colors. Selected swatch has a ring.
- Default icon: `mdi:book-open-page-variant`. Default color: `blue`.

### 2.3 Edit Deck

**Route:** `GET /decks/{deck}/edit`, `PUT /decks/{deck}`
**Controller:** `Web\DeckController@edit`, `@update`
**Request:** `UpdateDeckRequest`
**Authorization:** `DeckPolicy@update`

Same form as Create, pre-filled. Submit button reads "Save changes."

**Behavior:**

- On success: redirect back to `/decks/{deck}` with toast "Deck updated."
- The `user_id` is never editable. Ownership is immutable.

### 2.4 Delete Deck

**Route:** `DELETE /decks/{deck}`
**Controller:** `Web\DeckController@destroy`
**Authorization:** `DeckPolicy@delete`

**Confirmation modal:**

| Element        | UI Copy                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| Title          | Delete "{deck name}"?                                                                |
| Body           | This will also delete {n} cards and all their review history. This cannot be undone. |
| Cancel button  | Cancel                                                                               |
| Confirm button | Delete deck                                                                          |

**Behavior:**

- Cancel is the default focus. Enter key cancels, not deletes.
- Confirm button is styled destructive (red).
- On success: redirect to `/decks` with toast "Deck deleted."
- Cascade: cards and their review logs are deleted by the database.

### 2.5 Deck Detail

**Route:** `GET /decks/{deck}`
**Controller:** `Web\DeckController@show`
**Authorization:** `DeckPolicy@view`

**Layout:**

- Header: deck icon + name + description, Edit and Delete buttons
- Stats strip: total cards, cards due now, cards mastered (repetitions >= 5), last studied
- Primary CTA: "Study now" (disabled if 0 due) or "Generate cards" if 0 cards
- Card list (paginated, 20 per page)

| Element                        | UI Copy                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| Study CTA (due > 0)            | Study now ({n} due)                                                  |
| Study CTA (due = 0, cards > 0) | Nothing due — come back later                                        |
| Study CTA (cards = 0)          | Generate your first cards                                            |
| Empty card list                | No cards yet. Generate a batch from your notes, or add one manually. |
| Add card button                | Add card                                                             |
| Generate cards button          | Generate with AI                                                     |

---

## 3. Flashcard Management

### 3.1 Add Card (Manual)

**Route:** `GET /decks/{deck}/cards/create`, `POST /decks/{deck}/cards`
**Controller:** `Web\CardController@create`, `@store`
**Request:** `StoreCardRequest`
**Authorization:** via `CardPolicy@create` (parent deck passed to the policy)

| Element                 | UI Copy                          |
| ----------------------- | -------------------------------- |
| Page title              | Add a card                       |
| Front label             | Front (the question)             |
| Front placeholder       | What is the derivative of ln(x)? |
| Back label              | Back (the answer)                |
| Back placeholder        | 1/x                              |
| Explanation label       | Explanation (optional)           |
| Explanation placeholder | Why is this the answer?          |
| Submit button           | Add card                         |
| Cancel button           | Cancel                           |

**Validation:**

- `front`: required, string, max 2000
- `back`: required, string, max 2000
- `explanation`: nullable, string, max 2000

**Behavior:**

- On success: redirect back to the create form with toast "Card added. Add another?" — allows rapid manual entry.
- A "Done" link returns to `/decks/{deck}`.
- New cards start with SM-2 defaults: `ease_factor = 2.5`, `interval = 0`, `repetitions = 0`, `due_at = now()`.

### 3.2 Edit Card

**Route:** `GET /cards/{card}/edit`, `PUT /cards/{card}`
**Controller:** `Web\CardController@edit`, `@update`
**Request:** `StoreCardRequest` (reused)
**Authorization:** `CardPolicy@update`

Same form as Add, pre-filled. Editing does **not** reset SM-2 state — the card keeps its scheduling.

### 3.3 Delete Card

**Route:** `DELETE /cards/{card}`
**Controller:** `Web\CardController@destroy`
**Authorization:** `CardPolicy@delete`

**Confirmation modal:**

| Element        | UI Copy                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Title          | Delete this card?                                                                                 |
| Body           | "{front excerpt, 60 chars}..." — This will also delete its review history. This cannot be undone. |
| Cancel button  | Cancel                                                                                            |
| Confirm button | Delete card                                                                                       |

### 3.4 Card List (within Deck Detail)

| Element               | UI Copy     |
| --------------------- | ----------- |
| Column: Front         | Front       |
| Column: Due           | Due         |
| Column: Repetitions   | Reviews     |
| Row action: Edit      | Edit        |
| Row action: Delete    | Delete      |
| Due soon (within 24h) | Due in {h}h |
| Due now               | Due now     |
| Due later             | In {n} days |

**Behavior:**

- Paginated, 20 per page, sorted by `due_at` asc (due soonest first).
- The front column is truncated to 80 chars with ellipsis.

---

## 4. AI Flashcard Generation

### 4.1 Generate Cards — The Modal

**Trigger:** "Generate with AI" button on `/decks/{deck}`.
**API Endpoint:** `POST /api/v1/decks/{deck}/generate`
**Controller:** `Api\V1\GenerateCardsController@store`
**Request:** `GenerateCardsRequest`

**Modal layout:**

| Element                   | UI Copy                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Title                     | Generate flashcards                                                                          |
| Subtitle                  | Paste your notes, or upload a PDF or DOCX file.                                              |
| Tab 1 label               | Paste text                                                                                   |
| Tab 2 label               | Upload file                                                                                  |
| Text area placeholder     | Paste your notes, a textbook section, or any study material here.                            |
| File dropzone             | Drop a PDF or DOCX here, or click to browse.                                                 |
| File selected             | {filename} — {size} KB                                                                       |
| File remove button        | Remove file                                                                                  |
| Difficulty label          | Difficulty                                                                                   |
| Difficulty option 1       | Basic — recall definitions and facts                                                         |
| Difficulty option 2       | Standard — explain and apply concepts                                                        |
| Difficulty option 3       | Advanced — analyze and synthesize                                                            |
| Generate button           | Generate cards                                                                               |
| Generate button (loading) | Generating...                                                                                |
| Cancel button             | Cancel                                                                                       |
| Error — too long          | That's too much text. Try a shorter section (max 5,000 characters).                          |
| Error — wrong file type   | Only PDF and DOCX files are supported.                                                       |
| Error — file too big      | Files must be under 5 MB.                                                                    |
| Error — no text extracted | We couldn't find any text in that file. If it's a scanned PDF, try pasting the text instead. |
| Error — rate limited      | You've reached today's generation limit. Try again tomorrow.                                 |
| Error — AI failed         | Something went wrong on our end. Please try again.                                           |

**Behavior:**

- Character counter shows live: "1,234 / 5,000 characters."
- If a file is uploaded, text is extracted server-side, then fed into the same generation pipeline as pasted text.
- File extraction is a preview step — the user sees the extracted text in a read-only area before confirming, so they can cancel if extraction is garbled.
- Generate button is disabled until valid input exists.
- Generation takes 1–5 seconds. A progress indicator (indeterminate spinner + "Generating...") shows during the wait.
- On success: modal closes, deck detail page refreshes, new cards appear in the list, toast: "Generated {n} cards."

### 4.2 Generation Response Handling

The API returns:

```json
{
    "cards": [
        {
            "id": 42,
            "front": "What is the derivative of ln(x)?",
            "back": "1/x",
            "explanation": "The derivative of the natural logarithm is the reciprocal of its argument, a standard result from calculus."
        }
    ],
    "usage": {
        "generations_today": 3,
        "generations_limit": 10
    }
}
```

**Behavior:**

- Client inserts the returned cards into local state (or triggers an Inertia reload).
- Usage info can be shown as a small footer: "3 of 10 generations used today."
- Cards inherit the deck's owner and `deck_id`. Never trust client-supplied `deck_id` — the URL is the source of truth.

### 4.3 Rate Limiting

- **Daily cap:** `AI_DAILY_LIMIT` (default 10) per user, across all decks.
- **Max input size:** `AI_MAX_INPUT_CHARS` (default 5,000) characters per generation.
- **Max output:** The prompt asks the model to generate at most 30 cards per call.
- **Enforcement:** Before calling the AI, the controller counts rows in `ai_usage_logs` for the user where `created_at >= today`. If `count >= limit`, return 429 with the rate-limit error message.

**Rate limit UI copy:**

| Element                                | UI Copy                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Rate limit heading                     | You've reached today's limit                                                                                                 |
| Rate limit body                        | Taking breaks is TOTES necessary. You can't absorb knowledge if your mind is tired from studying anyway. Come back tomorrow. |
| Rate limit reset hint                  | Your limit resets at midnight.                                                                                               |
| Generate button tooltip (when limited) | Taking breaks is TOTES necessary.                                                                                            |

### 4.4 What AI Generation Does NOT Do

- No URL fetching (see [`11-future-work.md`](11-future-work.md)).
- No OCR for scanned PDFs. If a PDF has no text layer, extraction returns empty, and the user sees the "no text extracted" error.
- No video/audio transcription.
- No multi-turn conversation. One call, one response.

## 5. Study Mode

### 5.1 Study Session

**Route:** `GET /decks/{deck}/study`
**Controller:** `Web\StudyController@show`
**Authorization:** `DeckPolicy@view`

**Layout:** Full-screen focus mode. No navigation visible during a session except an Exit link.

**Flow:**

1. Server fetches due cards for the deck, ordered by `due_at` asc.
2. If shuffle is enabled (deck preference or user toggle), the order is randomized server-side.
3. Card 1 front is displayed. Back and explanation are **not** sent to the client yet.
4. User clicks "Show answer" or presses `Space`.
5. Client fetches `GET /api/v1/cards/{card}/answer` — returns `{ back, explanation }`.
6. Back and explanation are revealed. Rating buttons appear.
7. User rates: Again / Hard / Good / Easy, or presses `1`, `2`, `3`, `4`.
8. Client posts the rating to `POST /api/v1/cards/{card}/review` — SM-2 recalculates, log written.
9. Next card is shown. Repeat.
10. When no cards remain due: session summary screen.

| Element                    | UI Copy                                         |
| -------------------------- | ----------------------------------------------- |
| Header: deck name          | {deck name}                                     |
| Header: progress           | {current} / {total}                             |
| Header: exit link          | Exit session                                    |
| Front label (small)        | Question                                        |
| Reveal button              | Show answer                                     |
| Reveal hint (below button) | Or press Space                                  |
| Back label (small)         | Answer                                          |
| Explanation label (small)  | Why                                             |
| Rating prompt              | How well did you know this?                     |
| Rating: Again              | Again (1)                                       |
| Rating: Hard               | Hard (2)                                        |
| Rating: Good               | Good (3)                                        |
| Rating: Easy               | Easy (4)                                        |
| Keyboard hints             | 1 2 3 4                                         |
| Exit confirm modal title   | Exit session?                                   |
| Exit confirm modal body    | Your progress is saved. You can resume anytime. |
| Exit confirm modal button  | Exit                                            |

**Behavior:**

- If 0 cards are due: show an empty state with "Nothing due. Come back later." and a link back to the deck.
- **Answer is never in the initial page props.** This is the cheat mitigation. Answers arrive via a separate API call after the user clicks Show answer.
- Keyboard shortcuts: `Space` to reveal, `1–4` to rate.
- Rating triggers an async request. During the request, the current card is locked. On success, advance. On failure, show error and allow retry.
- Session state (which cards were seen) is tracked server-side via review logs, not client state.

### 5.2 Learning Steps vs. SM-2

New cards (fewer than 2 prior repetitions) use learning steps:

| Rating | Next interval                                    |
| ------ | ------------------------------------------------ |
| Again  | 1 minute                                         |
| Hard   | 5 minutes                                        |
| Good   | 10 minutes                                       |
| Easy   | Graduate to SM-2 immediately (interval = 4 days) |

After 2 repetitions, the card enters the SM-2 long-term schedule (day-granularity).

Full details in 06-spaced-repetition.md.

### 5.3 Session Summary

**Route:** Reached after the last card in a session.
**Controller:** `Web\StudyController@summary` (or rendered client-side from session data)

| Element             | UI Copy                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Title               | Session complete                                                   |
| Subtitle            | The only time education sucks is when you stop before you're done. |
| Stats: reviewed     | {n} cards reviewed                                                 |
| Stats: correct      | {n} rated Good or Easy                                             |
| Stats: struggled    | {n} rated Again or Hard                                            |
| Stats: time         | {m} minutes                                                        |
| Analysis CTA        | Analyze this session                                               |
| Analysis loading    | Analyzing...                                                       |
| Analysis heading    | What to focus on                                                   |
| Another session CTA | Study more                                                         |
| Back to deck CTA    | Back to deck                                                       |

## 6. Session Analysis

### 6.1 Trigger

**API Endpoint:** `POST /api/v1/sessions/{session_id}/analyze`
**Controller:** `Api\V1\SessionAnalysisController@store`

**Note:** A "session" is not a stored entity. It's the set of review logs from a study session. To identify a session, the client sends the timestamp range or the list of `review_log` IDs from that session.

**Simpler alternative:** The client sends the review log IDs collected during the session. The API fetches those logs, builds a summary, calls AI, returns analysis.

### 6.2 Analysis Output

```json
{
    "analysis": "You struggled most with cards about logarithmic differentiation and the chain rule. Focus on those before moving forward. Try explaining each step out loud as you solve — it forces your brain to commit the reasoning to memory, not just the answer. You rated 8 of 20 cards Easy, which is a strong start.",
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

| Element             | UI Copy                                                   |
| ------------------- | --------------------------------------------------------- |
| Analysis heading    | What to focus on                                          |
| Focus cards heading | Cards that need another pass                              |
| Focus card CTA      | Review these now                                          |
| Error               | We couldn't analyze this session. Please try again later. |

**Behavior:**

- AI receives: session length, ratings breakdown, list of fronts rated Again or Hard, list of fronts rated Easy, elapsed time.
- AI returns 3–4 sentences plus a list of card IDs to focus on.
- **Cost control:** Same daily limit as generation (`AI_DAILY_LIMIT`). Analysis and generation share the cap.
- Analysis is optional. If the user skips it, no call is made.

---

## 7. Settings

### 7.1 Profile

**Route:** `GET /settings/profile`, `PATCH /settings/profile`
**Controller:** Breeze-provided

| Element                 | UI Copy                                       |
| ----------------------- | --------------------------------------------- |
| Page title              | Profile                                       |
| Name label              | Name                                          |
| Email label             | Email                                         |
| Unverified email notice | Your email address is unverified.             |
| Resend verification     | Click here to re-send the verification email. |
| Save button             | Save                                          |
| Saved toast             | Saved.                                        |

### 7.2 Password

**Route:** `GET /settings/password`, `PUT /settings/password`
**Controller:** Breeze-provided

| Element                | UI Copy           |
| ---------------------- | ----------------- |
| Page title             | Password          |
| Current password label | Current password  |
| New password label     | New password      |
| Confirm password label | Confirm password  |
| Save button            | Save              |
| Saved toast            | Password updated. |

### 7.3 Appearance

**Route:** `GET /settings/appearance`, `PATCH /settings/appearance`
**Controller:** `Web\Settings\AppearanceController`

| Element              | UI Copy                                       |
| -------------------- | --------------------------------------------- |
| Page title           | Appearance                                    |
| Theme label          | Theme                                         |
| Theme option: Light  | Light                                         |
| Theme option: Dark   | Dark                                          |
| Theme option: System | System                                        |
| Description          | System follows your operating system setting. |
| Saved toast          | Theme updated.                                |

**Behavior:**

- Change applies instantly (no page reload).
- Persisted to `users.theme` via API.
- Also written to `localStorage` for instant application on next page load.

### 7.4 Account Deletion

**Route:** `DELETE /settings/profile`
**Controller:** Breeze-provided

**Confirmation modal:**

| Element             | UI Copy                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Title               | Delete your account?                                                                                                    |
| Body                | This will permanently delete your account, all {n} decks, all {m} cards, and all review history. This cannot be undone. |
| Confirm input label | Type your email to confirm                                                                                              |
| Confirm button      | Delete account                                                                                                          |
| Cancel button       | Cancel                                                                                                                  |

**Behavior:**

- Requires typing the account email to confirm. Prevents accidental deletion.
- Cascade: everything tied to the user is deleted.

---

## 8. Global Behaviors

### 8.1 Dark Mode

- Toggle in the top-right nav (sun/moon icon from Iconify).
- Click cycles: light → dark → system.
- Preference persisted via `PATCH /settings/appearance`.
- Applied by setting `class="dark"` on `<html>`.
- All components must have `dark:` variants. If a component looks wrong in dark mode, that's a bug.

### 8.2 Responsive Breakpoints

| Breakpoint       | Target                                           |
| ---------------- | ------------------------------------------------ |
| `< 640px`        | Mobile — single column, bottom nav on study mode |
| `640px – 1024px` | Tablet — 2-column deck grid                      |
| `> 1024px`       | Desktop — 3-column deck grid, sidebar nav        |

**Study mode:** card is full-width on mobile, max-width 640px centered on desktop.

### 8.3 Toasts

- Position: bottom-right on desktop, top-center on mobile.
- Duration: 3 seconds.
- Dismissible via X button.
- Types: success (green), error (red), info (neutral).

| Event            | Toast copy                                        |
| ---------------- | ------------------------------------------------- |
| Deck created     | Deck created.                                     |
| Deck updated     | Deck updated.                                     |
| Deck deleted     | Deck deleted.                                     |
| Card added       | Card added.                                       |
| Card updated     | Card updated.                                     |
| Card deleted     | Card deleted.                                     |
| Cards generated  | Generated {n} cards.                              |
| Session analyzed | Analysis ready.                                   |
| Rate limited     | You've reached today's limit. Try again tomorrow. |
| Generic error    | Something went wrong. Please try again.           |

### 8.4 Loading States

- Buttons that trigger async actions show an inline spinner and change label (e.g., "Save" → "Saving...").
- Buttons are disabled during the request.
- The page never becomes unresponsive — navigation always works.

### 8.5 Error Handling

- **404:** "We couldn't find that page. It may have been deleted."
- **403:** "You don't have access to that."
- **500:** "Something went wrong on our end. We've been notified."
- **Validation errors:** Shown inline under each field. The form does not lose entered data.
- **Network errors:** Toast + the action can be retried.

### 8.6 Voice Rules for UI Copy

- No emojis. Ever.
- No exclamation marks unless the moment genuinely warrants it (session complete is the one exception).
- No "Oops!", "Uh oh!", "Whoops!" — patronizing.
- No "Great job!", "Awesome!" — hollow.
- Sentence case for headings. Title case for buttons.
- The slogan format may appear in empty states and error states, but never more than once per screen.
- When in doubt, shorter. When still in doubt, quieter.
- The word "TOTES" is used as a pun in exactly one place: the rate limit message.
  It must not appear as wordplay anywhere else. Used once, it lands. Used twice,
  it becomes a gimmick.
- TOTES does not use scores, grades, percentages, or rankings. Session stats are
  descriptive, not evaluative.

---

## Relationship to Other Docs

- **Product Vision** ([`01-product-vision.md`](01-product-vision.md)) — the voice these features speak in
- **Architecture** ([`02-architecture.md`](02-architecture.md)) — which features use Inertia vs. the REST API
- **Database Schema** ([`03-database-schema.md`](03-database-schema.md)) — the tables each feature touches
- **AI Integration** ([`05-ai-integration.md`](05-ai-integration.md)) — the two AI features in detail
- **Spaced Repetition** ([`06-spaced-repetition.md`](06-spaced-repetition.md)) — the SM-2 and learning-step logic
- **API & Routes** ([`07-api-and-routes.md`](07-api-and-routes.md)) — every endpoint listed here, formally specified
- **Security** ([`08-security.md`](08-security.md)) — the policies and answer gating these features rely on

---

## What to Review

This doc is long. Review it with these questions:

1. **UI copy tone** — Does the copy match the TOTES voice? Especially the empty states and error messages. Any lines that feel off?
2. **The session analysis data flow** — I proposed the client sends review log IDs. This is a bit awkward (sessions aren't stored entities). Do you accept this, or should we add a `sessions` table to make it cleaner? (Adding a table means Day 1 schema changes.)
3. **The study mode flow** — Step 5 (fetch answer via API) is the cheat mitigation. Confirm this is what you want, and that the extra request per card is acceptable for UX.
4. **Missing features** — Anything user-facing that I forgot? For example: search/filter for decks? Sorting options? Bulk card actions?
5. **Voice rules section (8.6)** — This is where we codify the no-emoji rule and tone. Does it capture what you meant?

Once confirmed, we move to **`docs/05-ai-integration.md`** — the prompts, the AI service design, and cost controls.

**Save `04-features.md` to `totes/docs/04-features.md` once you're happy.** Let me know when it's placed.
