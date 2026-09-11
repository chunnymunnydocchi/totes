# TOTES

> The Only Time Education Sucks is when...

**TOTES** is a spaced-repetition flashcard app that turns your study material into a reviewable deck — with AI helping you generate cards from your own notes and reflect on your sessions.

It exists because education doesn't have to suck. Most of the time, it sucks for a specific, fixable reason. You reviewed for an exam and forgot what you studied. You spent hours listening and retained nothing. You understood something in the moment and couldn't explain it a week later.

TOTES is for those moments.

---

## What It Does

- **Create decks** for any subject — each with its own icon and color.
- **Generate flashcards** from your own material. Paste text, or upload a PDF/DOCX. AI reads it and produces cards with questions, answers, and explanations drawn from your source.
- **Study with spaced repetition.** Cards you struggle with come back sooner. Cards you master fade into the background. The scheduling is based on SM-2, the same algorithm family used by tools like Anki.
- **Get a session analysis** when you're done. AI reads your performance and tells you what to focus on next.
- **Review in light or dark mode**, on desktop or mobile.

---

## The Slogan

> The only time education sucks is when...

Every user completes that sentence differently. For some, it's when they forget what they studied. For others, it's when they can't explain what they thought they understood. For others, it's when they sit down to review and don't know where to start.

TOTES doesn't pretend to fix education. It fixes the moment _right before_ education sucks — the moment you open your notes and realize you don't remember them.

---

## Tech Stack

| Layer      | Choice                              | Why                                                                                             |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend    | Laravel 11                          | Convention over configuration. Batteries included: auth, validation, ORM, queues.               |
| Frontend   | React + TypeScript (via Inertia.js) | React's component model, TypeScript's safety, without building a separate SPA API from scratch. |
| Styling    | Tailwind CSS                        | Utility-first, dark mode built in.                                                              |
| Icons      | Iconify                             | 200,000+ icons from multiple sets, searchable, string-identifier storage.                       |
| Database   | MySQL                               | Relational data (users → decks → cards → logs). Eloquent handles it beautifully.                |
| AI         | Groq (Llama 3.3 70B)                | Fast inference, generous free tier, high accuracy on structured extraction tasks.               |
| Deployment | Railway                             | Laravel-friendly, GitHub-based deploys, free tier for portfolio use.                            |

Full reasoning for each choice lives in [`docs/02-architecture.md`](docs/02-architecture.md).

---

## AI Usage

AI is used in **exactly three places**, and nowhere else:

1. **Flashcard generation** — from pasted text or uploaded PDF/DOCX. One call per generation. User picks a difficulty hint (Basic / Standard / Advanced) that modifies the prompt.
2. **End-of-session analysis** — one call per completed session. Reads a summary of ratings and produces a short focus recommendation.
3. **Nothing else.** The learning loop (spaced repetition, self-rating, scheduling) is deterministic and doesn't depend on any AI call succeeding.

If the AI provider goes down, TOTES still works. Users can create cards manually, study, and track progress. Full details in [`docs/05-ai-integration.md`](docs/05-ai-integration.md).

---

## Screenshots

_(Placeholder — to be added after Day 5.)_

---

## Getting Started

> **Note:** Setup instructions will be finalized on Day 7 of development. This section will contain exact commands for local installation and environment configuration.

---

## Documentation

All project documentation lives in [`docs/`](docs/):

| Document                                               | Purpose                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| [01 — Product Vision](docs/01-product-vision.md)       | Who TOTES is for, what it solves, the slogan philosophy   |
| [02 — Architecture](docs/02-architecture.md)           | Stack decisions, diagrams, why each choice                |
| [03 — Database Schema](docs/03-database-schema.md)     | Every table, column, relationship, reasoning              |
| [04 — Features](docs/04-features.md)                   | Full feature specs with behavior                          |
| [05 — AI Integration](docs/05-ai-integration.md)       | The 3 AI touchpoints, prompts, cost controls              |
| [06 — Spaced Repetition](docs/06-spaced-repetition.md) | SM-2 algorithm explained                                  |
| [07 — API & Routes](docs/07-api-and-routes.md)         | Every route, method, purpose                              |
| [08 — Security](docs/08-security.md)                   | Auth, authorization, cheat mitigation                     |
| [09 — Deployment](docs/09-deployment.md)               | Railway setup + fallback                                  |
| [10 — Development Log](docs/10-development-log.md)     | Daily log of what was built, what broke, what was learned |
| [11 — Future Work](docs/11-future-work.md)             | Deliberately deferred features                            |

---

## Status

**In active development.** Built as a portfolio project over a 9-day sprint.

| Day | Focus                                            | Status     |
| --- | ------------------------------------------------ | ---------- |
| 1   | Foundation (Laravel + Inertia + React + TS + DB) | ⏳ Pending |
| 2   | Deck CRUD + Icon picker + Dark mode              | ⏳ Pending |
| 3   | Flashcard CRUD + Manual creation                 | ⏳ Pending |
| 4   | AI card generation (text + file upload)          | ⏳ Pending |
| 5   | Study mode + SM-2 scheduling                     | ⏳ Pending |
| 6   | End-of-session AI analysis + Review logs         | ⏳ Pending |
| 7   | Polish, responsive pass, cheat mitigation        | ⏳ Pending |
| 8   | Deployment (Railway)                             | ⏳ Pending |
| 9   | Buffer / final documentation                     | ⏳ Pending |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Author

Built by Christian John Sabino as a portfolio project.

- GitHub: [@chunnymunny](https://github.com/chunnymunny)
- Portfolio: [https://shukumunni.vercel.app](https://shukumunni.vercel.app)
