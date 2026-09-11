# 01 — Product Vision

> This document defines what TOTES is, who it's for, and what it's _not_. Every other document in this project references back to this one. If a feature doesn't serve the vision described here, it doesn't belong in TOTES.

---

## The Name

**TOTES** is an acronym, but it's also a word. It reads like a casual, confident "totally" — _"TOTES gonna pass this exam."_ That double meaning is intentional. The app isn't serious in tone, even though the science behind it (spaced repetition) is.

The all-caps styling is deliberate. It's a mark, not a word. You don't read it — you _recognize_ it.

---

## The Slogan

> The only time education sucks is when...

This line is **open-ended on purpose.** Every user completes it differently:

- _"...you reviewed for an exam and forgot what you studied."_
- _"...you spent hours listening and retained nothing."_
- _"...you understood something in the moment and couldn't explain it a week later."_
- _"...you sit down to review and don't know where to start."_
- _"...people ask you things you already know, but you can't form your own opinion about them."_

The slogan is not a promise. It's an _invitation_. It says: you already know why education sucks for you. TOTES doesn't fix education. It fixes the moment _right before_ education sucks — the moment you open your notes and realize you don't remember them.

**Why open-ended matters:** A fixed slogan tells the user what to feel. An open-ended one asks them to bring their own frustration. That's more honest, more personal, and it makes the app feel like it was built _for them specifically_ rather than for a hypothetical "student."

---

## The Problem TOTES Solves

Learning material is abundant. Retention is not.

A student today can access thousands of hours of lectures, tutorials, textbooks, and notes for any subject. What they _can't_ easily do is convert that material into something they'll actually remember when it matters — during an exam, a job interview, or a conversation where they need to explain what they supposedly learned.

The gap isn't content. It's **conversion.** Turning passive reading and watching into active recall.

TOTES is a conversion tool. It takes whatever material the user already has — pasted text, a PDF, a DOCX — and turns it into a reviewable deck of flashcards. Then it schedules those flashcards so the user reviews them at the right intervals to actually _remember_ them.

That's the whole product. Nothing more.

---

## Who TOTES Is For

**Primary audience:** Students preparing for exams (university, senior high, licensure, certification).

**Secondary audience:** Self-learners — developers learning a new stack, professionals studying for certifications, hobbyists picking up a new field.

**Tertiary audience (portfolio context):** Recruiters and hiring managers evaluating the technical depth of the project. Yes, this is real. A portfolio project should be designed so that the _reading_ of the code is itself a product experience.

**Who it's NOT for:**

- Teams or classrooms (no shared decks, no collaboration — those are different products)
- Casual trivia or quiz games (TOTES is for retention, not entertainment)
- People who want a chatbot tutor (AI in TOTES is a tool, not a conversational partner)

---

## The Core Loop

```
Every feature in TOTES serves this loop:
   ┌──────────────────────────────────────────────┐
   │                                              │
   ▼                                              │
[ User has material ]                             │
        │                                         │
        ▼                                         │
[ TOTES generates flashcards ]                    │
        │                                         │
        ▼                                         │
[ User studies — attempts recall ]                │
        │                                         │
        ▼                                         │
[ User self-rates: Again / Hard / Good / Easy ]   │
        │                                         │
        ▼                                         │
[ SM-2 schedules the next review ]                │
        │                                         │
        ▼                                         │
[ Session ends — AI analyzes performance ]────────┘
        │
        ▼
[ User comes back later — reviews due cards ]

Everything in scope serves one of these stages. Everything out of scope does not.
```

---

## Design Principles

These are the rules we hold ourselves to when making decisions. If a feature request conflicts with a principle, the principle wins.

### 1. The learning loop works without AI

AI makes material ingestion faster and reflection sharper. But if every AI provider goes offline tomorrow, TOTES still works: users create cards manually, study them, and the SM-2 algorithm schedules reviews. **AI is a lever, not a foundation.**

### 2. Deterministic over clever

Spaced repetition is a solved problem (SM-2, SM-18, FSRS). We implement SM-2 because it's well-documented, easy to reason about, and easy to test. We don't invent a new algorithm. We don't use AI for scheduling. Cleverness is a liability in scheduling systems — predictability is the feature.

### 3. Scope is a feature

We deliberately cut: URL fetching, OCR, video transcription, custom themes, drag-reorder, AI difficulty tiers as multi-model routing, and hint systems. Every cut is documented in [`11-future-work.md`](11-future-work.md) with reasoning. A senior engineer's job is not to build everything — it's to build _the right things_ within the time available.

### 4. Documentation is part of the product

Every architectural decision, every schema choice, every AI prompt has a _why_ attached. The docs aren't an afterthought — they're the artifact that turns a codebase into a project. Code shows _what_ was built. Docs show _why_.

### 5. Voice matters

TOTES has a tone: casual, direct, a little self-aware. Empty states, error messages, and session analyses speak in that voice. This isn't decoration — it's what makes the app feel like it was made by a person, not a template.

### 6. Retention over evaluation

TOTES does not score, grade, or rank. It tracks what needs review and what's
been mastered, but it doesn't judge the user. Scores incentivize dishonest
self-rating and imply a finality that contradicts how memory actually works.
The session summary shows descriptive stats — cards reviewed, ratings
breakdown, time spent — not a percentage or a pass/fail. A learner who sees
"3 cards need another pass" is better served than one who sees "70%."

---

## What Success Looks Like

By the end of the 9-day build:

- A working, deployed app at a public URL
- Users can register, create decks, generate cards with AI, study them with SM-2, and get session analysis
- The code is clean enough that a senior engineer can read it and follow the intent
- The documentation is complete and honest — including what's missing and why
- The project _feels_ like a product, not a demo

**Not** part of success:

- Highest possible feature count
- Most AI calls per session
- Prettiest UI in the world (though it should be clean)

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — how the vision is technically realized
- **Features** ([`04-features.md`](04-features.md)) — the specific behaviors that serve this vision
- **AI Integration** ([`05-ai-integration.md`](05-ai-integration.md)) — where AI fits, and where it deliberately doesn't
- **Future Work** ([`11-future-work.md`](11-future-work.md)) — features we cut _because_ of this vision, not in spite of it
