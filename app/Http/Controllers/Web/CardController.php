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
