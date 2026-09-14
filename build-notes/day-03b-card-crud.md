# Day 3b — Card CRUD

**Objective:** Users can add, edit, and delete cards within a deck they own. The card list on `Decks/Show` becomes real — paginated, sorted by due date, with working "Add card" and per-row "Edit"/"Delete" actions. Every new file follows the patterns established in `day-02` (deck CRUD).

**Estimated time:** 2–3 hours including tests.

**Commit boundary:** One commit at the end. `day-03a` must be committed first — this manual's frontend work assumes the dark sweep is in place, and `Decks/Show.tsx` is edited by both.

**Dependency:** This manual modifies `Decks/Show.tsx`, which `day-03a` §4.2 also modifies. Apply `day-03a` first, then this. If you apply them out of order, the dark-mode edits and the card-list edits will conflict.

---

## 0. Prerequisites

1. XAMPP MySQL running.
2. Terminal 1: `npm run dev`
3. Terminal 2: `php artisan serve`
4. `day-03a` committed.

---

## 1. What this manual builds

| Piece           | File                                                          | Pattern source                    |
| --------------- | ------------------------------------------------------------- | --------------------------------- |
| Validation      | `app/Http/Requests/StoreCardRequest.php`                      | `StoreDeckRequest`                |
| Authorization   | `app/Policies/CardPolicy.php`                                 | `DeckPolicy`                      |
| Controller      | `app/Http/Controllers/Web/CardController.php`                 | `DeckController`                  |
| Routes          | `routes/web.php` (edit)                                       | existing deck routes              |
| Model additions | `app/Models/Card.php` (edit)                                  | —                                 |
| Factory         | `database/factories/CardFactory.php`                          | `DeckFactory`                     |
| Pages           | `resources/js/Pages/Cards/Create.tsx`, `Edit.tsx`             | `Decks/Create.tsx`, `Edit.tsx`    |
| Form component  | `resources/js/Pages/Cards/Partials/CardForm.tsx`              | `Decks/Partials/DeckForm.tsx`     |
| Card list       | `resources/js/Pages/Decks/Show.tsx` (edit)                    | —                                 |
| Flash plumbing  | `app/Http/Middleware/HandleInertiaRequests.php` (edit)        | —                                 |
| Types           | `resources/js/types/index.d.ts` (edit)                        | —                                 |
| Tests           | `tests/Feature/Cards/CardCrudTest.php`, `CardFactoryTest.php` | `DeckCrudTest`, `DeckFactoryTest` |
| Doc fix         | `docs/04-features.md` (edit)                                  | —                                 |

**What this manual does not build:** AI generation (Day 4), study mode (Day 5), the "Generate with AI" button (stays a disabled stub), review scheduling logic (`Sm2Scheduler` is Day 5's job — cards created here get default scheduling state only).

---

## 2. Authorization decision — recorded, not relitigated

`04-features.md` §3.1 says card create authorizes "via `DeckPolicy@update` (parent deck)." §3.2 and §3.3 say `CardPolicy@update` / `CardPolicy@delete`. **The spec contradicts itself. Resolved in favor of `CardPolicy`.**

**Why `CardPolicy`, not `DeckPolicy`:**

- A card route has a `Card` model. Authorizing it via the deck means manually loading the deck in every controller method — extra code, easy to forget one path.
- `User` has no `cards()` relationship (confirmed in `app/Models/User.php`). Cards are reached only through decks. A `CardPolicy` can still check ownership via `$card->deck->user_id`, so nothing is lost.
- Consistency with `DeckController`, which uses `abort_unless($request->user()->can(...), 404)`. `CardController` uses the same shape with `CardPolicy`.

**One subtlety:** `CardPolicy@create` must accept a `Deck`, not a `Card` — you're authorizing "can this user add a card to this deck," and there's no card yet. Laravel supports this: `$this->authorize('create', [Card::class, $deck])`, or `abort_unless($user->can('create', [Card::class, $deck]), 404)`. The policy signature is `create(User $user, Deck $deck): bool`.

**`04-features.md` §3.1 is updated in this same commit** — see §7. The doc and the code must not disagree; the doc's own header says so.

---

## 3. Backend

### 3.1 `app/Http/Requests/StoreCardRequest.php`

Mirrors `StoreDeckRequest`. Validates all three fields; authorization returns `true` (the controller does the policy check, same as decks).

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'front' => ['required', 'string', 'max:2000'],
            'back' => ['required', 'string', 'max:2000'],
            'explanation' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
```

**Why `max:2000` and not the DB's implicit limit:** the columns are `text`, which in MySQL holds 65,535 bytes. 2,000 characters is a product decision, not a storage one — it matches `04-features.md` §3.1 and keeps the study-mode card readable. Enforced here, not in the migration, because the limit is about UX, not schema.

**Why no `due_at` in the rules:** it's not user input. The controller sets it. Never trust a client-supplied scheduling field — a user could POST `due_at: 2099-01-01` and hide a card from their own review queue.

**Reused for both store and update.** Like `StoreDeckRequest`, there's no separate `UpdateCardRequest` — the fields are identical and no field is optional-on-update. `04-features.md` §3.2 says "reused," so this matches the spec.

### 3.2 `app/Policies/CardPolicy.php`

Mirrors `DeckPolicy`, but `create` takes a `Deck`.

```php
<?php

namespace App\Policies;

use App\Models\Card;
use App\Models\Deck;
use App\Models\User;

class CardPolicy
{
    public function viewAny(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
    }

    public function view(User $user, Card $card): bool
    {
        return $user->id === $card->deck->user_id;
    }

    public function create(User $user, Deck $deck): bool
    {
        return $user->id === $deck->user_id;
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

**Why `$card->deck->user_id` and not `$card->user_id`:** cards don't have a `user_id` column. Ownership is transitive through the deck. This is a deliberate schema decision from Day 1 — one source of truth for ownership, no denormalization to keep in sync.

**Why `viewAny` takes a `Deck`:** listing a deck's cards is authorized by deck ownership, not by card ownership. It's only used if we add a standalone "all cards" route later; for now, the card list is rendered by `DeckController@show`, which already authorizes via `DeckPolicy@view`. Including it here is defensive — if a future route needs it, the method exists and is correct.

**Laravel will not auto-register this policy** unless the naming convention matches. `Card` model → `CardPolicy` is the convention, and Laravel 12's auto-discovery handles it (same as `Deck` → `DeckPolicy`). No `AuthServiceProvider` edit needed.

### 3.3 `app/Http/Controllers/Web/CardController.php`

Nested resource controller. Every method authorizes via `abort_unless(..., 404)` — same pattern as `DeckController`, preserving the "404 not 403" decision from `08-security.md`.

```php
<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCardRequest;
use App\Models\Card;
use App\Models\Deck;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CardController extends Controller
{
    public function create(Request $request, Deck $deck): Response
    {
        abort_unless(
            $request->user()->can('create', [Card::class, $deck]),
            404
        );

        return Inertia::render('Cards/Create', [
            'deck' => $deck->only(['id', 'name']),
        ]);
    }

    public function store(StoreCardRequest $request, Deck $deck): RedirectResponse
    {
        abort_unless(
            $request->user()->can('create', [Card::class, $deck]),
            404
        );

        $deck->cards()->create([
            ...$request->validated(),
            'due_at' => now(),
        ]);

        return redirect()
            ->route('cards.create', $deck)
            ->with('success', 'Card added. Add another?');
    }

    public function edit(Request $request, Card $card): Response
    {
        abort_unless($request->user()->can('update', $card), 404);

        return Inertia::render('Cards/Edit', [
            'card' => $card->only(['id', 'front', 'back', 'explanation']),
            'deck' => $card->deck->only(['id', 'name']),
        ]);
    }

    public function update(StoreCardRequest $request, Card $card): RedirectResponse
    {
        abort_unless($request->user()->can('update', $card), 404);

        $card->update($request->validated());

        return redirect()->route('decks.show', $card->deck_id);
    }

    public function destroy(Request $request, Card $card): RedirectResponse
    {
        abort_unless($request->user()->can('delete', $card), 404);

        $deckId = $card->deck_id;
        $card->delete();

        return redirect()->route('decks.show', $deckId);
    }
}
```

**Why `due_at => now()` in `store`:** the migration makes `due_at` nullable with no default. A card with no `due_at` would never appear in a "due now" query (`dueCards()` filters `due_at <= now()`). New cards must be immediately due — that's what makes them show up in study mode on Day 5. This is the one field `StoreCardRequest` doesn't validate because it's not user input.

**Why `store` redirects to `cards.create`, not `decks.show`:** `04-features.md` §3.1 says "redirect back to the create form with toast 'Card added. Add another?' — allows rapid manual entry." Manual entry is the use case: a user pasting ten cards from a textbook doesn't want to navigate back to the deck between each one.

**Why `update` and `destroy` redirect to `decks.show`:** editing or deleting is a terminal action — the user is done with that card. Sending them back to the deck list makes sense.

**Why `edit` passes both `card` and `deck`:** the page header reads "Edit card in {deck name}" so the user knows where they are. Only `id` and `name` are passed — no need to serialize the whole deck.

**Why no `index` method:** the card list lives on `Decks/Show`, served by `DeckController@show`. A separate `/cards` index isn't in the spec. Adding one would be scope creep.

### 3.4 `routes/web.php`

Add card routes inside the existing `auth` group, near the deck resource.

```php
Route::middleware('auth')->group(function () {
    Route::resource('decks', DeckController::class);
    Route::resource('decks.cards', CardController::class)
        ->shallow()
        ->except(['index', 'show']);
    Route::patch('settings/appearance', [AppearanceController::class, 'update'])
        ->name('settings.appearance.update');
});
```

**Why `->shallow()`:** shallow nesting means the routes that only need a card ID use `/cards/{card}` instead of `/decks/{deck}/cards/{card}`. The deck ID is redundant once you have the card — the card already knows its deck. Shallow gives:

| Route   | URI                         | Name            |
| ------- | --------------------------- | --------------- |
| create  | `decks/{deck}/cards/create` | `cards.create`  |
| store   | `decks/{deck}/cards`        | `cards.store`   |
| edit    | `cards/{card}/edit`         | `cards.edit`    |
| update  | `cards/{card}`              | `cards.update`  |
| destroy | `cards/{card}`              | `cards.destroy` |

Create and store need the deck (you're adding _to_ a deck). Edit, update, delete only need the card. This is exactly what the URLs should be.

**Why `->except(['index', 'show'])`:** no card index page (the list is on the deck page), no card show page (cards are answered in study mode, not viewed standalone). Without this, Laravel generates routes pointing at controller methods that don't exist, and any route:list or IDE inspection shows phantom routes.

**Why `Route::resource` over explicit routes:** the deck controller already uses `Route::resource`. Consistency. Explicit routes would be five lines instead of three and would drift from the pattern.

### 3.5 `app/Models/Card.php` — one addition

No schema changes. One helper the card list needs.

Add to the existing model:

```php
public function isDue(): bool
{
    return $this->due_at !== null && $this->due_at->isPast();
}
```

**Why this exists:** the card list needs to render "Due now" / "Due in {h}h" / "In {n} days" per row (`04-features.md` §3.4). Doing that with raw date math in the React component means reimplementing the same logic in TypeScript, with all the timezone bugs that implies. A server-side helper keeps the date math in one language.

**Why not a scope:** `isDue()` is per-instance, not a query filter. `dueCards()` already exists as the query-level equivalent. A scope would duplicate it.

**Why not put this on the frontend:** PHP's `Carbon` handles the "is this past?" check correctly with the app's timezone. JavaScript's `Date` in the browser uses the _user's_ timezone, which may differ from the server's. For a card due "in 3 hours," that discrepancy is small; for "due now," it's the difference between showing "Due now" and "Due in 1m." Server-side is correct.

**This does not add scheduling logic.** `isDue()` is a read-only check. `Sm2Scheduler` — which _writes_ `ease_factor`, `interval`, `repetitions`, `due_at` — is Day 5's job.

---

## 4. Factory and tests

### 4.1 `database/factories/CardFactory.php`

Mirrors `DeckFactory`.

```php
<?php

namespace Database\Factories;

use App\Models\Deck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Card>
 */
class CardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'deck_id' => Deck::factory(),
            'front' => fake()->sentence(),
            'back' => fake()->sentence(),
            'explanation' => fake()->optional()->paragraph(),
            'ease_factor' => 2.50,
            'interval' => 0,
            'repetitions' => 0,
            'due_at' => now(),
            'last_reviewed_at' => null,
        ];
    }
}
```

**Why `due_at => now()` in the factory but nullable in the schema:** the schema allows null (for future states like "suspended"), but every card created through normal flows gets a `due_at`. The factory should produce cards that look like real ones. If a test needs a card with no due date, it passes `['due_at' => null]` explicitly.

**Why the SM-2 fields are hardcoded to their defaults rather than randomized:** these aren't fake data — they're scheduling state, and a factory that produced `ease_factor: 1.7` would create cards that behave differently in study-mode tests. Defaults keep the factory deterministic. Tests that need different values set them explicitly.

### 4.2 `tests/Feature/Cards/CardCrudTest.php`

Mirrors `DeckCrudTest`. Same structure, same `assertInertia` usage, same `RefreshDatabase`.

```php
<?php

namespace Tests\Feature\Cards;

use App\Models\Card;
use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_the_card_create_form(): void
    {
        $deck = Deck::factory()->create();

        $this->get(route('cards.create', $deck))->assertRedirect('/login');
    }

    public function test_a_user_can_view_the_create_form_for_their_own_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create(['name' => 'Physics']);

        $this->actingAs($user)
            ->get(route('cards.create', $deck))
            ->assertOk()
            ->assertInertia(
                fn ($page) => $page
                    ->component('Cards/Create')
                    ->where('deck.id', $deck->id)
                    ->where('deck.name', 'Physics')
            );
    }

    public function test_a_user_cannot_view_the_create_form_for_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->get(route('cards.create', $deck))
            ->assertNotFound();
    }

    public function test_a_user_can_create_a_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'front' => 'What is the derivative of ln(x)?',
            'back' => '1/x',
            'explanation' => 'Standard calculus result.',
        ]);

        $response->assertRedirect(route('cards.create', $deck));

        $card = Card::firstOrFail();
        $this->assertSame($deck->id, $card->deck_id);
        $this->assertSame('What is the derivative of ln(x)?', $card->front);
        $this->assertNotNull($card->due_at);
        $this->assertSame('2.50', $card->ease_factor);
        $this->assertSame(0, $card->repetitions);
    }

    public function test_creating_a_card_requires_front_and_back(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'explanation' => 'No front or back.',
        ]);

        $response->assertSessionHasErrors(['front', 'back']);
        $this->assertSame(0, Card::count());
    }

    public function test_creating_a_card_rejects_overly_long_fields(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'front' => str_repeat('a', 2001),
            'back' => 'ok',
        ]);

        $response->assertSessionHasErrors('front');
        $this->assertSame(0, Card::count());
    }

    public function test_a_user_cannot_create_a_card_in_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->post(route('cards.store', $deck), [
                'front' => 'Hijacked',
                'back' => 'No',
            ])
            ->assertNotFound();

        $this->assertSame(0, Card::count());
    }

    public function test_a_user_can_edit_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create(['front' => 'Old']);

        $this->actingAs($user)
            ->get(route('cards.edit', $card))
            ->assertOk()
            ->assertInertia(
                fn ($page) => $page
                    ->component('Cards/Edit')
                    ->where('card.front', 'Old')
                    ->where('deck.id', $deck->id)
            );
    }

    public function test_a_user_cannot_edit_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create();

        $this->actingAs($user)
            ->get(route('cards.edit', $card))
            ->assertNotFound();
    }

    public function test_a_user_can_update_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create(['front' => 'Old']);

        $this->actingAs($user)
            ->put(route('cards.update', $card), [
                'front' => 'New',
                'back' => 'Answer',
                'explanation' => null,
            ])
            ->assertRedirect(route('decks.show', $deck));

        $this->assertSame('New', $card->fresh()->front);
    }

    public function test_updating_a_card_does_not_reset_scheduling_state(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create([
            'repetitions' => 5,
            'interval' => 30,
            'ease_factor' => 2.30,
        ]);

        $this->actingAs($user)->put(route('cards.update', $card), [
            'front' => 'Edited',
            'back' => 'Answer',
        ]);

        $card->refresh();
        $this->assertSame(5, $card->repetitions);
        $this->assertSame(30, $card->interval);
        $this->assertSame('2.30', $card->ease_factor);
    }

    public function test_a_user_cannot_update_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create(['front' => 'Original']);

        $this->actingAs($user)
            ->put(route('cards.update', $card), [
                'front' => 'Hijacked',
                'back' => 'No',
            ])
            ->assertNotFound();

        $this->assertSame('Original', $card->fresh()->front);
    }

    public function test_a_user_can_delete_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create();

        $this->actingAs($user)
            ->delete(route('cards.destroy', $card))
            ->assertRedirect(route('decks.show', $deck));

        $this->assertNull($card->fresh());
    }

    public function test_a_user_cannot_delete_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create();

        $this->actingAs($user)
            ->delete(route('cards.destroy', $card))
            ->assertNotFound();

        $this->assertNotNull($card->fresh());
    }

    public function test_deleting_a_deck_cascades_to_its_cards(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        Card::factory()->for($deck)->count(3)->create();

        $this->assertSame(3, Card::count());

        $deck->delete();

        $this->assertSame(0, Card::count());
    }
}
```

**Why `test_updating_a_card_does_not_reset_scheduling_state` exists:** `04-features.md` §3.2 says explicitly "Editing does not reset SM-2 state — the card keeps its scheduling." This test locks that decision. Without it, a future refactor could accidentally reset scheduling on edit and nobody would notice until a user complained their cards stopped being spaced correctly. The test is the guardrail.

**Why `test_deleting_a_deck_cascades_to_its_cards` exists:** the migration has `cascadeOnDelete()`, but that's a DB-level guarantee, and DB-level guarantees break when someone changes the migration. This test asserts the behavior at the application level — if the cascade ever stops working, the test fails before a user loses data.

**Why `assertNotFound()` and not `assertForbidden()`:** matches `08-security.md`'s "404 not 403 for unauthorized web access (no resource enumeration)." Same decision, same assertion.

### 4.3 `tests/Feature/Cards/CardFactoryTest.php`

Mirrors `DeckFactoryTest` — a small sanity check that the factory produces valid cards.

```php
<?php

namespace Tests\Feature\Cards;

use App\Models\Card;
use App\Models\Deck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_factory_creates_a_card_with_a_parent_deck(): void
    {
        $card = Card::factory()->create();

        $this->assertNotNull($card->deck);
        $this->assertInstanceOf(Deck::class, $card->deck);
    }

    public function test_the_factory_defaults_to_a_due_card(): void
    {
        $card = Card::factory()->create();

        $this->assertTrue($card->isDue());
    }

    public function test_the_factory_defaults_to_sm2_initial_state(): void
    {
        $card = Card::factory()->create();

        $this->assertSame('2.50', $card->ease_factor);
        $this->assertSame(0, $card->interval);
        $this->assertSame(0, $card->repetitions);
        $this->assertNull($card->last_reviewed_at);
    }
}
```

**Why these three tests:** the factory is used by every card test. If it produces a card whose `due_at` is null, `isDue()` returns false, and every study-mode test on Day 5 silently breaks. These three tests catch that class of bug at the source.

**Note on `assertSame('2.50', $card->ease_factor)`:** the `decimal(4,2)` cast returns a string, not a float. `assertSame('2.50', ...)` is correct; `assertSame(2.5, ...)` would fail. This is a Laravel/MySQL gotcha worth knowing — if the test fails with a "string vs float" mismatch, this is why.

---

## 5. Frontend — the card form component

### 5.1 `resources/js/Pages/Cards/Partials/CardForm.tsx`

Mirrors `DeckForm.tsx`'s structure: a presentational component that receives a `useForm`-shaped object and renders the fields. The pages own the `useForm` call and the submit handler.

```tsx
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import { Link } from "@inertiajs/react";
import { FormEventHandler } from "react";

export type CardFormData = {
    front: string;
    back: string;
    explanation: string;
};

export type CardFormApi = {
    data: CardFormData;
    setData: <K extends keyof CardFormData>(
        key: K,
        value: CardFormData[K],
    ) => void;
    errors: Partial<Record<keyof CardFormData, string>>;
    processing: boolean;
};

type Props = {
    form: CardFormApi;
    submitLabel: string;
    onSubmit: FormEventHandler;
    cancelHref: string;
};

export default function CardForm({
    form,
    submitLabel,
    onSubmit,
    cancelHref,
}: Props) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <InputLabel htmlFor="front" value="Front (the question)" />
                <textarea
                    id="front"
                    value={form.data.front}
                    onChange={(e) => form.setData("front", e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={3}
                    placeholder="What is the derivative of ln(x)?"
                    autoFocus
                />
                <InputError message={form.errors.front} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="back" value="Back (the answer)" />
                <textarea
                    id="back"
                    value={form.data.back}
                    onChange={(e) => form.setData("back", e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={3}
                    placeholder="1/x"
                />
                <InputError message={form.errors.back} className="mt-2" />
            </div>

            <div>
                <InputLabel
                    htmlFor="explanation"
                    value="Explanation (optional)"
                />
                <textarea
                    id="explanation"
                    value={form.data.explanation}
                    onChange={(e) =>
                        form.setData("explanation", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={2}
                    placeholder="Why is this the answer?"
                />
                <InputError
                    message={form.errors.explanation}
                    className="mt-2"
                />
            </div>

            <div className="flex items-center gap-3">
                <PrimaryButton disabled={form.processing}>
                    {submitLabel}
                </PrimaryButton>
                <Link
                    href={cancelHref}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
```

**Why raw `<textarea>` and not `TextInput`:** cards are long-form (up to 2,000 characters). A single-line `<input>` is wrong for multi-sentence content. `TextInput` wraps an `<input type="text">`, which can't wrap text.

**Why inline dark classes rather than a new `TextArea` component:** a `TextArea` component would be the _right_ refactor, but it's scope creep. The dark sweep (`day-03a` §2.16) already established the pattern for inline-swept textareas in `DeckForm`. `CardForm` follows the same pattern. If a third textarea appears later, that's the point to extract a component — three usages is the conventional threshold for extraction, two is not.

**Why the dark classes are written in from the start:** `day-03a` is committed before this. `CardForm` must be dark-correct on arrival, not swept later. The classes above match `DeckForm`'s post-sweep textarea exactly.

**Why `explanation` is `string` and not `string | null` in the type:** `useForm` in the Create page initializes it as `''`, and `setData` always sets a string. The controller's `validated()` returns `null` for an empty explanation (because the rule is `nullable`), but the frontend never sends `null`. The type reflects the frontend's reality, not the backend's.

---

## 6. Frontend — the pages

### 6.1 `resources/js/Pages/Cards/Create.tsx`

Mirrors `Decks/Create.tsx`. Includes the inline flash message per §6.3.

```tsx
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CardForm from "@/Pages/Cards/Partials/CardForm";
import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";

type Deck = {
    id: number;
    name: string;
};

export default function Create({
    deck,
    flash,
}: {
    deck: Deck;
    flash: { success?: string | null };
}) {
    const form = useForm({
        front: "",
        back: "",
        explanation: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route("cards.store", deck.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                    Add a card to {deck.name}
                </h2>
            }
        >
            <Head title={`Add a card to ${deck.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        {flash?.success && (
                            <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
                                {flash.success}
                            </div>
                        )}
                        <CardForm
                            form={form}
                            submitLabel="Add card"
                            onSubmit={submit}
                            cancelHref={route("decks.show", deck.id)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

**Why the header includes the deck name:** `04-features.md` §3.1 says the page title is "Add a card." Adding the deck name disambiguates when a user has multiple decks open in tabs. Small UX improvement, no cost.

**Why the flash message sits above the form, inside the panel:** it's the first thing the user sees after the redirect. Placing it inside the surface panel (not on the page background) keeps it visually attached to the thing it's about.

### 6.2 `resources/js/Pages/Cards/Edit.tsx`

Mirrors `Decks/Edit.tsx`.

```tsx
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CardForm from "@/Pages/Cards/Partials/CardForm";
import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";

type Card = {
    id: number;
    front: string;
    back: string;
    explanation: string | null;
};

type Deck = {
    id: number;
    name: string;
};

export default function Edit({ card, deck }: { card: Card; deck: Deck }) {
    const form = useForm({
        front: card.front,
        back: card.back,
        explanation: card.explanation ?? "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(route("cards.update", card.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                    Edit card in {deck.name}
                </h2>
            }
        >
            <Head title={`Edit card in ${deck.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <CardForm
                            form={form}
                            submitLabel="Save changes"
                            onSubmit={submit}
                            cancelHref={route("decks.show", deck.id)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

**Why `card.explanation ?? ''`:** the backend can return `null` for `explanation` (it's nullable). `useForm` needs a string. The `?? ''` handles the null case. On submit, an empty string is sent, which the backend's `nullable` rule accepts and stores as `null`.

### 6.3 Flash messages — the shared prop

**File:** `app/Http/Middleware/HandleInertiaRequests.php`

**Find:**

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
    ];
}
```

**Replace with:**

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
        'flash' => [
            'success' => fn () => $request->session()->get('success'),
        ],
    ];
}
```

**Why a closure around `$request->session()->get('success')`:** Inertia evaluates shared props lazily. Without the closure, `$request->session()->get('success')` runs on every request, including ones where there's no session to read (e.g., during certain middleware timing edge cases). The closure defers evaluation until Inertia actually serializes the props. This is the documented Laravel/Inertia pattern — the closure is not optional stylistic preference, it's the correct form.

**Why only `success`, not `error` or `info`:** `04-features.md` §8.3 defines three toast types, but `day-03b` only emits a success message. Adding `error` and `info` now means adding keys nothing reads. When the toast system lands, all three get added together. Adding them one at a time creates dead props.

**Why the key is `flash` and not flattened:** `auth` is already a nested key. A sibling `flash` key matches the established shape. Flattening to `success_flash` would be inconsistent with the file's existing convention.

### 6.4 `resources/js/types/index.d.ts` — extend `PageProps`

**Find:**

```ts
export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
```

**Replace with:**

```ts
export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string | null;
    };
};
```

**Why this edit is necessary:** every Inertia response now carries a `flash` prop. Every page component that types itself as `PageProps` will type-check against this shape. Without the addition, `Cards/Create.tsx`'s destructure of `flash` would still work (it declares its own prop type), but any page that reads `usePage().props.flash` would fail type-checking. Adding it now is correct-by-construction; adding it later means chasing a type error.

### 6.5 `resources/js/Pages/Decks/Show.tsx` — the card list

This is the largest frontend edit in `day-03b`. The current `Show.tsx` has:

- An unconditional empty-state ("No cards yet…") that renders even when cards exist.
- A disabled "Add card" stub.
- No card list.

**Backend change required first.** `DeckController@show` currently does:

```php
$deck->loadCount(['cards', 'dueCards']);

return Inertia::render('Decks/Show', ['deck' => $deck]);
```

It must paginate cards and pass them separately:

```php
public function show(Request $request, Deck $deck): Response
{
    abort_unless($request->user()->can('view', $deck), 404);

    $deck->loadCount(['cards', 'dueCards']);

    $cards = $deck->cards()
        ->orderBy('due_at')
        ->paginate(20);

    return Inertia::render('Decks/Show', [
        'deck' => $deck,
        'cards' => $cards,
    ]);
}
```

**Why a separate `cards` prop, not `$deck->load('cards')`:** paginated data carries metadata (`current_page`, `last_page`, `links`). Embedding a paginator inside the deck object means the `Deck` type grows a paginator field, and the React component has to distinguish `deck.cards` (a paginator) from `deck.cards_count` (a number). Separate props keep each type clean.

**Why `orderBy('due_at')` ascending:** `04-features.md` §3.4 says "sorted by `due_at` asc (due soonest first)." Cards that need review appear at the top of the list.

**Why 20 per page:** `04-features.md` §3.4. Hardcoded, not configurable. If it becomes configurable, it's a `config/` value, not a query-string parameter — a query-string page size is a DoS vector (someone requests 100,000 per page).

**Why `due_at` can be null and still sort:** MySQL sorts `NULL` first in ascending order. Cards with no due date would appear at the top. This is fine for now — the only way a card gets a null `due_at` is if someone sets it explicitly, and no current flow does. If that changes (a "suspend card" feature, say), the ordering needs `orderByRaw('due_at IS NULL, due_at ASC')`. Noted, not solved — no current code path produces null `due_at`.

Then the React side. Add these types near the top of `Show.tsx`:

```tsx
type CardType = {
    id: number;
    front: string;
    back: string;
    explanation: string | null;
    due_at: string | null;
    repetitions: number;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};
```

Update the component's props:

```tsx
export default function Show({
    deck,
    cards,
}: {
    deck: Deck;
    cards: Paginated<CardType>;
}) {
```

Add state and handler for the card delete modal:

```tsx
const [confirmingDeleteCard, setConfirmingDeleteCard] =
    useState<CardType | null>(null);

const deleteCard = () => {
    if (!confirmingDeleteCard) return;
    router.delete(route("cards.destroy", confirmingDeleteCard.id), {
        onFinish: () => setConfirmingDeleteCard(null),
    });
};
```

Add the `formatDue` helper below the component:

```tsx
function formatDue(dueAt: string | null): string {
    if (!dueAt) return "Not scheduled";

    const due = new Date(dueAt);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs <= 0) return "Due now";

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `Due in ${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Due in ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `In ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
}
```

Replace the current disabled "Add card" stub with:

```tsx
<Link
    href={route("cards.create", deck.id)}
    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
>
    Add card
</Link>
```

The "Generate with AI" stub stays disabled — that's Day 4.

Replace the current unconditional empty-state block with:

```tsx
{
    cards.data.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No cards yet. Generate a batch from your notes, or add one manually.
        </div>
    ) : (
        <>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {cards.data.map((card) => (
                    <li
                        key={card.id}
                        className="flex items-center justify-between gap-4 p-4"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                                {card.front}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formatDue(card.due_at)}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            <Link
                                href={route("cards.edit", card.id)}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                Edit
                            </Link>
                            <button
                                type="button"
                                onClick={() => setConfirmingDeleteCard(card)}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {cards.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 p-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                        Page {cards.current_page} of {cards.last_page}
                    </span>
                    <div className="flex gap-2">
                        {cards.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? "#"}
                                preserveScroll
                                className={
                                    "rounded-md px-3 py-1 " +
                                    (link.active
                                        ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900"
                                        : link.url
                                          ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          : "text-gray-300 dark:text-gray-600 cursor-not-allowed")
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
```

Add the card delete modal at the same level as the existing deck delete modal:

```tsx
<Modal
    show={confirmingDeleteCard !== null}
    onClose={() => setConfirmingDeleteCard(null)}
    maxWidth="md"
>
    <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Delete this card?
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            &ldquo;{confirmingDeleteCard?.front.slice(0, 60)}
            {confirmingDeleteCard && confirmingDeleteCard.front.length > 60
                ? "…"
                : ""}
            &rdquo; — This will also delete its review history. This cannot be
            undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton
                onClick={() => setConfirmingDeleteCard(null)}
                autoFocus
            >
                Cancel
            </SecondaryButton>
            <DangerButton onClick={deleteCard}>Delete card</DangerButton>
        </div>
    </div>
</Modal>
```

**Why `dangerouslySetInnerHTML` for `link.label`:** Laravel's paginator labels are HTML entities (`&laquo; Previous`, `Next &raquo;`). Rendering them as plain text shows the entities literally. This is the standard Inertia pattern for Laravel paginators. The labels are generated by Laravel, not user input, so the "dangerously" prefix isn't a real risk here — it's Laravel's own strings.

**Why `preserveScroll`:** clicking to page 2 shouldn't jump the user to the top of the page. They want to stay where they are in the card list.

**Why a per-row modal instead of a global one:** the modal needs to know _which_ card. Storing the card in state (`confirmingDeleteCard`) is the simplest way. A global boolean plus a separate "card to delete" state is the same thing with more variables.

**Why truncate the front to 60 chars:** `04-features.md` §3.3 specifies this. Long fronts in a modal would blow out the layout.

**Why `formatDue` lives in the component and not server-side:** the `isDue()` helper (§3.5) answers a boolean; this answers "how far in the future." Both could live on the server, but the client-side version refreshes without a round trip, and the string "Due in 3h" is presentation, not data. The one place this matters — deciding _whether_ a card is due for study mode — is server-side and stays server-side.

**Why the timestamp comparison uses `new Date()` client-side:** the difference between server-now and client-now is at most a few seconds, and "Due in 2h" vs "Due in 2h" isn't affected. This is not the scheduling decision; it's a display string.

---

## 7. Doc fix — `04-features.md` §3.1

The line currently reads:

> **Authorization:** via `DeckPolicy@update` (parent deck)

Change to:

> **Authorization:** via `CardPolicy@create` (parent deck passed to the policy)

**Why this edit is in the same commit:** `04-features.md`'s own header says _"When code and this doc disagree, one of them is wrong — fix both in the same commit."_ The code now uses `CardPolicy`. The doc must say so.

**Why not also update §3.2 and §3.3:** those already say `CardPolicy@update` / `CardPolicy@delete`, which is now correct. Only §3.1 is wrong.

---

## 8. Verification

### 8.1 Automated

```bash
php artisan test
```

Expected: all existing tests pass, plus ~16 new card tests. If any existing test fails, the cause is likely a route-name change — check `php artisan route:list` for the new `cards.*` names.

```bash
npm run build
```

Expected: clean build. Type errors in the new pages (a missing type, a wrong prop name) surface here.

### 8.2 Manual — the card lifecycle

Start the stack. Log in.

1. Go to `/decks`. Open a deck.
2. The card list shows "No cards yet…" and an enabled "Add card" button.
3. Click "Add card." The create form loads with the deck name in the header.
4. Fill in front, back, explanation. Click "Add card."
5. You're redirected back to a _fresh, empty_ create form.
6. A green success message appears above the form reading "Card added. Add another?"
7. Click "Cancel." You land back on the deck page.
8. The card you added appears in the list. The due label reads "Due now."
9. Click "Edit" on that card. Change the front. Save.
10. You land back on the deck page. The card list shows the new front.
11. Click "Delete" on that card. A modal appears with the front excerpt.
12. Cancel. The modal closes. Card still there.
13. Click "Delete" again. Confirm. The card disappears. List is empty again.

### 8.3 Manual — dark mode

Toggle to dark. Repeat the full lifecycle above. Every surface, every label, every button must read correctly. No white boxes, no invisible text, no white focus halos.

### 8.4 Manual — authorization

Open a second browser profile or a private window. Register a second user.

1. As user B, visit `/decks/{id}` for user A's deck (copy the URL). You get a 404.
2. As user B, visit `/decks/{id}/cards/create` for user A's deck. 404.
3. As user B, visit `/cards/{id}/edit` for user A's card. 404.
4. As user B, try to DELETE user A's card via dev tools (construct the request manually). 404. Card still exists.

The 404-not-403 behavior is intentional and must be preserved.

### 8.5 Manual — pagination

Add 25 cards to one deck (or use `php artisan tinker` to create them via factory). The list shows 20 on page 1. Click "Next." Page 2 shows 5. The URL doesn't change (Inertia handles it client-side, but check that the page state updates).

---

## 9. Commit

One commit. Message:

```
Day 3b: card CRUD

- Add CardPolicy (ownership via parent deck, 404-not-403)
- Add CardController (create, store, edit, update, destroy)
- Add StoreCardRequest (front, back, explanation; due_at set server-side)
- Register nested shallow card routes
- Add flash message plumbing via HandleInertiaRequests
- Add CardFactory and card CRUD/factory tests
- Add Cards/Create.tsx, Cards/Edit.tsx, Cards/Partials/CardForm.tsx
- Add card list to Decks/Show.tsx with pagination and delete modal
- Update DeckController@show to paginate cards
- Add Card::isDue() helper
- Extend PageProps with flash prop
- Fix 04-features.md §3.1: CardPolicy, not DeckPolicy

Refs: 04-features.md §3
```

---

## 10. What this manual deliberately does not do

- **No AI generation.** That's Day 4. The "Generate with AI" button stays a disabled stub.
- **No study mode.** That's Day 5. Cards created here have default scheduling state and are immediately due, but nothing reviews them yet.
- **No SM-2 logic.** `Sm2Scheduler` exists as a stub. This manual does not touch it.
- **No full toast system.** §6.3 delivers the spec's _behavior_ (a confirmation appears) via an inline message, not the spec's _mechanism_ (a toast). The toast system (`04-features.md` §8.3) is a later day.
- **No `TextArea` component extraction.** `CardForm` uses raw `<textarea>` elements, matching `DeckForm`'s pattern. Extraction is a Day 7 refactor.
- **No bulk card actions.** `04-features.md` doesn't specify them. Adding them would be scope creep.
- **No search or filter on the card list.** Not in the spec.
- **No card reordering.** Not in the spec.
- **No `UpdateCardRequest`.** `StoreCardRequest` is reused, per the spec.

If you find yourself wanting any of the above mid-build, stop. Note it. Day 5 or Day 7.

---

**End of manual.**
