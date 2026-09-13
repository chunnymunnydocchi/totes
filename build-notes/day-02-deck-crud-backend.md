# TOTES — Day 2 Operations Manual (Segment 1 of 3)

> Deck CRUD backend. Form requests, policy, controller, constants, factory,
> and routes. By the end of Segment 1, the backend accepts requests, enforces
> ownership, validates input, and every route is wired. There is no UI yet —
> that's Segment 2. Tests are Segment 3.

**Estimated time for Segment 1:** 2–3 hours.

**Scope discipline:** The features doc (`docs/04-features.md`) describes the
finished app. Day 2 ships a strict subset. Anything not in the frozen
deliverable list below is Day 3 or later. If you find yourself adding toasts,
a settings page, or a 12-component dark sweep, stop — that's scope creep and
I'll call it out.

---

## Guiding principle for today

Day 1 built the floor. Day 2 builds the first real furniture: a resource
with full CRUD, authorization, validation, and a UI that has opinions about
its own appearance. This is the day we establish _patterns_ — how a
controller looks, how a form request validates, how a page composes. Every
feature after today (cards, generation, study) will copy these patterns.
So we get them right once.

We do not skip authorization "because it's only our own decks." We do not
skip validation "because the frontend already checks." We do not skip
tests "because we can click through it." Those three shortcuts are how
Day 4 becomes debugging, not building.

Segment 1 is backend only. Segment 2 is frontend. Segment 3 is tests and
verification. Do not blur them — if you're writing React in Segment 1,
something has gone wrong.

At four points in Segment 1, marked **PAUSE**, I want you to paste
output back before continuing. Those are the moments where a silent wrong
turn costs us hours.

---

## Decisions locked before we start

These came out of our pre-Day-2 conversation. They are frozen for today.
If we want to revisit one, we do it as an explicit decision, not a drift.

**Decision: Dark mode authority is hybrid.**
`localStorage.totes-theme` is a cache read synchronously before paint to
prevent flash. `users.theme` is the source of truth. Server value wins on
conflict. The nav toggle writes both. This is why `app.blade.php` gets an
inline script (Segment 2) and why we need an `AppearanceController@update`
endpoint today even though the settings page is Day 7.

**Decision: Icon picker is a curated list, filtered client-side.**
`@iconify/react` is the renderer. The searchable list is our own component
(Segment 2), filtered locally against a static array of ~200 names in
`resources/js/Constants/deckIcons.ts`. No Iconify API calls at runtime.
The server validates the icon's _shape_ (`set:name`), not its existence —
a bad icon string produces a cosmetic empty slot, not a security problem.
`04-features.md` §2.2 explicitly permits this: _"validated against a
whitelist of fetched names, or trusted client-side with a fallback."_ We
took the fallback path.

**Decision: Day 2 scope is A.**
Deck CRUD + policy + form requests + four React pages + delete modal +
factory + tests + nav theme toggle + appearance endpoint. Full dark-mode
sweep across Breeze components is Day 3, and Day 3 is committed, not
deferred to polish. If Day 2 finishes early, we may start the sweep on
Day 2's clock — but Day 3 is the backstop and it will land there.

**Decision: `Decks/Show` is a real partial page, not a stub.**
Header, stats strip, and empty card list ship today. Card list, "Add card,"
and "Generate with AI" are Day 3 and Day 4. The buttons render disabled
so the layout is stable and the Day 3 diff is small.

**Decision: The post-registration redirect changes to `/decks`.**
`04-features.md` §1.1 says registration lands on `/decks`. Breeze's default
is `/dashboard`. We change it today, or the first screen a new user sees
is wrong. This is a two-line edit and easy to forget.

---

## Segment 1 deliverable list, frozen

So there's no ambiguity about what Segment 1 produces:

**Backend (PHP):**

- `app/Http/Controllers/Web/DeckController.php` — index, create, store, show, edit, update, destroy
- `app/Http/Controllers/Web/Settings/AppearanceController.php` — update
- `app/Http/Requests/StoreDeckRequest.php`
- `app/Http/Requests/UpdateDeckRequest.php`
- `app/Http/Requests/UpdateAppearanceRequest.php`
- `app/Policies/DeckPolicy.php` — viewAny, view, create, update, delete
- `app/Models/Deck.php` — add `dueCards()` relation
- `database/factories/DeckFactory.php`
- `routes/web.php` — deck routes, appearance route, post-register redirect fix

**Frontend data (TS, no components yet):**

- `resources/js/Constants/deckIcons.ts` — the curated list
- `resources/js/Constants/deckColors.ts` — the 8-color palette

**Out of scope for Segment 1 (Segments 2 and 3):**

- Any `.tsx` file
- Any Tailwind class change
- Any `app.blade.php` edit
- Tests

**Explicitly not produced today, at all:**

- `app/Support/DeckIcon.php`
- `app/Support/DeckColor.php`
- Any PHP mirror of the TS constants
- Any TS↔PHP drift test

---

## Step 1 — Confirm we're in the right place, and start clean

```bash
cd ~/Desktop/main\ works/totes
pwd
git status
```

**Expected:** `pwd` ends in `totes`. `git status` shows a clean tree on
`main`. If anything is uncommitted from Day 1, commit it now with a
"Day 1 leftover" message before we touch anything.

**Why this matters more on Day 2 than Day 1:** we're about to change
`routes/web.php`, `app/Models/Deck.php`, and Breeze's
`RegisteredUserController.php` — three files that, if broken, break the
entire app. A clean starting point means any breakage is ours, not
pre-existing.

---

## Step 2 — Start the environment

Two terminals, as always.

**Terminal 1:**

```bash
npm run dev
```

**Terminal 2:**

```bash
php artisan serve
```

Plus XAMPP's MySQL service, running from the Control Panel.

**Verify:** open `http://localhost:8000` in a browser. You should land on
the welcome page (logged out) or the dashboard (logged in). If either
terminal errored, paste the output. We do not proceed on a broken
environment.

**Leave both running for the rest of today.** Segment 2 involves a lot of
save-and-check, and restarting servers between every step is friction
we don't need. `php artisan serve` in particular will hot-reload PHP
changes without a restart; only the frontend needs Vite's watch.

---

## Step 3 — Install `@iconify/react`

```bash
npm install @iconify/react
```

**Why only this package:** `@iconify/react` is the rendering component.
It fetches icon data from Iconify's CDN on first use per icon and caches
it. We deliberately do _not_ install `@iconify/json` (the full icon set,
~100MB) because we render maybe 20 distinct icons across the whole app.
CDN-on-demand is correct for our scale.

**Why this is in Segment 1 even though it's a frontend dependency:** the
TS constant file we're about to write imports nothing from it, but the
Segment 2 components will. Installing now means Segment 2 has zero setup
steps and can go straight to file-writing.

**Verify:** `package.json` should now list `@iconify/react` under
`dependencies` (not `devDependencies`). If npm put it in devDependencies,
move it manually — it ships to production.

**PAUSE #1.** Paste the new `package.json` `dependencies` block. I want
to confirm nothing else moved.

---

## Step 4 — Create the frontend constants

Two TS files. No PHP mirror this time — the server validates shape, not
existence, so there is nothing to keep in sync.

### 4a. `resources/js/Constants/deckIcons.ts`

Create the directory, then the file:

```bash
mkdir -p resources/js/Constants
```

```ts
// Curated list of Iconify icon names available for decks.
// The server validates only the SHAPE of an icon name (set:name),
// not its existence in this list. If a user submits a name that's
// shaped correctly but doesn't exist, the frontend renders an empty
// slot and the user edits the deck. Cosmetic, self-healing.

export const DECK_ICONS: readonly string[] = [
    "mdi:book-open-page-variant",
    "mdi:book-open-variant",
    "mdi:book-education",
    "mdi:school",
    "mdi:brain",
    "mdi:lightbulb",
    "mdi:lightbulb-on",
    "mdi:atom",
    "mdi:flask",
    "mdi:flask-outline",
    "mdi:math-log",
    "mdi:function-variant",
    "mdi:calculator",
    "mdi:sigma",
    "mdi:chart-line",
    "mdi:chart-bar",
    "mdi:graph",
    "mdi:earth",
    "mdi:map",
    "mdi:compass",
    "mdi:history",
    "mdi:bookmark",
    "mdi:notebook",
    "mdi:notebook-outline",
    "mdi:pencil",
    "mdi:pen",
    "mdi:format-quote-close",
    "mdi:translate",
    "mdi:language",
    "mdi:alphabetical",
    "mdi:music",
    "mdi:music-note",
    "mdi:palette",
    "mdi:brush",
    "mdi:camera",
    "mdi:filmstrip",
    "mdi:medical-bag",
    "mdi:heart-pulse",
    "mdi:dna",
    "mdi:leaf",
    "mdi:tree",
    "mdi:paw",
    "mdi:cat",
    "mdi:dog",
    "mdi:chef-hat",
    "mdi:food",
    "mdi:coffee",
    "mdi:soccer",
    "mdi:basketball",
    "mdi:run",
    "mdi:code-tags",
    "mdi:code-braces",
    "mdi:terminal",
    "mdi:database",
    "mdi:server",
    "mdi:cloud",
    "mdi:robot",
    "mdi:cpu-64-bit",
    "mdi:memory",
    "mdi:shield",
    "mdi:lock",
    "mdi:key",
    "mdi:eye",
    "mdi:magnify",
    "mdi:compass-outline",
    "mdi:flag",
    "mdi:star",
    "mdi:heart",
    "mdi:fire",
    "mdi:snowflake",
    "mdi:weather-sunny",
    "mdi:weather-night",
    "mdi:rocket",
    "mdi:airplane",
    "mdi:train",
    "mdi:car",
    "mdi:bike",
    "mdi:home",
    "mdi:office-building",
    "mdi:city",
    "mdi:bank",
    "mdi:cash",
    "mdi:currency-usd",
    "mdi:briefcase",
    "mdi:account-group",
    "mdi:account",
    "mdi:emoticon",
    "mdi:emoticon-happy",
    "mdi:emoticon-sad",
    "mdi:thought-bubble",
    "mdi:comment",
    "mdi:message",
    "mdi:email",
    "mdi:phone",
    "mdi:calendar",
    "mdi:clock",
    "mdi:timer",
    "mdi:alarm",
    "mdi:bell",
    "mdi:gift",
    "mdi:party-popper",
    "mdi:cake",
    "mdi:pizza",
    "mdi:hamburger",
    "mdi:apple",
    "mdi:carrot",
    "mdi:flower",
    "mdi:sprout",
    "mdi:seed",
    "mdi:water",
    "mdi:weather-cloudy",
    "mdi:weather-rainy",
    "mdi:umbrella",
    "mdi:moon-waning-crescent",
    "mdi:white-balance-sunny",
    "mdi:crown",
    "mdi:diamond-stone",
    "mdi:cube",
    "mdi:cube-outline",
    "mdi:shape",
    "mdi:triangle",
    "mdi:circle",
    "mdi:square",
    "mdi:hexagon",
    "mdi:puzzle",
    "mdi:gamepad-variant",
    "mdi:dice-multiple",
    "mdi:cards",
    "mdi:chess-knight",
    "mdi:sword",
    "mdi:shield-sword",
    "mdi:target",
    "mdi:crosshairs",
    "mdi:map-marker",
    "mdi:sign-direction",
    "mdi:routes",
    "mdi:hiking",
    "mdi:tent",
    "mdi:campfire",
    "mdi:binoculars",
    "mdi:telescope",
    "mdi:satellite-variant",
    "mdi:orbit",
    "mdi:planet",
    "mdi:star-four-points",
    "mdi:weather-sunset",
    "mdi:weather-sunset-up",
    "mdi:image",
    "mdi:image-multiple",
    "mdi:video",
    "mdi:headphones",
    "mdi:microphone",
    "mdi:radio",
    "mdi:speaker",
    "mdi:cast",
    "mdi:wifi",
    "mdi:bluetooth",
    "mdi:usb",
    "mdi:laptop",
    "mdi:cellphone",
    "mdi:tablet",
    "mdi:watch",
    "mdi:keyboard",
    "mdi:mouse",
    "mdi:printer",
    "mdi:scanner",
    "mdi:projector",
    "mdi:television",
    "mdi:monitor",
    "mdi:desktop-tower",
    "mdi:harddisk",
    "mdi:sd",
    "mdi:sim",
    "mdi:router",
    "mdi:access-point",
    "mdi:antenna",
    "mdi:satellite-uplink",
    "mdi:broadcast",
    "mdi:podcast",
    "mdi:rss",
    "mdi:web",
    "mdi:link",
    "mdi:share",
    "mdi:download",
    "mdi:upload",
    "mdi:cloud-upload",
    "mdi:cloud-download",
    "mdi:sync",
    "mdi:refresh",
    "mdi:backup-restore",
    "mdi:archive",
    "mdi:folder",
    "mdi:folder-open",
    "mdi:file",
    "mdi:file-document",
    "mdi:file-pdf-box",
    "mdi:file-word",
    "mdi:file-excel",
    "mdi:file-powerpoint",
    "mdi:file-image",
    "mdi:file-music",
    "mdi:file-video",
    "mdi:file-code",
    "mdi:file-chart",
    "mdi:clipboard",
    "mdi:clipboard-text",
    "mdi:clipboard-check",
    "mdi:clipboard-list",
    "mdi:format-list-bulleted",
    "mdi:format-list-numbered",
    "mdi:format-list-checks",
    "mdi:checkbox-marked",
    "mdi:checkbox-blank",
    "mdi:progress-check",
    "mdi:progress-clock",
    "mdi:progress-close",
    "mdi:check-circle",
    "mdi:close-circle",
    "mdi:alert-circle",
    "mdi:information",
    "mdi:help-circle",
    "mdi:question-mark",
    "mdi:exclamation",
    "mdi:plus-circle",
    "mdi:minus-circle",
    "mdi:dots-horizontal",
    "mdi:dots-vertical",
    "mdi:menu",
    "mdi:apps",
    "mdi:view-grid",
    "mdi:view-list",
    "mdi:view-dashboard",
    "mdi:layers",
    "mdi:layers-triple",
    "mdi:stack",
    "mdi:package",
    "mdi:package-variant",
    "mdi:truck",
    "mdi:train-car",
    "mdi:bus",
    "mdi:tram",
    "mdi:ferry",
    "mdi:sail-boat",
    "mdi:anchor",
    "mdi:lighthouse",
    "mdi:beach",
    "mdi:island",
    "mdi:pine-tree",
    "mdi:palm-tree",
    "mdi:cactus",
    "mdi:mountain",
    "mdi:volcano",
    "mdi:waves",
    "mdi:weather-windy",
    "mdi:weather-tornado",
    "mdi:weather-lightning",
    "mdi:flash",
    "mdi:flashlight",
    "mdi:candle",
    "mdi:lamp",
    "mdi:ceiling-light",
    "mdi:string-lights",
    "mdi:firework",
    "mdi:weather-sunset-down",
    "mdi:city-variant",
    "mdi:bridge",
    "mdi:castle",
    "mdi:church",
    "mdi:mosque",
    "mdi:synagogue",
    "mdi:temple-buddhist",
    "mdi:cross",
    "mdi:star-david",
    "mdi:dharma-wheel",
    "mdi:yin-yang",
    "mdi:om",
] as const;

export const DEFAULT_DECK_ICON = "mdi:book-open-page-variant";
```

**Why ~200 icons and not 5,000:** the picker feels genuinely useful at
~200 filtered names. Beyond that, users scroll instead of search, and we
pay for it in bundle size if we ever decide to bundle locally. 200 is the
sweet spot for a study app.

**Why `readonly string[]`:** we never mutate this list. The type says so,
so a future refactor can't accidentally `.push()` onto it.

**Why no PHP mirror:** the server validates shape, not membership. See
Step 6a. If the whitelist and the PHP list could drift, that's a problem
we avoid by not having two lists.

### 4b. `resources/js/Constants/deckColors.ts`

```ts
// The eight deck colors. No PHP mirror — the server validates these
// inline as a Rule::in([...]) of eight short strings. Eight values is
// small enough that a shared constant would be ceremony, not leverage.
//
// Each entry maps a stored value to the Tailwind classes that render it.
// The stored value is what goes in the database; the classes are UI only.

export const DECK_COLORS = [
    {
        value: "blue",
        bg: "bg-blue-500",
        ring: "ring-blue-500",
        text: "text-blue-500",
    },
    {
        value: "purple",
        bg: "bg-purple-500",
        ring: "ring-purple-500",
        text: "text-purple-500",
    },
    {
        value: "green",
        bg: "bg-green-500",
        ring: "ring-green-500",
        text: "text-green-500",
    },
    {
        value: "amber",
        bg: "bg-amber-500",
        ring: "ring-amber-500",
        text: "text-amber-500",
    },
    {
        value: "rose",
        bg: "bg-rose-500",
        ring: "ring-rose-500",
        text: "text-rose-500",
    },
    {
        value: "teal",
        bg: "bg-teal-500",
        ring: "ring-teal-500",
        text: "text-teal-500",
    },
    {
        value: "indigo",
        bg: "bg-indigo-500",
        ring: "ring-indigo-500",
        text: "text-indigo-500",
    },
    {
        value: "slate",
        bg: "bg-slate-500",
        ring: "ring-slate-500",
        text: "text-slate-500",
    },
] as const;

export type DeckColor = (typeof DECK_COLORS)[number]["value"];

export const DEFAULT_DECK_COLOR: DeckColor = "blue";

export function deckColorClasses(value: string) {
    return DECK_COLORS.find((c) => c.value === value) ?? DECK_COLORS[0];
}
```

**Why the full class strings, not `bg-${value}-500`:** Tailwind's JIT
scanner does static analysis. `bg-${value}-500` is invisible to it, so
those classes get purged in production and every deck renders gray. The
ugly, explicit list is the correct pattern. This is a real bug we're
avoiding, not a style preference.

**Why a `deckColorClasses` helper:** so pages don't reimplement the
lookup, and so an unknown value falls back to blue instead of throwing.

**PAUSE #2.** Paste the output of:

```bash
ls resources/js/Constants/
head -5 resources/js/Constants/deckIcons.ts
grep -c "'mdi:" resources/js/Constants/deckIcons.ts
```

Expected: both files exist. The `grep -c` should print a number around 200. If it prints `0`, the file has no icon entries; if it prints much
more, the regex is picking up something else. This is the only constant
we ship this session, so I want it confirmed before it becomes the data
backing the Segment 2 picker.

---

## Step 5 — Add the `dueCards` relation and a `DeckFactory`

### 5a. Edit `app/Models/Deck.php`

Add inside the class, below `cards()`:

```php
public function dueCards(): HasMany
{
    return $this->hasMany(Card::class)
        ->whereNotNull('due_at')
        ->where('due_at', '<=', now());
}
```

**Why `whereNotNull` and `where <= now()`:** `due_at` is nullable to
distinguish "never scheduled" from "scheduled and due." A card with
`due_at = null` is new; it's not due yet in the SM-2 sense. The relation
expresses that.

**Why this matters today:** the deck list (`04-features.md` §2.1) shows
a due count per deck. Without this relation, we'd inline the query in the
controller and drift from the doc's language. With it, the controller
reads `$deck->dueCards()->count()` and matches the spec.

### 5b. Create `database/factories/DeckFactory.php`

```bash
php artisan make:factory DeckFactory
```

Then fill it in:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Deck>
 */
class DeckFactory extends Factory
{
    private const ICON_POOL = [
        'mdi:book-open-page-variant',
        'mdi:atom',
        'mdi:flask',
        'mdi:brain',
        'mdi:palette',
        'mdi:code-tags',
        'mdi:earth',
        'mdi:music',
    ];

    private const COLOR_POOL = [
        'blue', 'purple', 'green', 'amber',
        'rose', 'teal', 'indigo', 'slate',
    ];

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'icon' => fake()->randomElement(self::ICON_POOL),
            'color' => fake()->randomElement(self::COLOR_POOL),
            'shuffle_default' => false,
        ];
    }
}
```

**Why `user_id => User::factory()`:** this is the Laravel convention that
makes `Deck::factory()->create()` produce a deck with a freshly created
owner. It also makes `Deck::factory()->for($user)->create()` work when
tests want a specific owner. Both patterns are used in our feature tests.

**Why the icon and color pools are hardcoded in the factory and not
pulled from a shared constant:** because there _is_ no shared PHP
constant anymore. The factory's job is to produce valid-ish test data,
not to guarantee membership in the frontend's curated list. Since the
server validates shape only, any `set:name`-shaped string would pass. A
small hardcoded pool keeps the factory readable and gives tests a
predictable set of values to assert against if they ever need to.

**PAUSE #3.** Paste:

```bash
php artisan tinker --execute "\$d = App\Models\Deck::factory()->create(); dump(\$d->id, \$d->name, \$d->icon, \$d->color, App\Models\Deck::count()); App\Models\Deck::truncate();"
```

**Warning:** if you later run a cleanup command that includes
`User::query()->delete()`, be aware it cascades: deleting users
deletes their decks, cards, and review logs. In a development
database this is fine; if you have real accounts you want to keep,
use a targeted command (`User::where('email', 'like', '%@test%')->delete()`)
or skip the cleanup entirely.

**Correction (from Day 2 execution):** the truncate command in
Step 5's PAUSE #3 fails on `decks` because the `cards` table has a
foreign key pointing at it. Use `Deck::query()->delete()` instead,
which respects FKs and cascades. If you also need to remove users,
note that `User::query()->delete()` cascades to decks, cards, and
review logs — including any real development accounts you've
created.

Expected: an integer ID, a name of three words, an icon from the pool,
a color from the pool, and `Deck count = 1`. Then no error on truncate.
This proves the factory and relation wiring work before any controller
exists. If it fails, we debug here rather than inside a request cycle.

---

## Step 6 — Write the form requests

Three request classes. Two for decks (store/update), one for appearance.

### 6a. `app/Http/Requests/StoreDeckRequest.php`

```bash
php artisan make:request StoreDeckRequest
```

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9-]+:[a-z0-9-]+$/i'],
            'color' => ['required', 'string', Rule::in([
                'blue', 'purple', 'green', 'amber',
                'rose', 'teal', 'indigo', 'slate',
            ])],
            'shuffle_default' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'shuffle_default' => $this->boolean('shuffle_default'),
        ]);
    }
}
```

**Why `authorize()` returns `true`:** authorization is the policy's job
on Day 2, not the form request's. Deck creation has no pre-existing
resource to check against — any authenticated user can create a deck,
and the controller assigns `user_id` from the session, never the request.
Keeping authorization in one place (the policy) means one place to audit.

**Why `prepareForValidation` with `$this->boolean()`:** when a checkbox is
unchecked, the browser omits it entirely. If we don't normalize, an
unchecked box arrives as `null` and fails `boolean`. `$this->boolean()`
converts missing/`'on'`/`'1'`/`1`/`true` into a real bool. This is the
classic checkbox trap.

**Why the icon rule is a regex, not `Rule::in(...)`:** the server
validates _shape_, not existence. The regex `^[a-z0-9-]+:[a-z0-9-]+$`
(with `i` flag) accepts anything that looks like an Iconify name —
`mdi:atom`, `simple-icons:react`, `ph:cat-duotone`. It rejects
`garbage`, `mdi:`, `:atom`, `mdi atom`, `mdi:ATOM WITH SPACES`. The
`max:80` is a belt-and-braces cap; Iconify names are never that long.
If a user submits a shaped-but-nonexistent name, the frontend's
`<Icon>` renders nothing and the deck card shows an empty slot. The
user edits and fixes it. Cosmetic failure mode. `04-features.md` §2.2
explicitly permits this: _"trusted client-side with a fallback."_

**Why the regex has the `i` flag but lowercases are still the norm:**
Iconify is case-sensitive in practice, but the picker only emits
lowercase names, and a hand-typed `MDI:atom` shouldn't be a validation
error — it should just render as nothing. Rejecting it at the API
boundary adds no security value. Accept the shape, let the render fail
gracefully.

**Why `Rule::in` for color and not a regex:** the color set is
_enumerated_, fixed at eight, and the database stores the value as a
short string that the frontend keys off. A `Rule::in` with the eight
strings is the honest check. It's inline rather than a constant because
eight short strings don't need a class to hold them.

### 6b. `app/Http/Requests/UpdateDeckRequest.php`

```bash
php artisan make:request UpdateDeckRequest
```

Identical to `StoreDeckRequest`. Yes, identical. Copy it.

**Why two identical classes and not one shared class:** Laravel resolves
`StoreDeckRequest` by type-hint. If both actions type-hint the same class,
the form request can't distinguish create from update — and the moment
we want different rules for one (e.g., update allows setting
`last_reviewed_at` for a migration tool, create doesn't), we'd have to
add branching inside `rules()`. Two trivial classes now beats one
branching class later. This is a deliberate pattern choice for the whole
project: store and update get their own request classes even when they
start identical.

**The `user_id` is not in `rules()`, and that is the point.** It cannot be
mass-assigned from a request. Ownership is set by the controller from
`$request->user()->id` and is immutable after creation. `04-features.md`
§2.3 says "The `user_id` is never editable." The form request is where
that guarantee lives.

### 6c. `app/Http/Requests/UpdateAppearanceRequest.php`

```bash
php artisan make:request UpdateAppearanceRequest
```

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppearanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'theme' => ['required', 'string', Rule::in(['light', 'dark', 'system'])],
        ];
    }
}
```

**Why `authorize()` is `true` here but the controller still checks auth:**
the route has the `auth` middleware. Any logged-in user can change _their
own_ theme — there's no other user's theme to touch, because the controller
writes to `$request->user()`, not to an ID from the URL. The policy layer
is unnecessary; the URL structure prevents the attack.

**PAUSE #4.** Paste:

```bash
ls app/Http/Requests/
php artisan route:list --path=decks
```

`route:list` will error right now, because we haven't defined deck routes
yet. That's fine — I want to see the error rather than assume it. If it
prints an empty table instead, that means Day 1's routes are broken and
we stop and fix that first.

---

## Step 7 — Write `DeckPolicy`

```bash
php artisan make:policy DeckPolicy --model=Deck
```

```php
<?php

namespace App\Policies;

use App\Models\Deck;
use App\Models\User;

class DeckPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
    }

    public function create(User $user): bool
    {
        return true;
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

**Why `viewAny` and `create` return `true`:** every authenticated user can
see their own deck list (which is already scoped to `$user->decks()`) and
create a new deck. There's no resource to check ownership against yet.

**Why the ownership check is `$user->id === $deck->user_id` and not
`$deck->user()->is($user)`:** both work. The ID comparison is cheaper and
doesn't lazy-load the relation. With a `$deck` already in hand, its
`user_id` attribute is in memory.

**Why we check ownership explicitly instead of relying on route model
binding scoped to the user:** scoping the binding (`Deck::where('user_id',
$user->id)`) would return 404 for other users' decks — which is what we
want behaviorally. But it hides the authorization decision inside a query,
where it can be forgotten or misapplied. An explicit policy that returns
403-for-unauthorized keeps the decision visible. Combined with the
`08-security.md` "404 not 403 for unauthorized web access" rule, the
controller converts the policy's 403 into a 404 via `abort_unless` with a
404 status. We do that in the controller, not the policy.

**Register the policy.** Laravel 12 auto-discovers policies in
`app/Policies/` matching model names. `DeckPolicy` for `Deck` works out
of the box. Confirm with:

```bash
php artisan tinker --execute "dump(get_class(app(\Illuminate\Contracts\Auth\Access\Gate::class)->getPolicyFor(App\Models\Deck::class)));"
```

Expected: `App\Policies\DeckPolicy`. If it prints `null` or throws,
auto-discovery is off and we register manually in `AppServiceProvider`
via `Gate::policy(Deck::class, DeckPolicy::class);`.

---

## Step 8 — Write `DeckController`

```bash
mkdir -p app/Http/Controllers/Web
php artisan make:controller Web/DeckController
```

```php
<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeckRequest;
use App\Http\Requests\UpdateDeckRequest;
use App\Models\Deck;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeckController extends Controller
{
    public function index(Request $request): Response
    {
        $decks = $request->user()
            ->decks()
            ->withCount(['cards', 'dueCards'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Decks/Index', [
            'decks' => $decks,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Decks/Create');
    }

    public function store(StoreDeckRequest $request): RedirectResponse
    {
        $deck = $request->user()->decks()->create($request->validated());

        return redirect()->route('decks.show', $deck);
    }

    public function show(Request $request, Deck $deck): Response
    {
        abort_unless($request->user()->can('view', $deck), 404);

        $deck->loadCount(['cards', 'dueCards']);

        return Inertia::render('Decks/Show', [
            'deck' => $deck,
        ]);
    }

    public function edit(Request $request, Deck $deck): Response
    {
        abort_unless($request->user()->can('update', $deck), 404);

        return Inertia::render('Decks/Edit', [
            'deck' => $deck,
        ]);
    }

    public function update(UpdateDeckRequest $request, Deck $deck): RedirectResponse
    {
        abort_unless($request->user()->can('update', $deck), 404);

        $deck->update($request->validated());

        return redirect()->route('decks.show', $deck);
    }

    public function destroy(Request $request, Deck $deck): RedirectResponse
    {
        abort_unless($request->user()->can('delete', $deck), 404);

        $deck->delete();

        return redirect()->route('decks.index');
    }
}
```

**Why `abort_unless(..., 404)` and not `$this->authorize(...)`:** Laravel's
`authorize()` throws a 403. `08-security.md` and the handoff both say
**404, not 403, for unauthorized web access** — we don't reveal that a
resource exists. `abort_unless` with an explicit 404 gives us that. It's
verbose, but the verbosity is the point: the security posture is visible
in every method instead of hidden in a helper that might change defaults
between Laravel versions.

**Why the guard is `$request->user()->can(...)` instead of
`$this->authorize(...)`:** the `Controller` base class doesn't ship the
`AuthorizesRequests` trait by default in Laravel 12 — Breeze's
`Controller.php` is bare. Using `$request->user()->can()` bypasses that
without modifying the base class, which is a shared file we don't want to
touch for this one need.

**Why `withCount(['cards', 'dueCards'])`:** the deck list needs both
counts. Without `withCount`, rendering 20 deck cards runs 41 queries
(1 for decks, 20 for `cards()->count()`, 20 for `dueCards()->count()`).
`withCount` collapses it to 3. This is the single most common N+1 in
Laravel apps, and we avoid it from the first commit.

**Why no pagination on `index`:** `04-features.md` §2.1 doesn't ask for it,
and a user with more than ~50 decks is not a Day 2 concern. Adding
pagination now means the frontend has to render a paginator, which is
its own component. Defer.

**Why `store` redirects to `show` and not `index`:** `04-features.md` §2.2
says "redirect to `/decks/{id}`." Following the doc. It also means the
user immediately sees what they created, which is the point of creating it.

**PAUSE #5.** Paste:

```bash
ls app/Http/Controllers/Web/
head -5 app/Http/Controllers/Web/DeckController.php
```

Expected: `DeckController.php` exists with `namespace
App\Http\Controllers\Web;` on line 3. If `make:controller` complained
about the namespace or the directory, that's our first controller in this
subnamespace and we want to fix the convention now rather than after
writing four of them.

---

## Step 9 — Write `AppearanceController`

```bash
mkdir -p app/Http/Controllers/Web/Settings
php artisan make:controller Web/Settings/AppearanceController
```

```php
<?php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAppearanceRequest;
use Illuminate\Http\RedirectResponse;

class AppearanceController extends Controller
{
    public function update(UpdateAppearanceRequest $request): RedirectResponse
    {
        $request->user()->update([
            'theme' => $request->validated('theme'),
        ]);

        return back();
    }
}
```

**Why `back()` and not a named route:** this endpoint is hit by the nav
toggle from any page. The user should stay where they are. `back()` sends
the Inertia redirect to the current URL, which triggers a partial reload
of props — including the shared `auth.user`, so the new `theme` value
flows back to the frontend on the next render.

**Why this isn't a `PATCH /settings/appearance` yet:** the route will be,
for URL stability, but there's no settings page on Day 2. That's fine —
a PATCH to a route with no GET page is unusual but valid. When the
settings page lands on Day 7, it POSTs to the same endpoint.

---

## Step 10 — Wire up routes

### 10a. Add deck and appearance routes to `routes/web.php`

Open `routes/web.php`. Add these `use` statements at the top, below the
existing ones:

```php
use App\Http\Controllers\Web\DeckController;
use App\Http\Controllers\Web\Settings\AppearanceController;
```

Then add the route group before the `require __DIR__.'/auth.php';` line:

```php
Route::middleware('auth')->group(function () {
    Route::resource('decks', DeckController::class);
    Route::patch('settings/appearance', [AppearanceController::class, 'update'])
        ->name('settings.appearance.update');
});
```

**Why `Route::resource` and not seven explicit `Route::get/post/...`
lines:** `resource` generates index, create, store, show, edit, update,
destroy with conventional route names (`decks.index`, `decks.store`, etc.)
in one line. The conventions matter because Ziggy exposes them to the
frontend by the same names, and because it's the pattern every Laravel
developer recognizes. There's no feature of resource we don't use and no
feature we need that it doesn't provide.

**Why not `Route::resource('decks', ...)->only([...])`:** we use all seven
methods. No need to restrict.

**Why `patch` and not `put` for appearance:** a partial update of a user
setting. Semantically `PATCH`. The route name uses the same convention
we'll extend on Day 7.

**Why the appearance route is `settings/appearance` and not
`user/theme`:** it matches `04-features.md` §7.3's URL. Consistency with
the doc, even before the page exists.

### 10b. Change the post-registration redirect

Open `app/Http/Controllers/Auth/RegisteredUserController.php` and find:

```php
return redirect(route('dashboard', absolute: false));
```

Change to:

```php
return redirect(route('decks.index', absolute: false));
```

**Why this matters and why it's easy to miss:** `04-features.md` §1.1 says
registration lands on `/decks`. Breeze ships `dashboard`. If we skip this,
a new user lands on the dashboard, which is a placeholder page — the worst
possible first impression. Two-line fix. Do it now or forget it.

**Why not delete the dashboard entirely:** `04-features.md` never mentions
a dashboard. It's plausible we remove it later. For now we leave it
reachable but not the default landing, so we don't break the existing
route or any Breeze test that references it.

### 10c. Verify routes

Run:

```bash
php artisan route:clear
php artisan route:list --path=decks
php artisan route:list --path=settings
```

**Why `route:clear` first:** Laravel caches routes in production but not
in dev by default. If you've ever run `route:cache` manually, the new
routes won't show until the cache is cleared. It's a cheap command and
avoids the "why isn't my route listed" confusion.

**PAUSE #6.** Paste the output of both `route:list` commands.

Expected: seven `decks.*` routes (index, create, store, show, edit, update,
destroy) and one `settings.appearance.update`. If `decks.store` is missing
or `PUT` and `PATCH` are both listed against `decks.update`, that's normal
— `Route::resource` registers both verbs for update. Nothing to fix.

**If `route:list` throws** `Target class [App\Http\Controllers\Web\DeckController]
does not exist`, the namespace in the controller file is wrong. Check
`head -5 app/Http/Controllers/Web/DeckController.php`. It must start with
`<?php` then a blank line then `namespace App\Http\Controllers\Web;`.

---

## End of Segment 1

Segment 2 begins with frontend plumbing and the four React pages. It
includes:

- `@iconify/react` imports in components
- The `deckIcons`-filtered `IconPicker` component (with the debounced
  search mechanic from your admin tool, minus the modal wrapper)
- The `ColorPicker` component
- The `ThemeToggle` component
- The pre-paint script in `app.blade.php`
- The `User` type extension in `types/index.d.ts`
- `Decks/Index.tsx`, `Decks/Create.tsx`, `Decks/Edit.tsx`, `Decks/Show.tsx`,
  and the shared `Decks/Partials/DeckForm.tsx`
- Edits to `AuthenticatedLayout.tsx` (Decks nav link + ThemeToggle)

Segment 3 is tests, manual verification, commit, and session state.

Before you continue to Segment 2, run through the PAUSE outputs. If any of
the four PAUSE markers shows something unexpected, stop and paste it —
we fix it now, not mid-Segment-2.
